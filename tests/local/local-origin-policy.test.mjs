import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import childProcess from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { pathToFileURL } from 'node:url'
import { LOCAL_BIND_HOST, LOCAL_API_PORT, LOCAL_API_ORIGIN, LOCAL_WEB_ORIGIN, LOCAL_FRONTENDS, LOCAL_BROWSER_ORIGINS,
  assertLocalInstallationManifest, localInstallationManifest, localBuildEnvironment } from '../../scripts/local/local-origin-policy.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const builder = path.join(root, 'scripts/build-local-profile.mjs')

/** Exécute le vrai constructeur avec ses frontières remplacées : aucun build,
 * Git, fichier de livrable, processus enfant ou appel réseau n'est exécuté. */
async function captureBuildPlan(profile) {
  const commands = [], files = []
  const injected = Object.fromEntries(['VITE_BACKEND_URL', 'VITE_REMOTE_BACKEND', 'VITE_API_URL',
    'VITE_WEB_CLIENT_URL', 'VITE_BACKOFFICE_URL', 'VITE_POS_URL', 'VITE_CAISSE_URL', 'VITE_ANALYTICS_URL']
    .map(key => [key, 'https://external.fixture.invalid/not-authorized']))
  const savedEnvironment = Object.fromEntries(Object.keys(injected).map(key => [key, process.env[key]]))
  const savedArgs = process.argv, savedExec = childProcess.execFileSync, savedWrite = fs.writeFileSync, savedLog = console.log
  try {
    Object.assign(process.env, injected)
    process.argv = [process.execPath, builder, profile]
    childProcess.execFileSync = (executable, args, options) => {
      if (executable === process.execPath) { commands.push({ args: [...args], cwd: options.cwd, env: { ...options.env } }); return Buffer.alloc(0) }
      if (executable === 'git' && args[0] === 'ls-files') return ''
      if (executable === 'git' && args[0] === 'rev-parse') return 'f'.repeat(40)
      if (executable === 'git' && args[0] === 'diff') return ''
      throw Error('Toute exécution externe non prévue est interdite par ce test')
    }
    fs.writeFileSync = (file, content) => { files.push({ path: path.relative(root, file).replaceAll('\\', '/'), content: JSON.parse(String(content)) }) }
    console.log = () => {} // Ne jamais annoncer une compilation fictive comme réelle.
    syncBuiltinESMExports()
    await import(`${pathToFileURL(builder).href}?local-origin-plan=${profile}`)
    return { commands, files }
  } finally {
    process.argv = savedArgs
    childProcess.execFileSync = savedExec
    fs.writeFileSync = savedWrite
    console.log = savedLog
    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    syncBuiltinESMExports()
  }
}

