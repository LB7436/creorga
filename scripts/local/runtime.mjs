import { register } from 'node:module'
import { readFile, access } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { startStaticHost } from './static-host.mjs'

// Entrée unique : API + quatre interfaces statiques dans un seul processus Node.
// PostgreSQL est géré séparément. Aucun seed, install, reset ou migration au boot.
const profile = process.argv.includes('--full') ? 'full' : 'business'
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const runtimeDirectory = process.env.CREORGA_RUNTIME_DIR
if (!runtimeDirectory || !path.isAbsolute(runtimeDirectory)) throw Error('CREORGA_RUNTIME_DIR absolu requis : aucune nouvelle arborescence de données créée implicitement.')
await access(path.join(runtimeDirectory, 'data'))
process.chdir(runtimeDirectory)
let database
try { database = new URL(process.env.DATABASE_URL) } catch { throw Error('DATABASE_URL privée requise avant le lancement local.') }
if (!['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname) || !['postgres:', 'postgresql:'].includes(database.protocol)) throw Error('Le lanceur local refuse une base distante.')
if (process.env.EMAIL_TEST_ONLY !== 'true') throw Error('EMAIL_TEST_ONLY=true requis dans cette installation de laboratoire.')
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) throw Error('Secrets privés de session requis ; aucune valeur de démonstration créée.')
Object.assign(process.env, {
  NODE_ENV: 'production', CREORGA_BIND_HOST: '127.0.0.1', PORT: '3002',
  CREORGA_BUSINESS_ONLY: profile === 'business' ? 'true' : 'false', CREORGA_BACKGROUND_MODE: 'essential',
  FALLBACK_ADMIN_ENABLED: 'false', CREORGA_FLOOR_AUTHORITY: 'postgres',
  PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: '', PAYPAL_CLIENT_SECRET: '', PAYPAL_LIVE_ENABLED: 'false',
  STRIPE_PAYMENT_KEY: '', STRIPE_PAYMENT_WEBHOOK_SECRET: '', STRIPE_PAYMENTS_LIVE_ENABLED: 'false',
  PAYMENT_MERCHANT_COMPANY_ID: '',
})
const apps = [['web', 5174], ['pos', 5175], ['superadmin', 5177], ['guest', 5178]]
for (const [app] of apps) {
  const directory = path.join(root, 'apps', app, `dist-${profile}`)
  await access(path.join(directory, 'index.html'))
  const installation = JSON.parse(await readFile(path.join(directory, 'local-installation.json'), 'utf8'))
  if (installation.profile !== profile || installation.apiOrigin !== 'http://127.0.0.1:3002' || installation.binding !== 'loopback') {
    throw Error('Livrable local non vérifié : recompilation locale obligatoire avant ouverture.')
  }
}
const proof = JSON.parse(await readFile(path.join(root, 'apps/web', `dist-${profile}`, 'profile-manifest.json'), 'utf8'))
if (proof.profile !== profile || (profile === 'business' && proof.gameModuleCount !== 0)) throw Error('Compilation de profil incohérente : relancer build:business ou build:full.')
await access(path.join(root, 'apps/backend/dist/src/index.js'))
register('./extensionless-esm.mjs', import.meta.url)
const servers = []
try {
  for (const [app, port] of apps) servers.push(await startStaticHost({ directory: path.join(root, 'apps', app, `dist-${profile}`), port }))
  await import(pathToFileURL(path.join(root, 'apps/backend/dist/src/index.js')).href)
  console.log(`[CréOrga] Profil ${profile}, interfaces compilées sur 127.0.0.1 ; tâches essentielles, aucune purge automatique.`)
} catch (error) {
  for (const server of servers) server.close()
  console.error(`[CréOrga] Démarrage refusé : ${error.code || error.name || 'erreur'} ; consulter le journal privé.`)
  process.exit(1)
}
