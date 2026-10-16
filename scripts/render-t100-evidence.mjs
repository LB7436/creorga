/** Preuves réduites : les journaux, comptes et captures bruts restent dans le laboratoire. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { scanWorkspace } from './audit-ui-controls.mjs'

export function summarizeUnit(report, suite) {
  return { suite, executedAt: new Date(report.startTime).toISOString(), passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests }
}

export function summarizeBrowser(report) {
  const cases = []
  function visit(suite, file) {
    file = suite.file || file
    for (const spec of suite.specs || []) for (const test of spec.tests || []) {
      const result = test.results?.at(-1)
      const failed = test.results?.some(r => ['failed', 'timedOut', 'interrupted'].includes(r.status))
      const status = failed ? 'FAIL' : result?.status === 'passed' && test.expectedStatus === 'passed' ? 'PASS' : 'NOT RUN'
      cases.push({ file: 'tests/browser-lab/' + path.basename(file || spec.file || 'inconnu'), name: spec.title,
        status, executedAt: result?.startTime || report.stats.startTime, durationMs: result?.duration })
    }
    for (const child of suite.suites || []) visit(child, file)
  }
  visit(report)
  return { executedAt: report.stats.startTime, globalErrors: (report.errors || []).length, counts: Object.fromEntries(['PASS', 'FAIL', 'NOT RUN'].map(s => [s, cases.filter(c => c.status === s).length])), cases }
}

function performanceEvidence(report, root) {
  let result
  function visit(suite) {
    for (const spec of suite.specs || []) for (const test of spec.tests || []) for (const run of test.results || []) {
      if (run.status !== 'passed') continue
      for (const attachment of run.attachments || []) if (attachment.name === 'performance-locale.json') {
        let data
        if (attachment.body) data = JSON.parse(Buffer.from(attachment.body, 'base64').toString())
        else {
          const file = path.resolve(attachment.path), allowed = path.resolve(root, 'test-results') + path.sep
          assert.ok(file.startsWith(allowed), 'Pièce de performance hors du répertoire de recette')
          data = JSON.parse(fs.readFileSync(file, 'utf8'))
        }
        result = Object.fromEntries(['measuredAt', 'os', 'cpu', 'logicalCpus', 'ramGiB', 'node', 'chrome', 'network', 'actualDataset', 'bootstrapHttpAndJson', 'draftConfirmedHttpAndJson', 'manualPaymentConfirmedHttpAndJson', 'dialogClickToOpaquePlaywright', 'sizes', 'dialogTextContrast', 'jsErrors', 'limitations'].map(key => [key, data[key]]))
      }
    }
    for (const child of suite.suites || []) visit(child)
  }
  visit(report)
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [reports, sinceText] = process.argv.slice(2), since = Date.parse(sinceText)
  if (!reports || !Number.isFinite(since)) throw Error('Usage : node scripts/render-t100-evidence.mjs <dossier-privé> <date-ISO-minimale>')
  const root = path.resolve(import.meta.dirname, '..'), output = path.join(root, 'docs/2.0/preuves')
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
  const unit = ['backend-unit', 'web-unit', 'pos-unit', 'integration'].map(suite => {
    const raw = read(path.join(reports, `t100-${suite}.json`))
    assert.equal(raw.success, true, 'Suite interrompue ou en erreur')
    assert.equal(raw.numFailedTestSuites, 0)
    return summarizeUnit(raw, suite)
  })
  const rawBrowser = read(path.join(root, 'test-results/business-recipe-browser.json'))
  const browser = summarizeBrowser(rawBrowser)
  for (const run of [...unit, browser]) assert.ok(Date.parse(run.executedAt) >= since, 'Rapport ancien refusé')
  for (const run of unit) { assert.equal(run.failed, 0); assert.equal(run.skipped, 0); assert.ok(run.passed > 0) }
  assert.ok(browser.cases.length > 0)
  assert.equal(browser.globalErrors, 0)
  assert.equal(browser.counts.FAIL, 0); assert.equal(browser.counts['NOT RUN'], 0)
  const inventory = scanWorkspace(root)
  assert.ok(inventory.metadata.completeParse)
  assert.ok(inventory.controls.every(c => c.status === 'NOT RUN' && c.evidence.length === 0))
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
  const proof = { generatedAt: new Date().toISOString(), sourceCommit: commit, since: sinceText,
    environment: 'Windows, PostgreSQL 16 loopback:5450 ; sociétés et comptes fictifs ; Chrome neuf, jamais de profil historique.',
    scope: 'Unités, PostgreSQL et parcours Chrome ciblés ; IA, incidents et certaines frontières UI simulés explicitement dans les noms et tests. Aucun prestataire bancaire réel, matériel physique ou déploiement.',
    unit, browser, browserPerformance: performanceEvidence(rawBrowser, root), inventory: inventory.metadata,
    t100: { status: 'NOT RUN', reason: 'Inventaire source réalisé et contrôles critiques étendus exécutés ; tous les contrôles rendus, rôles et erreurs du produit ne sont pas encore couverts. Aucun PASS global déduit de cet inventaire.' } }
  fs.mkdirSync(output, { recursive: true })
  fs.writeFileSync(path.join(output, 't100-validation-2026-10-16.json'), JSON.stringify(proof, null, 2) + '\n')
  // Une entrée par ligne pour revue/diff, identifiants stables dans un source donné.
  const lines = [{ type: 'metadata', ...inventory.metadata }, ...inventory.routes.map(row => ({ type: 'route', ...row })), ...inventory.controls.map(row => ({ type: 'control', ...row }))]
  fs.writeFileSync(path.join(output, 't100-inventaire-source-2026-10-16.jsonl'), lines.map(row => JSON.stringify(row)).join('\n') + '\n')
  console.log(JSON.stringify({ unit, browser: browser.counts, inventory: inventory.metadata.totals, t100: proof.t100.status }, null, 2))
}
