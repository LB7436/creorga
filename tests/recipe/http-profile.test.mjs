import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comparison } from '../../scripts/render-http-profile.mjs'

const fixture = () => ({ datasetHash: 'a'.repeat(64), dataset: { products: 100, tables: 10, covers: 20, lines: 100 }, instrumentation: 'fictive',
  cpu: 'FICTIF', os: 'test', node: 'test', measuredAt: '2026-10-16T00:00:00Z', samplesMs: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], warmup: 4,
  sql: { queryCount: 1, sqlCumulativeMs: 1, io: { fsyncSync: { n: 1, ms: 1.1234 } }, privateSql: 'SECRET' }, topCpu: [{ function: 'syncKitchenTickets', selfMs: 1, file: 'SECRET' }], secret: 'SECRET' })

test('profil : mêmes données obligatoires et p95 recalculé depuis les mesures', () => {
  const a = fixture(), b = fixture(); b.samplesMs = b.samplesMs.map(n => n / 2)
  const report = comparison(a, b)
  assert.equal(report.before.p95Ms, 10)
  assert.equal(report.after.p95Ms, 5)
  assert.equal(report.p95ReductionPercent, 50)
  assert.equal(JSON.stringify(report).includes('SECRET'), false)
  assert.equal(report.before.io.fsyncSync.ms, 1.12)
})

test('profil : refuse jeux différents ou mesures insuffisantes', () => {
  const a = fixture(), b = fixture(); b.datasetHash = 'b'.repeat(64)
  assert.throws(() => comparison(a, b), /Jeux différents/)
  b.datasetHash = a.datasetHash; b.samplesMs = [1]
  assert.throws(() => comparison(a, b))
})
