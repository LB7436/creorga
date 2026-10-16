import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scannerUrl = new URL('../../scripts/audit-ui-controls.mjs', import.meta.url)

async function scanner() {
  try { return await import(scannerUrl.href) }
  catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
    assert.fail('Le scanner AST attendu doit être implémenté ; le module est absent.')
  }
}

function fixtureWorkspace(t) {
  const root = mkdtempSync(join(tmpdir(), 'creorga-ui-fixture-'))
  t.after(() => {
    assert.ok(basename(root).startsWith('creorga-ui-fixture-'))
    rmSync(root, { recursive: true, force: true })
  })
  function source(file, content) {
    const target = join(root, file)
    mkdirSync(join(target, '..'), { recursive: true })
    writeFileSync(target, content)
  }
  return { root, source }
}

// Catches treating comments / string contents as JSX or exporting sensitive values.
test('inventorie les vrais contrôles JSX sans copier les valeurs ni le code des handlers', async () => {
  const { scanSource } = await scanner()
  const result = scanSource(`
const text = '<button onClick="fake">faux</button>'
// <button>Commentaire</button>
export function Page() {
  return <main>
    {/* <input value="COMMENT_SECRET"/> */}
    <button onClick={() => api.save('HANDLER_SECRET')}><span>Enregistrer</span></button>
    <a href="/client?token=URL_SECRET">Client</a>
    <form onSubmit={handleSubmit}>
      <input type="email" value="person@example.invalid" placeholder="PRIVATE_PLACEHOLDER"/>
      <select onChange={choose}><option>FR</option></select>
      <textarea defaultValue="PRIVATE_NOTE"/>
    </form>
    <div role="button" onKeyDown={e => activate(e.key)} title="Ouvrir">Action</div>
    <Widget onTouchStart={start} onDragEnd={() => end()}/>
  </main>
}`, { file: 'apps/web/src/Page.tsx', app: 'web' })
  assert.equal(result.controls.length, 9)
  assert.deepEqual(result.controls.map(control => control.tag), [
    'button', 'a', 'form', 'input', 'select', 'option', 'textarea', 'div', 'Widget',
  ])
  const button = result.controls[0]
  assert.equal(button.label, 'Enregistrer')
  assert.equal(button.component, 'Page')
  assert.equal(button.file, 'apps/web/src/Page.tsx')
  assert.equal(button.line, 7)
  assert.equal(button.column, 5)
  assert.deepEqual(button.handlers, [{ name: 'onClick', calls: ['api.save'], references: [], dynamic: false }])
  assert.deepEqual(result.controls[2].handlers[0].references, ['handleSubmit'])
  assert.deepEqual(result.controls[7].handlers[0].calls, ['activate'])
  assert.equal(result.controls[1].href, '/client?[REDACTED]')
  assert.equal(result.controls[3].inputType, 'email')
  assert.equal(result.controls[7].title, 'Ouvrir')
  assert.ok(result.controls.every(control => control.status === 'NOT RUN' && control.evidence.length === 0))
  assert.ok(result.controls.every(control => control.reasons.includes('STATIC_SOURCE_NOT_EXECUTED')))
  const serialized = JSON.stringify(result)
  for (const secret of ['HANDLER_SECRET', 'URL_SECRET', 'person@example.invalid', 'PRIVATE_PLACEHOLDER', 'PRIVATE_NOTE', 'COMMENT_SECRET', "api.save('"])
    assert.equal(serialized.includes(secret), false, `La valeur privée ${secret} ne doit pas être exportée.`)
})

