import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer, request, Agent } from 'node:http'
import { connect } from 'node:net'
import { startStaticHost, closeStaticHost } from '../../scripts/local/static-host.mjs'

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const tick = () => new Promise(resolve => setImmediate(resolve))
const closeServer = server => new Promise((resolve, reject) => server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve()))
const closeHost = server => closeStaticHost(server)
const bounded = (operation, label) => {
  let timer
  return Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label)), 1200) })]).finally(() => clearTimeout(timer))
}

async function laboratory(t, handler = (_req, res) => res.end('fictif')) {
  // Ces ports sont choisis par l'OS. Aucune connexion au runtime/Chrome/API/PG.
  const directory = await mkdtemp(path.join(tmpdir(), 'creorga-static-drain-fixture-'))
  await writeFile(path.join(directory, 'index.html'), '<main>Fixture temporaire de drainage</main>', { flag: 'wx' })
  const upstream = createServer(handler)
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const server = await startStaticHost({ directory, port: 0, apiPort: upstream.address().port })
  const fixture = { server, upstream, port: server.address().port, clients: [], accepted: new Map(), releases: [], operations: [], agents: [] }
  t.after(async () => {
    // Libérer d'abord les réponses fictives admises ; ne pas les interrompre.
    fixture.releases.forEach(release => release())
    await Promise.allSettled(fixture.operations)
    fixture.agents.forEach(agent => agent.destroy())
    fixture.clients.forEach(socket => socket.destroy())
    await Promise.all([closeServer(server), closeServer(upstream)])
    // Les minuscules fichiers de fixture restent dans leur dossier temporaire ;
    // aucune suppression ni rotation d'archive n'est effectuée par ces tests.
  })
  return fixture
}

async function preconnect(fixture) {
  const admitted = once(fixture.server, 'connection')
  const socket = connect({ host: '127.0.0.1', port: fixture.port })
  fixture.clients.push(socket); socket.on('error', () => {}); socket.resume()
  const [, [peer]] = await Promise.all([once(socket, 'connect'), admitted])
  fixture.accepted.set(socket, peer)
  return socket
}

function call(fixture, pathname, options = {}) {
  const result = new Promise((resolve, reject) => {
    const outgoing = request({ host: '127.0.0.1', port: fixture.port, path: pathname, ...options }, incoming => {
      let body = ''; incoming.setEncoding('utf8'); incoming.on('data', chunk => { body += chunk })
      incoming.on('end', () => resolve({ status: incoming.statusCode, body })); incoming.on('error', reject)
    })
    outgoing.on('error', reject); outgoing.end(options.body)
  })
  // Le résultat reste attendu dans le test même si sa connexion est refusée.
  void result.catch(() => {}); fixture.operations.push(result)
  return result
}

test('le drainage ferme une préconnexion TCP sans requête admise', async t => {
  let admitted = 0
  const fixture = await laboratory(t, (_req, res) => { admitted++; res.end('ne doit pas être appelé') })
  const socket = await preconnect(fixture), ended = once(socket, 'close')
  await bounded(closeHost(fixture.server), 'Une préconnexion sans requête ne doit pas bloquer le drainage')
  await bounded(ended, 'La préconnexion de test doit se fermer')
  assert.equal(admitted, 0)
})

test('une requête aux en-têtes incomplets n’est pas admise et ne retient pas la fermeture', async t => {
  let admitted = 0
  const fixture = await laboratory(t, (_req, res) => { admitted++; res.end('ne doit pas être appelé') })
  const socket = await preconnect(fixture)
  const arrived = once(fixture.accepted.get(socket), 'data')
  socket.write(`POST /api/fictif HTTP/1.1\r\nHost: 127.0.0.1:${fixture.port}\r\nX-Incomplet: `)
  await arrived
  await bounded(closeHost(fixture.server), 'Des en-têtes non admis ne doivent pas bloquer le drainage')
  assert.equal(admitted, 0)
})

test('le keep-alive d’une réponse HTTP terminée est fermé sans couper son contenu', async t => {
  const fixture = await laboratory(t), agent = new Agent({ keepAlive: true, maxSockets: 1 })
  fixture.agents.push(agent)
  const freed = once(agent, 'free')
  const response = await call(fixture, '/index.html', { agent })
  await freed
  assert.equal(response.status, 200)
  assert.match(response.body, /Fixture temporaire de drainage/)
  assert.equal(Object.values(agent.freeSockets).flat().length, 1)
  await bounded(closeHost(fixture.server), 'Un keep-alive inactif ne doit pas retenir la fermeture')
})

