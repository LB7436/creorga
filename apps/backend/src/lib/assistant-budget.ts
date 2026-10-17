import type { Request, Response } from 'express'

// One absolute deadline across orchestration and nested calls, not one allowance
// per model/fallback. A public header can never extend or choose this budget.
export const ASSISTANT_BUDGET_MS = 20_000
const DEADLINE_HEADER = 'x-creorga-assistant-deadline'

export class AssistantRequestError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) { super(message) }
}

export class AssistantBudget {
  readonly deadline: number
  private controller = new AbortController()
  private timer: ReturnType<typeof setTimeout>
  private abandoned = () => {
    if (!this.response.writableFinished) this.controller.abort(new AssistantRequestError('ASSISTANT_CANCELLED', 499,
      'Analyse interrompue. Cette interruption ne prouve pas l’annulation d’une action déjà effectuée ; vérifiez les données avant de réessayer.'))
  }

  constructor(req: Request, private response: Response) {
    const now = Date.now()
    const inherited = (req as any).user?.userId === 'internal-service' ? Number(req.get(DEADLINE_HEADER)) : NaN
    this.deadline = Number.isFinite(inherited) ? Math.min(now + ASSISTANT_BUDGET_MS, inherited) : now + ASSISTANT_BUDGET_MS
    this.timer = setTimeout(() => this.expire(), Math.max(0, this.deadline - now))
    response.once('close', this.abandoned)
  }

  get signal(): AbortSignal { return this.controller.signal }
  internalDeadlineHeaders() { return { [DEADLINE_HEADER]: String(this.deadline) } }
  private expire() {
    if (!this.signal.aborted) this.controller.abort(new AssistantRequestError('ASSISTANT_TIMEOUT', 504,
      'Le délai de l’assistant est dépassé. Aucun résultat supplémentaire n’est confirmé ; vérifiez les données avant toute nouvelle tentative.'))
  }
  check() {
    if (Date.now() >= this.deadline) this.expire()
    if (this.signal.aborted) throw this.signal.reason
  }
  rethrowIfFatal(error: unknown) {
    this.check()
    if (error instanceof AssistantRequestError) throw error
  }

  // Also bounds an external implementation that ignores AbortSignal. Its late
  // resolution is observed but cannot resume the orchestration or write memory.
  async wait<T>(operation: () => Promise<T>): Promise<T> {
    this.check()
    let onAbort!: () => void
    try {
      return await new Promise<T>((resolve, reject) => {
        onAbort = () => reject(this.signal.reason)
        this.signal.addEventListener('abort', onAbort, { once: true })
        Promise.resolve().then(() => { this.check(); return operation() }).then(value => {
          try { this.check(); resolve(value) } catch (error) { reject(error) }
        }, reject)
      })
    } finally { this.signal.removeEventListener('abort', onAbort) }
  }
  async fetch(input: string | URL, init: RequestInit = {}): Promise<globalThis.Response> {
    const response = await this.wait(() => fetch(input, { ...init, signal: this.signal }))
    // No caller consumes an unsuccessful model/internal body. Release it even
    // when a later, successful fallback finishes before the deadline fires.
    if (!response.ok) void response.body?.cancel().catch(() => {})
    return response
  }
  async json(response: globalThis.Response, internal = false): Promise<any> {
    this.check()
    if (internal && !response.ok) {
      void response.body?.cancel().catch(() => {})
      if ([400, 401, 403].includes(response.status)) throw new AssistantRequestError('ASSISTANT_CONTEXT_UNAVAILABLE', 503,
        'Le contexte autorisé de cette société n’est pas disponible dans l’assistant. Aucune réponse métier n’a été vérifiée. Utilisez le module concerné.')
      throw new AssistantRequestError('ASSISTANT_UPSTREAM_UNAVAILABLE', 503,
        'Un service de l’assistant est indisponible. Aucun résultat métier supplémentaire n’est confirmé.')
    }
    return this.wait(() => response.json())
  }
  async internalJson(input: string, init: RequestInit): Promise<any> {
    try {
      const headers = new Headers(init.headers)
      headers.set(DEADLINE_HEADER, String(this.deadline))
      return await this.json(await this.fetch(input, { ...init, headers }), true)
    } catch (error) {
      this.rethrowIfFatal(error)
      // The request may have reached its handler. A lost/malformed reply must
      // never select another action or replay an interpretation blindly.
      throw new AssistantRequestError('ASSISTANT_RESULT_UNKNOWN', 503,
        'Le résultat de la demande à l’assistant est inconnu. Aucun nouvel essai automatique ; vérifiez le module concerné avant de réessayer.')
    }
  }
  dispose() { clearTimeout(this.timer); this.response.removeListener('close', this.abandoned) }
}

export async function withAssistantBudget(req: Request, res: Response, work: (budget: AssistantBudget) => Promise<unknown>) {
  const budget = new AssistantBudget(req, res)
  try { await budget.wait(() => work(budget)) }
  catch (error) {
    if (!res.destroyed && !res.headersSent) {
      const failure = error instanceof AssistantRequestError ? error : new AssistantRequestError('ASSISTANT_UNAVAILABLE', 503,
        'L’assistant n’a pas pu vérifier cette demande. Aucun résultat métier supplémentaire n’est confirmé.')
      res.status(failure.status).json({ kind: 'error', code: failure.code, text: failure.message })
    }
  } finally { budget.dispose() }
}
