import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '../..')
const isolated = { version: 1, profile: 'business', context: 'f18-isolated', apiOrigin: 'http://127.0.0.1:13002',
  webOrigin: 'http://127.0.0.1:15174', binding: 'loopback', externalProviders: 'disabled-by-local-runtime' }
const original = { version: 1, profile: 'business', apiOrigin: 'http://localhost:3002', webOrigin: 'http://localhost:5174',
  binding: 'loopback', externalProviders: 'disabled-by-local-runtime' }
const recovery = { version: 1, profile: 'business', context: 'f18-recovery', apiOrigin: 'http://127.0.0.1:23002',
  webOrigin: 'http://127.0.0.1:25174', binding: 'loopback', externalProviders: 'disabled-by-local-runtime' }

// Uniquement des fixtures neuves ; aucun fichier n'est supprimé, aucun port de
// l'installation originale ou du laboratoire n'est ouvert ou interrogé.
async function fixture({ badApp, legacyContext = false, recoveryContext = false, games = 0 } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'creorga-f18-context-'))
  const scripts = path.join(directory, 'scripts/local')
  await mkdir(scripts, { recursive: true })
  for (const name of ['runtime.mjs', 'local-origin-policy.mjs', 'extensionless-esm.mjs']) {
    await copyFile(path.join(root, 'scripts/local', name), path.join(scripts, name))
  }
  await writeFile(path.join(directory, 'package.json'), '{"type":"module"}')
  const runtime = path.join(directory, 'runtime')
  await mkdir(path.join(runtime, 'data'), { recursive: true })
  for (const app of ['web', 'pos', 'superadmin', 'guest', 'backend']) {
    for (const artifact of ['dist-business', 'dist-business-f18-isolated', 'dist-business-f18-recovery', ...(app === 'backend' ? ['dist'] : [])]) {
      const output = path.join(directory, 'apps', app, artifact)
      await mkdir(path.join(output, 'src'), { recursive: true })
      await writeFile(path.join(output, 'index.html'), '<main>Fixture locale</main>')
      await writeFile(path.join(output, 'profile-manifest.json'), JSON.stringify({ profile: 'business', gameModuleCount: games }))
      await writeFile(path.join(output, 'local-installation.json'), JSON.stringify(app === badApp ? original : artifact === 'dist-business-f18-recovery' ? recovery : artifact === 'dist-business-f18-isolated' ? isolated : original))
      // Import réellement sans extension : protège la résolution du build isolé.
      await writeFile(path.join(output, 'src/identity.js'), `export const artifact = ${JSON.stringify(artifact)}`)
      await writeFile(path.join(output, 'src/index.js'), `import { artifact } from './identity';
        console.log('FIXTURE_BACKEND ' + JSON.stringify({ artifact, port: process.env.PORT, host: process.env.CREORGA_BIND_HOST,
          frontend: process.env.FRONTEND_URL, origins: process.env.ALLOWED_ORIGINS }));
        export const backendReady = Promise.resolve(); export const shutdownBackend = async () => {};`)
    }
  }
  const staticHostUrl = pathToFileURL(path.join(root, 'scripts/local/static-host.mjs')).href
  // La frontière d'écoute est redirigée vers des ports éphémères. Le vrai proxy
  // reste exécuté ; un port API manquant/divergent refuse avant tout réseau.
  await writeFile(path.join(scripts, 'static-host.mjs'), `
    import { createServer } from 'node:http';
    import { startStaticHost as actualStart, closeStaticHost as actualClose } from ${JSON.stringify(staticHostUrl)};
    export async function startStaticHost(options) {
      if (options.apiPort !== ${legacyContext ? 3002 : recoveryContext ? 23002 : 13002}) throw Error('FIXTURE_PROXY_DESTINATION_INCORRECTE');
      const upstream = createServer((req, res) => { res.setHeader('Connection', 'close'); res.end(JSON.stringify({ apiPort: options.apiPort, path: req.url })); });
      await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
      const server = await actualStart({ ...options, port: 0, apiPort: upstream.address().port });
      try {
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/fixture-isolation', { headers: { Connection: 'close' } });
        console.log('FIXTURE_HOST ' + JSON.stringify({ directory: options.directory, port: options.port, response: await response.json() }));
      } catch (error) { console.error('FIXTURE_ERROR', error); throw error; }
      finally { await actualClose(server); await new Promise(resolve => upstream.close(resolve)); }
      return server;
    }
    export const closeStaticHost = async () => {};`)
  await writeFile(path.join(scripts, 'runtime-control.mjs'), 'export async function startRuntimeControl() { throw Error("Aucun IPC de test attendu") }')
  return { directory, runtime, entry: path.join(scripts, 'runtime.mjs') }
}

