import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { connect } from 'node:net'
import { startRuntimeControl, requestRuntimeShutdown } from '../../scripts/local/runtime-control.mjs'
const fixture = () => path.join(mkdtempSync(path.join(tmpdir(), 'creorga-control-')), 'control.json')
const packet = (descriptor, data, progress = () => {}) => new Promise((resolve, reject) => {
  const socket = connect(descriptor.pipe); let buffer = '', result
  socket.setTimeout(4000, () => { socket.destroy(); reject(Error('Contrôle local sans réponse')) })
  socket.once('connect', () => socket.write(JSON.stringify(data) + '\n'))
  socket.on('data', data => {
    buffer += data.toString('utf8')
    let end
    while ((end = buffer.indexOf('\n')) >= 0) {
      const response = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1)
      if (response.status === 'DRAINING') progress(response); else result = response
    }
  }); socket.on('error', reject)
  socket.on('end', () => result ? resolve(result) : reject(Error('Fermeture non confirmée')))
})

test('le contrôleur prive le navigateur de tout droit d’arrêt et conserve son descripteur', async t => {
  const file = fixture(); let stopped = 0
  const control = await startRuntimeControl({ descriptorPath: file, onShutdown: async () => { stopped++ } })
  t.after(() => control.close())
  assert.equal(existsSync(file), true, 'Descripteur privé créé sans API HTTP')
  const descriptor = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(descriptor.pid, process.pid)
  const denied = await packet(descriptor, { action: 'shutdown', token: 'incorrect', pid: process.pid, instance: descriptor.instance })
  assert.equal(denied.status, 'DENIED'); assert.equal(stopped, 0)
  assert.equal((await requestRuntimeShutdown(file, { expectedPid: process.pid })).status, 'STOPPED')
  assert.equal(stopped, 1); assert.equal(existsSync(file), true, 'Aucune suppression du journal de contrôle')
})

test('deux demandes authentifiées attendent la même fermeture et ne doublent pas le drain', async t => {
  const file = fixture(); let finish, entered, count = 0
  const started = new Promise(resolve => { entered = resolve })
  const draining = new Promise(resolve => { finish = resolve })
  const control = await startRuntimeControl({ descriptorPath: file, onShutdown: async () => { count++; entered(); await draining } })
  t.after(() => control.close())
  assert.equal(existsSync(file), true)
  const descriptor = JSON.parse(readFileSync(file, 'utf8'))
  const command = { action: 'shutdown', pid: process.pid, instance: descriptor.instance, token: descriptor.token }
  const first = packet(descriptor, command)
  await started
  let admit
  const admitted = new Promise(resolve => { admit = resolve })
  const second = packet(descriptor, command, () => admit())
  // La seconde connexion est admise avant libération, sans délai arbitraire.
  await admitted
  assert.equal(count, 1)
  finish()
  assert.deepEqual((await Promise.all([first, second])).map(r => r.status), ['STOPPED', 'STOPPED'])
})

test('un fichier de contrôle existant n’est jamais remplacé', async () => {
  const file = fixture(); writeFileSync(file, 'conservation', { flag: 'wx' })
  await assert.rejects(startRuntimeControl({ descriptorPath: file, onShutdown: async () => {} }))
  assert.equal(readFileSync(file, 'utf8'), 'conservation')
})

test('un PID divergent ou une destination falsifiée ne déclenche aucune fermeture', async t => {
  const file = fixture(); let stopped = false
  const control = await startRuntimeControl({ descriptorPath: file, onShutdown: async () => { stopped = true } })
  t.after(() => control.close())
  assert.equal(existsSync(file), true)
  await assert.rejects(requestRuntimeShutdown(file, { expectedPid: process.pid + 1 }))
  assert.equal(stopped, false)
  const evil = fixture(); writeFileSync(evil, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), pipe: '\\\\.\\pipe\\autre-service' }), { flag: 'wx' })
  await assert.rejects(requestRuntimeShutdown(evil, { expectedPid: process.pid }))
  assert.equal(stopped, false)
})

