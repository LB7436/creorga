import { createServer, connect } from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

const endpoint = (file, pid, instance) => process.platform === 'win32'
  ? `\\\\.\\pipe\\creorga-${pid}-${instance}` : path.join(path.dirname(file), `creorga-${pid}-${instance}.sock`)
const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b)
  && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** Canal local privé, pas une API HTTP ni une permission exposée au navigateur. */
export async function startRuntimeControl({ descriptorPath, onShutdown }) {
  if (!path.isAbsolute(descriptorPath) || typeof onShutdown !== 'function') throw Error('Contrôle local privé mal configuré')
  const fd = fs.openSync(descriptorPath, 'wx', 0o600)
  const descriptor = { version: 1, pid: process.pid, instance: randomUUID(), token: randomBytes(32).toString('base64url') }
  descriptor.pipe = endpoint(descriptorPath, descriptor.pid, descriptor.instance)
  const sockets = new Set(); let shutdown
  const server = createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {})
    socket.setTimeout(5000, () => socket.destroy())
    let frame = '', handled = false
    const denied = () => socket.end(JSON.stringify({ status: 'DENIED' }) + '\n')
    socket.on('data', chunk => {
      if (handled) return
      frame += chunk.toString('utf8')
      if (Buffer.byteLength(frame) > 2048) { handled = true; denied(); return }
      const end = frame.indexOf('\n')
      if (end < 0) return
      handled = true
      let request
      try { request = JSON.parse(frame.slice(0, end)) } catch { denied(); return }
      if (request?.action !== 'shutdown' || request.pid !== descriptor.pid || request.instance !== descriptor.instance || !equal(request.token, descriptor.token)) { denied(); return }
      socket.setTimeout(0)
      socket.write(JSON.stringify({ status: 'DRAINING' }) + '\n')
      shutdown ??= Promise.resolve().then(onShutdown)
      void shutdown.then(() => {
        socket.end(JSON.stringify({ status: 'STOPPED' }) + '\n')
        if (server.listening) server.close()
      }, () => socket.end(JSON.stringify({ status: 'FAILED', code: 'SHUTDOWN_UNCONFIRMED' }) + '\n'))
    })
  })
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen({ path: descriptor.pipe, readableAll: false, writableAll: false }, resolve) })
    fs.writeFileSync(fd, JSON.stringify(descriptor)); fs.fsyncSync(fd)
  } catch (error) {
    server.close(); throw error
  } finally { fs.closeSync(fd) }
  return { close: async () => { for (const socket of sockets) socket.destroy(); if (server.listening) await new Promise(resolve => server.close(resolve)) } }
}

export async function requestRuntimeShutdown(descriptorPath, { expectedPid, timeoutMs = 30000 }) {
  if (!path.isAbsolute(descriptorPath) || !Number.isSafeInteger(expectedPid) || expectedPid <= 0) throw Error('Identité de processus requise')
  const stat = fs.lstatSync(descriptorPath)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) throw Error('Descripteur de contrôle non sûr')
  const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'))
  if (descriptor.version !== 1 || descriptor.pid !== expectedPid || !/^[a-f0-9-]{36}$/.test(descriptor.instance || '')
      || !/^[A-Za-z0-9_-]{43}$/.test(descriptor.token || '') || descriptor.pipe !== endpoint(descriptorPath, expectedPid, descriptor.instance)) throw Error('Descripteur incompatible : aucun arrêt envoyé')
  return new Promise((resolve, reject) => {
    const socket = connect(descriptor.pipe); let frame = '', result
    socket.setTimeout(timeoutMs, () => { socket.destroy(); reject(Error('Arrêt non confirmé ; aucune interruption forcée')) })
    socket.once('connect', () => socket.write(JSON.stringify({ action: 'shutdown', pid: descriptor.pid, instance: descriptor.instance, token: descriptor.token }) + '\n'))
    socket.on('data', chunk => {
      frame += chunk.toString('utf8')
      if (frame.length > 4096) { socket.destroy(); reject(Error('Réponse de contrôle invalide')); return }
      let end
      while ((end = frame.indexOf('\n')) >= 0) {
        let value
        try { value = JSON.parse(frame.slice(0, end)) } catch { socket.destroy(); reject(Error('Réponse de contrôle invalide')); return }
        frame = frame.slice(end + 1)
        if (value.status !== 'DRAINING') result = value
      }
    })
    socket.once('error', reject)
    socket.once('end', () => result ? resolve(result) : reject(Error('Arrêt non confirmé ; état à vérifier')))
  })
}
