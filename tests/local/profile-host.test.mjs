import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer, get } from 'node:http'
import { startStaticHost } from '../../scripts/local/static-host.mjs'

test('interfaces compilées : SPA, MIME, refus de traversée et proxy API borné', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'creorga-static-test-'))
  const upstream = createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ path: req.url, method: req.method })) })
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
  await mkdir(path.join(directory, 'assets'))
  await writeFile(path.join(directory, 'index.html'), '<main>CréOrga laboratoire</main>')
  await writeFile(path.join(directory, 'assets/app.js'), 'console.log("métier")')
  const server = await startStaticHost({ directory, port: 0, apiPort: upstream.address().port })
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const spa = await fetch(base + '/planning/semaine')
    assert.equal(spa.status, 200); assert.match(await spa.text(), /laboratoire/)
    assert.match(spa.headers.get('cache-control'), /no-store/)
    const asset = await fetch(base + '/assets/app.js')
    assert.match(asset.headers.get('content-type'), /javascript/)
    assert.equal((await fetch(base + '/assets/absent.js')).status, 404)
    assert.equal((await fetch(base + '/.env')).status, 404)
    assert.equal((await fetch(base + '/%2e%2e%2fprivate-config.json')).status, 400)
    assert.equal((await fetch(base + '/index.html', { method: 'POST' })).status, 405)
    const api = await fetch(base + '/api/health?test=1', { method: 'POST' })
    assert.deepEqual(await api.json(), { path: '/api/health?test=1', method: 'POST' })
    assert.equal((await fetch(base + '/assets/app.js', { method: 'HEAD' })).status, 200)
  } finally {
    await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => upstream.close(resolve))])
    // Conserver les fichiers fictifs : aucune suppression implicite pendant F18.
  }
})

test('une réponse API abandonnée ne retient pas une connexion orpheline pendant l’arrêt', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'creorga-static-abandon-'))
  await writeFile(path.join(directory, 'index.html'), '<main>Fictif</main>')
  let upstreamClosed
  const closed = new Promise(resolve => { upstreamClosed = resolve })
  const upstream = createServer((req, res) => {
    req.socket.once('close', () => upstreamClosed())
    res.setHeader('content-type', 'application/octet-stream')
    // Dépasse les buffers TCP pour reproduire un bootstrap réel non consommé.
    res.end(Buffer.alloc(8 * 1024 * 1024, 65))
  })
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const server = await startStaticHost({ directory, port: 0, apiPort: upstream.address().port })
  t.after(async () => {
    // Uniquement les serveurs éphémères de ce test, jamais ceux du laboratoire.
    server.closeAllConnections(); upstream.closeAllConnections()
    await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => upstream.close(resolve))])
  })
  await new Promise((resolve, reject) => {
    const client = get(`http://127.0.0.1:${server.address().port}/api/bootstrap-fictif`, response => {
      response.once('data', () => { response.destroy(); resolve() })
      response.on('error', () => {})
    })
    client.on('error', reject)
  })
  const result = await Promise.race([closed.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 1500))])
  assert.equal(result, true, 'La fermeture aval doit libérer son unique requête amont, pas attendre un timeout destructif global')
})
