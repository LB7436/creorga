import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { evaluateReliabilityScenario, extractUnitEvidence, extractBrowserEvidence, specialRestorationEvidence, specialMigrationEvidence, buildReliabilityMatrix, writeReliabilityOutputs } from '../../scripts/render-reliability-matrix.mjs'

const since = '2026-10-17T07:00:00Z', time = '2026-10-17T08:00:00Z'
const scenario = { id: 'T01', title: 'Fictif', prerequisites: 'Copie', actions: 'Tester', expected: 'Refus', proofs: [{ file: 'apps/backend/src/routes/sample.integration.test.ts', name: 'refuse' }] }
const passed = { file: scenario.proofs[0].file, name: 'refuse une ressource étrangère', status: 'passed', executedAt: time, validRun: true }

test('une preuve réelle complète et fraîche seule permet PASS', () => {
  assert.equal(evaluateReliabilityScenario(scenario, [passed], since).status, 'PASS')
  assert.equal(evaluateReliabilityScenario(scenario, [], since).status, 'NOT RUN')
  assert.equal(evaluateReliabilityScenario({ ...scenario, proofs: [...scenario.proofs, { file: 'autre.ts', name: 'manquant' }] }, [passed], since).status, 'NOT RUN')
})
test('une assertion ratée, sautée ou retirée ne devient jamais PASS', () => {
  assert.equal(evaluateReliabilityScenario(scenario, [{ ...passed, status: 'failed' }], since).status, 'FAIL')
  for (const status of ['skipped', 'pending', 'interrupted', 'unknown']) assert.equal(evaluateReliabilityScenario(scenario, [{ ...passed, status }], since).status, 'NOT RUN')
  assert.equal(evaluateReliabilityScenario(scenario, [{ ...passed, validRun: false }], since).status, 'NOT RUN')
})
test('preuve ancienne ou sans date ne valide pas une exigence actuelle', () => {
  assert.equal(evaluateReliabilityScenario(scenario, [{ ...passed, executedAt: '2026-10-16T23:59:00Z' }], since).status, 'NOT RUN')
  assert.equal(evaluateReliabilityScenario(scenario, [{ ...passed, executedAt: undefined }], since).status, 'NOT RUN')
})
test('un blocage et T100 restent explicites malgré une assertion ciblée réussie', () => {
  assert.equal(evaluateReliabilityScenario({ ...scenario, blocked: 'Matériel absent' }, [passed], since).status, 'BLOCKED')
  assert.equal(evaluateReliabilityScenario({ ...scenario, blocked: 'Absent' }, [{ ...passed, status: 'failed' }], since).status, 'FAIL')
  assert.equal(evaluateReliabilityScenario({ ...scenario, notRun: 'Tout le produit non parcouru' }, [passed], since).status, 'NOT RUN')
})
const unit = () => ({ startTime: Date.parse(time), success: true, numTotalTests: 1, numPassedTests: 1, numFailedTests: 0, numPendingTests: 0, numFailedTestSuites: 0,
  testResults: [{ name: '/repo/apps/backend/src/routes/sample.integration.test.ts', startTime: Date.parse(time), status: 'passed', assertionResults: [{ title: passed.name, status: 'passed', duration: 3 }] }] })
