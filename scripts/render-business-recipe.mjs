import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { scenarios } from '../tests/recipe/business-scenarios.mjs'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const norm = p => p.replaceAll('\\', '/')
export function evaluate(scenario, results) {
  if (scenario.blocked) return { status: 'BLOCKED', observed: scenario.blocked, evidence: [] }
  if (scenario.notRun) return { status: 'NOT RUN', observed: scenario.notRun, evidence: [] }
  const matches = scenario.proofs.flatMap(p => results.filter(r => p.special ? r.special === p.special : norm(r.file).endsWith(p.file) && r.name.includes(p.name)))
  const missing = scenario.proofs.some(p => !results.some(r => p.special ? r.special === p.special : norm(r.file).endsWith(p.file) && r.name.includes(p.name)))
  const evidence = matches.map(r => ({ file: r.file, name: r.name, status: r.status, durationMs: r.durationMs, executedAt: r.executedAt, observed: r.observed }))
  if (matches.some(r => r.status === 'failed')) return { status: 'FAIL', observed: 'Au moins une assertion exécutée est en échec. Voir la preuve, ne pas livrer ce parcours comme validé.', evidence }
  if (missing || !matches.length || matches.some(r => r.status !== 'passed')) return { status: 'NOT RUN', observed: 'Preuve actuelle complète absente ou test non exécuté. Aucun PASS déduit du code.', evidence }
  return { status: 'PASS', observed: matches.some(r => r.special === 'restore') ? matches.find(r => r.special === 'restore').observed : 'Assertions exécutées et réussies : ' + matches.map(r => r.name).join(' ; ') + '. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.', evidence }
}
if (process.argv.includes('--self-test')) {
  const s = { proofs: [{ file: 'a.ts', name: 'test' }] }, p = { file: 'a.ts', name: 'test exact', status: 'passed' }
  assert.equal(scenarios.length, 100)
  assert.equal(new Set(scenarios.map(s => s.id)).size, 100)
  scenarios.forEach((s, i) => { assert.equal(s.id, 'T' + String(i + 1).padStart(2, '0')); for (const k of ['title', 'prerequisites', 'actions', 'expected']) assert.ok(s[k]) })
  assert.equal(evaluate(s, []).status, 'NOT RUN')
  assert.equal(evaluate(s, [p]).status, 'PASS')
  assert.equal(evaluate(s, [{ ...p, status: 'skipped' }]).status, 'NOT RUN')
  assert.equal(evaluate(s, [{ ...p, status: 'failed' }]).status, 'FAIL')
  assert.equal(evaluate({ ...s, blocked: 'imprimante absente' }, [p]).status, 'BLOCKED')
  assert.equal(evaluate({ ...s, notRun: 'parcours incomplet' }, [p]).status, 'NOT RUN')
  assert.equal(evaluate({ proofs: [...s.proofs, { file: 'b.ts', name: 'autre' }] }, [p]).status, 'NOT RUN')
  console.log('Matrice : 100 scénarios uniques ; 7 contrôles de statut réussis.')
} else {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => { const i = arg.indexOf('='); if (i < 0) throw new Error('Arguments --cle=valeur requis'); return [arg.slice(2, i), arg.slice(i + 1)] }))
  if (!args.reports || !args.since) throw new Error('--reports=<répertoire privé> --since=<date ISO du début de recette> requis')
  const since = Date.parse(args.since)
  if (!Number.isFinite(since)) throw new Error('Date de recette invalide')
  const root = path.resolve(import.meta.dirname, '..'), reportDir = path.resolve(args.reports), results = [], runs = []
  for (const name of ['recipe-backend-unit.json', 'recipe-web-unit.json', 'recipe-pos-unit.json', 'recipe-integration.json']) {
    const report = read(path.join(reportDir, name))
    if (!report.startTime || report.startTime < since) throw new Error('Rapport ancien refusé : ' + name)
    runs.push({ suite: name, executedAt: new Date(report.startTime).toISOString(), passed: report.numPassedTests, failed: report.numFailedTests, pending: report.numPendingTests })
    for (const file of report.testResults) for (const t of file.assertionResults) results.push({ file: norm(path.relative(root, file.name)), name: t.title, status: t.status, durationMs: t.duration, executedAt: new Date(report.startTime).toISOString() })
  }
  const browser = read(path.join(root, 'test-results/business-recipe-browser.json'))
  if (Date.parse(browser.stats.startTime) < since) throw new Error('Rapport Chrome ancien refusé')
  let performance
  function visit(suite, source) {
    for (const spec of suite.specs || []) for (const test of spec.tests) {
      const actual = test.results.at(-1), file = norm(source || spec.file)
      results.push({ file: 'tests/browser-lab/' + path.basename(file), name: spec.title, status: actual?.status, durationMs: actual?.duration, executedAt: actual?.startTime })
      if (actual?.status === 'passed') for (const a of actual.attachments || []) if (a.name === 'performance-locale.json') performance = a.body ? JSON.parse(Buffer.from(a.body, 'base64').toString()) : read(a.path)
    }
    for (const child of suite.suites || []) visit(child, child.file || source)
  }
  visit(browser)
  runs.push({ suite: 'Chrome', executedAt: browser.stats.startTime, passed: browser.stats.expected, failed: browser.stats.unexpected, pending: browser.stats.skipped })
  const restoration = read(path.join(reportDir, 'RESTORATION-2.0.json'))
  if (Date.parse(restoration.testedAt) < since) throw new Error('Restauration ancienne refusée')
  const ok = restoration.verification.status === 'equal' && restoration.verification.differences.length === 0 && restoration.encryptedCopyVerified && !restoration.keyIncludedInArchive && restoration.checkedFiles > 0
  results.push({ special: 'restore', file: 'scripts/verify-restored-copy.mjs', name: 'restauration native chiffrée et comparaison exhaustive', status: ok ? 'passed' : 'failed', executedAt: restoration.testedAt,
    observed: `${restoration.verification.source.tables.length} tables, ${restoration.checkedFiles} fichiers, données et PDF comparés égaux ; AES-GCM vérifié, clé séparée. ${restoration.elapsedMs} ms sur cette copie, pas un RTO.` })
  const rows = scenarios.map(s => ({ ...s, ...evaluate(s, results) })), counts = { PASS: 0, FAIL: 0, BLOCKED: 0, 'NOT RUN': 0 }
  for (const r of rows) counts[r.status]++
  const output = path.join(root, 'docs/2.0/preuves'); fs.mkdirSync(output, { recursive: true })
  const proof = { generatedAt: new Date().toISOString(), since: args.since, environment: 'Laboratoire loopback privé ; sociétés fictives ; banque remplacée ; jamais production.', counts, runs, scenarios: rows }
  fs.writeFileSync(path.join(output, 'recette-metier-2026-10-16.json'), JSON.stringify(proof, null, 2) + '\n')
  if (performance) {
    // Le champ de mesure prouve des déclarations manuelles fictives, jamais un
    // paiement bancaire, même si un ancien libellé d'attachement omettait ce cas.
    performance.limitations = 'Mesure mono-utilisateur synthétique : lectures, sauvegardes, règlements manuels fictifs et ouverture de dialogue. Pas une baseline, un service chargé, Core Web Vitals, matériel physique ou paiement bancaire.'
    fs.writeFileSync(path.join(output, 'performance-2026-10-16.json'), JSON.stringify(performance, null, 2) + '\n')
  }
  const link = p => `[${path.basename(p)}](../../${norm(p)})`
  const body = rows.map(r => `## ${r.id} — ${r.title} — ${r.status}\n\nPréconditions et données : ${r.prerequisites}\n\nActions utilisateur / API : ${r.actions}\n\nAttendu : ${r.expected}\n\nObservé : ${r.observed}\n\nPreuves : ${r.evidence.length ? r.evidence.map(e => `${link(e.file)} — « ${e.name} », ${e.status}, ${e.executedAt}`).join(' ; ') : 'Aucune exécution revendiquée.'}\n`).join('\n')
  fs.writeFileSync(path.join(root, 'docs/2.0/RECETTE-METIER-T01-T100.md'), `# Recette métier T01–T100\n\nGénérée le ${proof.generatedAt}. ${proof.environment}\n\n**${counts.PASS} PASS / ${counts.FAIL} FAIL / ${counts.BLOCKED} BLOCKED / ${counts['NOT RUN']} NOT RUN.**\n\nNumérotation conservée de l’annexe du prompt maître, y compris vidéo désactivée. PASS ne couvre que le scénario logiciel décrit. Un test d’API n’est pas un clic Chrome ; une banque remplacée n’est pas le sandbox officiel. Aucune certification ou mise en production. Les scénarios non exécutés ne sont jamais déduits de l’existence du code. Détails horodatés : [preuve JSON](preuves/recette-metier-2026-10-16.json).\n\n${body}`)
  console.log(JSON.stringify({ counts, runs, performancePublished: !!performance }, null, 2))
}
