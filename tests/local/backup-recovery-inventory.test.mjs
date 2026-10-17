import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { inventoryRecoveredBackups } from '../../scripts/local/backup-recovery-inventory.mjs'
const require = createRequire(new URL('../../apps/backend/package.json', import.meta.url)), AdmZip = require('adm-zip')

function fixture() {
  // Nouvelles entrées factices uniquement ; conservées après les tests.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-inventory-fixture-'))
  const recovered = 'recovered-rotation-dumps-fixture', archiveDir = 'runtime-backend/data/backups/full'
  fs.mkdirSync(path.join(root, recovered)); fs.mkdirSync(path.join(root, archiveDir), { recursive: true })
  const filename = 'creorga-db-2026-10-16-1634-1792161286128-84575.dump'
  const archive = 'creorga-full-2026-10-16-1792161286364-27547.zip', contents = Buffer.from('PGDMP-fictif-inventaire')
  const digest = createHash('sha256').update(contents).digest('hex')
  fs.writeFileSync(path.join(root, recovered, filename), contents)
  const zip = new AdmZip(), member = `database/${filename}`
  zip.addFile(member, contents)
  zip.addFile('backup-manifest.json', Buffer.from(JSON.stringify({ version: 2, databaseIncluded: true,
    startedAt: '2026-10-16T14:34:46.000Z', completedAt: '2026-10-16T14:34:47.000Z',
    files: [{ name: member, size: contents.length, sha256: digest }] })))
  zip.writeZip(path.join(root, archiveDir, archive))
  const index = { checkedAt: '2026-10-16T19:32:02.389Z', recovered: [{ archive, filename, bytes: contents.length, sha256: digest }] }
  fs.writeFileSync(path.join(root, recovered, 'recovery-index.json'), JSON.stringify(index))
  return { root, recovered, archiveDir, filename, archive, index, digest, contents }
}

test('relie les octets conservés au ZIP et manifeste sans extraction ni modification', async () => {
  const f = fixture(), original = fs.readFileSync(path.join(f.root, f.recovered, 'recovery-index.json'))
  const result = await inventoryRecoveredBackups(f.root, f.recovered)
  assert.equal(result.verifiedCount, 1)
  assert.equal(result.copies[0].sha256, f.digest)
  assert.equal(result.copies[0].zipEntrySha256, f.digest)
  assert.equal(result.copies[0].bytes, f.contents.length)
  assert.equal(result.copies[0].signature, 'PGDMP')
  assert.equal(result.copies[0].namedLocalTime, '2026-10-16T16:34')
  assert.equal(result.copies[0].dumpNameEpochUtc, '2026-10-16T14:34:46.128Z')
  assert.equal(result.copies[0].manifestStartedAt, '2026-10-16T14:34:46.000Z')
  assert.equal(result.copies[0].recoveredFile, `${f.recovered}/${f.filename}`)
  assert.ok(!JSON.stringify(result).includes(f.root))
  assert.deepEqual(fs.readFileSync(path.join(f.root, f.recovered, 'recovery-index.json')), original)
  assert.deepEqual(fs.readFileSync(path.join(f.root, f.recovered, f.filename)), f.contents)
})

test('refuse un dump altéré et garde les preuves intactes', async () => {
  const f = fixture(), file = path.join(f.root, f.recovered, f.filename)
  fs.writeFileSync(file, 'PGDMP-altéré')
  await assert.rejects(() => inventoryRecoveredBackups(f.root, f.recovered), /empreinte|taille/i)
  assert.equal(fs.readFileSync(file, 'utf8'), 'PGDMP-altéré')
})

test('refuse le lien à une archive dont le manifeste ne correspond pas aux octets', async () => {
  const f = fixture(), archive = path.join(f.root, f.archiveDir, f.archive), zip = new AdmZip(archive)
  const manifest = JSON.parse(zip.readAsText('backup-manifest.json'))
  manifest.files[0].sha256 = '0'.repeat(64)
  zip.updateFile('backup-manifest.json', Buffer.from(JSON.stringify(manifest))); zip.writeZip(archive)
  await assert.rejects(() => inventoryRecoveredBackups(f.root, f.recovered), /manifeste/i)
  assert.ok(fs.existsSync(archive))
})

test('refuse traversées et doublons avant lecture de fichiers non ciblés', async () => {
  const f = fixture(), index = path.join(f.root, f.recovered, 'recovery-index.json')
  await assert.rejects(() => inventoryRecoveredBackups(f.root, '../hors-lab'), /répertoire/i)
  f.index.recovered[0].filename = '../secret.dump'
  fs.writeFileSync(index, JSON.stringify(f.index))
  await assert.rejects(() => inventoryRecoveredBackups(f.root, f.recovered), /nom/i)
  f.index.recovered[0].filename = f.filename
  f.index.recovered.push({ ...f.index.recovered[0] })
  fs.writeFileSync(index, JSON.stringify(f.index))
  await assert.rejects(() => inventoryRecoveredBackups(f.root, f.recovered), /doublon/i)
})
