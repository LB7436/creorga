import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { assertLocalInstallationManifest } from '../../scripts/local/local-origin-policy.mjs'
const root = path.resolve(import.meta.dirname, '../..')

test('le livrable business ne contient aucun jeu ; le livrable complet les conserve', () => {
  const business = path.join(root, 'apps/web/dist-business')
  const full = path.join(root, 'apps/web/dist-full')
  const a = JSON.parse(fs.readFileSync(path.join(business, 'profile-manifest.json'), 'utf8'))
  const b = JSON.parse(fs.readFileSync(path.join(full, 'profile-manifest.json'), 'utf8'))
  assert.equal(a.profile, 'business'); assert.equal(a.gameModuleCount, 0)
  assert.equal(a.games.length, 0)
  assert.ok(b.gameModuleCount > 40)
  assert.equal(fs.existsSync(path.join(business, 'cards/scopa')), false)
  assert.equal(fs.readdirSync(path.join(full, 'cards/scopa')).length, 41)
  assert.equal(fs.readdirSync(path.join(root, 'apps/web/public/cards/scopa')).length, 41)
  const chunks = fs.readdirSync(path.join(business, 'assets'))
  assert.equal(chunks.some(name => /MenschGame|TowerDefense|chess\.worker|ScopaGame/.test(name)), false)
  for (const app of ['pos', 'guest', 'superadmin']) assert.ok(fs.existsSync(path.join(root, 'apps', app, 'dist-business/index.html')))
  for (const profile of ['business', 'full']) for (const app of ['web', 'pos', 'guest', 'superadmin']) {
    const installation = JSON.parse(fs.readFileSync(path.join(root, 'apps', app, `dist-${profile}`, 'local-installation.json'), 'utf8'))
    assertLocalInstallationManifest(installation, profile)
    const assets = path.join(root, 'apps', app, `dist-${profile}`, 'assets')
    const chunks = fs.readdirSync(assets).filter(name => name.endsWith('.js')).map(name => fs.readFileSync(path.join(assets, name), 'utf8'))
    const productionEnv = path.join(root, 'apps', app, '.env.production')
    const destinations = fs.existsSync(productionEnv) ? [...fs.readFileSync(productionEnv, 'utf8')
      .matchAll(/^(VITE_(?:BACKEND_URL|REMOTE_BACKEND|POS_URL|CAISSE_URL|BACKOFFICE_URL|WEB_CLIENT_URL|API_URL|ANALYTICS_URL|OLLAMA_URL))\s*=\s*["']?([^\r\n"']+)/gm)] : []
    for (const match of destinations) if (/^https?:/.test(match[2].trim()) && !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/.test(match[2].trim())) {
      assert.equal(chunks.some(chunk => chunk.includes(match[2].trim())), false, `${app}/${profile} ne doit pas conserver ${match[1]} de production`)
    }
    if (app === 'web' || app === 'pos') {
      assert.ok(chunks.some(chunk => chunk.includes('http://localhost:3002')), `${app}/${profile} doit utiliser l’API locale de même hostname`)
      assert.equal(chunks.some(chunk => chunk.includes('http://127.0.0.1:3002')), false, `${app}/${profile} ne doit pas garder l’ancienne destination de session`)
    }
  }
})