test('un drain refusé ne devient jamais une confirmation et ne force pas le processus', async t => {
  const file = fixture(); let attempts = 0
  const control = await startRuntimeControl({ descriptorPath: file, onShutdown: async () => { attempts++; throw Error('fsync fictif indisponible') } })
  t.after(() => control.close())
  const first = await requestRuntimeShutdown(file, { expectedPid: process.pid })
  assert.equal(first.status, 'FAILED')
  assert.equal(first.code, 'SHUTDOWN_UNCONFIRMED')
  assert.equal((await requestRuntimeShutdown(file, { expectedPid: process.pid })).status, 'FAILED')
  assert.equal(attempts, 1, 'Un drain échoué ne doit pas être rejoué sans diagnostic')
  assert.equal(existsSync(file), true)
  assert.doesNotThrow(() => process.kill(process.pid, 0))
})

test('un refus renvoie seulement le diagnostic privé borné sans sérialiser erreur ou secrets', async t => {
  const file = fixture(); let attempts = 0
  const control = await startRuntimeControl({ descriptorPath: file,
    onShutdown: async () => { attempts++; throw Object.assign(Error('SECRET_FICTIF_DANS_MESSAGE'), { stack: 'SECRET_FICTIF_DANS_STACK', query: 'SECRET_FICTIF_DANS_SQL' }) },
    getShutdownDiagnostic: () => ({ stage: 'event-sink', reason: 'EVENT_SINK_UNCONFIRMED', message: 'SECRET_FICTIF', stack: 'SECRET_FICTIF', query: 'SECRET_FICTIF' }),
  })
  t.after(() => control.close())
  const first = await requestRuntimeShutdown(file, { expectedPid: process.pid })
  assert.deepEqual(first, { status: 'FAILED', code: 'SHUTDOWN_UNCONFIRMED', diagnostic: { stage: 'event-sink', reason: 'EVENT_SINK_UNCONFIRMED' } })
  assert.equal(JSON.stringify(first).includes('SECRET'), false)
  assert.deepEqual(await requestRuntimeShutdown(file, { expectedPid: process.pid }), first)
  assert.equal(attempts, 1)
})

test('une étape falsifiée ou un collecteur défaillant restent inconnus, jamais du contenu brut', async t => {
  for (const getShutdownDiagnostic of [() => ({ stage: 'SECRET_FICTIF', reason: 'SECRET_FICTIF' }), () => { throw Error('SECRET_FICTIF') }]) {
    const file = fixture()
    const control = await startRuntimeControl({ descriptorPath: file, onShutdown: async () => { throw Error('SECRET_FICTIF') }, getShutdownDiagnostic })
    t.after(() => control.close())
    const result = await requestRuntimeShutdown(file, { expectedPid: process.pid })
    assert.deepEqual(result, { status: 'FAILED', code: 'SHUTDOWN_UNCONFIRMED', diagnostic: { stage: 'runtime', reason: 'UNSPECIFIED_FAILURE' } })
  }
})

test('les champs diagnostiques ne sont lus qu’une fois avant leur filtrage', async t => {
  let reads = 0
  const file = fixture()
  const control = await startRuntimeControl({ descriptorPath: file, onShutdown: async () => { throw Error('SECRET_FICTIF') },
    getShutdownDiagnostic: () => ({ get stage() { return ++reads === 1 ? 'audit' : 'SECRET_FICTIF' }, reason: 'FILESYSTEM_FAILURE' }),
  })
  t.after(() => control.close())
  const result = await requestRuntimeShutdown(file, { expectedPid: process.pid })
  assert.deepEqual(result.diagnostic, { stage: 'audit', reason: 'FILESYSTEM_FAILURE' })
  assert.equal(reads, 1)
})