test('les unités utilisent le résultat exécuté, refusent les rapports anciens et expurgent chemins privés/messages', () => {
  const report = unit(); report.testResults[0].assertionResults[0].failureMessages = ['SECRET-NE-PAS-PUBLIER']
  const parsed = extractUnitEvidence(report, 'integration', '/repo', since)
  assert.equal(parsed.records[0].file, passed.file)
  assert.equal(parsed.records[0].status, 'passed')
  assert.ok(!JSON.stringify(parsed).includes('SECRET-NE-PAS-PUBLIER'))
  assert.throws(() => extractUnitEvidence({ ...report, startTime: 1 }, 'integration', '/repo', since), /ancien|date/i)
  const interrupted = extractUnitEvidence({ ...report, success: false }, 'integration', '/repo', since)
  assert.equal(evaluateReliabilityScenario(scenario, interrupted.records, since).status, 'NOT RUN')
})
const browser = () => ({ stats: { startTime: time, expected: 1, unexpected: 0, skipped: 0, flaky: 0 }, errors: [], suites: [{ file: 'sample.spec.ts', specs: [{ title: 'clic réel', tests: [{ expectedStatus: 'passed', results: [{ status: 'passed', startTime: time, duration: 5 }] }] }] }] })
test('Chrome : tous les essais comptent, un échec suivi de succès ne devient pas PASS', () => {
  assert.equal(extractBrowserEvidence(browser(), 'Chrome', since).records[0].status, 'passed')
  const retried = browser(); retried.suites[0].specs[0].tests[0].results.unshift({ status: 'failed', startTime: time, error: { message: 'SECRET' } })
  const parsed = extractBrowserEvidence(retried, 'Chrome', since)
  assert.equal(parsed.records[0].status, 'failed')
  assert.ok(!JSON.stringify(parsed).includes('SECRET'))
  const stale = browser(); stale.suites[0].specs[0].tests[0].results[0].startTime = '2026-10-16T00:00:00Z'
  assert.throws(() => extractBrowserEvidence(stale, 'Chrome', since), /ancien|date/i)
})
test('des fichiers unitaires anciens ou ratés ne se cachent pas derrière une date globale récente', () => {
  const stale = unit(); stale.testResults[0].startTime = 1
  assert.throws(() => extractUnitEvidence(stale, 'integration', '/repo', since), /ancien|date/i)
  const failedFile = unit(); failedFile.testResults[0].status = 'failed'
  assert.equal(extractUnitEvidence(failedFile, 'integration', '/repo', since).run.complete, false)
})
test('Chrome : résultat inversé ou absent non accepté, erreurs de rapport visibles', () => {
  const expectedFailure = browser(); expectedFailure.suites[0].specs[0].tests[0].expectedStatus = 'failed'
  assert.notEqual(extractBrowserEvidence(expectedFailure, 'Chrome', since).records[0].status, 'passed')
  const absent = browser(); absent.suites[0].specs[0].tests[0].results = []
  assert.notEqual(extractBrowserEvidence(absent, 'Chrome', since).records[0].status, 'passed')
  const broken = browser(); broken.errors = [{ message: 'Erreur privée' }]
  assert.equal(extractBrowserEvidence(broken, 'Chrome', since).run.complete, false)
})
const table = (name, count, pdf = false) => ({ schema: 'public', table: name, count, sha256: 'a'.repeat(64), columnsSha256: 'b'.repeat(64), ...(pdf ? { issuedPdf: { status: 'checked', count: 1, sha256: 'c'.repeat(64), storedHashMismatches: 0, nonPdfHeaders: 0, missingBinaryWithHash: 0 } } : {}) })
const restoration = () => {
  const tables = [table('Invoice', 1, true), table('InvoiceDocumentLink', 1), table('InvoiceDocumentLinkEvent', 2)]
  return { testedAt: time, checkedFiles: 2, encryptedCopyVerified: true, keyIncludedInArchive: false, elapsedMs: 7, archiveVersion: 2,
    sourceDatabase: 'PRIVATE', restoredDatabase: 'PRIVATE', verification: { checkedAt: time, status: 'equal', readonly: true, loopbackOnly: true, differences: [], source: { readOnly: true, tables }, restored: { readOnly: true, tables: structuredClone(tables) } } }
}
test('restauration : compare les empreintes, PDF et nouvelles tables avec lignes, pas seulement status=equal', () => {
  assert.equal(specialRestorationEvidence(restoration(), since).status, 'passed')
  const changed = restoration(); changed.verification.restored.tables[0].sha256 = 'd'.repeat(64)
  assert.equal(specialRestorationEvidence(changed, since).status, 'failed')
  const empty = restoration(); empty.verification.source.tables[1].count = 0; empty.verification.restored.tables[1].count = 0
  assert.equal(specialRestorationEvidence(empty, since).status, 'failed')
  const corruptPdf = restoration(); corruptPdf.verification.source.tables[0].issuedPdf.nonPdfHeaders = 1
  assert.equal(specialRestorationEvidence(corruptPdf, since).status, 'failed')
  const keys = restoration(); keys.keyIncludedInArchive = true
  assert.equal(specialRestorationEvidence(keys, since).status, 'failed')
  assert.throws(() => specialRestorationEvidence({ ...restoration(), testedAt: '2026-10-16T00:00:00Z' }, since), /ancien|date/i)
})
test('restauration : une table source dupliquée ne peut masquer une table non comparée', () => {
  const report = restoration()
  report.verification.source.tables.push(structuredClone(report.verification.source.tables[0]))
  report.verification.restored.tables.push(table('CashDrawer', 0))
  assert.equal(specialRestorationEvidence(report, since).status, 'failed')
})
test('restauration : les PDF d’avoirs ne masquent pas une vérification PDF des factures absente', () => {
  const report = restoration()
  delete report.verification.source.tables[0].issuedPdf
  delete report.verification.restored.tables[0].issuedPdf
  report.verification.source.tables.push(table('CreditNote', 1, true))
  report.verification.restored.tables.push(table('CreditNote', 1, true))
  assert.equal(specialRestorationEvidence(report, since).status, 'failed')
})
const migration = () => ({ testedAt: time, initialMigrations: 7, finalMigrations: 36, preservedTables: 1, preservedRows: 3, allOriginalColumnsAndRowsEqual: true, oldSnapshotUnchanged: true,
  tables: [{ name: 'Invoice', columns: ['id'], rows: 3, sha256: 'a'.repeat(64) }], source: 'PRIVATE-PATH', target: 'PRIVATE-DATABASE', limitations: 'Copie uniquement' })