// Catches expansion of a .map template into pretend executed instances / loss of nested controls.
test('conserve les contrôles imbriqués et marque les gabarits map et branches conditionnelles', async () => {
  const { scanSource } = await scanner()
  const source = `const Page = () => <>
    {rows.map(row => <Card onClick={() => select(row.id)}>
      <button disabled={row.locked} aria-label={row.name} onClick={choose}>Choisir</button>
      {canDelete && <button disabled title="Supprimer" onClick={remove}/>}
    </Card>)}
    <button disabled={false}>Actif</button>
    <motion.button {...dragProps} onPointerDown={begin} onDrop={() => finish()}>Déplacer</motion.button>
  </>`
  const result = scanSource(source, { file: 'apps/pos/src/Page.tsx', app: 'pos' })
  assert.equal(result.controls.length, 5)
  assert.equal(result.controls[0].tag, 'Card')
  assert.equal(result.controls[1].disabled, 'DYNAMIC')
  assert.equal(result.controls[1].ariaLabel, 'DYNAMIC')
  assert.deepEqual(result.controls.slice(0, 3).map(control => control.template), [true, true, true])
  assert.deepEqual(result.controls[1].templateSources, ['map'])
  assert.equal(result.controls[2].conditional, true)
  assert.equal(result.controls[2].disabled, true)
  assert.equal(result.controls[3].template, false)
  assert.equal(result.controls[3].disabled, false)
  assert.equal(result.controls[4].spreadAttributes, true)
  assert.ok(result.controls[4].reasons.includes('SPREAD_ATTRIBUTES_UNRESOLVED'))
  assert.deepEqual(result.controls[4].handlers.map(handler => handler.name), ['onPointerDown', 'onDrop'])
  const repeated = scanSource(source, { file: 'apps/pos/src/Page.tsx', app: 'pos' })
  assert.deepEqual(result.controls.map(control => control.id), repeated.controls.map(control => control.id))
  assert.equal(new Set(result.controls.map(control => control.id)).size, 5)
})

// Catches copying JavaScript expressions, mail addresses, credential URLs, or literal-handler bodies.
test('réduit les expressions aux noms de fonctions et expurge les attributs sensibles', async () => {
  const { scanSource } = await scanner()
  const { controls } = scanSource(`export default () => <>
    <input type="password" value={"PASSWORD_SECRET"} defaultValue="DEFAULT_SECRET" onChange={e => update(e.target.value)}/>
    <a href="mailto:contact@example.invalid" title="Écrire à contact@example.invalid">contact@example.invalid</a>
    <a href="https://user:URL_PASSWORD@example.invalid/path?key=QUERY_SECRET#FRAGMENT_SECRET">Page</a>
    <a href={computeUrl('DYNAMIC_URL_SECRET')} onClick={handlers['LITERAL_KEY_SECRET']}>Ouvrir</a>
    <div role={computeRole()} onClick={enabled ? handleAccept : handleReject}/>
    <a href="javascript:send('SCRIPT_SECRET')">Script</a>
    <Link to={routes.settings}>Réglages</Link>
  </>`, { file: 'fixture.tsx' })
  assert.equal(controls.length, 7)
  assert.equal(controls[1].href, 'mailto:[REDACTED]')
  assert.equal(controls[1].label, '[EMAIL_REDACTED]')
  assert.equal(controls[2].href, 'https://example.invalid/path?[REDACTED]')
  assert.equal(controls[3].href, 'DYNAMIC')
  assert.equal(controls[3].handlers[0].dynamic, true)
  assert.equal(controls[4].role, 'DYNAMIC')
  assert.deepEqual(controls[4].handlers[0].references, ['handleAccept', 'handleReject'])
  assert.equal(controls[5].href, 'DYNAMIC')
  assert.equal(controls[6].to, 'DYNAMIC')
  const exported = JSON.stringify(controls)
  for (const secret of ['PASSWORD_SECRET', 'DEFAULT_SECRET', 'contact@example.invalid', 'URL_PASSWORD', 'QUERY_SECRET', 'FRAGMENT_SECRET', 'DYNAMIC_URL_SECRET', 'LITERAL_KEY_SECRET', 'SCRIPT_SECRET', 'e.target.value'])
    assert.equal(exported.includes(secret), false, `${secret} doit être absent de l’export.`)
})

// Catches unlabeled inventory entries when the real input is named by an ordinary HTML label.
test('retrouve les libellés htmlFor et englobants sans conserver les identifiants ou valeurs des champs', async () => {
  const { scanSource } = await scanner()
  const result = scanSource(`const Page = () => <>
    <label htmlFor="PRIVATE_IDENTIFIER">Société</label>
    <input id="PRIVATE_IDENTIFIER" value="PRIVATE_VALUE"/>
    <label>Mot de passe <span>professionnel</span><input type="password" defaultValue="PRIVATE_PASSWORD"/></label>
  </>`, { file: 'fixture.tsx' })
  assert.deepEqual(result.controls.map(control => control.label), ['Société', 'Mot de passe professionnel'])
  const exported = JSON.stringify(result)
  for (const secret of ['PRIVATE_IDENTIFIER', 'PRIVATE_VALUE', 'PRIVATE_PASSWORD'])
    assert.equal(exported.includes(secret), false)
})

