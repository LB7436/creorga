import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(new URL('../../apps/backend/package.json', import.meta.url)), yauzl = require('yauzl')
const DUMP = /^creorga-db-(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})-(\d{13})-\d+\.dump$/
const ARCHIVE = /^creorga-full-\d{4}-\d{2}-\d{2}-(\d{13})-\d+\.zip$/
const ARCHIVE_DIRECTORY = 'runtime-backend/data/backups/full'
const MAX_DUMP = 512 * 1024 ** 2, MAX_ARCHIVE = 8 * 1024 ** 3, MAX_MANIFEST = 16 * 1024 ** 2
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)

function checkedPath(root, relative, directory = false) {
  if (!relative || relative.includes('\\') || relative.includes(':') || relative.split('/').some(piece => !piece || piece === '.' || piece === '..')) throw new Error('Nom ou répertoire relatif refusé')
  let current = root
  const pieces = relative.split('/')
  for (let index = 0; index < pieces.length; index++) {
    current = path.join(current, pieces[index])
    const stat = fs.lstatSync(current)
    if (stat.isSymbolicLink() || (index < pieces.length - 1 || directory ? !stat.isDirectory() : !stat.isFile())) throw new Error('Fichier ou répertoire non régulier refusé')
  }
  return current
}

async function fingerprint(file, limit) {
  const before = fs.lstatSync(file)
  if (!before.isFile() || before.isSymbolicLink() || before.size > limit) throw new Error('Fichier hors limite ou non régulier')
  const digest = createHash('sha256')
  let size = 0, head = Buffer.alloc(0)
  for await (const chunk of fs.createReadStream(file)) {
    size += chunk.length
    if (size > limit) throw new Error('Fichier hors limite')
    digest.update(chunk)
    if (head.length < 5) head = Buffer.concat([head, chunk.subarray(0, 5 - head.length)])
  }
  const after = fs.lstatSync(file)
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino || size !== before.size) throw new Error('Fichier modifié pendant le contrôle')
  return { bytes: size, sha256: digest.digest('hex'), head: head.toString('ascii') }
}

function selectedZipEntries(archive, dumpEntry) {
  return new Promise((resolve, reject) => {
    yauzl.open(archive, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) { reject(new Error('ZIP source illisible')); return }
      let count = 0, manifest = null, manifestSha256 = null, dump = null
      const names = new Set()
      const fail = error => { zip.close(); reject(error instanceof Error ? error : new Error('Lecture ZIP interrompue')) }
      zip.on('error', () => fail(new Error('Lecture ZIP interrompue')))
      zip.on('entry', entry => {
        const read = async () => {
          if (++count > 100_000 || names.has(entry.fileName.toLowerCase())) throw new Error('Entrées ZIP en doublon ou hors limite')
          names.add(entry.fileName.toLowerCase())
          if (entry.fileName !== dumpEntry && entry.fileName !== 'backup-manifest.json') return
          const isManifest = entry.fileName === 'backup-manifest.json', limit = isManifest ? MAX_MANIFEST : MAX_DUMP
          if (entry.uncompressedSize > limit || ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000) throw new Error('Entrée ZIP source hors limite ou lien symbolique')
          const stream = await new Promise((done, failed) => zip.openReadStream(entry, (error, input) => error || !input ? failed(new Error('Flux ZIP source absent')) : done(input)))
          const digest = createHash('sha256'), chunks = []
          let bytes = 0, head = Buffer.alloc(0)
          for await (const chunk of stream) {
            bytes += chunk.length
            if (bytes > limit) throw new Error('Entrée ZIP source hors limite')
            digest.update(chunk)
            if (head.length < 5) head = Buffer.concat([head, chunk.subarray(0, 5 - head.length)])
            if (isManifest) chunks.push(chunk)
          }
          if (bytes !== entry.uncompressedSize) throw new Error('Taille entrée ZIP incorrecte')
          const sha256 = digest.digest('hex')
          if (isManifest) { manifest = JSON.parse(Buffer.concat(chunks).toString('utf8')); manifestSha256 = sha256 }
          else dump = { bytes, sha256, head: head.toString('ascii') }
        }
        read().then(() => zip.readEntry(), fail)
      })
      zip.on('end', () => {
        if (!manifest || !dump) { reject(new Error('Manifeste ou dump source absent')); return }
        resolve({ manifest, manifestSha256, dump })
      })
      zip.readEntry()
    })
  })
}

