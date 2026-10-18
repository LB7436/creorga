import { afterEach, describe, expect, it } from 'vitest'
import express, { type Router } from 'express'
import { createTrackedRouter } from './tracked-router'
import { createServer, request } from 'node:http'
import { Readable } from 'node:stream'
import type { Socket } from 'node:net'
import { createHttpDrain } from './http-drain'
import { createHttpWorkRegistry, observeHttpMiddleware, trackHttpTask } from './http-work'
import { sendHttpStream } from './http-stream'

const tick = () => new Promise<void>(resolve => setImmediate(resolve))
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer!: NodeJS.Timeout
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('Le traitement HTTP reste bloqué')), 1500) })]) }
  finally { clearTimeout(timer) }
}
const cleanups: Array<() => Promise<void>> = []
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup() })

async function laboratory(register: (router: Router, gate: ReturnType<typeof deferred>, events: string[]) => void, failureExpected = false) {
  const app = express(), work = createHttpWorkRegistry(), gate = deferred(), events: string[] = [], peers = new Set<Socket>()
  const router = createTrackedRouter(); register(router, gate, events); app.use(router)
  const server = createServer(app), drain = createHttpDrain(server, () => false, work)
  server.on('connection', socket => { peers.add(socket); socket.once('close', () => peers.delete(socket)) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const stop = () => drain.close(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())), () => {})
    .then(() => { events.push('frontière-déconnexion') })
  cleanups.push(async () => {
    gate.resolve(); await tick(); await tick(); peers.forEach(socket => socket.destroy())
    try { await bounded(stop()) } catch (error) { if (!failureExpected) throw error }
  })
  const call = () => new Promise<{ status: number | undefined, body: string }>((resolve, reject) => {
    const client = request({ host: '127.0.0.1', port: (server.address() as { port: number }).port, path: '/fixture/value', agent: false }, response => {
      let body = ''; response.setEncoding('utf8'); response.on('data', chunk => { body += chunk })
      response.on('end', () => resolve({ status: response.statusCode, body })); response.on('error', reject)
    }); client.on('error', reject); client.end()
  })
  return { call, stop, events, gate, port: (server.address() as { port: number }).port }
}

