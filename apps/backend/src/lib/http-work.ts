import type { IncomingMessage } from 'node:http'

type Handler = (...args: any[]) => any
interface RequestWork {
  registry: HttpWorkRegistry
  active: number
  covered: boolean
  opaque: boolean
  children: number
}
const requests = new WeakMap<IncomingMessage, RequestWork>()
const trackedRouters = new WeakSet<Function>()

export interface HttpWorkRegistry {
  bind(req: IncomingMessage): void
  run<T>(req: IncomingMessage, task: () => T | PromiseLike<T>): Promise<T>
  freeze(): void
  drain(): Promise<void>
  isCovered(req: IncomingMessage): boolean
  markOpaque(req: IncomingMessage): void
  snapshot(): Readonly<{ frozen: boolean; activeOperations: number; opaqueRequests: number }>
}

/** Travaux applicatifs : leur promesse, jamais le transport, prouve leur fin. */
export function createHttpWorkRegistry(): HttpWorkRegistry {
  const pending = new Set<Promise<unknown>>()
  const opaqueRequests = new Set<IncomingMessage>()
  let frozen = false
  let draining: Promise<void> | undefined
  const registry: HttpWorkRegistry = {
    bind(req) {
      if (!requests.has(req)) requests.set(req, { registry, active: 0, covered: false, opaque: false, children: 0 })
      else if (requests.get(req)!.registry !== registry) throw new Error('Requête liée à un autre suivi applicatif.')
    },
    run(req, task) {
      registry.bind(req)
      const context = requests.get(req)!
      // Les continuations d'un travail déjà admis restent possibles pendant
      // le gel. Une nouvelle racine ne peut plus commencer une transaction.
      if (frozen && context.active === 0) return Promise.reject(new Error('HTTP_WORK_STOPPING'))
      let resolve!: (value: any) => void, reject!: (error: unknown) => void
      const operation = new Promise<any>((done, fail) => { resolve = done; reject = fail })
      context.active++
      pending.add(operation)
      const release = () => { context.active--; pending.delete(operation) }
      void operation.then(release, release)
      // Appel synchrone pour conserver l'ordre next()/AsyncLocalStorage.
      try { Promise.resolve(task()).then(resolve, reject) } catch (error) { reject(error) }
      return operation
    },
    freeze() { frozen = true },
    drain() {
      registry.freeze()
      return draining ||= (async () => {
        // Pas d'instantané unique : un contrôleur admis peut encore enregistrer
        // sa sauvegarde/projection fille avant de terminer son propre finally.
        while (pending.size) await Promise.allSettled([...pending])
        if (opaqueRequests.size) throw new Error('Arrêt non confirmé : callback sans promesse ni continuation prouvée ; travaux et base conservés.')
      })()
    },
    isCovered(req) {
      const context = requests.get(req)
      return context?.registry === registry && context.covered && !context.opaque && context.active === 0
    },
    markOpaque(req) { registry.bind(req); requests.get(req)!.opaque = true; opaqueRequests.add(req) },
    // Diagnostic uniquement : aucune URL, identité, donnée ou promesse exposée.
    snapshot() { return Object.freeze({ frozen, activeOperations: pending.size, opaqueRequests: opaqueRequests.size }) },
  }
  return registry
}

export const httpWork = createHttpWorkRegistry()
function contextFor(req: IncomingMessage): RequestWork {
  if (!requests.has(req)) httpWork.bind(req)
  return requests.get(req)!
}

/** Une tâche détachée doit enregistrer sa chaîne complète, gestion d'erreur incluse. */
export function trackHttpTask<T>(req: IncomingMessage, task: () => T | PromiseLike<T>): Promise<T> {
  const context = contextFor(req)
  context.children++
  return context.registry.run(req, task)
}

export function markTrackedRouter(router: Function): void { trackedRouters.add(router) }
export function isTrackedRouter(router: Function): boolean { return trackedRouters.has(router) }

