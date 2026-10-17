import { createServer, request } from 'node:http'
import { connect } from 'node:net'
import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.pdf': 'application/pdf', '.webp': 'image/webp', '.mp4': 'video/mp4' }
const inside = (root, target) => target === root || (!path.relative(root, target).startsWith('..') && !path.isAbsolute(path.relative(root, target)))
const localHost = (value, port) => [`127.0.0.1:${port}`, `localhost:${port}`].includes(String(value).toLowerCase())
const hostClosers = new WeakMap()

/** Drain privé de cet hôte seulement : aucune fermeture globale de connexions. */
export function closeStaticHost(server) {
  const close = hostClosers.get(server)
  if (!close) return Promise.reject(new Error('Hôte statique non reconnu : aucun arrêt exécuté.'))
  return close()
}

/** Hôte statique loopback : aucune compilation, aucun watcher, proxy uniquement vers l'API locale fixe. */
export async function startStaticHost({ directory, port, apiPort = 3002 }) {
  if (!Number.isInteger(port) || port < 0 || port > 65535 || !Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) throw new Error('Ports locaux invalides')
  const root = await realpath(directory)
  await stat(path.join(root, 'index.html'))
  const sockets = new Map()
  let draining = false, closing, boundPort = port
  const server = createServer(async (req, res) => {
    const connection = sockets.get(req.socket)
    if (connection) connection.inFlight++
    let released = false
    const release = () => {
      if (released) return
      released = true
      if (connection) {
        connection.inFlight--
        // end() conserve les octets déjà écrits et n'interrompt aucune réponse
        // admise. Attendre aussi les réponses503 pipelinées déjà en file.
        if (draining && connection.inFlight === 0 && !connection.upgraded) req.socket.end()
      }
    }
    res.once('finish', release); res.once('close', release)
    const fail = (code) => { res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }); res.end(`CréOrga : HTTP ${code}`) }
    if (draining) { res.setHeader('Connection', 'close'); return fail(503) }
    if (connection) connection.admitted++
    if (!localHost(req.headers.host, boundPort)) return fail(403)
    if (/^\/api(?:\/|\?|$)|^\/socket\.io(?:\/|\?|$)/.test(req.url || '')) {
      let apiResponse
      const upstream = request({ hostname: '127.0.0.1', port: apiPort, path: req.url, method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${apiPort}` } }, response => {
        apiResponse = response
        res.writeHead(response.statusCode || 502, response.headers); response.pipe(res)
      })
      upstream.setTimeout(120_000, () => upstream.destroy())
      upstream.on('error', () => { if (res.destroyed) return; if (!res.headersSent) fail(502); else res.destroy() })
      // req.aborted ne couvre pas un GET déjà reçu dont le navigateur abandonne
      // la réponse. Libérer seulement son relais, jamais toutes les connexions.
      res.once('close', () => { if (!res.writableEnded) { apiResponse?.destroy(); upstream.destroy() } })
      req.on('aborted', () => upstream.destroy()); req.pipe(upstream); return
    }
    if (!['GET', 'HEAD'].includes(req.method)) return fail(405)
    let pathname
    try { pathname = decodeURIComponent((req.url || '/').split('?')[0]) } catch { return fail(400) }
    if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) return fail(400)
    if (pathname.split('/').some(segment => segment.startsWith('.'))) return fail(404)
    let target = path.resolve(root, '.' + pathname)
    if (!inside(root, target)) return fail(400)
    try {
      const candidate = await stat(target).catch(() => null)
      if (!candidate?.isFile()) {
        if (path.extname(pathname) || pathname.startsWith('/assets/') || pathname.startsWith('/cards/')) return fail(404)
        target = path.join(root, 'index.html')
      }
      target = await realpath(target)
      if (!inside(root, target)) return fail(403)
      const metadata = await stat(target), extension = path.extname(target).toLowerCase()
      res.writeHead(200, { 'content-type': types[extension] || 'application/octet-stream', 'content-length': metadata.size,
        'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-store',
        'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' })
      if (req.method === 'HEAD') res.end()
      else createReadStream(target).on('error', () => res.destroy()).pipe(res)
    } catch { if (!res.headersSent) fail(404); else res.destroy() }
  })
  server.on('connection', socket => {
    const connection = { inFlight: 0, admitted: 0, upgraded: false }
    sockets.set(socket, connection)
    socket.once('close', () => sockets.delete(socket))
    // Une acceptation TCP déjà en file au moment de close() ne constitue pas
    // une opération métier admise.
    if (draining) socket.destroy()
  })
  server.on('upgrade', (req, socket, head) => {
    if (draining) { socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); return }
    if (!localHost(req.headers.host, boundPort) || !/^\/socket\.io(?:\/|\?|$)/.test(req.url || '')) { socket.destroy(); return }
    const connection = sockets.get(socket)
    if (connection) connection.upgraded = true
    const upstream = connect(apiPort, '127.0.0.1', () => {
      const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` }
      upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`)
      if (head.length) upstream.write(head)
      socket.pipe(upstream).pipe(socket)
    })
    upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy())
    socket.on('close', () => upstream.destroy())
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { boundPort = server.address().port; resolve() }) })
  hostClosers.set(server, () => {
    if (closing) return closing
    draining = true
    closing = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    // API HTTP officielle : ne ferme que les connexions reconnues inactives.
    server.closeIdleConnections()
    for (const [socket, connection] of sockets) if (!connection.upgraded && connection.inFlight === 0) {
      if (connection.admitted === 0) socket.destroy() // TCP préconnecté/en-têtes incomplets, aucune requête admise.
      else socket.end() // Réponse achevée, FIN gracieux plutôt que coupure de son contenu.
    }
    return closing
  })
  return server
}