// Catches flattened nested paths / attributing unrelated component controls to an executed route.
test('relève les routes JSX et leurs parents sans inventer les routes dynamiques', async () => {
  const { scanSource } = await scanner()
  const result = scanSource(`export function App() { return <Routes>
    <Route path="/gestion" element={<Layout/>}>
      <Route index element={<Home/>}/>
      <Route path="ventes" element={<Sales/>}/>
      <Route path={configuredPath} element={<DynamicPage/>}/>
      <Route path="aide" element={<button onClick={help}>Aide</button>}/>
    </Route>
  </Routes> }`, { file: 'apps/web/src/App.tsx', app: 'web' })
  assert.equal(result.routes.length, 5)
  assert.deepEqual(result.routes.map(route => route.fullPath), ['/gestion', '/gestion', '/gestion/ventes', 'DYNAMIC', '/gestion/aide'])
  assert.deepEqual(result.routes[0].components, ['Layout'])
  assert.equal(result.routes[1].index, true)
  assert.equal(result.routes[1].parentRouteId, result.routes[0].id)
  assert.equal(result.routes[0].component, 'App')
  assert.equal(result.controls.length, 1)
  assert.deepEqual(result.controls[0].routeIds, [result.routes[0].id, result.routes[4].id])
  assert.ok(result.routes.every(route => route.status === 'NOT RUN' && route.evidence.length === 0))
})

// Catches silent parse failures which would falsely present an incomplete inventory as exhaustive.
test('signale les diagnostics de parsing sans exporter les fragments du source', async () => {
  const { scanSource } = await scanner()
  const result = scanSource('export const Page = () => <button aria-label="PRIVATE_TEXT"', { file: 'broken.tsx' })
  assert.ok(result.diagnostics.length > 0)
  assert.ok(result.diagnostics.every(diagnostic => Number.isInteger(diagnostic.code) && diagnostic.line >= 1))
  assert.equal(JSON.stringify(result.diagnostics).includes('PRIVATE_TEXT'), false)
  assert.equal(result.metadata.completeParse, false)
})

// Catches scanning only web, including tests/build artefacts, or pretending totals prove runtime behavior.
test('scanne les cinq apps et produit des totaux statiques avec une CLI sans détails par défaut', async t => {
  const { scanWorkspace } = await scanner()
  const workspace = fixtureWorkspace(t)
  for (const app of ['web', 'pos', 'guest', 'superadmin', 'marketing'])
    workspace.source(`apps/${app}/src/Page.tsx`, `export const Page = () => <button>${app} test</button>`)
  workspace.source('apps/web/src/Page.test.tsx', 'const fake = <button>Test exclu</button>')
  workspace.source('apps/web/dist/build.tsx', 'const fake = <button>Build exclu</button>')
  workspace.source('apps/web/src/node_modules/nested.tsx', 'const fake = <button>Module exclu</button>')
  const result = scanWorkspace(workspace.root)
  assert.equal(result.controls.length, 5)
  assert.equal(result.metadata.totals.controls, 5)
  assert.equal(result.metadata.totals.files, 5)
  assert.deepEqual(Object.keys(result.metadata.byApp).sort(), ['guest', 'marketing', 'pos', 'superadmin', 'web'])
  assert.equal(result.metadata.byApp.web.controls, 1)
  assert.equal(result.metadata.byType.button, 5)
  assert.equal(result.metadata.runtimeVerified, false)
  assert.ok(result.metadata.algorithmVersion)
  assert.ok(result.metadata.limitations.length > 0)
  const cli = spawnSync(process.execPath, [fileURLToPath(scannerUrl), `--root=${workspace.root}`], { encoding: 'utf8' })
  assert.equal(cli.status, 0, cli.stderr)
  const summary = JSON.parse(cli.stdout)
  assert.equal(summary.totals.controls, 5)
  assert.equal(summary.controls, undefined)
  assert.equal(cli.stdout.includes('web test'), false)
  const output = join(workspace.root, 'report', 'inventory.json')
  const saved = spawnSync(process.execPath, [fileURLToPath(scannerUrl), `--root=${workspace.root}`, `--output=${output}`], { encoding: 'utf8' })
  assert.equal(saved.status, 0, saved.stderr)
  assert.equal(JSON.parse(readFileSync(output, 'utf8')).controls.length, 5)
})
