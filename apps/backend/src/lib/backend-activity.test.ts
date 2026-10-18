import { describe, expect, it } from 'vitest'
import { createServer, request } from 'node:http'
import type { Socket } from 'node:net'
import { createHttpWorkRegistry, observeHttpHandler } from './http-work'
import { createHttpDrain } from './http-drain'
import { TrackedTasks } from './backend-lifecycle'

function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
const tick = () => new Promise<void>(resolve => setImmediate(resolve))
async function bounded<T>(operation: Promise<T>) {
  let timer: NodeJS.Timeout | undefined
  try { return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('Fixture HTTP de diagnostic bloquée')), 2000) })]) }
  finally { clearTimeout(timer) }
}

describe('diagnostics d’activité sans données de requête', () => {
  it('distingue une réponse finie du callback et du travail de fond encore actifs', async () => {
    const work = createHttpWorkRegistry(), tasks = new TrackedTasks(), gate = deferred(), peers = new Set<Socket>()
    const server = createServer(observeHttpHandler(async (_req, res) => { res.end('fictif'); await gate.promise }))
    const drain = createHttpDrain(server, () => false, work)
    server.on('connection', socket => { peers.add(socket); socket.once('close', () => peers.delete(socket)) })
    const background = tasks.run(async () => { await gate.promise })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as { port: number }).port
    try {
      await bounded(new Promise<void>((resolve, reject) => {
        const client = request({ host: '127.0.0.1', port, path: '/fixture?token=NE_PAS_JOURNALISER', agent: false,
          headers: { Authorization: 'FAUX_IDENTIFIANT_PRIVE' } }, response => { response.resume(); response.once('end', resolve); response.once('error', reject) })
        client.once('error', reject); client.end()
      }))
      expect(typeof work.snapshot).toBe('function')
      expect(work.snapshot()).toEqual({ frozen: false, activeOperations: 1, opaqueRequests: 0 })
      expect(tasks.snapshot()).toEqual({ frozen: false, activeOperations: 1 })
      expect(drain.snapshot()).toMatchObject({ draining: false, pendingResponses: 0, businessRequests: 0, transportRequests: 0, upgradedSockets: 0 })
      const closing = drain.close(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())), () => {})
      const draining = tasks.drain()
      await tick()
      const diagnostics = { work: work.snapshot(), http: drain.snapshot(), background: tasks.snapshot() }
      expect(diagnostics.work).toEqual({ frozen: true, activeOperations: 1, opaqueRequests: 0 })
      expect(diagnostics.background).toEqual({ frozen: true, activeOperations: 1 })
      expect(JSON.stringify(diagnostics)).not.toMatch(/fixture|token|NE_PAS|IDENTIFIANT|Authorization/)
      expect(Object.isFrozen(diagnostics.work)).toBe(true)
      gate.resolve(); await bounded(Promise.all([closing, draining, background]))
      expect(work.snapshot()).toEqual({ frozen: true, activeOperations: 0, opaqueRequests: 0 })
      expect(tasks.snapshot()).toEqual({ frozen: true, activeOperations: 0 })
      expect(drain.snapshot()).toMatchObject({ draining: true, pendingResponses: 0, businessRequests: 0, transportRequests: 0 })
    } finally {
      gate.resolve(); await background
      // Seulement les sockets éphémères propres au test, jamais un runtime PC.
      peers.forEach(socket => socket.destroy())
      if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })
})
