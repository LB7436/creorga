import path from 'node:path'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { LOCAL_API_ORIGIN, LOCAL_FRONTENDS, localBuildEnvironment, localInstallationManifest } from './local/local-origin-policy.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const profile = process.argv[2] || 'business'
if (!['business', 'full'].includes(profile)) throw Error('Profil attendu : business ou full')
// process.env VITE_* prime sur les anciens .env.production de chaque app.
// Ce constructeur est EXCLUSIVEMENT local, y compris son profil complet.
const apiOrigin = LOCAL_API_ORIGIN
const env = localBuildEnvironment(profile, process.env)
const run = (args, cwd) => execFileSync(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true })
for (const [app] of LOCAL_FRONTENDS) {
  const cwd = path.join(root, 'apps', app)
  // Ne pas régénérer le buildinfo utilisateur, ni nettoyer des données.
  run([path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.json'], cwd)
  run([path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', `dist-${profile}`], cwd)
  fs.writeFileSync(path.join(cwd, `dist-${profile}`, 'local-installation.json'), JSON.stringify(localInstallationManifest(profile), null, 2))
}
run([path.join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], path.join(root, 'apps/backend'))
const sourceFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', windowsHide: true }).split('\0')
  .filter(file => /^(?:apps\/|scripts\/|package(?:-lock)?\.json$)/.test(file) && !/(?:^|\/)\.env|\.tsbuildinfo$/.test(file))
  .filter(file => fs.existsSync(path.join(root, file))).sort()
const hash = createHash('sha256')
for (const file of sourceFiles) { hash.update(file); hash.update('\0'); hash.update(fs.readFileSync(path.join(root, file))) }
const manifest = { profile, builtAt: new Date().toISOString(), apiOrigin, sourceFingerprint: { algorithm: 'sha256', files: sourceFiles.length, digest: hash.digest('hex'), includesUntrackedSource: true },
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(),
  changes: execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/).filter(Boolean),
  note: 'Compilation locale ; aucun environnement externe qualifié par ce fichier.' }
fs.writeFileSync(path.join(root, 'apps/web', `dist-${profile}`, 'build-manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`[CréOrga] Compilation ${profile} terminée (5 applications).`)
