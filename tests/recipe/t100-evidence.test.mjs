import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeBrowser, summarizeUnit } from '../../scripts/render-t100-evidence.mjs'

test('preuve T100 : un test ignoré, en échec ou absent n’est pas PASS', () => {
  const fixture = status => ({ stats: { startTime: '2026-10-16T18:00:00Z' }, suites: [{ file: 'tests/browser-lab/fictif.spec.ts', specs: [{ title: 'cas fictif', tests: [{ expectedStatus: 'passed', results: [{ status, duration: 12 }] }] }] }] })
  assert.equal(summarizeBrowser(fixture('passed')).cases[0].status, 'PASS')
  assert.equal(summarizeBrowser(fixture('failed')).cases[0].status, 'FAIL')
  assert.equal(summarizeBrowser(fixture('skipped')).cases[0].status, 'NOT RUN')
  const absent = fixture('passed'); absent.suites[0].specs[0].tests[0].results = []
  assert.equal(summarizeBrowser(absent).cases[0].status, 'NOT RUN')
})

test('preuve T100 : ne publie ni logs, ni pièces jointes, ni erreur privée', () => {
  const result = summarizeUnit({ startTime: 1, numPassedTests: 2, numFailedTests: 1, numPendingTests: 0, secret: 'PRIVATE_SECRET', testResults: [{ assertionResults: [{ failureMessages: ['PRIVATE_SECRET'] }] }] }, 'unites-fictives')
  assert.deepEqual(result, { suite: 'unites-fictives', executedAt: new Date(1).toISOString(), passed: 2, failed: 1, skipped: 0 })
  assert.equal(JSON.stringify(result).includes('PRIVATE_SECRET'), false)
})

test('preuve T100 : une erreur globale Chrome ne disparaît pas derrière des cas verts', () => {
  const result = summarizeBrowser({ stats: { startTime: '2026-10-16T18:00:00Z' }, suites: [], errors: [{ message: 'PRIVATE_ERROR' }] })
  assert.equal(result.globalErrors, 1)
  assert.equal(JSON.stringify(result).includes('PRIVATE_ERROR'), false)
})
