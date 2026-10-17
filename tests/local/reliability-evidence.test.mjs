import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validateReliabilityUnits, validateReliabilityBrowsers, reliabilityPerformance } from '../../scripts/render-reliability-evidence.mjs'

const since = '2026-10-17T07:00:00Z', fresh = '2026-10-17T08:00:00.000Z'
function unit() { return { startTime: Date.parse(fresh), success: true, numFailedTestSuites: 0, numPassedTests: 1, numFailedTests: 0, numPendingTests: 0, numTotalTests: 1, testResults: [{ assertionResults: [{ status: 'passed' }] }] } }
function units() { return Object.fromEntries(['backend-unit', 'web-unit', 'pos-unit', 'integration'].map(name => [name, unit()])) }
function browser(file, name) { return { stats: { startTime: fresh, skipped: 0 }, errors: [], suites: [{ file, specs: [{ file, title: name,
  tests: [{ expectedStatus: 'passed', results: [{ status: 'passed', startTime: fresh, duration: 12 }] }] }] }] } }
const manifest = [{ file: 'tests/browser-lab/a.spec.ts', name: 'clic A' }, { file: 'tests/browser-lab/b.spec.ts', name: 'clic B' }]
const browsers = () => [browser('a.spec.ts', 'clic A'), browser('b.spec.ts', 'clic B')]

test('les quatre suites fraîches et chaque cas Chrome déclaré sont requis, sans statuts inventés', () => {
  const summary = validateReliabilityUnits(units(), since)
  assert.equal(summary.length, 4); assert.equal(summary.reduce((sum, row) => sum + row.passed, 0), 4)
  const chrome = validateReliabilityBrowsers(browsers(), { since, expectedCases: manifest, expectedFiles: ['a.spec.ts', 'b.spec.ts'] })
  assert.deepEqual(chrome.counts, { PASS: 2, FAIL: 0, 'NOT RUN': 0 })
  assert.equal(chrome.globalErrors, 0)
})

test('les unités absentes, anciennes, échouées, ignorées ou aux compteurs incohérents sont refusées', () => {
  const missing = units(); delete missing['pos-unit']
  assert.throws(() => validateReliabilityUnits(missing, since))
  const old = units(); old['web-unit'].startTime = Date.parse('2026-10-16T20:00:00Z')
  assert.throws(() => validateReliabilityUnits(old, since), /ancien|date/i)
  const failed = units(); failed['web-unit'].success = false
  assert.throws(() => validateReliabilityUnits(failed, since))
  const skipped = units(); skipped['web-unit'].numPendingTests = 1
  assert.throws(() => validateReliabilityUnits(skipped, since))
  const inconsistent = units(); inconsistent['web-unit'].testResults[0].assertionResults[0].status = 'pending'
  assert.throws(() => validateReliabilityUnits(inconsistent, since))
  assert.throws(() => validateReliabilityUnits(units(), '2026-10-16T07:00:00Z'), /date|seuil/i)
})

test('Chrome refuse fichier ou cas absent, doublon, erreur globale, skip et ancienne exécution', () => {
  const options = { since, expectedCases: manifest, expectedFiles: ['a.spec.ts', 'b.spec.ts'] }
  assert.throws(() => validateReliabilityBrowsers(browsers().slice(0, 1), options))
  assert.throws(() => validateReliabilityBrowsers([...browsers(), browser('a.spec.ts', 'clic A')], options), /doublon/i)
  const globalError = browsers(); globalError[0].errors = [{ message: 'erreur fictive privée à ne pas publier' }]
  assert.throws(() => validateReliabilityBrowsers(globalError, options), /globale/i)
  const skipped = browsers(); skipped[0].suites[0].specs[0].tests[0].results[0].status = 'skipped'
  assert.throws(() => validateReliabilityBrowsers(skipped, options))
  const old = browsers(); old[0].suites[0].specs[0].tests[0].results[0].startTime = '2026-10-16T22:00:00Z'
  assert.throws(() => validateReliabilityBrowsers(old, options), /ancien|date/i)
  const partial = browsers(); partial[1].suites[0].specs[0].title = 'autre cas'
  assert.throws(() => validateReliabilityBrowsers(partial, options))
})