for (const profile of ['business', 'full']) test(`plan ${profile} : API et quatre interfaces utilisent le même hostname sans destination héritée externe`, async () => {
  const { commands, files } = await captureBuildPlan(profile)
  assert.equal(commands.length, 9, 'quatre vérifications TypeScript, quatre builds Vite et un backend, tous seulement capturés')
  assert.deepEqual(commands.map(command => path.relative(root, command.cwd).replaceAll('\\', '/')), [
    'apps/web', 'apps/web', 'apps/pos', 'apps/pos', 'apps/superadmin', 'apps/superadmin', 'apps/guest', 'apps/guest', 'apps/backend',
  ])
  for (let index = 0; index < 4; index++) {
    assert.equal(commands[index * 2].args[0], path.join(root, 'node_modules/typescript/bin/tsc'))
    assert.deepEqual(commands[index * 2].args.slice(1), ['--noEmit', '-p', 'tsconfig.json'])
    assert.equal(commands[index * 2 + 1].args[0], path.join(root, 'node_modules/vite/bin/vite.js'))
    assert.deepEqual(commands[index * 2 + 1].args.slice(1), ['build', '--outDir', `dist-${profile}`])
  }
  assert.deepEqual(commands[8].args, [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'])
  for (const command of commands) {
    // N'afficher que les valeurs publiques vérifiées, jamais tout process.env.
    assert.equal(command.env.VITE_BACKEND_URL, 'http://localhost:3002')
    assert.equal(command.env.VITE_REMOTE_BACKEND, 'http://localhost:3002')
    assert.equal(command.env.VITE_API_URL, 'http://localhost:3002/api')
    assert.equal(command.env.VITE_WEB_CLIENT_URL, 'http://localhost:5174')
    assert.equal(command.env.VITE_BACKOFFICE_URL, 'http://localhost:5174')
    assert.equal(command.env.VITE_POS_URL, 'http://localhost:5175')
    assert.equal(command.env.VITE_CAISSE_URL, 'http://localhost:5175')
    assert.equal(command.env.VITE_ANALYTICS_URL, '')
    assert.equal(command.env.CREORGA_BUSINESS_ONLY, profile === 'business' ? 'true' : 'false')
  }
  assert.equal(files.length, 5)
  for (const app of ['web', 'pos', 'superadmin', 'guest']) {
    const installation = files.find(file => file.path === `apps/${app}/dist-${profile}/local-installation.json`)?.content
    assert.ok(installation, `manifeste local requis pour ${app}`)
    assert.equal(installation.profile, profile)
    assert.equal(installation.apiOrigin, 'http://localhost:3002')
    assert.equal(installation.webOrigin, 'http://localhost:5174')
    assert.equal(installation.binding, 'loopback')
    assert.equal(installation.externalProviders, 'disabled-by-local-runtime')
  }
  assert.equal(files.find(file => file.path.endsWith('/build-manifest.json'))?.content.apiOrigin, 'http://localhost:3002')
})

test('les quatre interfaces publiques locales sont bornées, distinctes du binding réseau strict', () => {
  assert.equal(LOCAL_BIND_HOST, '127.0.0.1')
  assert.equal(LOCAL_API_PORT, 3002)
  assert.equal(LOCAL_API_ORIGIN, 'http://localhost:3002')
  assert.equal(LOCAL_WEB_ORIGIN, 'http://localhost:5174')
  assert.deepEqual(LOCAL_FRONTENDS, [['web', 5174], ['pos', 5175], ['superadmin', 5177], ['guest', 5178]])
  assert.deepEqual(LOCAL_BROWSER_ORIGINS, ['http://localhost:5174', 'http://localhost:5175', 'http://localhost:5177', 'http://localhost:5178'])
  assert.throws(() => { LOCAL_FRONTENDS[0][1] = 9999 }, TypeError)
})

for (const profile of ['business', 'full']) test(`manifeste ${profile} : garde exacte, refus des anciens hôtes mixtes et destinations externes`, () => {
  const manifest = localInstallationManifest(profile)
  assert.doesNotThrow(() => assertLocalInstallationManifest(manifest, profile))
  for (const invalid of [null, {}, { ...manifest, version: 2 }, { ...manifest, profile: profile === 'business' ? 'full' : 'business' },
    { ...manifest, apiOrigin: 'http://127.0.0.1:3002' }, { ...manifest, apiOrigin: 'http://localhost:3002/' },
    { ...manifest, apiOrigin: 'http://localhost.evil.invalid:3002' }, { ...manifest, apiOrigin: 'https://external.fixture.invalid' },
    { ...manifest, apiOrigin: 'http://user:pass@localhost:3002' }, { ...manifest, webOrigin: 'http://127.0.0.1:5174' },
    { ...manifest, webOrigin: 'https://external.fixture.invalid' }, { ...manifest, binding: '0.0.0.0' },
    { ...manifest, externalProviders: 'enabled' }]) {
    assert.throws(() => assertLocalInstallationManifest(invalid, profile), /recompilation locale obligatoire/)
  }
})

test('une origine héritée ne choisit ni destination d’authentification ni profil inconnu', async () => {
  const env = localBuildEnvironment('business', { CREORGA_BUSINESS_ONLY: 'false', VITE_DEMO_AUTOLOGIN: 'true',
    VITE_DEMO_EMAIL: 'unused@fixture.invalid', VITE_DEMO_PASSWORD: 'unused-fixture', VITE_COMPANY_ID: 'fixture',
    VITE_BACKEND_URL: 'https://external.fixture.invalid', VITE_REMOTE_BACKEND: 'https://external.fixture.invalid' })
  assert.equal(env.VITE_BACKEND_URL, 'http://localhost:3002')
  assert.equal(env.CREORGA_BUSINESS_ONLY, 'true')
  assert.equal(env.VITE_DEMO_AUTOLOGIN, 'false')
  assert.equal(env.VITE_DEMO_EMAIL, '')
  assert.equal(env.VITE_DEMO_PASSWORD, '')
  assert.equal(env.VITE_COMPANY_ID, '')
  assert.throws(() => localBuildEnvironment('production'), /Profil attendu/)
  assert.throws(() => localInstallationManifest('production'), /Profil attendu/)
  assert.throws(() => assertLocalInstallationManifest({}, 'production'), /Profil attendu/)
  await assert.rejects(captureBuildPlan('production'), /Profil attendu/)
})