function run(f, extra = {}, args = []) {
  return spawnSync(process.execPath, [f.entry, ...args], { cwd: f.directory, encoding: 'utf8', windowsHide: true, timeout: 20000,
    env: { ...process.env, CREORGA_LOCAL_CONTEXT: 'f18-isolated', CREORGA_RUNTIME_DIR: f.runtime,
      DATABASE_URL: 'postgresql://fixture:unused@127.0.0.1:15450/creorga_f18_local', EMAIL_TEST_ONLY: 'true',
      JWT_SECRET: 'fixture-only', JWT_REFRESH_SECRET: 'fixture-only-refresh', CREORGA_CONTROL_FILE: '', NODE_OPTIONS: '', ...extra } })
}

test('F18 lance ses artefacts, ses quatre ports et le vrai proxy vers sa seule API', async () => {
  const f = await fixture(), result = run(f)
  assert.equal(result.status, 0, result.stderr)
  const hosts = result.stdout.split('\n').filter(line => line.startsWith('FIXTURE_HOST ')).map(line => JSON.parse(line.slice(13)))
  assert.equal(hosts.length, 4)
  assert.deepEqual(hosts.map(host => host.port), [15174, 15175, 15177, 15178])
  for (const host of hosts) {
    assert.equal(path.basename(host.directory), 'dist-business-f18-isolated')
    assert.deepEqual(host.response, { apiPort: 13002, path: '/api/fixture-isolation' })
  }
  const backend = JSON.parse(result.stdout.split('\n').find(line => line.startsWith('FIXTURE_BACKEND ')).slice(16))
  assert.deepEqual(backend, { artifact: 'dist-business-f18-isolated', port: '13002', host: '127.0.0.1',
    frontend: 'http://127.0.0.1:15174', origins: 'http://127.0.0.1:15174,http://127.0.0.1:15175,http://127.0.0.1:15177,http://127.0.0.1:15178' })
})

for (const badApp of ['web', 'pos', 'superadmin', 'guest', 'backend']) test(`F18 refuse le manifeste ${badApp} de l’original avant la première écoute`, async () => {
  const result = run(await fixture({ badApp }))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /recompilation locale obligatoire/)
  assert.doesNotMatch(result.stdout, /FIXTURE_HOST|FIXTURE_BACKEND/)
})

test('F18 refuse jeux, contexte inconnu, full et répertoire runtime relatif avant toute écoute', async () => {
  const games = run(await fixture({ games: 1 }))
  assert.equal(games.status, 1); assert.match(games.stderr, /Compilation de profil incohérente/)
  const f = await fixture()
  for (const [env, args, message] of [
    [{ CREORGA_LOCAL_CONTEXT: 'https://remote.fixture.invalid' }, [], /Contexte local inconnu/],
    [{}, ['--full'], /business.*f18-isolated|f18-isolated.*business/],
    [{ CREORGA_RUNTIME_DIR: 'runtime' }, [], /CREORGA_RUNTIME_DIR absolu requis/],
  ]) {
    const result = run(f, env, args)
    assert.equal(result.status, 1); assert.match(result.stderr, message)
    assert.doesNotMatch(result.stdout, /FIXTURE_HOST|FIXTURE_BACKEND/)
  }
})

for (const [label, DATABASE_URL] of [
  ['le cluster source', 'postgresql://fixture:unused@127.0.0.1:5450/creorga_f18_local'],
  ['une autre base', 'postgresql://fixture:unused@127.0.0.1:15450/autre_base'],
  ['un alias localhost', 'postgresql://fixture:unused@localhost:15450/creorga_f18_local'],
  ['le paramètre schema=public', 'postgresql://fixture:unused@127.0.0.1:15450/creorga_f18_local?schema=public'],
  ['un autre schéma', 'postgresql://fixture:unused@127.0.0.1:15450/creorga_f18_local?schema=autre'],
  ['un fragment', 'postgresql://fixture:unused@127.0.0.1:15450/creorga_f18_local#autre'],
]) test(`F18 refuse ${label} avant toute écoute`, async () => {
  const result = run(await fixture(), { DATABASE_URL })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /f18-isolated exige la base/)
  assert.doesNotMatch(result.stdout, /FIXTURE_HOST|FIXTURE_BACKEND/)
})

