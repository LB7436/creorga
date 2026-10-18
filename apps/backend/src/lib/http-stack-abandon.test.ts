import { afterEach, describe, expect, it } from 'vitest'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { createServer, request } from 'node:http'
import type { Socket } from 'node:net'
import { Server as SocketServer } from 'socket.io'
import WebSocket from 'ws'
import { once } from 'node:events'
import { createBackendShutdown } from './backend-lifecycle'
import { createHttpDrain } from './http-drain'
import { createHttpWorkRegistry, observeHttpArguments, observeHttpMiddleware } from './http-work'
import { createTrackedRouter } from './tracked-router'

const tick = () => new Promise<void>(resolve => setImmediate(resolve))
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer!: NodeJS.Timeout
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('Pile HTTP de laboratoire bloquée')), 2000) })]) }
  finally { clearTimeout(timer) }
}
const cleanups: Array<() => Promise<void>> = []
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup() })

describe('abandon après admission avec middleware HTTP réels, sans PG', () => {
  it('ne confond pas une réponse synchrone compressée avec un callback métier opaque', async () => {
    const app = express(), work = createHttpWorkRegistry(), router = createTrackedRouter()
    app.use(...observeHttpArguments([compression()], true))
    router.get('/fixture', (_req, res) => { res.json({ text: 'fictif'.repeat(1000) }) })
    app.use(router)
    const server = createServer(app), peers = new Set<Socket>()
    const drain = createHttpDrain(server, () => false, work)
    server.on('connection', socket => { peers.add(socket); socket.once('close', () => peers.delete(socket)) })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as { port: number }).port
    try {
      const result = await bounded(new Promise<{ status?: number, encoding?: string }>((resolve, reject) => {
        const client = request({ host: '127.0.0.1', port, path: '/fixture', headers: { 'Accept-Encoding': 'gzip' } }, response => {
          response.resume()
          response.once('end', () => resolve({ status: response.statusCode, encoding: response.headers['content-encoding'] }))
          response.once('error', reject)
        })
        client.once('error', reject); client.end()
      }))
      expect(result).toEqual({ status: 200, encoding: 'gzip' })
      await bounded(drain.close(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())), () => {}))
    } finally {
      // Uniquement les sockets et listener éphémères de cette fixture sans DB.
      peers.forEach(socket => socket.destroy())
      if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })

  it.each([{ when: 'avant', websocket: false }, { when: 'pendant', websocket: false }, { when: 'pendant', websocket: true }])('attend le rollback contrôlé après abandon $when arrêt, WebSocket=$websocket', async ({ when, websocket }) => {
    const app = express(), work = createHttpWorkRegistry(), router = createTrackedRouter()
    const gate = deferred(), accepted = deferred(), closed = deferred(), events: string[] = [], shutdownCalls: string[] = [], peers = new Set<Socket>()
    const useTracked = ((...args: unknown[]) => app.use(...observeHttpArguments(args, true))) as typeof app.use
    app.set('trust proxy', 1)
    useTracked((_req, res, next) => { if (lifecycle.stopping) { res.status(503).end(); return }; next() })
    useTracked(helmet()); useTracked(cors({ origin: (_origin, done) => done(null, true), credentials: true }))
    useTracked(compression()); useTracked(observeHttpMiddleware(express.json(), { beforeAdmission: true })); useTracked(cookieParser())
    useTracked('/api/pos', async (_req, _res, next) => { await tick(); next() }, router)
    router.get('/fixture', async (_req, res) => { res.json({ text: 'fictif'.repeat(1000) }) })
    router.post('/fixture', async (req, res) => {
      expect(req.body).toEqual({ requestId: 'REFERENCE_FICTIVE_PAS_UN_PAIEMENT' })
      res.once('close', closed.resolve); accepted.resolve()
      try {
        try { await gate.promise; throw Object.assign(Error('ROLLBACK_CONTROLE_SANS_SQL'), { code: 'P2028' }) }
        finally { events.push('finally-opération') }
      } catch { events.push('rollback-contrôlé'); res.status(503).json({ error: 'fictif'.repeat(1000) }) }
      finally { events.push('finally-contrôleur') }
    })
    const server = createServer(app), io = new SocketServer(server)
    const drain = createHttpDrain(server, req => req.url?.startsWith('/socket.io/') === true, work)
    server.on('connection', socket => { peers.add(socket); socket.once('close', () => peers.delete(socket)) })
    const lifecycle = createBackendShutdown({
      assertAllowed: () => {}, stopScheduling: () => { work.freeze() },
      closeHttp: () => drain.close(() => new Promise<void>((resolve, reject) => {
        shutdownCalls.push('io-close'); void io.close(error => error ? reject(error) : resolve()).catch(reject)
      }), () => { shutdownCalls.push('engine-close'); io.engine.close() }),
      drain: async () => { events.push('workers-drainés') }, flushAudit: async () => { events.push('audit-confirmé') }, disconnect: async () => { events.push('frontière-déconnexion') },
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as { port: number }).port
    let transport: WebSocket | undefined, transportClosed: Promise<any[]> | undefined
    cleanups.push(async () => {
      gate.resolve(); transport?.close(); peers.forEach(socket => socket.destroy())
      await bounded(lifecycle.shutdown())
    })
    if (websocket) {
      const connected = once(io, 'connection')
      transport = new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`)
      transport.on('error', () => {})
      transport.once('message', () => transport!.send('40'))
      await bounded(connected)
      transportClosed = once(transport, 'close')
    }
    // Première réponse compressée normale : le registre ne doit pas être
    // empoisonné par les middleware ou leur double observation au montage.
    await bounded(new Promise<void>((resolve, reject) => {
      const client = request({ host: '127.0.0.1', port, path: '/api/pos/fixture', headers: { 'Accept-Encoding': 'gzip' } }, response => {
        response.resume(); response.on('end', resolve); response.on('error', reject)
      }); client.on('error', reject); client.end()
    }))
    const body = JSON.stringify({ requestId: 'REFERENCE_FICTIVE_PAS_UN_PAIEMENT' })
    const client = request({ host: '127.0.0.1', port, path: '/api/pos/fixture', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Accept-Encoding': 'gzip', Origin: 'http://127.0.0.1' } })
    client.on('error', () => {}); client.end(body)
    await bounded(accepted.promise)
    const stopping = when === 'pendant' ? lifecycle.shutdown() : undefined
    client.destroy(); await bounded(closed.promise)
    const closing = stopping || lifecycle.shutdown()
    let settled = false; void closing.then(() => { settled = true }, () => { settled = true })
    await tick(); expect(settled).toBe(false); expect(events).toEqual([])
    expect(shutdownCalls).toEqual(['engine-close'])
    gate.resolve(); await bounded(closing)
    expect(shutdownCalls).toEqual(['engine-close', 'io-close'])
    if (transportClosed) {
      const [code] = await bounded(transportClosed)
      expect(code).not.toBe(1006)
      expect(transport!.readyState).toBe(WebSocket.CLOSED)
    }
    expect(events).toEqual(['finally-opération', 'rollback-contrôlé', 'finally-contrôleur', 'workers-drainés', 'audit-confirmé', 'frontière-déconnexion'])
  })
})
