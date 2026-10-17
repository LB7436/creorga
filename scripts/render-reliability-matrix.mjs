/** Preuves réduites et matrice courante ; aucun lancement ni écriture à l'import. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scenarios } from '../tests/recipe/business-scenarios.mjs'

const MINIMUM = Date.parse('2026-10-17T07:00:00Z')
const norm = value => String(value).replaceAll('\\', '/')
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const integer = value => Number.isInteger(value) && value >= 0
const parsedDate = value => typeof value === 'number' ? value : Date.parse(value)
function cutoff(since) {
  const value = parsedDate(since)
  if (!Number.isFinite(value) || value < MINIMUM) throw Error('Date minimale de recette : 2026-10-17T07:00:00Z.')
  return value
}
function fresh(value, since, label) {
  const time = parsedDate(value)
  if (!Number.isFinite(time) || time < cutoff(since)) throw Error(`Rapport ancien ou date absente : ${label}.`)
  return new Date(time).toISOString()
}
function fileInRepository(file, root) {
  const normalized = norm(file), base = norm(path.resolve(root)).replace(/\/$/, '') + '/'
  const relative = normalized.startsWith(base) ? normalized.slice(base.length) : normalized
  if (/^(apps|tests)\//.test(relative) && !relative.split('/').includes('..')) return relative
  // Les rapports transportés Windows→autre OS gardent leur origine absolue.
  // Ne publier que le suffixe source connu, jamais son chemin privé.
  const suffix = normalized.match(/(?:^|\/)((?:apps\/(?:backend|web|pos)\/src|tests\/browser-lab)\/[^?#]+)$/)?.[1]
  if (suffix && !suffix.split('/').includes('..')) return suffix
  throw Error('Chemin de preuve hors du dépôt refusé.')
}
const summaryEvidence = result => Object.fromEntries(['file', 'name', 'status', 'durationMs', 'executedAt', 'observed'].filter(key => result[key] !== undefined).map(key => [key, result[key]]))
const matches = (proof, result) => proof.special ? result.special === proof.special : norm(result.file).endsWith(proof.file) && result.name.includes(proof.name)

export function evaluateReliabilityScenario(scenario, results, since) {
  const minimum = cutoff(since), proofs = scenario.proofs || []
  const found = proofs.flatMap(proof => results.filter(result => matches(proof, result)))
  const usable = result => Number.isFinite(parsedDate(result.executedAt)) && parsedDate(result.executedAt) >= minimum
  const evidence = found.map(summaryEvidence)
  if (scenario.notRun) return { status: 'NOT RUN', observed: scenario.notRun, evidence }
  if (found.some(result => usable(result) && result.status === 'failed')) return { status: 'FAIL', observed: 'Au moins une assertion actuelle exécutée est en échec ; aucune validation de ce parcours.', evidence }
  if (scenario.blocked) return { status: 'BLOCKED', observed: scenario.blocked, evidence }
  const missing = !proofs.length || proofs.some(proof => !results.some(result => matches(proof, result)))
  if (missing || !found.length || found.some(result => !usable(result) || result.status !== 'passed' || result.validRun === false)) return {
    status: 'NOT RUN', observed: 'Preuve actuelle complète absente, suite incomplète ou assertion non exécutée. Aucun PASS déduit du code.', evidence,
  }
  return { status: 'PASS', observed: found.find(result => result.special && result.observed)?.observed ||
    'Assertions réellement exécutées et réussies : ' + [...new Set(found.map(result => result.name))].join(' ; ') + '. Portée : laboratoire logiciel ; prestataires et incidents simulés lorsqu’indiqués. Pas de preuve matérielle ou bancaire réelle.', evidence }
}

export function extractUnitEvidence(report, suite, root, since) {
  const executedAt = fresh(report.startTime, since, suite)
  if (!Array.isArray(report.testResults)) throw Error('Rapport unitaire sans résultats.')
  const records = report.testResults.flatMap(file => {
    if (!Array.isArray(file.assertionResults)) throw Error('Assertions unitaires manquantes.')
    const fileExecutedAt = fresh(file.startTime, since, suite + ' / fichier')
    return file.assertionResults.map(result => ({ file: fileInRepository(file.name, root), name: String(result.title), status: result.status, durationMs: result.duration, executedAt: fileExecutedAt }))
  })
  const passed = records.filter(result => result.status === 'passed').length
  const failed = records.filter(result => result.status === 'failed').length
  const skipped = records.length - passed - failed
  const complete = report.success === true && report.numFailedTestSuites === 0 && report.testResults.every(file => file.status === 'passed') && failed === 0 && skipped === 0 && passed > 0 &&
    report.numPassedTests === passed && report.numFailedTests === failed && report.numPendingTests === skipped && report.numTotalTests === records.length
  return { run: { suite, executedAt, passed, failed, skipped, complete }, records: records.map(result => ({ ...result, validRun: complete })) }
}

export function extractBrowserEvidence(report, suite, since) {
  const executedAt = fresh(report.stats?.startTime, since, suite), records = []
  function visit(node, source) {
    const file = node.file || source
    for (const spec of node.specs || []) for (const browserTest of spec.tests || []) {
      const attempts = browserTest.results || [], last = attempts.at(-1)
      for (const attempt of attempts) fresh(attempt.startTime, since, suite + ' / tentative')
      const failed = attempts.some(result => ['failed', 'timedOut', 'interrupted'].includes(result.status))
      const status = failed ? 'failed' : last?.status === 'passed' && browserTest.expectedStatus === 'passed' ? 'passed' : 'skipped'
      records.push({ file: 'tests/browser-lab/' + path.posix.basename(norm(file || spec.file || 'inconnu')),
        name: String(spec.title), status, durationMs: last?.duration, executedAt: last?.startTime || executedAt })
    }
    for (const child of node.suites || []) visit(child, file)
  }
  visit(report)
  const passed = records.filter(result => result.status === 'passed').length, failed = records.filter(result => result.status === 'failed').length
  const skipped = records.length - passed - failed, globalErrors = Array.isArray(report.errors) ? report.errors.length : 1
  const complete = passed > 0 && failed === 0 && skipped === 0 && globalErrors === 0 && report.stats.expected === passed &&
    report.stats.unexpected === 0 && report.stats.skipped === 0 && report.stats.flaky === 0
  return { run: { suite, executedAt, passed, failed, skipped, globalErrors, complete }, records: records.map(result => ({ ...result, validRun: complete })) }
}

function sameTables(source, restored) {
  if (!Array.isArray(source) || !Array.isArray(restored) || !source.length || source.length !== restored.length) return false
  const index = new Map(restored.map(table => [`${table.schema}.${table.table}`, table]))
  if (index.size !== source.length || new Set(source.map(table => `${table.schema}.${table.table}`)).size !== source.length) return false
  return source.every(table => {
    const other = index.get(`${table.schema}.${table.table}`)
    if (!other || !integer(table.count) || !hex(table.sha256) || !hex(table.columnsSha256) || table.count !== other.count || table.sha256 !== other.sha256 || table.columnsSha256 !== other.columnsSha256) return false
    const pdf = table.issuedPdf
    if (Boolean(pdf) !== Boolean(other.issuedPdf) || (['Invoice', 'CreditNote'].includes(table.table) && !pdf)) return false
    if (pdf && (pdf.status !== 'checked' || !integer(pdf.count) || !hex(pdf.sha256) || pdf.storedHashMismatches !== 0 || pdf.nonPdfHeaders !== 0 || pdf.missingBinaryWithHash !== 0 || JSON.stringify(pdf) !== JSON.stringify(other.issuedPdf))) return false
    return true
  })
}
export function specialRestorationEvidence(report, since) {
  const executedAt = fresh(report.testedAt, since, 'restauration')
  fresh(report.verification?.checkedAt, since, 'comparaison de restauration')
  const verification = report.verification, tables = verification?.source?.tables || []
  const documentTables = ['InvoiceDocumentLink', 'InvoiceDocumentLinkEvent'].every(name => tables.some(table => table.table === name && table.count > 0))
  const pdfCount = tables.reduce((sum, table) => sum + (table.issuedPdf?.count || 0), 0)
  const ok = verification?.status === 'equal' && verification.readonly === true && verification.loopbackOnly === true &&
    verification.source?.readOnly === true && verification.restored?.readOnly === true && Array.isArray(verification.differences) && verification.differences.length === 0 &&
    sameTables(tables, verification.restored?.tables) && documentTables && pdfCount > 0 && report.encryptedCopyVerified === true &&
    report.keyIncludedInArchive === false && integer(report.checkedFiles) && report.checkedFiles > 0 && report.archiveVersion === 2
  return { special: 'restore', file: 'scripts/verify-restored-copy.mjs', name: 'restauration native chiffrée et comparaison exhaustive', executedAt,
    status: ok ? 'passed' : 'failed', validRun: true,
    observed: ok ? `${tables.length} tables, ${report.checkedFiles} fichiers et ${pdfCount} PDF comparés égaux ; nouvelles tables de liens peuplées ; AES-GCM vérifié et clé séparée. ${report.elapsedMs} ms sur cette copie, pas un RTO.` : 'Restauration non validée : égalité exhaustive, PDF, fichiers, chiffrement ou données des nouvelles tables non prouvés.' }
}
export function specialMigrationEvidence(report, since) {
  const executedAt = fresh(report.testedAt, since, 'migration de copie ancienne'), tables = Array.isArray(report.tables) ? report.tables : []
  const ok = report.allOriginalColumnsAndRowsEqual === true && report.oldSnapshotUnchanged === true && integer(report.initialMigrations) &&
    integer(report.finalMigrations) && report.finalMigrations > report.initialMigrations && integer(report.preservedTables) && report.preservedTables > 0 &&
    integer(report.preservedRows) && tables.length === report.preservedTables && new Set(tables.map(table => table.name)).size === tables.length &&
    tables.every(table => integer(table.rows) && hex(table.sha256) && Array.isArray(table.columns) && table.columns.length > 0) && tables.reduce((sum, table) => sum + table.rows, 0) === report.preservedRows
  const record = { special: 'old-migration', file: 'docs/2.0/preuves/migration-ancienne-copie-fiabilite-2026-10-17.json',
    name: 'migration réelle d’un cliché privé ancien vers une nouvelle base', executedAt, status: ok ? 'passed' : 'failed', validRun: true,
    observed: ok ? `${report.initialMigrations} → ${report.finalMigrations} migrations, ${report.preservedTables} tables / ${report.preservedRows} lignes anciennes identiques. Cliché lu seulement ; aucune archive originale ni profil historique modifié.` : 'Migration ancienne non validée : conservation exhaustive et cliché inchangé non prouvés.' }
  return { record, proof: { testedAt: executedAt, initialMigrations: report.initialMigrations, finalMigrations: report.finalMigrations,
    preservedTables: report.preservedTables, preservedRows: report.preservedRows, allOriginalColumnsAndRowsEqual: report.allOriginalColumnsAndRowsEqual,
    oldSnapshotUnchanged: report.oldSnapshotUnchanged, tables: tables.map(table => ({ name: table.name, columnCount: table.columns?.length, rows: table.rows, sha256: table.sha256 })),
    limitations: 'Migration d’une copie ancienne dans une nouvelle base locale ; pas installation vierge, ouverture de profil navigateur historique ou qualification de production.' } }
}

export function buildReliabilityMatrix({ unitReports, browserReports, restoration, oldMigration, since, root, generatedAt = new Date().toISOString() }) {
  cutoff(since)
  if (scenarios.length !== 100 || new Set(scenarios.map(row => row.id)).size !== 100 || scenarios.some((row, index) => row.id !== 'T' + String(index + 1).padStart(2, '0'))) throw Error('Les 100 identifiants de recette sont incohérents.')
  const parsed = [...unitReports.map(({ report, suite }) => extractUnitEvidence(report, suite, root, since)), ...browserReports.map(({ report, suite }) => extractBrowserEvidence(report, suite, since))]
  const restore = specialRestorationEvidence(restoration, since), migration = specialMigrationEvidence(oldMigration, since)
  const results = [...parsed.flatMap(item => item.records), restore, migration.record]
  const rows = scenarios.map(scenario => ({ ...scenario, ...evaluateReliabilityScenario(scenario, results, since) }))
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, 'NOT RUN': 0 }; rows.forEach(row => { counts[row.status]++ })
  return { restorationVerified: restore.status === 'passed', migrationVerified: migration.record.status === 'passed',
    publicationReady: unitReports.length === 4 && browserReports.length === 3 && parsed.every(item => item.run.complete),
    migrationProof: migration.proof,
    proof: { generatedAt, since, environment: 'Laboratoire privé Windows, PostgreSQL loopback, comptes et sociétés fictifs ; aucune production ou banque réelle.',
      limits: 'PASS limité au parcours logiciel décrit. Les incidents, transports et prestataires simulés sont distingués dans les tests. Aucun PASS global de tous les écrans, rôles, matériels ou langues.',
      counts, runs: parsed.map(item => item.run), specialEvidence: [summaryEvidence(restore), summaryEvidence(migration.record)], scenarios: rows } }
}

function markdown(proof) {
  const counts = proof.counts
  const link = file => `[${path.posix.basename(norm(file))}](../../${norm(file)})`
  const body = proof.scenarios.map(row => `## ${row.id} — ${row.title} — ${row.status}\n\nPréconditions et données : ${row.prerequisites}\n\nActions utilisateur / API : ${row.actions}\n\nAttendu : ${row.expected}\n\nObservé : ${row.observed}${row.blockerCategory ? '\n\nCatégorie du blocage : ' + row.blockerCategory + ' ; voir [BLOCAGES-FIABILITE.md](BLOCAGES-FIABILITE.md).' : ''}\n\nPreuves : ${row.evidence.length ? row.evidence.map(evidence => `${link(evidence.file)} — « ${evidence.name} », ${evidence.status}, ${evidence.executedAt || 'date absente'}`).join(' ; ') : 'Aucune exécution complète du scénario revendiquée.'}\n`).join('\n')
  return `# Recette métier T01–T100 — fiabilité du profil métier\n\nGénérée le ${proof.generatedAt}. ${proof.environment}\n\n**${counts.PASS} PASS / ${counts.FAIL} FAIL / ${counts.BLOCKED} BLOCKED / ${counts['NOT RUN']} NOT RUN.**\n\nSeules les preuves exécutées depuis ${proof.since} sont admissibles. Source des exigences : \`tests/recipe/business-scenarios.mjs\`. Les preuves historiques du 16 octobre restent conservées, mais ne sont pas utilisées comme preuves fraîches de ce lot. Détails horodatés : [preuve JSON actuelle](preuves/recette-metier-fiabilite-2026-10-17.json).\n\n${proof.limits} Une API testée n'est pas un clic Chrome ; une banque remplacée n'est pas un sandbox officiel. T69 repose sur son expiration serveur et les parcours PDF/Chrome réellement exécutés. **T100 reste NOT RUN / partiel**, indépendamment de l'inventaire source et des contrôles ciblés. Aucun déploiement ou certification.\n\nRapports : [fiabilité](FIABILITE-PROFIL-METIER.md), [T100 ciblé](T100-FIABILITE-UI.md), [liens PDF](LIENS-DOCUMENTAIRES.md), [sauvegardes](SAUVEGARDES-FIABILITE.md).\n\n${body}`
}
export function writeReliabilityOutputs(built, root) {
  if (!built.restorationVerified) throw Error('Publication interdite : restauration complète non vérifiée.')
  if (!built.migrationVerified) throw Error('Publication interdite : migration ancienne non vérifiée.')
  if (!built.publicationReady) throw Error('Publication interdite : suites manquantes, interrompues, en échec ou ignorées.')
  const output = path.join(root, 'docs/2.0/preuves')
  const files = [
    [path.join(output, 'recette-metier-fiabilite-2026-10-17.json'), JSON.stringify(built.proof, null, 2) + '\n'],
    [path.join(output, 'migration-ancienne-copie-fiabilite-2026-10-17.json'), JSON.stringify(built.migrationProof, null, 2) + '\n'],
    [path.join(root, 'docs/2.0/RECETTE-METIER-T01-T100.md'), markdown(built.proof)],
  ]
  fs.mkdirSync(output, { recursive: true })
  for (const [target, data] of files) {
    const temporary = target + `.tmp-${process.pid}`
    fs.writeFileSync(temporary, data, { flag: 'wx' }); fs.renameSync(temporary, target)
  }
  return files.map(([target]) => path.relative(root, target))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).map(argument => {
    if (argument === '--dry-run') return ['dry-run', true]
    const match = /^--(reports|since)=(.+)$/.exec(argument)
    if (!match) throw Error('Usage : --reports=<dossier privé> --since=<date ISO> [--dry-run]')
    return [match[1], match[2]]
  }))
  if (!args.reports || !args.since) throw Error('--reports et --since sont requis.')
  const root = path.resolve(import.meta.dirname, '..'), directory = path.resolve(args.reports)
  const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8').replace(/^\uFEFF/, ''))
  const built = buildReliabilityMatrix({ root, since: args.since,
    unitReports: ['backend-unit', 'web-unit', 'pos-unit', 'integration'].map(suite => ({ suite, report: read(`reliability-final-${suite}.json`) })),
    browserReports: ['reliability-final-existing-browser.json', 'reliability-ui-green-browser.json', 'reliability-documents-green-browser.json'].map(suite => ({ suite, report: read(suite) })),
    restoration: read('RESTORATION-2.0-fiabilite.json'), oldMigration: read('MIGRATION-ANCIENNE-COPIE-fiabilite.json'),
  })
  const files = args['dry-run'] ? [] : writeReliabilityOutputs(built, root)
  console.log(JSON.stringify({ counts: built.proof.counts, runs: built.proof.runs, restorationVerified: built.restorationVerified, migrationVerified: built.migrationVerified, publicationReady: built.publicationReady, files }, null, 2))
}
