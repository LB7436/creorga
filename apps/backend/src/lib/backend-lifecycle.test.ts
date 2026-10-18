import { describe, expect, it } from 'vitest'
import { createServer, request } from 'node:http'
import { Server as SocketServer } from 'socket.io'
import { createBackendShutdown, createShutdownDiagnostics, TrackedTasks } from './backend-lifecycle'

const tick = () => new Promise<void>(resolve => setImmediate(resolve))
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }

describe('arrêt backend contrôlé', () => {
  it('attend réponse/commit HTTP et tâche commencée avant audit puis déconnexion', async () => {
    const commit = deferred(), accepted = deferred(), background = deferred(), events: string[] = []
    const tasks = new TrackedTasks()
    const server = createServer(async (_req, res) => { accepted.resolve(); await commit.promise; events.push('commit'); res.end('enregistré') })
    const io = new SocketServer(server)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as { port: number }
    const response = new Promise<string>((resolve, reject) => {
      const outgoing = request({ hostname: '127.0.0.1', port: address.port, method: 'POST', headers: { Connection: 'close' } }, res => { let body = ''; res.setEncoding('utf8'); res.on('data', chunk => { body += chunk }); res.on('end', () => resolve(body)) })
      outgoing.on('error', reject); outgoing.end('fictif')
    })
    await accepted.promise
    const pending = tasks.run(async () => { await background.promise; events.push('job-terminé') })
    const lifecycle = createBackendShutdown({
      assertAllowed: () => {}, stopScheduling: () => { tasks.freeze(); events.push('planification-gelée') },
      closeHttp: () => new Promise<void>((resolve, reject) => { void io.close(error => error ? reject(error) : resolve()) }),
      drain: () => tasks.drain(), flushAudit: async () => { events.push('audit-confirmé') }, disconnect: async () => { events.push('prisma-déconnecté') },
    })
    const stopping = lifecycle.shutdown()
    expect(lifecycle.shutdown()).toBe(stopping)
    await tick()
    expect(events).toEqual(['planification-gelée'])
    await tasks.run(async () => { events.push('job-interdit') })
    commit.resolve()
    expect(await response).toBe('enregistré')
    await tick()
    expect(events).not.toContain('prisma-déconnecté')
    background.resolve(); await pending; await stopping
    expect(events).toEqual(['planification-gelée', 'commit', 'job-terminé', 'audit-confirmé', 'prisma-déconnecté'])
  })
  it('refuse une configuration non drainable avant toute fermeture', async () => {
    const events: string[] = []
    const lifecycle = createBackendShutdown({ assertAllowed: () => { throw new Error('Profil non qualifié') }, stopScheduling: () => { events.push('stop') },
      closeHttp: async () => { events.push('http') }, drain: async () => {}, flushAudit: async () => {}, disconnect: async () => { events.push('disconnect') } })
    await expect(lifecycle.shutdown()).rejects.toThrow(/non qualifié/)
    expect(events).toEqual([])
    expect(lifecycle.stopping).toBe(false)
  })
  it('un échec de flush ne déconnecte pas la base et reste un arrêt refusé', async () => {
    const events: string[] = []
    const lifecycle = createBackendShutdown({ assertAllowed: () => {}, stopScheduling: () => {}, closeHttp: async () => {}, drain: async () => {},
      flushAudit: async () => { throw new Error('Audit non confirmé') }, disconnect: async () => { events.push('disconnect') } })
    const result = lifecycle.shutdown()
    await expect(result).rejects.toThrow(/Audit non confirmé/)
    expect(lifecycle.shutdown()).toBe(result)
    expect(events).toEqual([])
  })

  it.each([
    ['assertAllowed', 'profile'], ['stopScheduling', 'scheduling'], ['closeHttp', 'http'],
    ['drain', 'workers'], ['flushAudit', 'audit'], ['disconnect', 'disconnect'],
  ] as const)('conserve le rejet de %s et publie seulement son étape %s', async (dependency, stage) => {
    const failure = Object.assign(Error('CONTENU_PRIVE_QUERY_ET_TOKEN_NON_EXPORTABLE'), { query: 'SELECT SECRET_FICTIF', token: 'SECRET_FICTIF' })
    const dependencies = {
      assertAllowed: () => {}, stopScheduling: () => {}, closeHttp: async () => {}, drain: async () => {}, flushAudit: async () => {}, disconnect: async () => {},
    }
    dependencies[dependency] = (() => { throw failure }) as never
    const lifecycle = createBackendShutdown(dependencies), result = lifecycle.shutdown()
    await expect(result).rejects.toBe(failure)
    expect(lifecycle.diagnostic).toEqual({ stage, reason: 'UNSPECIFIED_FAILURE' })
    if (dependency !== 'assertAllowed') expect(lifecycle.shutdown()).toBe(result)
    expect(JSON.stringify(lifecycle.diagnostic)).not.toContain('SECRET')
  })

  it('réduit un code technique connu en raison bornée sans sérialiser son erreur', async () => {
    const failure = Object.assign(Error('URL_ET_REQUETE_PRIVEES'), { code: 'ENOSPC', stack: 'CONTENU_PRIVE' })
    const lifecycle = createBackendShutdown({ assertAllowed: () => {}, stopScheduling: () => {}, closeHttp: async () => {}, drain: async () => {},
      flushAudit: async () => { throw failure }, disconnect: async () => {} })
    await expect(lifecycle.shutdown()).rejects.toBe(failure)
    expect(lifecycle.diagnostic).toEqual({ stage: 'audit', reason: 'FILESYSTEM_FAILURE' })
  })

  it('conserve la sous-étape initiale et le même rejet après la remontée du refus', async () => {
    const diagnostics = createShutdownDiagnostics()
    const failure = Error('Arrêt non confirmé : journal d’événements non enregistré.')
    const lifecycle = createBackendShutdown({ diagnostics, assertAllowed: () => {}, stopScheduling: () => {}, closeHttp: async () => {}, drain: async () => {},
      flushAudit: () => diagnostics.run('event-sink', async () => { throw failure }), disconnect: async () => {} })
    await expect(lifecycle.shutdown()).rejects.toBe(failure)
    expect(lifecycle.diagnostic).toEqual({ stage: 'event-sink', reason: 'EVENT_SINK_UNCONFIRMED' })
    diagnostics.record('disconnect', Error('SECOND_SECRET'))
    expect(lifecycle.diagnostic).toEqual({ stage: 'event-sink', reason: 'EVENT_SINK_UNCONFIRMED' })
    expect(Object.isFrozen(lifecycle.diagnostic)).toBe(true)
  })

  it('notifie une seule fois le journal borné sans masquer le rejet si le journal échoue', async () => {
    const reports: unknown[] = []
    const diagnostics = createShutdownDiagnostics(diagnostic => { reports.push(diagnostic); throw Error('JOURNAL_FICTIF_INDISPONIBLE') })
    const failure = Object.assign(Error('SECRET_FICTIF'), { code: 'EPERM' })
    await expect(diagnostics.run('audit-log', async () => { throw failure })).rejects.toBe(failure)
    diagnostics.record('audit', failure)
    expect(reports).toEqual([{ stage: 'audit-log', reason: 'FILESYSTEM_FAILURE' }])
  })
})

describe('suivi des tâches déjà admises', () => {
  it('le gel refuse de démarrer une nouvelle tâche et attend toutes les anciennes même si une échoue', async () => {
    const tasks = new TrackedTasks(), held = deferred(), events: string[] = []
    const first = tasks.run(async () => { await held.promise; events.push('ancienne-confirmée') })
    const failed = tasks.run(async () => { throw new Error('échec fictif') }); void failed.catch(() => {})
    tasks.freeze()
    await tasks.run(async () => { events.push('nouvelle-interdite') })
    let drained = false
    const draining = tasks.drain().then(() => { drained = true })
    await tick(); expect(drained).toBe(false)
    held.resolve(); await first
    await expect(draining).rejects.toThrow(/tâche|travail/)
    expect(events).toEqual(['ancienne-confirmée'])
  })
})
