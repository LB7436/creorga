import { afterEach, describe, expect, it } from 'vitest'
import { once } from 'node:events'
import { Agent, createServer, request, type IncomingMessage, type RequestOptions, type ServerResponse } from 'node:http'
import { connect, type Socket } from 'node:net'
import { Server as SocketServer } from 'socket.io'
import WebSocket from 'ws'
import { createBackendShutdown } from './backend-lifecycle'
import { createHttpDrain } from './http-drain'
import { createHttpWorkRegistry, observeHttpHandler } from './http-work'

const tick = () => new Promise<void>(resolve => setImmediate(resolve))
function deferred<T = void>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
async function bounded<T>(operation: Promise<T>, message: string): Promise<T> {
  let timer!: NodeJS.Timeout
  try {
    return await Promise.race([operation, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(message)), 1200)
    })])
  } finally { clearTimeout(timer) }
}

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup() })

async function laboratory(handler: (req: IncomingMessage, res: ServerResponse) => unknown, shutdownFailureExpected = false, observeCallback = true) {
  // Ports éphémères propres au test : aucun accès au runtime, à Chrome ou à PG.
  const clients: Socket[] = [], peers = new Set<Socket>(), agents: Agent[] = []
  const releases: Array<() => void> = [], operations: Promise<unknown>[] = []
  const events: string[] = []
  const work = createHttpWorkRegistry()
  const callback = observeCallback ? observeHttpHandler(handler) : handler
  const server = createServer((req, res) => {
    if (lifecycle.stopping) { res.writeHead(503, { Connection: 'close' }); res.end('BACKEND_STOPPING'); return }
    const operation = callback(req, res)
    // Nettoyage de fixture uniquement : le cycle de vie ne connaît pas encore
    // cette promesse applicative, contrairement à sa réponse HTTP.
    if (operation && typeof (operation as Promise<unknown>).then === 'function') {
      const pending = Promise.resolve(operation); void pending.catch(() => {}); operations.push(pending)
    }
  })
  server.on('connection', socket => { peers.add(socket); socket.once('close', () => peers.delete(socket)) })
  const io = new SocketServer(server)
  const httpDrain = createHttpDrain(server, req => req.url?.startsWith('/socket.io/') === true, work)
  const lifecycle = createBackendShutdown({
    assertAllowed: () => {}, stopScheduling: () => {},
    closeHttp: () => httpDrain.close(() => new Promise<void>((resolve, reject) => {
      void io.close(error => error ? reject(error) : resolve()).catch(reject)
    }), () => { io.engine.close() }),
    drain: async () => { events.push('travaux-drainés') },
    flushAudit: async () => { events.push('audit-confirmé') },
    disconnect: async () => { events.push('base-déconnectée') },
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as { port: number }).port
  cleanups.push(async () => {
    releases.forEach(release => release())
    await Promise.allSettled(operations)
    agents.forEach(agent => agent.destroy())
    clients.forEach(socket => socket.destroy())
    // Seulement les sockets des serveurs éphémères appartenant à cette fixture.
    peers.forEach(socket => socket.destroy())
    try { await lifecycle.shutdown() } catch (error) { if (!shutdownFailureExpected) throw error }
    if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  })
  return { server, io, lifecycle, port, clients, peers, agents, releases, operations, events }
}
type Laboratory = Awaited<ReturnType<typeof laboratory>>

async function preconnect(fixture: Laboratory) {
  const accepted = once(fixture.server, 'connection')
  const client = connect({ host: '127.0.0.1', port: fixture.port })
  fixture.clients.push(client); client.on('error', () => {}); client.resume()
  const [, [peer]] = await Promise.all([once(client, 'connect'), accepted])
  return { client, peer: peer as Socket }
}

function call(fixture: Laboratory, options: RequestOptions & { body?: string } = {}) {
  const operation = new Promise<{ status: number | undefined, body: string }>((resolve, reject) => {
    const outgoing = request({ host: '127.0.0.1', port: fixture.port, path: '/fictif', ...options }, incoming => {
      let body = ''; incoming.setEncoding('utf8'); incoming.on('data', chunk => { body += chunk })
      incoming.on('end', () => resolve({ status: incoming.statusCode, body })); incoming.on('error', reject)
    })
    outgoing.on('error', reject); outgoing.end(options.body)
  })
  void operation.catch(() => {}); fixture.operations.push(operation)
  return operation
}

describe('drain HTTP backend attribuable au serveur', () => {
  it('confirme la fermeture malgré une préconnexion TCP sans requête admise', async () => {
    let admitted = 0
    const fixture = await laboratory((_req, res) => { admitted++; res.end('ne doit pas être appelé') })
    const { client } = await preconnect(fixture), closed = once(client, 'close')
    await bounded(fixture.lifecycle.shutdown(), 'Une préconnexion TCP sans requête bloque io.close')
    await bounded(closed, 'La préconnexion éphémère reste ouverte')
    expect(admitted).toBe(0)
    expect(fixture.events).toEqual(['travaux-drainés', 'audit-confirmé', 'base-déconnectée'])
  })

  it('ne laisse pas des en-têtes incomplets retenir audit et déconnexion', async () => {
    let admitted = 0
    const fixture = await laboratory((_req, res) => { admitted++; res.end('ne doit pas être appelé') })
    const { client, peer } = await preconnect(fixture)
    const arrived = once(peer, 'data')
    client.write('POST /fictif HTTP/1.1\r\nHost: 127.0.0.1\r\nX-Incomplet: ')
    await arrived
    await bounded(fixture.lifecycle.shutdown(), 'Des en-têtes incomplets bloquent io.close sans requête admise')
    expect(admitted).toBe(0)
    expect(fixture.events).toContain('base-déconnectée')
  })

  it('préserve tout le POST admis, son commit et sa réponse avant la déconnexion', async () => {
    const accepted = deferred(), release = deferred()
    const fixture = await laboratory(async (req, res) => {
      accepted.resolve(); await release.promise
      let body = ''; for await (const chunk of req) body += chunk
      fixture.events.push('commit-fictif'); res.end('enregistré:' + body)
    })
    fixture.releases.push(() => release.resolve())
    const response = call(fixture, { method: 'POST', body: 'paiement-fictif', headers: { Connection: 'close' } })
    await accepted.promise
    const closing = fixture.lifecycle.shutdown()
    expect(fixture.lifecycle.shutdown()).toBe(closing)
    await tick(); expect(fixture.events).toEqual([])
    release.resolve()
    expect(await bounded(response, 'La réponse admise a été interrompue')).toEqual({ status: 200, body: 'enregistré:paiement-fictif' })
    await bounded(closing, 'Le POST terminé retient la fermeture')
    expect(fixture.events).toEqual(['commit-fictif', 'travaux-drainés', 'audit-confirmé', 'base-déconnectée'])
  })

  it('ferme le keep-alive après une réponse entière déjà terminée', async () => {
    const fixture = await laboratory((_req, res) => res.end('export-fictif-entier'))
    const agent = new Agent({ keepAlive: true, maxSockets: 1 }); fixture.agents.push(agent)
    const freed = once(agent, 'free'), response = await call(fixture, { agent })
    await freed
    expect(response).toEqual({ status: 200, body: 'export-fictif-entier' })
    expect(Object.values(agent.freeSockets).flat()).toHaveLength(1)
    await bounded(fixture.lifecycle.shutdown(), 'Le keep-alive terminé bloque la fermeture')
  })

  it('refuse la seconde requête pipelinée sans couper la première réponse', async () => {
    const accepted = deferred(), release = deferred(), paths: string[] = []
    const fixture = await laboratory(async (req, res) => {
      paths.push(req.url!); accepted.resolve(); await release.promise; res.end('première-conservée')
    })
    fixture.releases.push(() => release.resolve())
    const { client } = await preconnect(fixture), closed = once(client, 'close')
    let wire = ''; client.on('data', chunk => { wire += chunk.toString('utf8') })
    client.write('GET /premiere HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n')
    await accepted.promise
    const closing = fixture.lifecycle.shutdown()
    const second = new Promise<void>(resolve => fixture.server.on('request', req => { if (req.url === '/interdite') resolve() }))
    client.write('GET /interdite HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n')
    await bounded(second, 'La requête pipelinée de fixture n’a pas été analysée')
    expect(fixture.events).toEqual([])
    release.resolve(); await bounded(closing, 'La première réponse ne termine pas le drainage')
    await bounded(closed, 'La connexion pipelinée reste ouverte')
    expect(paths).toEqual(['/premiere'])
    expect(wire).toContain('première-conservée')
    expect(wire).toContain('HTTP/1.1 503')
  })

  it('préserve le corps envoyé après 100 Continue pour une requête déjà admise', async () => {
    const accepted = deferred(), release = deferred()
    const fixture = await laboratory(async (req, res) => {
      accepted.resolve()
      let body = ''; for await (const chunk of req) body += chunk
      await release.promise; res.end('corps-conservé:' + body)
    })
    fixture.releases.push(() => release.resolve())
    const continued = deferred()
    const response = new Promise<string>((resolve, reject) => {
      const outgoing = request({ host: '127.0.0.1', port: fixture.port, path: '/fictif', method: 'POST',
        headers: { Expect: '100-continue', 'Content-Length': Buffer.byteLength('suite-fictive'), Connection: 'close' } }, incoming => {
        let body = ''; incoming.setEncoding('utf8'); incoming.on('data', chunk => { body += chunk })
        incoming.on('end', () => resolve(body)); incoming.on('error', reject)
      })
      outgoing.on('error', reject); outgoing.once('continue', () => continued.resolve()); outgoing.flushHeaders()
      fixture.releases.push(() => { if (!outgoing.writableEnded) outgoing.end('suite-fictive') })
    })
    void response.catch(() => {}); fixture.operations.push(response)
    await bounded(continued.promise, 'Le serveur ne transmet pas 100 Continue'); await accepted.promise
    const closing = fixture.lifecycle.shutdown()
    await tick(); expect(fixture.events).toEqual([])
    fixture.releases.forEach(releaseRequest => releaseRequest())
    expect(await bounded(response, 'Le corps admis après 100 Continue a été coupé')).toBe('corps-conservé:suite-fictive')
    await bounded(closing, 'La requête 100 Continue terminée retient la fermeture')
  })

  it('laisse Socket.IO fermer son WebSocket sans coupure TCP anormale', async () => {
    const fixture = await laboratory((_req, res) => res.end('fictif'))
    const client = new WebSocket(`ws://127.0.0.1:${fixture.port}/socket.io/?EIO=4&transport=websocket`)
    const cleanup = () => client.close()
    fixture.releases.push(cleanup)
    client.on('error', () => {})
    await bounded(once(client, 'open'), 'Le WebSocket éphémère ne s’ouvre pas')
    const closed = once(client, 'close')
    await bounded(fixture.lifecycle.shutdown(), 'Socket.IO ne termine pas son arrêt')
    const [code] = await bounded(closed, 'Socket.IO ne ferme pas son transport WebSocket')
    expect(code).not.toBe(1006)
    expect(client.readyState).toBe(WebSocket.CLOSED)
  })

  it('refuse le POST polling concurrent sans couper le POST métier déjà admis sur ce TCP', async () => {
    const accepted = deferred(), release = deferred()
    const fixture = await laboratory(async (req, res) => {
      req.resume(); accepted.resolve(); await release.promise
      fixture.events.push('commit-partagé'); res.end('réponse-partagée-entière')
    })
    fixture.releases.push(() => release.resolve())
    const handshake = await call(fixture, { path: '/socket.io/?EIO=4&transport=polling', headers: { Connection: 'close' } })
    expect(handshake.status).toBe(200)
    expect(handshake.body[0]).toBe('0')
    const { sid } = JSON.parse(handshake.body.slice(1)) as { sid: string }
    expect(typeof sid).toBe('string')
    const pollingPath = '/socket.io/?EIO=4&transport=polling&sid=' + encodeURIComponent(sid)
    const pollingAccepted = new Promise<void>(resolve => fixture.server.on('request', req => {
      if (req.url === pollingPath) resolve()
    }))
    const { client, peer } = await preconnect(fixture), closed = once(client, 'close')
    let wire = ''; client.on('data', chunk => { wire += chunk.toString('utf8') })
    client.write('POST /metier-tenu HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n\r\n' +
      `POST ${pollingPath} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: text/plain\r\nContent-Length: 100\r\n\r\n4`)
    await bounded(Promise.all([accepted.promise, pollingAccepted]), 'Les deux POST partagés ne sont pas admis')
    const engine = fixture.io.engine as unknown as { clients: Record<string, { transport: { dataReq?: IncomingMessage } }> }
    const transport = engine.clients[sid].transport
    // La frontière d'admission empêche Engine.IO de posséder/détruire le TCP
    // d'une réponse métier active. Le corps polling reste délibérément partiel.
    expect(fixture.peers.has(peer)).toBe(true)
    expect(Boolean(transport.dataReq)).toBe(false)
    const closing = fixture.lifecycle.shutdown()
    let timer!: NodeJS.Timeout
    try {
      const premature = await Promise.race([
        closed.then(() => 'tcp-coupé'), closing.then(() => 'arrêt-avant-commit'),
        new Promise<string>(resolve => { timer = setTimeout(() => resolve('métier-toujours-protégé'), 80) }),
      ])
      expect(premature).toBe('métier-toujours-protégé')
    } finally { clearTimeout(timer) }
    expect(fixture.events).toEqual([])
    release.resolve()
    await bounded(closing, 'La réponse métier achevée ne libère pas le polling incomplet')
    await bounded(closed, 'Le TCP partagé reste ouvert après son drainage')
    expect(wire).toContain('réponse-partagée-entière')
    expect(wire).toContain('HTTP/1.1 503')
    expect(fixture.events).toEqual(['commit-partagé', 'travaux-drainés', 'audit-confirmé', 'base-déconnectée'])
  })

  it('refuse sans action métier le POST pipeliné derrière un longpoll actif sur le même TCP', async () => {
    const release = deferred(), paths: string[] = []
    const fixture = await laboratory(async (req, res) => {
      paths.push(req.url!); req.resume(); await release.promise
      fixture.events.push('commit-après-poll'); res.end('réponse-après-poll-entière')
    })
    fixture.releases.push(() => release.resolve())
    const handshake = await call(fixture, { path: '/socket.io/?EIO=4&transport=polling', headers: { Connection: 'close' } })
    const { sid } = JSON.parse(handshake.body.slice(1)) as { sid: string }
    const pollingPath = '/socket.io/?EIO=4&transport=polling&sid=' + encodeURIComponent(sid)
    const businessParsed = new Promise<void>(resolve => fixture.server.on('request', req => {
      if (req.url === '/metier-apres-poll') resolve()
    }))
    const { client } = await preconnect(fixture), closed = once(client, 'close')
    let wire = ''; client.on('data', chunk => { wire += chunk.toString('utf8') })
    client.write(`GET ${pollingPath} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n` +
      'POST /metier-apres-poll HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n\r\n')
    await bounded(businessParsed, 'Le POST après longpoll n’est pas analysé')
    expect(paths).toEqual([])
    const closing = fixture.lifecycle.shutdown()
    await bounded(closing, 'Le longpoll bloque son refus503 en file')
    await bounded(closed, 'Le TCP longpoll/métier ne se ferme pas')
    expect(wire).toContain('HTTP/1.1 503')
    expect(wire).not.toContain('réponse-après-poll-entière')
    expect(fixture.events).toEqual(['travaux-drainés', 'audit-confirmé', 'base-déconnectée'])
  })

  it('conserve le keep-alive successif transport puis métier sur le même TCP', async () => {
    const fixture = await laboratory((_req, res) => res.end('métier-successif-conservé'))
    const agent = new Agent({ keepAlive: true, maxSockets: 1 }); fixture.agents.push(agent)
    const accepted = once(fixture.server, 'connection')
    const handshake = await call(fixture, { path: '/socket.io/?EIO=4&transport=polling', agent })
    expect(handshake.status).toBe(200)
    const [peer] = await accepted
    const business = new Promise<IncomingMessage>(resolve => fixture.server.on('request', req => {
      if (req.url === '/metier-successif') resolve(req)
    }))
    expect(await call(fixture, { path: '/metier-successif', method: 'POST', body: 'fictif', agent })).toEqual({ status: 200, body: 'métier-successif-conservé' })
    expect((await business).socket).toBe(peer)
    await bounded(fixture.lifecycle.shutdown(), 'Le keep-alive successif ne termine pas son drainage')
  })

  it('conserve deux requêtes métier pipelinées admises avant l’arrêt', async () => {
    const accepted = deferred(), release = deferred(), paths: string[] = []
    const fixture = await laboratory(async (req, res) => {
      paths.push(req.url!); req.resume()
      if (paths.length === 2) accepted.resolve()
      await release.promise; res.end('conservée:' + req.url)
    })
    fixture.releases.push(() => release.resolve())
    const { client } = await preconnect(fixture), closed = once(client, 'close')
    let wire = ''; client.on('data', chunk => { wire += chunk.toString('utf8') })
    client.write('POST /metier-un HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n\r\n' +
      'POST /metier-deux HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n\r\n')
    await bounded(accepted.promise, 'Les deux requêtes métier ne sont pas admises')
    const closing = fixture.lifecycle.shutdown()
    await tick(); expect(fixture.events).toEqual([])
    release.resolve(); await bounded(closing, 'Le pipeline métier ne termine pas son drainage')
    await bounded(closed, 'Le TCP métier ne se ferme pas')
    expect(paths).toEqual(['/metier-un', '/metier-deux'])
    expect(wire).toContain('conservée:/metier-un'); expect(wire).toContain('conservée:/metier-deux')
    expect(wire).not.toContain('503')
  })

  it('attend le callback et son finally après une réponse HTTP déjà terminée', async () => {
    const responseSent = deferred(), release = deferred()
    const fixture = await laboratory(async (req, res) => {
      req.resume(); res.end('réponse-déjà-reçue'); responseSent.resolve()
      try { await release.promise; fixture.events.push('travail-après-réponse') }
      finally { fixture.events.push('finally-achevé') }
    })
    fixture.releases.push(() => release.resolve())
    expect(await call(fixture, { headers: { Connection: 'close' } })).toEqual({ status: 200, body: 'réponse-déjà-reçue' })
    await responseSent.promise
    const stopping = fixture.lifecycle.shutdown()
    await tick()
    expect(fixture.events).toEqual([])
    release.resolve(); await bounded(stopping, 'Le callback terminé ne libère pas le drainage')
    expect(fixture.events).toEqual(['travail-après-réponse', 'finally-achevé', 'travaux-drainés', 'audit-confirmé', 'base-déconnectée'])
  })

  it.each(['avant', 'pendant'] as const)('récupère après abandon %s le drainage sans finir le callback prématurément', async when => {
    const accepted = deferred<ServerResponse>(), release = deferred()
    const fixture = await laboratory(async (req, res) => {
      req.resume(); accepted.resolve(res)
      try { await release.promise; fixture.events.push('commit-après-abandon-suivi') }
      finally { fixture.events.push('finally-après-abandon') }
      // Aucun end tardif requis pour prouver la fin du callback suivi.
    }, true)
    fixture.releases.push(() => release.resolve())
    const { client } = await preconnect(fixture)
    client.write('POST /metier-suivi-abandonne HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n\r\n')
    const res = await accepted.promise, closedOnServer = once(res, 'close')
    const stopping = when === 'pendant' ? fixture.lifecycle.shutdown() : undefined
    if (stopping) void stopping.catch(() => {})
    client.destroy(); await bounded(closedOnServer, 'L’abandon fictif n’atteint pas le serveur')
    const closing = stopping || fixture.lifecycle.shutdown()
    let settled = false
    void closing.then(() => { settled = true }, () => { settled = true })
    await tick()
    expect(settled).toBe(false)
    expect(fixture.events).toEqual([])
    release.resolve(); await bounded(closing, 'La fin du callback suivi doit permettre l’arrêt après abandon')
    expect(fixture.events).toEqual(['commit-après-abandon-suivi', 'finally-après-abandon', 'travaux-drainés', 'audit-confirmé', 'base-déconnectée'])
  })

  it('refuse de confirmer l’arrêt si une réponse métier est abandonnée avant sa fin', async () => {
    const accepted = deferred(), release = deferred(), finished = deferred()
    const fixture = await laboratory(async (req, res) => {
      req.resume(); accepted.resolve(); await release.promise
      fixture.events.push('commit-après-abandon'); res.end('réponse-abandonnée'); finished.resolve()
    }, true, false)
    fixture.releases.push(() => release.resolve()); fixture.operations.push(finished.promise)
    const { client } = await preconnect(fixture)
    client.write('POST /metier-abandonne HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n\r\n')
    await accepted.promise
    const closing = fixture.lifecycle.shutdown()
    client.destroy() // Seulement le client éphémère appartenant à cette fixture.
    await expect(bounded(closing, 'L’abandon métier doit rendre l’arrêt non confirmé')).rejects.toThrow(/interrompue/)
    expect(fixture.events).toEqual([])
    release.resolve(); await finished.promise
    expect(fixture.events).toEqual(['commit-après-abandon'])
  })

  it('reste non confirmé si l’abandon métier précède le début du drainage', async () => {
    const accepted = deferred<ServerResponse>(), release = deferred(), finished = deferred()
    const fixture = await laboratory(async (req, res) => {
      req.resume(); accepted.resolve(res); await release.promise
      fixture.events.push('commit-après-abandon-antérieur'); res.end('réponse-abandonnée'); finished.resolve()
    }, true, false)
    fixture.releases.push(() => release.resolve()); fixture.operations.push(finished.promise)
    const { client } = await preconnect(fixture)
    client.write('POST /metier-abandonne-avant-arret HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n\r\n')
    const res = await accepted.promise, closedOnServer = once(res, 'close')
    client.destroy()
    await bounded(closedOnServer, 'L’abandon fictif n’a pas atteint le serveur')
    expect(res.writableFinished).toBe(false)
    await expect(fixture.lifecycle.shutdown()).rejects.toThrow(/interrompue/)
    expect(fixture.events).toEqual([])
    release.resolve(); await finished.promise
    expect(fixture.events).toEqual(['commit-après-abandon-antérieur'])
    // Un res.end() tardif ne suffit pas à prouver la fin du callback complet.
    await expect(fixture.lifecycle.shutdown()).rejects.toThrow(/interrompue/)
  })

  it('ne laisse pas un upgrade pipeliné couper la réponse métier déjà admise', async () => {
    const accepted = deferred(), release = deferred()
    const fixture = await laboratory(async (req, res) => {
      req.resume(); accepted.resolve(); await release.promise
      fixture.events.push('commit-avant-upgrade'); res.end('réponse-avant-upgrade-entière')
    })
    fixture.releases.push(() => release.resolve())
    const { client } = await preconnect(fixture), closed = once(client, 'close'), upgrade = once(fixture.server, 'upgrade')
    let wire = ''; client.on('data', chunk => { wire += chunk.toString('utf8') })
    client.write('POST /metier-avant-upgrade HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n\r\n' +
      'GET /socket.io/?EIO=4&transport=websocket HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n')
    await bounded(Promise.all([accepted.promise, upgrade]), 'L’upgrade pipeliné n’est pas analysé')
    const closing = fixture.lifecycle.shutdown()
    await tick(); expect(fixture.events).toEqual([])
    release.resolve()
    await bounded(closing, 'L’upgrade refusé retient la fermeture du métier achevé')
    await bounded(closed, 'La connexion avec upgrade refusé reste ouverte')
    expect(wire).toContain('réponse-avant-upgrade-entière')
    expect(wire).toContain('HTTP/1.1 503')
    expect(wire).not.toContain('101 Switching Protocols')
    expect(fixture.events).toEqual(['commit-avant-upgrade', 'travaux-drainés', 'audit-confirmé', 'base-déconnectée'])
  })

  it('ne ferme pas les connexions d’un autre serveur', async () => {
    const first = await laboratory((_req, res) => res.end('premier'))
    const unrelated = await laboratory((_req, res) => res.end('second-conservé'))
    const { client } = await preconnect(unrelated)
    await bounded(first.lifecycle.shutdown(), 'Le premier serveur ne se ferme pas')
    expect(unrelated.server.listening).toBe(true)
    expect(client.destroyed).toBe(false)
    expect(await call(unrelated, { headers: { Connection: 'close' } })).toEqual({ status: 200, body: 'second-conservé' })
  })
})