/** Lecture seule : jamais d'extraction, connexion SQL, suppression ou réécriture. */
export async function inventoryRecoveredBackups(labDirectory, recoveredDirectory) {
  const lab = path.resolve(labDirectory)
  const labStat = fs.lstatSync(lab)
  if (!labStat.isDirectory() || labStat.isSymbolicLink() || !/^recovered-rotation-dumps-[A-Za-z0-9_-]+$/.test(recoveredDirectory)) throw new Error('Répertoire de récupération refusé')
  const recovered = checkedPath(lab, recoveredDirectory, true)
  checkedPath(lab, ARCHIVE_DIRECTORY, true)
  const indexPath = checkedPath(lab, `${recoveredDirectory}/recovery-index.json`)
  const indexBefore = await fingerprint(indexPath, 1024 ** 2)
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  if (!Array.isArray(index.recovered) || !index.recovered.length || index.recovered.length > 1000) throw new Error('Index de récupération invalide')
  const seen = new Set()
  // Valider tout l'index avant d'ouvrir le premier dump.
  for (const item of index.recovered) {
    if (!DUMP.test(item.filename) || !ARCHIVE.test(item.archive) || !Number.isSafeInteger(item.bytes) || item.bytes < 5 || item.bytes > MAX_DUMP || !hex(item.sha256)) throw new Error('Nom, taille ou empreinte de l’index refusé')
    if (seen.has(item.filename)) throw new Error('Dump en doublon dans l’index')
    seen.add(item.filename)
  }
  if (fs.readdirSync(recovered).filter(name => name.endsWith('.dump')).some(name => !seen.has(name))) throw new Error('Dump présent mais absent de l’index')
  const copies = []
  for (const item of index.recovered) {
    const recoveredFile = `${recoveredDirectory}/${item.filename}`, sourceArchive = `${ARCHIVE_DIRECTORY}/${item.archive}`
    const filePath = checkedPath(lab, recoveredFile), archivePath = checkedPath(lab, sourceArchive)
    const file = await fingerprint(filePath, MAX_DUMP)
    if (file.bytes !== item.bytes || file.sha256 !== item.sha256) throw new Error('Taille ou empreinte récupérée différente de l’index')
    if (file.head !== 'PGDMP') throw new Error('Signature PostgreSQL récupérée invalide')
    const zipBefore = await fingerprint(archivePath, MAX_ARCHIVE), zipEntry = `database/${item.filename}`
    const { manifest, manifestSha256, dump } = await selectedZipEntries(archivePath, zipEntry)
    if (![1, 2].includes(manifest.version) || manifest.databaseIncluded !== true || !Array.isArray(manifest.files)) throw new Error('Manifeste source invalide')
    const declared = manifest.files.filter(record => record.name === zipEntry)
    if (declared.length !== 1 || declared[0].size !== file.bytes || declared[0].sha256 !== file.sha256 || dump.bytes !== file.bytes || dump.sha256 !== file.sha256 || dump.head !== 'PGDMP') throw new Error('Manifeste ou entrée ZIP différent des octets récupérés')
    const zipAfter = await fingerprint(archivePath, MAX_ARCHIVE)
    if (zipBefore.bytes !== zipAfter.bytes || zipBefore.sha256 !== zipAfter.sha256) throw new Error('ZIP source modifié pendant le contrôle')
    const named = DUMP.exec(item.filename), archiveNamed = ARCHIVE.exec(item.archive)
    const instant = value => Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null
    copies.push({ recoveredFile, bytes: file.bytes, sha256: file.sha256, signature: 'PGDMP', sourceArchive,
      archiveBytes: zipBefore.bytes, archiveSha256: zipBefore.sha256, zipEntry, zipEntrySha256: dump.sha256,
      manifestVersion: manifest.version, manifestSha256,
      namedLocalTime: `${named[1]}T${named[2]}:${named[3]}`, namedLocalTimeZone: 'non encodé dans le libellé',
      dumpNameEpochUtc: instant(Number(named[4])), archiveNameEpochUtc: instant(Number(archiveNamed[1])),
      manifestStartedAt: typeof manifest.startedAt === 'string' ? instant(manifest.startedAt) : null,
      manifestCompletedAt: typeof manifest.completedAt === 'string' ? instant(manifest.completedAt) : null })
  }
  const indexAfter = await fingerprint(indexPath, 1024 ** 2)
  if (indexAfter.sha256 !== indexBefore.sha256) throw new Error('Index modifié pendant le contrôle')
  copies.sort((a, b) => a.recoveredFile.localeCompare(b.recoveredFile))
  const range = field => { const values = copies.map(item => item[field]).filter(Boolean).sort(); return { first: values[0] ?? null, last: values.at(-1) ?? null } }
  return { checkedAt: new Date().toISOString(), mode: 'read-only', verifiedCount: copies.length,
    totalDumpBytes: copies.reduce((total, item) => total + item.bytes, 0), recoveryIndexSha256: indexBefore.sha256,
    originalIndexCheckedAt: typeof index.checkedAt === 'string' ? index.checkedAt : null,
    periods: { namedLocalTime: range('namedLocalTime'), dumpNameEpochUtc: range('dumpNameEpochUtc'), manifestStartedAt: range('manifestStartedAt'), manifestCompletedAt: range('manifestCompletedAt') },
    limits: ['Dates de noms et manifestes issues des horloges applicatives, pas une preuve indépendante de l’heure du contenu.',
      'Signatures, tailles, SHA-256 et liens ZIP/manifeste vérifiés ; aucun de ces dumps historiques restauré par cet inventaire.',
      'Les deux suppressions de rotation sans nom ne peuvent pas être attribuées à deux de ces copies.',
      'Les autres entrées métier des ZIP ne sont pas extraites ni lues ; ceci ne revérifie pas l’intégrité complète de chaque archive.'], copies }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const [lab, recovered, output] = process.argv.slice(2)
  if (!lab || !recovered || !output || process.argv.length !== 5) throw new Error('Usage : node scripts/local/backup-recovery-inventory.mjs <laboratoire> <dossier-récupéré> <nouveau-rapport.json>')
  const report = await inventoryRecoveredBackups(lab, recovered)
  fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ verifiedCount: report.verifiedCount, totalDumpBytes: report.totalDumpBytes, periods: report.periods }))
}