test('F18 accepte aussi le protocole postgres avec la seule identité autorisée', async () => {
  const result = run(await fixture(), { DATABASE_URL: 'postgres://fixture:unused@127.0.0.1:15450/creorga_f18_local' })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /FIXTURE_BACKEND/)
})

test('le contexte default conserve les dossiers historiques, CORS localhost et backend dist', async () => {
  const result = run(await fixture({ legacyContext: true }), { CREORGA_LOCAL_CONTEXT: 'default',
    DATABASE_URL: 'postgresql://fixture:unused@localhost:5450/fixture?schema=public' })
  assert.equal(result.status, 0, result.stderr)
  const hosts = result.stdout.split('\n').filter(line => line.startsWith('FIXTURE_HOST ')).map(line => JSON.parse(line.slice(13)))
  assert.deepEqual(hosts.map(host => host.port), [5174, 5175, 5177, 5178])
  assert.ok(hosts.every(host => path.basename(host.directory) === 'dist-business' && host.response.apiPort === 3002))
  const backend = JSON.parse(result.stdout.split('\n').find(line => line.startsWith('FIXTURE_BACKEND ')).slice(16))
  assert.equal(backend.artifact, 'dist')
  assert.equal(backend.origins, 'http://localhost:5174,http://localhost:5175,http://localhost:5177,http://localhost:5178')
})

const recoveryEnvironment = { CREORGA_LOCAL_CONTEXT: 'f18-recovery', DATABASE_URL: 'postgresql://fixture:unused@127.0.0.1:25450/creorga_f18_recovery' }
test('le laboratoire de reprise utilise ses seuls artefacts, ports et proxy, pas les copies bloquées', async () => {
  const result = run(await fixture({ recoveryContext: true }), recoveryEnvironment)
  assert.equal(result.status, 0, result.stderr)
  const hosts = result.stdout.split('\n').filter(line => line.startsWith('FIXTURE_HOST ')).map(line => JSON.parse(line.slice(13)))
  assert.deepEqual(hosts.map(host => host.port), [25174, 25175, 25177, 25178])
  assert.ok(hosts.every(host => path.basename(host.directory) === 'dist-business-f18-recovery' && host.response.apiPort === 23002))
  const backend = JSON.parse(result.stdout.split('\n').find(line => line.startsWith('FIXTURE_BACKEND ')).slice(16))
  assert.equal(backend.artifact, 'dist-business-f18-recovery')
  assert.equal(backend.port, '23002')
  assert.equal(backend.origins, 'http://127.0.0.1:25174,http://127.0.0.1:25175,http://127.0.0.1:25177,http://127.0.0.1:25178')
})

for (const badApp of ['web', 'pos', 'superadmin', 'guest', 'backend']) test(`reprise refuse un ancien manifeste ${badApp} avant toute écoute`, async () => {
  const result = run(await fixture({ recoveryContext: true, badApp }), recoveryEnvironment)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /recompilation locale obligatoire/)
  assert.doesNotMatch(result.stdout, /FIXTURE_HOST|FIXTURE_BACKEND/)
})

for (const DATABASE_URL of ['postgresql://fixture:unused@127.0.0.1:5450/creorga_local',
  'postgresql://fixture:unused@127.0.0.1:15450/creorga_f18_local',
  'postgresql://fixture:unused@127.0.0.1:25450/autre_base',
  'postgresql://fixture:unused@127.0.0.1:25450/creorga_f18_recovery?schema=public']) test(`reprise refuse la base non prévue ${new URL(DATABASE_URL).port}${new URL(DATABASE_URL).pathname}${new URL(DATABASE_URL).search}`, async () => {
  const result = run(await fixture({ recoveryContext: true }), { ...recoveryEnvironment, DATABASE_URL })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /f18-recovery exige la base/)
  assert.doesNotMatch(result.stdout, /FIXTURE_HOST|FIXTURE_BACKEND/)
})

test('le résolveur charge les imports relatifs sans extension du backend isolé', async () => {
  const f = await fixture()
  const loader = pathToFileURL(path.join(f.directory, 'scripts/local/extensionless-esm.mjs')).href
  const entry = pathToFileURL(path.join(f.directory, 'apps/backend/dist-business-f18-isolated/src/index.js')).href
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { register } from 'node:module'; register(${JSON.stringify(loader)}); await import(${JSON.stringify(entry)});`],
  { cwd: f.directory, encoding: 'utf8', windowsHide: true, timeout: 10000, env: { ...process.env, NODE_OPTIONS: '' } })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /FIXTURE_BACKEND.*dist-business-f18-isolated/)
})
