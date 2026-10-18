import { register } from 'node:module'
import { readFile, access } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { startStaticHost, closeStaticHost } from './static-host.mjs'
import { startRuntimeControl } from './runtime-control.mjs'
import { LOCAL_BIND_HOST, LOCAL_API_PORT, LOCAL_WEB_ORIGIN, LOCAL_BROWSER_ORIGINS, LOCAL_FRONTENDS,
  localArtifactDirectory, localContext, assertLocalInstallationManifest } from './local-origin-policy.mjs'

// Entrée unique : API + quatre interfaces statiques dans un seul processus Node.
// PostgreSQL est géré séparément. Aucun seed, install, reset ou migration au boot.
const profile = process.argv.includes('--full') ? 'full' : 'business'
const artifactDirectory = localArtifactDirectory(profile)
const backendDirectory = localArtifactDirectory(profile, { backend: true })
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const runtimeDirectory = process.env.CREORGA_RUNTIME_DIR
if (!runtimeDirectory || !path.isAbsolute(runtimeDirectory)) throw Error('CREORGA_RUNTIME_DIR absolu requis : aucune nouvelle arborescence de données créée implicitement.')
await access(path.join(runtimeDirectory, 'data'))
process.chdir(runtimeDirectory)
let database
try { database = new URL(process.env.DATABASE_URL) } catch { throw Error('DATABASE_URL privée requise avant le lancement local.') }
if (!['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname) || !['postgres:', 'postgresql:'].includes(database.protocol)) throw Error('Le lanceur local refuse une base distante.')
const context = localContext()
const guardedDatabase = { 'f18-isolated': ['15450', '/creorga_f18_local'], 'f18-recovery': ['25450', '/creorga_f18_recovery'] }[context.name]
if (guardedDatabase && (database.hostname !== '127.0.0.1' || database.port !== guardedDatabase[0]
  || database.pathname !== guardedDatabase[1] || database.search !== '' || database.hash !== '')) {
  throw Error(`Le contexte ${context.name} exige la base 127.0.0.1:${guardedDatabase[0]}${guardedDatabase[1]} sans paramètres ni fragment.`)
}
if (process.env.EMAIL_TEST_ONLY !== 'true') throw Error('EMAIL_TEST_ONLY=true requis dans cette installation de laboratoire.')
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) throw Error('Secrets privés de session requis ; aucune valeur de démonstration créée.')
Object.assign(process.env, {
  NODE_ENV: 'production', CREORGA_BIND_HOST: LOCAL_BIND_HOST, PORT: String(LOCAL_API_PORT),
  FRONTEND_URL: LOCAL_WEB_ORIGIN, ALLOWED_ORIGINS: LOCAL_BROWSER_ORIGINS.join(','),
  CREORGA_BUSINESS_ONLY: profile === 'business' ? 'true' : 'false', CREORGA_BACKGROUND_MODE: 'essential',
  FALLBACK_ADMIN_ENABLED: 'false', CREORGA_FLOOR_AUTHORITY: 'postgres',
  PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: '', PAYPAL_CLIENT_SECRET: '', PAYPAL_LIVE_ENABLED: 'false',
  STRIPE_PAYMENT_KEY: '', STRIPE_PAYMENT_WEBHOOK_SECRET: '', STRIPE_PAYMENTS_LIVE_ENABLED: 'false',
  PAYMENT_MERCHANT_COMPANY_ID: '',
})
const apps = LOCAL_FRONTENDS
for (const [app] of apps) {
  const directory = path.join(root, 'apps', app, artifactDirectory)
  await access(path.join(directory, 'index.html'))
  const installation = JSON.parse(await readFile(path.join(directory, 'local-installation.json'), 'utf8'))
  assertLocalInstallationManifest(installation, profile)
}
const proof = JSON.parse(await readFile(path.join(root, 'apps/web', artifactDirectory, 'profile-manifest.json'), 'utf8'))
if (proof.profile !== profile || (profile === 'business' && proof.gameModuleCount !== 0)) throw Error('Compilation de profil incohérente : relancer build:business ou build:full.')
const backendEntry = path.join(root, 'apps/backend', backendDirectory, 'src/index.js')
await access(backendEntry)
if (localContext().name !== 'default') {
  const installation = JSON.parse(await readFile(path.join(root, 'apps/backend', backendDirectory, 'local-installation.json'), 'utf8'))
  assertLocalInstallationManifest(installation, profile)
}
register('./extensionless-esm.mjs', import.meta.url)
const servers = []
let backend, control, stopping, shutdownDiagnostic
const logActivity = phase => {
  try {
    const activity = backend?.getBackendActivityDiagnostics?.()
    console.log('[CréOrga] Activité arrêt', JSON.stringify({ phase, available: !!activity, ...activity }))
  } catch { console.error('[CréOrga] Compteurs d’activité indisponibles ; aucun état réussi déduit.') }
}
const closeFrontends = () => Promise.all(servers.map(closeStaticHost)).catch(error => {
  shutdownDiagnostic ||= { stage: 'frontends', reason: 'FRONTEND_CLOSE_FAILED' }
  console.error('[CréOrga] Arrêt non confirmé', JSON.stringify(shutdownDiagnostic))
  throw error
})
// Aucun SIGKILL de secours : un arrêt ambigu reste à diagnostiquer, pas « réussi ».
const shutdown = () => stopping ??= (async () => {
  if (!backend?.shutdownBackend) {
    shutdownDiagnostic ||= { stage: 'runtime', reason: 'BACKEND_NOT_AVAILABLE' }
    throw Error('Arrêt coordonné indisponible')
  }
  logActivity('before')
  try {
    await Promise.all([closeFrontends(), backend.shutdownBackend().catch(error => {
      shutdownDiagnostic ||= backend.getBackendShutdownDiagnostic?.() || { stage: 'runtime', reason: 'UNSPECIFIED_FAILURE' }
      throw error
    })])
  } finally { logActivity('settled') }
})()
try {
  for (const [app, port] of apps) servers.push(await startStaticHost({ directory: path.join(root, 'apps', app, artifactDirectory), port, apiPort: LOCAL_API_PORT }))
  backend = await import(pathToFileURL(backendEntry).href)
  await backend.backendReady
  if (process.env.CREORGA_CONTROL_FILE) {
    control = await startRuntimeControl({ descriptorPath: process.env.CREORGA_CONTROL_FILE, onShutdown: shutdown,
      getShutdownDiagnostic: () => shutdownDiagnostic || backend.getBackendShutdownDiagnostic?.(),
    })
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    void shutdown().then(() => control?.close()).catch(() => {
      console.error('[CréOrga] Arrêt non confirmé ; conserver le processus et consulter le journal privé.')
      process.exitCode = 1
    })
  })
  console.log(`[CréOrga] Profil ${profile}, interfaces compilées sur 127.0.0.1 ; tâches essentielles, aucune purge automatique.`)
} catch (error) {
  console.error(`[CréOrga] Démarrage refusé : ${error.code || error.name || 'erreur'} ; consulter le journal privé.`)
  try {
    if (backend?.shutdownBackend) await shutdown()
    else await closeFrontends()
    await control?.close()
  } catch { console.error('[CréOrga] Nettoyage de démarrage non confirmé ; aucune interruption forcée.') }
  process.exitCode = 1
}