test('migration : preuves concordantes et cliché inchangé, aucune cible privée publiée', () => {
  const result = specialMigrationEvidence(migration(), since)
  assert.equal(result.record.status, 'passed')
  assert.ok(!JSON.stringify(result).includes('PRIVATE'))
  assert.equal(specialMigrationEvidence({ ...migration(), oldSnapshotUnchanged: false }, since).record.status, 'failed')
  assert.equal(specialMigrationEvidence({ ...migration(), preservedRows: 4 }, since).record.status, 'failed')
})
test('les cent exigences sont uniques, T100 ne peut être promu par la présence du code', () => {
  const built = buildReliabilityMatrix({ unitReports: [], browserReports: [], restoration: restoration(), oldMigration: migration(), since, root: '/repo', generatedAt: time })
  assert.equal(built.proof.scenarios.length, 100)
  assert.equal(new Set(built.proof.scenarios.map(row => row.id)).size, 100)
  assert.equal(built.proof.scenarios.at(-1).status, 'NOT RUN')
  assert.equal(built.proof.scenarios.find(row => row.id === 'T69').status, 'NOT RUN')
})
test('publication interdite sans restauration valide et import sans effet de bord', async () => {
  await import('../../scripts/render-reliability-matrix.mjs')
  assert.throws(() => writeReliabilityOutputs({ proof: { counts: {}, scenarios: [] }, restorationVerified: false }, '/inexistant'), /restauration/i)
})
test('la publication écrit seulement la matrice et les deux nouvelles preuves, jamais celles historiques', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-reliability-matrix-'))
  const output = path.join(root, 'docs/2.0/preuves'); fs.mkdirSync(output, { recursive: true })
  const old = path.join(output, 'recette-metier-2026-10-16.json')
  fs.writeFileSync(old, 'PREUVE HISTORIQUE INCHANGEE')
  const built = buildReliabilityMatrix({ unitReports: ['backend-unit', 'web-unit', 'pos-unit', 'integration'].map(suite => ({ suite, report: unit() })),
    browserReports: ['existing', 'UI', 'documents'].map(suite => ({ suite, report: browser() })), restoration: restoration(), oldMigration: migration(), since, root: '/repo', generatedAt: time })
  const files = writeReliabilityOutputs(built, root)
  assert.equal(files.length, 3)
  assert.equal(fs.readFileSync(old, 'utf8'), 'PREUVE HISTORIQUE INCHANGEE')
  assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'recette-metier-fiabilite-2026-10-17.json'), 'utf8')).scenarios.length, 100)
  assert.match(fs.readFileSync(path.join(root, 'docs/2.0/RECETTE-METIER-T01-T100.md'), 'utf8'), /T100 reste NOT RUN/)
  assert.ok(!JSON.stringify(built.migrationProof).includes('PRIVATE'))
  // Répertoire éphémère de tests gardé ; aucune politique de purge implicite.
})
