export type ShutdownStage = 'profile' | 'scheduling' | 'http' | 'http-io' | 'http-transports' | 'workers' | 'mail' | 'recovery' | 'backup' | 'audit' | 'audit-log' | 'event-sink' | 'disconnect'
export type ShutdownReason = 'UNSPECIFIED_FAILURE' | 'FILESYSTEM_FAILURE' | 'HTTP_SERVER_NOT_RUNNING' | 'DATABASE_UNAVAILABLE' | 'TRANSACTION_NOT_CONFIRMED' | 'HTTP_WORK_UNTRACKED' | 'HTTP_RESPONSE_INTERRUPTED' | 'BACKGROUND_TASK_FAILED' | 'BACKUP_UNCONFIRMED' | 'EVENT_SINK_UNCONFIRMED'
export interface ShutdownDiagnostic { readonly stage: ShutdownStage; readonly reason: ShutdownReason }

function shutdownReason(error: unknown): ShutdownReason {
  // Ne jamais exporter message, stack, SQL, chemin, identifiant ou secret.
  // Les messages fixes ci-dessous identifient uniquement nos propres gardes
  // historiques ; tout autre texte reste une erreur non classée.
  try {
    const value = error as { code?: unknown; message?: unknown } | null
    const code = value?.code, message = value?.message
    if (typeof code === 'string' && ['EACCES', 'EPERM', 'ENOSPC', 'EMFILE', 'EROFS', 'EIO'].includes(code)) return 'FILESYSTEM_FAILURE'
    if (code === 'ERR_SERVER_NOT_RUNNING') return 'HTTP_SERVER_NOT_RUNNING'
    if (typeof code === 'string' && ['P1001', 'P1002', 'P1017', 'ECONNREFUSED'].includes(code)) return 'DATABASE_UNAVAILABLE'
    if (code === 'P2028') return 'TRANSACTION_NOT_CONFIRMED'
    const guards: Record<string, ShutdownReason> = {
      'Arrêt non confirmé : callback sans promesse ni continuation prouvée ; travaux et base conservés.': 'HTTP_WORK_UNTRACKED',
      'Arrêt non confirmé : réponse métier interrompue ; fin du callback non prouvée, travaux et base conservés.': 'HTTP_RESPONSE_INTERRUPTED',
      'Arrêt non confirmé : une tâche en cours a échoué.': 'BACKGROUND_TASK_FAILED',
      'Arrêt non confirmé : sauvegarde en cours échouée, partiel conservé.': 'BACKUP_UNCONFIRMED',
      'Arrêt non confirmé : journal d’événements non enregistré.': 'EVENT_SINK_UNCONFIRMED',
    }
    return typeof message === 'string' && Object.prototype.hasOwnProperty.call(guards, message) ? guards[message] : 'UNSPECIFIED_FAILURE'
  } catch { return 'UNSPECIFIED_FAILURE' }
}

/** Diagnostic privé borné : observer un échec, jamais le masquer ou le rejouer. */
export function createShutdownDiagnostics(onFailure?: (diagnostic: ShutdownDiagnostic) => void) {
  let failure: ShutdownDiagnostic | null = null
  const record = (stage: ShutdownStage, error: unknown) => {
    if (failure) return
    failure = Object.freeze({ stage, reason: shutdownReason(error) })
    // Le diagnostic est secondaire : une défaillance de son journal ne doit
    // jamais remplacer le vrai rejet, conservé et refusé à l'appelant.
    try { onFailure?.(failure) } catch { /* Rejet original inchangé. */ }
  }
  return {
    get failure() { return failure },
    record,
    async run<T>(stage: ShutdownStage, task: () => T | PromiseLike<T>): Promise<T> {
      try { return await task() } catch (error) { record(stage, error); throw error }
    },
  }
}

export class TrackedTasks {
  private accepting = true
  private readonly pending = new Set<Promise<unknown>>()
  private frozen: Promise<unknown>[] | null = null
  private draining: Promise<void> | null = null

  /** Compteurs de diagnostic en lecture seule ; ne gèle ni ne vide la file. */
  snapshot() { return Object.freeze({ frozen: !this.accepting, activeOperations: this.pending.size }) }

  run<T>(task: () => Promise<T>): Promise<T | undefined> {
    // Une tâche durable déjà mise en file peut rester QUEUED pour le prochain
    // démarrage. Ne pas commencer une nouvelle opération pendant l'arrêt.
    if (!this.accepting) return Promise.resolve(undefined)
    const operation = Promise.resolve().then(task)
    this.pending.add(operation)
    void operation.then(() => { this.pending.delete(operation) }, () => { this.pending.delete(operation) })
    return operation
  }

  freeze(): void {
    if (!this.accepting) return
    this.accepting = false
    this.frozen = [...this.pending]
  }

  drain(): Promise<void> {
    if (this.draining) return this.draining
    this.freeze()
    this.draining = Promise.allSettled(this.frozen!).then(results => {
      if (results.some(result => result.status === 'rejected')) throw new Error('Arrêt non confirmé : une tâche en cours a échoué.')
    })
    return this.draining
  }
}
export function createBackendShutdown(dependencies: { assertAllowed(): void; stopScheduling(): void; closeHttp(): Promise<void>; drain(): Promise<void>; flushAudit(): Promise<void>; disconnect(): Promise<void>; diagnostics?: ReturnType<typeof createShutdownDiagnostics> }) {
  let stopping = false, operation: Promise<void> | null = null
  const diagnostics = dependencies.diagnostics || createShutdownDiagnostics()
  return {
    get stopping() { return stopping },
    get diagnostic() { return diagnostics.failure },
    shutdown(): Promise<void> {
      if (operation) return operation
      // Vérifier avant toute action : on ne ferme pas partiellement un profil
      // dont les workers ne sont pas suivis et drainables.
      try { dependencies.assertAllowed() } catch (error) { diagnostics.record('profile', error); return Promise.reject(error) }
      stopping = true
      operation = (async () => {
        await diagnostics.run('scheduling', () => dependencies.stopScheduling())
        await diagnostics.run('http', () => dependencies.closeHttp())
        await diagnostics.run('workers', () => dependencies.drain())
        await diagnostics.run('audit', () => dependencies.flushAudit())
        await diagnostics.run('disconnect', () => dependencies.disconnect())
      })()
      return operation
    },
  }
}