function performanceFixture() {
  const http = { measuredAt: fresh, request: 'PUT fictif', instrumentation: 'mêmes instruments', dataset: { products: 10, tables: 2, covers: 3, lines: 5 }, datasetHash: 'a'.repeat(64), os: 'Windows fictif', cpu: 'CPU fictif', node: 'v22', n: 2, warmup: 1, samplesMs: [100, 110], p95Ms: 110,
    sql: { queryCount: 10, sqlCumulativeMs: 20, operations: { 'SELECT:OrderTender': { n: 4, ms: 2 } }, io: { fsyncSync: { n: 2, ms: 3 } } }, topCpu: [] }
  const ui = { measuredAt: fresh, chrome: 'Chrome fictif', dataset: { products: 10, tables: 2, lines: 5 }, measurements: [{ name: 'planning', samples: [10, 11], medianMs: 10.5, p95Ms: 11 }], jsErrors: [] }
  const resources = { measuredAt: fresh, logicalCpus: 2, measurements: [{ at: fresh, cpuNormalizedPercent: 0, workingSetSumMiB: 100, privateCommitMiB: 75, processCount: 2, gpuEnginePercentSum: null, gpuDedicatedMiB: null, gpuSharedMiB: null, gpuError: 'Compteur indisponible' }] }
  return { before: { http, ui, resources, startup: { at: fresh, profile: 'business', readyMs: 2000, pid: 123 } }, after: { http: structuredClone(http), ui: structuredClone(ui), resources: structuredClone(resources), startup: { at: fresh, profile: 'business', readyMs: 1000, pid: 456 } } }
}

test('les mesures appariées préservent unités/limites et n’inventent pas de GPU ou gain de démarrage', () => {
  const result = reliabilityPerformance(performanceFixture(), since)
  assert.equal(result.http.datasetHash, 'a'.repeat(64))
  assert.equal(result.resources.before.workingSetSumMiB, 100)
  assert.equal(result.resources.before.gpuDedicatedMiB, null)
  assert.equal(result.startup.causallyComparable, false)
  assert.equal(result.startup.gainClaimed, false)
  assert.ok(!JSON.stringify(result).includes('"pid"'))
})

test('une empreinte ou volumétrie différente interdit la comparaison et les dates manquantes sont refusées', () => {
  const changed = performanceFixture(); changed.after.http.datasetHash = 'b'.repeat(64)
  assert.throws(() => reliabilityPerformance(changed, since), /jeu|données|empreinte/i)
  const uiChanged = performanceFixture(); uiChanged.after.ui.dataset.lines++
  assert.throws(() => reliabilityPerformance(uiChanged, since), /jeu|données|volumétrie/i)
  const stale = performanceFixture(); stale.before.resources.measuredAt = '2026-10-16T08:00:00Z'
  assert.throws(() => reliabilityPerformance(stale, since), /ancien|date/i)
})

test('le rendu CLI incomplet ne crée ni ne remplace aucune preuve publique', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const names = ['validation-fiabilite-2026-10-17.json', 'performance-fiabilite-2026-10-17.json', 'inventaire-t100-fiabilite-2026-10-17.jsonl']
  const snapshot = () => names.map(name => {
    const file = path.join(root, 'docs/2.0/preuves', name)
    return fs.existsSync(file) ? fs.readFileSync(file) : null
  })
  const before = snapshot(), incomplete = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-evidence-incomplet-'))
  const run = spawnSync(process.execPath, [path.join(root, 'scripts/render-reliability-evidence.mjs'), incomplete], { cwd: root, encoding: 'utf8', windowsHide: true })
  assert.notEqual(run.status, 0)
  assert.deepEqual(snapshot(), before)
})