describe('enregistrement public des callbacks Express suivis', () => {
  const registrations: Array<[string, (router: Router, gate: ReturnType<typeof deferred>, events: string[]) => void, number]> = [
    ['tableaux de handlers et chemins', (router, gate, events) => {
      const handlers = [(_req: express.Request, _res: express.Response, next: express.NextFunction) => next(), [async (_req: express.Request, res: express.Response) => {
        res.end('réponse entière'); await gate.promise; events.push('finally-terminé')
      }]] as unknown as express.RequestHandler[]
      router.get(['/fixture/:id', '/autre'], handlers)
    }, 200],
    ['route().all() et chaînage', (router, gate, events) => {
      router.route('/fixture/:id').all((_req, _res, next) => next()).get(async (_req, res) => {
        res.end('réponse entière'); await gate.promise; events.push('finally-terminé')
      })
    }, 200],
    ['routeurs imbriqués', (router, gate, events) => {
      const child = createTrackedRouter({ mergeParams: true })
      child.all('/:id', async (_req, res) => { res.end('réponse entière'); await gate.promise; events.push('finally-terminé') })
      router.use('/fixture', [child])
    }, 200],
    ['middleware après next()', (router, gate, events) => {
      router.use('/fixture', async (_req, _res, next) => { next(); await gate.promise; events.push('finally-terminé') })
      router.get('/fixture/:id', (_req, res) => { res.end('réponse entière') })
    }, 200],
    ['param après next()', (router, gate, events) => {
      router.param('id', async (_req, _res, next) => { next(); await gate.promise; events.push('finally-terminé') })
      router.get('/fixture/:id', (_req, res) => { res.end('réponse entière') })
    }, 200],
    ['gestionnaire d’erreur à quatre arguments', (router, gate, events) => {
      router.get('/fixture/:id', (_req, _res, next) => next(Error('défaut de fixture contrôlé')))
      router.use(async (_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).end('réponse entière'); await gate.promise; events.push('finally-terminé')
      })
    }, 500],
  ]
  it.each(registrations)('attend la vraie fin : %s', async (_name, register, status) => {
    const fixture = await laboratory(register)
    expect(await bounded(fixture.call())).toEqual({ status, body: 'réponse entière' })
    let stopped = false
    const closing = fixture.stop().then(() => { stopped = true })
    await tick(); await tick()
    expect(stopped, 'La réponse finie ne doit pas prouver la fin du callback').toBe(false)
    expect(fixture.events).toEqual([])
    fixture.gate.resolve(); await bounded(closing)
    expect(fixture.events).toEqual(['finally-terminé', 'frontière-déconnexion'])
  })

  it('attend aussi une chaîne fille enregistrée après le gel', async () => {
    const fixture = await laboratory((router, gate, events) => {
      router.get('/fixture/:id', async (req, res) => {
        res.end('réponse entière'); await gate.promise
        void trackHttpTask(req, async () => { await tick(); events.push('sauvegarde-fille-terminée') })
          .catch(error => { events.push('échec-fille:' + error.message) })
      })
    })
    await bounded(fixture.call()); const closing = fixture.stop(); await tick()
    expect(fixture.events).toEqual([])
    fixture.gate.resolve(); await bounded(closing)
    expect(fixture.events).toEqual(['sauvegarde-fille-terminée', 'frontière-déconnexion'])
  })

  it('libère le parsing interrompu avant admission sans empoisonner l’arrêt', async () => {
    const accepted = deferred(), closed = deferred()
    let admitted = 0
    const fixture = await laboratory(router => {
      router.use((_req, res, next) => { res.once('close', closed.resolve); accepted.resolve(); next() })
      router.use(observeHttpMiddleware(express.json(), { beforeAdmission: true }))
      router.all('/fixture/:id', (_req, res) => { admitted++; res.end('interdit') })
      router.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(400).end('corps incomplet') })
    })
    const client = request({ host: '127.0.0.1', port: fixture.port, path: '/fixture/value', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '100' } })
    client.on('error', () => {}); client.write('{')
    await bounded(accepted.promise); client.destroy(); await bounded(closed.promise)
    await bounded(fixture.stop())
    expect(admitted).toBe(0)
    expect(fixture.events).toEqual(['frontière-déconnexion'])
  })

  it('remet un rejet async au vrai gestionnaire d’erreur et attend son finally', async () => {
    const fixture = await laboratory((router, gate, events) => {
      router.get('/fixture/:id', async () => { await tick(); throw Error('rollback simulé') })
      router.use(async (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(409).end(error.message); await gate.promise; events.push('nettoyage-terminé')
      })
    })
    expect(await bounded(fixture.call())).toEqual({ status: 409, body: 'rollback simulé' })
    const closing = fixture.stop(); await tick(); expect(fixture.events).toEqual([])
    fixture.gate.resolve(); await bounded(closing)
    expect(fixture.events).toEqual(['nettoyage-terminé', 'frontière-déconnexion'])
  })

  it('ne déclare pas couvert un callback de route abandonné avant son next tardif', async () => {
    const accepted = deferred(), closed = deferred()
    let terminal = 0
    const fixture = await laboratory((router, gate, events) => {
      router.get('/fixture/:id', (req, res, next) => {
        res.once('close', closed.resolve); accepted.resolve()
        void gate.promise.then(() => { events.push('callback-opaque-terminé'); next() })
      }, (_req, res) => { terminal++; res.end('interdit après gel') })
    }, true)
    const client = request({ host: '127.0.0.1', port: fixture.port, path: '/fixture/value' })
    client.on('error', () => {}); client.end()
    await bounded(accepted.promise); client.destroy(); await bounded(closed.promise)
    await expect(bounded(fixture.stop())).rejects.toThrow(/non confirmé/)
    expect(fixture.events).toEqual([])
    fixture.gate.resolve(); await tick(); await tick()
    expect(terminal).toBe(0)
    expect(fixture.events).toEqual(['callback-opaque-terminé'])
  })

  it('refuse clairement le callback opaque qui répond tard sans next ni promesse', async () => {
    const fixture = await laboratory((router, gate) => {
      router.use('/fixture', (_req, res) => { void gate.promise.then(() => res.end('réponse entière')) })
    }, true)
    const response = fixture.call(); fixture.gate.resolve()
    expect(await bounded(response)).toEqual({ status: 200, body: 'réponse entière' })
    await expect(bounded(fixture.stop())).rejects.toThrow(/non confirmé/)
    expect(fixture.events).toEqual([])
  })

  it.each([200, 206])('attend la vraie fermeture du flux média après sa réponse %i entière', async status => {
    const destroying = deferred()
    const fixture = await laboratory((router, gate, events) => {
      router.get('/fixture/:id', async (_req, res) => {
        const source = new Readable({
          read() { this.push('média fictif entier'); this.push(null) },
          destroy(error, callback) {
            destroying.resolve(); void gate.promise.then(() => { events.push('flux-source-fermé'); callback(error) })
          },
        })
        res.status(status)
        await sendHttpStream(source, res)
      })
    })
    expect(await bounded(fixture.call())).toEqual({ status, body: 'média fictif entier' })
    await bounded(destroying.promise)
    const closing = fixture.stop(); await tick(); await tick()
    expect(fixture.events).toEqual([])
    fixture.gate.resolve(); await bounded(closing)
    expect(fixture.events).toEqual(['flux-source-fermé', 'frontière-déconnexion'])
  })

  it('attend la fermeture de la source après abandon média sans garder un blocage permanent', async () => {
    const responseClosed = deferred(), destroying = deferred()
    const fixture = await laboratory((router, gate, events) => {
      router.get('/fixture/:id', async (_req, res) => {
        res.once('close', responseClosed.resolve)
        let sent = false
        const source = new Readable({
          read() { if (!sent) { sent = true; this.push('premier fragment fictif') } },
          destroy(error, callback) {
            destroying.resolve(); void gate.promise.then(() => { events.push('source-abandonnée-fermée'); callback(error) })
          },
        })
        await sendHttpStream(source, res)
        events.push('callback-flux-terminé')
      })
    })
    const client = request({ host: '127.0.0.1', port: fixture.port, path: '/fixture/value' }, response => {
      response.on('error', () => {}); response.once('data', () => response.destroy())
    })
    client.on('error', () => {}); client.end()
    await bounded(responseClosed.promise); await bounded(destroying.promise)
    const closing = fixture.stop(); await tick(); expect(fixture.events).toEqual([])
    fixture.gate.resolve(); await bounded(closing)
    expect(fixture.events).toEqual(['source-abandonnée-fermée', 'callback-flux-terminé', 'frontière-déconnexion'])
  })

})
