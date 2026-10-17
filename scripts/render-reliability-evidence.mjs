/** Rendu expurgé : aucun compte, secret, capture ou URL de capacité exporté. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { summarizeUnit, summarizeBrowser } from './render-t100-evidence.mjs'
import { scanWorkspace } from './audit-ui-controls.mjs'

export const MINIMUM_SINCE = '2026-10-17T07:00:00.000Z'
const SUITES = ['backend-unit', 'web-unit', 'pos-unit', 'integration']
const BROWSERS = ['reliability-final-existing-browser.json', 'reliability-ui-green-browser.json', 'reliability-documents-green-browser.json']
const finite = (value, label) => { assert.ok(typeof value === 'number' && Number.isFinite(value) && value >= 0, `${label} absent ou invalide`); return value }
const reduced = text => String(text ?? '').replace(/\bBearer\s+\S+/gi, '[JETON_MASQUE]').replace(/https?:\/\/\S+/gi, '[URL_MASQUEE]').replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL_MASQUE]').slice(0, 500)
function threshold(since) {
  const value = Date.parse(since)
  assert.ok(Number.isFinite(value) && value >= Date.parse(MINIMUM_SINCE), 'Date minimale de ce lot non respectée')
  return value
}
function fresh(value, since, label) {
  const instant = typeof value === 'number' ? value : Date.parse(value)
  assert.ok(Number.isFinite(instant) && instant >= since, `Rapport ancien ou date absente : ${label}`)
  return new Date(instant).toISOString()
}

export function validateReliabilityUnits(raw, since = MINIMUM_SINCE) {
  const minimum = threshold(since)
  return SUITES.map(suite => {
    const report = raw[suite]
    assert.ok(report && report.success === true, `Suite absente, échouée ou interrompue : ${suite}`)
    assert.equal(report.numFailedTestSuites, 0, `Suite invalide : ${suite}`)
    const summary = summarizeUnit(report, suite)
    fresh(report.startTime, minimum, suite)
    assert.equal(summary.failed, 0); assert.equal(summary.skipped, 0)
    assert.equal(report.numTodoTests ?? 0, 0)
    assert.ok(Number.isSafeInteger(summary.passed) && summary.passed > 0)
    assert.equal(report.numTotalTests, summary.passed, `Compteurs incomplets : ${suite}`)
    const cases = (report.testResults || []).flatMap(result => result.assertionResults || [])
    assert.equal(cases.length, summary.passed, `Cas unitaires absents : ${suite}`)
    assert.ok(cases.every(result => result.status === 'passed'), `Cas unitaire non exécuté : ${suite}`)
    return summary
  })
}

export function validateReliabilityBrowsers(reports, { since = MINIMUM_SINCE, expectedCases, expectedFiles }) {
  const minimum = threshold(since)
  assert.ok(Array.isArray(reports) && reports.length > 0 && expectedCases?.length > 0 && expectedFiles?.length > 0)
  const summaries = reports.map(report => {
    assert.ok(report?.stats && Array.isArray(report.errors || []), 'Rapport Chrome incomplet')
    const summary = summarizeBrowser(report)
    fresh(summary.executedAt, minimum, 'Chrome')
    assert.equal(summary.globalErrors, 0, 'Erreur globale Chrome : validation refusée')
    assert.equal(report.stats.skipped ?? 0, 0, 'Parcours Chrome ignoré')
    assert.ok(summary.cases.length > 0, 'Rapport Chrome sans parcours')
    assert.equal(summary.counts.FAIL, 0, 'Parcours Chrome échoué, y compris une tentative antérieure')
    assert.equal(summary.counts['NOT RUN'], 0, 'Parcours Chrome non exécuté')
    for (const entry of summary.cases) fresh(entry.executedAt, minimum, 'cas Chrome')
    return summary
  })
  const cases = summaries.flatMap(summary => summary.cases)
  const key = row => `${path.basename(row.file)}::${row.name}`
  const keys = cases.map(key)
  assert.equal(new Set(keys).size, keys.length, 'Parcours Chrome en doublon')
  assert.deepEqual([...new Set(cases.map(row => path.basename(row.file)))].sort(), [...expectedFiles].sort(), 'Fichier Chrome absent ou inattendu')
  assert.deepEqual([...keys].sort(), expectedCases.map(key).sort(), 'Manifest Chrome incomplet : cas déclaré absent ou inattendu')
  return { executedAt: summaries.map(summary => summary.executedAt).sort()[0], globalErrors: 0,
    counts: { PASS: cases.length, FAIL: 0, 'NOT RUN': 0 },
    cases: cases.map(entry => ({ ...entry, name: reduced(entry.name) })) }
}

function resourceSummary(raw, minimum) {
  const measuredAt = fresh(raw.measuredAt, minimum, 'ressources')
  assert.ok(Array.isArray(raw.measurements) && raw.measurements.length > 0)
  for (const sample of raw.measurements) {
    fresh(sample.at, minimum, 'échantillon ressources')
    for (const key of ['workingSetSumMiB', 'privateCommitMiB', 'cpuNormalizedPercent', 'processCount']) finite(sample[key], key)
  }
  const mean = key => {
    const values = raw.measurements.map(row => row[key]).filter(value => typeof value === 'number' && Number.isFinite(value))
    return values.length === raw.measurements.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : null
  }
  return { measuredAt, logicalCpus: finite(raw.logicalCpus, 'CPU logiques'), samples: raw.measurements.length,
    workingSetSumMiB: mean('workingSetSumMiB'), privateCommitMiB: mean('privateCommitMiB'), cpuNormalizedPercent: mean('cpuNormalizedPercent'),
    processCountMin: Math.min(...raw.measurements.map(row => row.processCount)), processCountMax: Math.max(...raw.measurements.map(row => row.processCount)),
    gpuEnginePercentSum: mean('gpuEnginePercentSum'), gpuDedicatedMiB: mean('gpuDedicatedMiB'), gpuSharedMiB: mean('gpuSharedMiB'),
    gpuCounterErrorSamples: raw.measurements.filter(row => row.gpuError).length }
}

export function reliabilityPerformance(raw, since = MINIMUM_SINCE) {
  const minimum = threshold(since), { before, after } = raw
  assert.ok(before && after, 'Deux séries complètes requises')
  for (const row of [before, after]) {
    fresh(row.http.measuredAt, minimum, 'profil HTTP'); fresh(row.ui.measuredAt, minimum, 'interface'); fresh(row.startup.at, minimum, 'démarrage')
    assert.ok(/^[a-f0-9]{64}$/.test(row.http.datasetHash), 'Empreinte de données absente')
    assert.ok(Array.isArray(row.http.samplesMs) && row.http.samplesMs.length === row.http.n && row.http.n > 0)
    row.http.samplesMs.forEach(value => finite(value, 'échantillon HTTP')); finite(row.http.p95Ms, 'p95 HTTP')
    assert.equal(row.ui.jsErrors?.length, 0, 'Erreurs JavaScript de performance')
    assert.ok(row.ui.measurements?.length > 0)
    for (const sample of row.ui.measurements) {
      assert.ok(sample.samples?.length > 0); sample.samples.forEach(value => finite(value, 'navigation'))
      finite(sample.medianMs, 'médiane UI'); finite(sample.p95Ms, 'p95 UI')
    }
  }
  assert.equal(before.http.datasetHash, after.http.datasetHash, 'Empreinte du jeu de données différente')
  assert.deepEqual(before.http.dataset, after.http.dataset, 'Jeu de données HTTP différent')
  assert.deepEqual(before.ui.dataset, after.ui.dataset, 'Volumétrie du jeu UI différente')
  for (const key of ['products', 'tables', 'lines']) assert.equal(before.ui.dataset[key], before.http.dataset[key], `Volumétrie UI/HTTP différente : ${key}`)
  assert.equal(before.http.instrumentation, after.http.instrumentation, 'Instrumentation HTTP non comparable')
  assert.equal(before.http.warmup, after.http.warmup); assert.equal(before.http.n, after.http.n)
  assert.equal(before.ui.chrome, after.ui.chrome)
  assert.deepEqual(before.ui.measurements.map(row => row.name), after.ui.measurements.map(row => row.name))
  const http = row => ({ measuredAt: row.measuredAt, n: row.n, warmup: row.warmup, samplesMs: row.samplesMs, p95Ms: row.p95Ms,
    sql: { queryCount: finite(row.sql.queryCount, 'requêtes SQL'), sqlCumulativeMs: finite(row.sql.sqlCumulativeMs, 'temps SQL'),
      operations: Object.fromEntries(Object.entries(row.sql.operations || {}).filter(([key]) => /^(SELECT|UPDATE|INSERT|DELETE|BEGIN|COMMIT|ROLLBACK):[A-Za-z_]+$/.test(key))
        .map(([key, value]) => [key, { n: finite(value.n, 'SQL n'), ms: finite(value.ms, 'SQL ms') }])),
      io: Object.fromEntries(Object.entries(row.sql.io || {}).filter(([key]) => ['writeFileSync', 'fsyncSync', 'readFileSync', 'renameSync'].includes(key))
        .map(([key, value]) => [key, { n: finite(value.n, 'I/O n'), ms: finite(value.ms, 'I/O ms') }])) },
    cpuSamples: (row.topCpu || []).slice(0, 12).map(item => ({ function: reduced(item.function), file: /^(?:(?:apps|node_modules)\/[\w./-]+|node:[\w/]+)$/.test(item.file) ? item.file : '', line: item.line, selfMs: finite(item.selfMs, 'CPU échantillonné') })) })
  const ui = row => ({ measuredAt: row.measuredAt, chrome: row.chrome, dataset: row.dataset,
    measurements: row.measurements.map(item => ({ name: reduced(item.name), samplesMs: item.samples, medianMs: item.medianMs, p95Ms: item.p95Ms })), jsErrorCount: row.jsErrors.length })
  const startup = row => ({ at: new Date(row.at).toISOString(), profile: reduced(row.profile), readyMs: finite(row.readyMs, 'démarrage ms') })
  return { generatedAt: new Date().toISOString(), http: { dataset: before.http.dataset, datasetHash: before.http.datasetHash, os: reduced(before.http.os), cpu: reduced(before.http.cpu).trim(), node: reduced(before.http.node),
    instrumentation: reduced(before.http.instrumentation), before: http(before.http), after: http(after.http), p95ObservedDeltaMs: Number((after.http.p95Ms - before.http.p95Ms).toFixed(2)) },
    ui: { before: ui(before.ui), after: ui(after.ui) }, resources: { before: resourceSummary(before.resources, minimum), after: resourceSummary(after.resources, minimum) },
    startup: { before: startup(before.startup), after: startup(after.startup), causallyComparable: false, gainClaimed: false,
      reason: 'Une seule relance par série, cache chaud ; instrumentation et contrôle privé non identiques, pas un gain causal de démarrage.' },
    limits: ['Courtes séries séquentielles loopback, pas de charge multiclient ni de qualification de production.',
      'p95 sur dix points HTTP et cinq navigations UI : indicateur grossier, tous les écrans ne s’améliorent pas.',
      'Somme des working sets non dédupliquée ; mémoire engagée privée différente de la RAM résidente physique.',
      'CPU/GPU zéro observé peut être sous la résolution ; GPU par moteur non normalisé, valeurs indisponibles conservées null.',
      'Autres logiciels Windows conservés ; aucun wattmètre, watt, kWh, euro ou gain énergétique calculé.'] }
}

const json = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
function browserManifest(root) {
  const environment = { ...process.env }
  for (const key of ['PLAYWRIGHT_JSON_OUTPUT_NAME', 'PLAYWRIGHT_JSON_OUTPUT_FILE', 'PLAYWRIGHT_JSON_OUTPUT_DIR']) delete environment[key]
  const text = execFileSync(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config', 'playwright.lab.config.ts', '--list', '--reporter=json'],
    { cwd: root, env: environment, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 ** 2 })
  const declared = JSON.parse(text)
  assert.equal((declared.errors || []).length, 0, 'Découverte des cas Chrome interrompue')
  const cases = summarizeBrowser(declared).cases
  assert.ok(cases.length > 0)
  return cases
}

export function buildReliabilityEvidence(root, reports, since = MINIMUM_SINCE) {
  threshold(since)
  const read = name => json(path.join(reports, name))
  const unit = validateReliabilityUnits(Object.fromEntries(SUITES.map(suite => [suite, read(`reliability-final-${suite}.json`)])), since)
  // Tout valider avant la moindre publication ; les anciens rapports restent intacts.
  const expectedFiles = fs.readdirSync(path.join(root, 'tests/browser-lab')).filter(name => name.endsWith('.spec.ts')).sort()
  const browser = validateReliabilityBrowsers(BROWSERS.map(read), { since, expectedFiles, expectedCases: browserManifest(root) })
  const performance = reliabilityPerformance(Object.fromEntries(['before', 'after'].map(label => [label, {
    http: read(`http-profile-reliability-${label}.json`), ui: read(`ui-reliability-${label}.json`), resources: read(`resources-reliability-${label}.json`), startup: read(`startup-reliability-${label}.json`),
  }])), since)
  const inventory = scanWorkspace(root)
  assert.ok(inventory.metadata.completeParse, 'Inventaire source incomplet')
  assert.ok([...inventory.routes, ...inventory.controls].every(row => row.status === 'NOT RUN' && row.evidence.length === 0), 'Statut statique exécuté interdit')
  const headings = [...fs.readFileSync(path.join(root, 'docs/2.0/RECETTE-METIER-T01-T100.md'), 'utf8').matchAll(/^## (T\d{2,3}) .* — (PASS|FAIL|BLOCKED|NOT RUN)\s*$/gm)]
  assert.equal(headings.length, 100, 'Matrice T01–T100 incomplète')
  assert.equal(new Set(headings.map(match => match[1])).size, 100)
  assert.deepEqual(headings.map(match => match[1]).sort(), Array.from({ length: 100 }, (_, index) => 'T' + String(index + 1).padStart(2, '0')).sort(), 'Identifiants de matrice divergents')
  const matrix = Object.fromEntries(['PASS', 'FAIL', 'BLOCKED', 'NOT RUN'].map(status => [status, headings.filter(match => match[2] === status).length]))
  const migrationCount = fs.readdirSync(path.join(root, 'apps/backend/prisma/migrations'), { withFileTypes: true }).filter(entry => entry.isDirectory()).length
  assert.equal(migrationCount, 36, 'Nombre de migrations du lot inattendu')
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', windowsHide: true }).length > 0
  const validation = { generatedAt: new Date().toISOString(), baseCommit: 'f198c98', sourceCommit, worktreeDirtyAtRendering: dirty, since,
    environment: 'Windows ; laboratoires PostgreSQL loopback ; Chrome neuf ; données fictives ; aucun profil historique.',
    scope: 'Unitaires, PostgreSQL et parcours Chrome ciblés. Incidents/IA/banques simulés quand indiqué ; ni prestataire réel, matériel, production ou certification.',
    unit, browser, browserFiles: expectedFiles, inventory: inventory.metadata, migrations: { count: migrationCount, productionApplied: false },
    t100: { status: 'NOT RUN', partial: true, declaredMatrix: matrix, matrixSource: 'docs/2.0/RECETTE-METIER-T01-T100.md',
      reason: 'Comptages de scénarios déclarés dans la matrice, jamais déduits du scan. Toutes les entrées statiques restent NOT RUN ; tous écrans/rôles/erreurs non couverts.' },
    safety: { productionDeployment: false, realPayment: false, historicProfileOpened: false, originalArchivesDeleted: false, masterChanged: false, stripeRefundsEnabled: false, videoEnabled: false } }
  const inventoryRecords = [{ type: 'metadata', ...inventory.metadata }, ...inventory.routes.map(row => ({ type: 'route', ...row })), ...inventory.controls.map(row => ({ type: 'control', ...row,
    profile: /\/guest\/games\/|\/guest\/GamesSection\.tsx|apps\/guest\/src\/pages\/GamesPage\.tsx/.test(row.file || '') ? 'full-only' : 'source-a-qualifier' }))]
  return { validation, performance, inventoryRecords }
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  const [directory, since = MINIMUM_SINCE] = process.argv.slice(2)
  if (!directory || process.argv.length > 4) throw Error('Usage : node scripts/render-reliability-evidence.mjs <laboratoire> [date-minimale-ISO]')
  const root = path.resolve(import.meta.dirname, '..'), output = path.join(root, 'docs/2.0/preuves')
  const result = buildReliabilityEvidence(root, path.resolve(directory), since)
  const files = [
    ['validation-fiabilite-2026-10-17.json', JSON.stringify(result.validation, null, 2) + '\n'],
    ['performance-fiabilite-2026-10-17.json', JSON.stringify(result.performance, null, 2) + '\n'],
    ['inventaire-t100-fiabilite-2026-10-17.jsonl', result.inventoryRecords.map(row => JSON.stringify(row)).join('\n') + '\n'],
  ]
  for (const [name] of files) assert.ok(!fs.existsSync(path.join(output, name)), 'Preuve existante préservée : choisissez un nouveau lot, aucun remplacement automatique')
  fs.mkdirSync(output, { recursive: true })
  for (const [name, text] of files) fs.writeFileSync(path.join(output, name), text, { flag: 'wx' })
  console.log(JSON.stringify({ unit: result.validation.unit, browser: result.validation.browser.counts, browserFiles: result.validation.browserFiles.length, inventory: result.validation.inventory.totals, matrix: result.validation.t100.declaredMatrix }))
}