test('le drainage attend un POST admis et préserve sa réponse sans accepter de nouvelle connexion', async t => {
  const received = deferred(), release = deferred()
  let ended = false
  const fixture = await laboratory(t, async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    received.resolve(body); await release.promise
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ recorded: 'simulation-unique', body }))
    ended = true
  })
  fixture.releases.push(release.resolve)
  const response = call(fixture, '/api/paiement-fictif', { method: 'POST', body: 'donnee-fictive', headers: { Connection: 'close' } })
  assert.equal(await received.promise, 'donnee-fictive')
  let closed = false
  const closing = closeHost(fixture.server).then(() => { closed = true })
  await tick()
  assert.equal(closed, false)
  assert.equal(ended, false)
  await assert.rejects(bounded(call(fixture, '/api/interdit-apres-arret'), 'Une nouvelle connexion doit être refusée'))
  release.resolve()
  assert.deepEqual(await response, { status: 200, body: '{"recorded":"simulation-unique","body":"donnee-fictive"}' })
  await bounded(closing, 'La fermeture doit se confirmer après la réponse du POST')
  assert.equal(ended, true)
})

test('deux demandes de drainage partagent la même attente du POST admis', async t => {
  const first = deferred(), release = deferred()
  const fixture = await laboratory(t, async (req, res) => { req.resume(); first.resolve(); await release.promise; res.end('réponse admise conservée') })
  fixture.releases.push(release.resolve)
  const response = call(fixture, '/api/operation-fictive', { method: 'POST', headers: { Connection: 'close' } })
  await first.promise
  const one = closeHost(fixture.server), two = closeHost(fixture.server)
  assert.equal(one, two)
  let closed = false; void one.then(() => { closed = true })
  await tick(); assert.equal(closed, false)
  release.resolve()
  assert.deepEqual(await response, { status: 200, body: 'réponse admise conservée' })
  await bounded(one, 'La fermeture partagée doit terminer après le POST')
  assert.equal(closeHost(fixture.server), one)
})

test('le contrôleur statique refuse de fermer un serveur non créé par cet hôte', async t => {
  const fixture = await laboratory(t)
  await assert.rejects(closeHost(fixture.upstream), /non reconnu/)
  assert.equal(fixture.upstream.listening, true)
  assert.equal(fixture.server.listening, true)
})

test('aucune seconde requête pipelinée sur une connexion admise ne démarre pendant le drainage', async t => {
  const first = deferred(), release = deferred(), paths = []
  const fixture = await laboratory(t, async (req, res) => {
    paths.push(req.url); req.resume()
    if (req.url === '/api/premiere-fictive') { first.resolve(); await release.promise }
    res.end(req.url)
  })
  fixture.releases.push(release.resolve)
  const socket = await preconnect(fixture)
  let content = ''; socket.on('data', chunk => { content += chunk.toString('utf8') })
  const ended = once(socket, 'close')
  socket.write(`POST /api/premiere-fictive HTTP/1.1\r\nHost: 127.0.0.1:${fixture.port}\r\nContent-Length: 0\r\nConnection: keep-alive\r\n\r\n`)
  await first.promise
  const closing = closeHost(fixture.server)
  const secondParsed = new Promise(resolve => fixture.server.on('request', req => { if (req.url === '/api/seconde-interdite') resolve() }))
  socket.write(`GET /api/seconde-interdite HTTP/1.1\r\nHost: 127.0.0.1:${fixture.port}\r\nConnection: close\r\n\r\n`)
  await bounded(secondParsed, 'La requête pipelinée doit être traitée comme refus, pas admise')
  release.resolve()
  await bounded(closing, 'La première réponse admise doit terminer le drainage')
  await bounded(ended, 'Le client de fixture doit recevoir sa fermeture')
  assert.deepEqual(paths, ['/api/premiere-fictive'])
  assert.match(content, /HTTP\/1.1 200/)
  assert.match(content, /HTTP\/1.1 503/)
})
