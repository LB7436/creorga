import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const entry = path.resolve(import.meta.dirname, '../../scripts/local/runtime.mjs')
test('le lanceur refuse une arborescence implicite, une base distante et les envois non neutralisés', () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'creorga-guards-'))
  mkdirSync(path.join(temporary, 'data'))
  const clean = { ...process.env, DATABASE_URL: 'postgresql://fake:unused@127.0.0.1:5450/creorga_tests', CREORGA_RUNTIME_DIR: '', EMAIL_TEST_ONLY: 'true', NODE_OPTIONS: '' }
  const run = env => spawnSync(process.execPath, [entry], { env, cwd: temporary, encoding: 'utf8', windowsHide: true, timeout: 10000 })
  try {
    const missing = run(clean); assert.equal(missing.status, 1); assert.match(missing.stderr, /CREORGA_RUNTIME_DIR absolu requis/)
    const remote = run({ ...clean, CREORGA_RUNTIME_DIR: temporary, DATABASE_URL: 'postgresql://fake:unused@outside.fixture.invalid/creorga_tests' })
    assert.equal(remote.status, 1); assert.match(remote.stderr, /refuse une base distante/)
    const mail = run({ ...clean, CREORGA_RUNTIME_DIR: temporary, EMAIL_TEST_ONLY: 'false' })
    assert.equal(mail.status, 1); assert.match(mail.stderr, /EMAIL_TEST_ONLY=true requis/)
  } finally { rmSync(temporary, { recursive: true, force: true }) }
})