function observe<T extends Handler>(handler: T, middleware: boolean, beforeAdmission = false, param = false): T {
  if (isTrackedRouter(handler)) return handler
  const invoke = (req: any, res: any, next: Handler, args: any[], nextIndex: number) => {
    const context = contextFor(req)
    const operation = context.registry.run(req, async () => {
      let nextCalled = false, complete!: () => void
      const continued = new Promise<void>(resolve => { complete = resolve })
      const proceed = (...nextArgs: any[]) => {
        nextCalled = true
        context.covered = false
        try { return next(...nextArgs) } finally { complete() }
      }
      args[nextIndex] = proceed
      if (!middleware) context.covered = true
      const abandoned = () => {
        // Seul l'adaptateur explicite de parsing est connu sans effet métier.
        // Un middleware callback opaque garde la protection conservatrice.
        if (beforeAdmission) context.covered = true
        else context.registry.markOpaque(req)
        complete()
      }
      try {
        const childrenBefore = context.children
        // compression() peut différer le end natif alors que le contrôleur
        // synchrone a déjà appelé res.end(). writableEnded reste alors false.
        // Observer uniquement cet appel pendant la pile du callback : un end
        // ultérieur issu d'un callback opaque ne constitue toujours pas une
        // preuve de fin métier. Ne pas remplacer un proxy installé par un
        // middleware ni conserver notre propre proxy après le retour.
        let endedSynchronously = false
        const previousEnd = res.end
        const observedEnd = function (this: any, ...endArgs: any[]) {
          endedSynchronously = true
          return previousEnd.apply(this, endArgs)
        }
        let result: any
        res.end = observedEnd
        try { result = handler(...args) }
        finally { if (res.end === observedEnd) res.end = previousEnd }
        if (result && typeof result.then === 'function') {
          await result
          if (!nextCalled) context.covered = true
        } else if (!nextCalled && !res.writableEnded && !endedSynchronously && context.children === childrenBefore) {
          // Même un router.get() peut recevoir un middleware callback. Ni le
          // finish ni l'abandon ne prouvent la fin de son travail opaque.
          req.once('aborted', abandoned)
          res.once('finish', abandoned)
          res.once('close', abandoned)
          if (req.aborted) abandoned()
          await continued
        } else if (!nextCalled) context.covered = true
      } catch (error) { proceed(error) }
      finally {
        req.removeListener('aborted', abandoned)
        res.removeListener('finish', abandoned)
        res.removeListener('close', abandoned)
      }
    })
    // Un refus d'admission ne lance aucun callback métier. Les exceptions du
    // callback, elles, sont remises à next() à l'intérieur du travail suivi.
    void operation.catch(error => {
      if (error?.message === 'HTTP_WORK_STOPPING') {
        if (!res.headersSent && !res.destroyed) res.status(503).json({ code: 'BACKEND_STOPPING', message: 'Arrêt en cours. Conservez la même référence.' })
      } else next(error)
    })
    return operation
  }
  if (param) return function (req: any, res: any, next: Handler, value: any, name: string) {
    return invoke(req, res, next, [req, res, next, value, name], 2)
  } as T
  if (handler.length === 4) return function (error: unknown, req: any, res: any, next: Handler) {
    return invoke(req, res, next, [error, req, res, next], 3)
  } as T
  return function (req: any, res: any, next: Handler = () => {}) {
    return invoke(req, res, next, [req, res, next], 2)
  } as T
}

export const observeHttpHandler = <T extends Handler>(handler: T): T => observe(handler, false)
export const observeHttpMiddleware = <T extends Handler>(handler: T, options?: { beforeAdmission?: boolean }): T => observe(handler, true, options?.beforeAdmission)
export const observeHttpParam = <T extends Handler>(handler: T): T => observe(handler, true, false, true)

/** Transforme uniquement les callbacks, en conservant chemins et tableaux. */
export function observeHttpArguments(args: unknown[], middleware: boolean): any[] {
  return args.map(value => Array.isArray(value) ? observeHttpArguments(value, middleware)
    : typeof value === 'function' ? (middleware ? observeHttpMiddleware(value as Handler) : observeHttpHandler(value as Handler)) : value)
}
