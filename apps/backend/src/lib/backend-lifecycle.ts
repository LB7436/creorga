export class TrackedTasks {
  private accepting = true
  private readonly pending = new Set<Promise<unknown>>()
  private frozen: Promise<unknown>[] | null = null
  private draining: Promise<void> | null = null

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
export function createBackendShutdown(dependencies: { assertAllowed(): void; stopScheduling(): void; closeHttp(): Promise<void>; drain(): Promise<void>; flushAudit(): Promise<void>; disconnect(): Promise<void> }) {
  let stopping = false, operation: Promise<void> | null = null
  return {
    get stopping() { return stopping },
    shutdown(): Promise<void> {
      if (operation) return operation
      // Vérifier avant toute action : on ne ferme pas partiellement un profil
      // dont les workers ne sont pas suivis et drainables.
      try { dependencies.assertAllowed() } catch (error) { return Promise.reject(error) }
      stopping = true
      operation = (async () => {
        dependencies.stopScheduling()
        await dependencies.closeHttp()
        await dependencies.drain()
        await dependencies.flushAudit()
        await dependencies.disconnect()
      })()
      return operation
    },
  }
}
