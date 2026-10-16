/** Publie uniquement les mesures du laboratoire, jamais ses configurations ou profils bruts. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

function summarize(profile) {
  assert.equal(profile.samplesMs.length, 10)
  assert.ok(profile.samplesMs.every(n => Number.isFinite(n) && n > 0))
  const samples = [...profile.samplesMs].sort((a, b) => a - b)
  return {
    measuredAt: profile.measuredAt, n: samples.length, warmup: profile.warmup,
    samplesMs: profile.samplesMs, medianMs: samples[5], p95Ms: samples[9],
    queries: profile.sql.queryCount, sqlCumulativeMs: profile.sql.sqlCumulativeMs,
    kitchenCpuSelfMs: profile.topCpu.filter(row => row.function === 'syncKitchenTickets').reduce((n, row) => n + row.selfMs, 0),
    // Les noms de fonctions, SQL, paramètres, chemins locaux et données métier sont exclus.
    io: Object.fromEntries(Object.entries(profile.sql.io).map(([name, value]) => [name, { n: value.n, ms: Number(value.ms.toFixed(2)) }])),
  }
}

export function comparison(before, after) {
  assert.ok(/^[a-f0-9]{64}$/.test(before.datasetHash), 'Empreinte de jeu requise')
  assert.equal(before.datasetHash, after.datasetHash, 'Jeux différents : pas de comparaison appariée')
  assert.deepEqual(before.dataset, after.dataset)
  assert.equal(before.instrumentation, after.instrumentation)
  assert.equal(before.cpu, after.cpu)
  const a = summarize(before), b = summarize(after)
  return {
    generatedAt: new Date().toISOString(), request: 'PUT /api/pos/draft complet, déplacements graphiques fictifs confirmés',
    environment: { os: before.os, cpu: before.cpu.trim(), node: before.node, network: 'loopback privé', instrumentation: before.instrumentation },
    dataset: before.dataset, datasetHash: before.datasetHash, before: a, after: b,
    p95ReductionPercent: Number(((a.p95Ms - b.p95Ms) / a.p95Ms * 100).toFixed(2)),
    limits: 'Dix mesures par série après quatre échauffements, même empreinte sémantique. API instrumentée, mono-utilisateur, sans builds/tests concurrents. Les sondes et tâches locales de fond restent actives : les compteurs SQL/IO ne sont pas un budget strict par requête. Pas un seuil de production, un débit multi-caisses, un essai électrique ou bancaire. Ne pas comparer directement aux séries historiques sur des jeux différents.',
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [reports, output] = process.argv.slice(2)
  if (!reports || !output) throw Error('Usage : node scripts/render-http-profile.mjs <dossier-mesures> <sortie.json>')
  const read = name => JSON.parse(fs.readFileSync(path.join(reports, name), 'utf8'))
  const result = comparison(read('http-profile-before.json'), read('http-profile-after.json'))
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify({ beforeP95Ms: result.before.p95Ms, afterP95Ms: result.after.p95Ms, reductionPercent: result.p95ReductionPercent }))
}
