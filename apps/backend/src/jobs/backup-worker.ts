import fs from 'fs'
import path from 'path'
import { createHash, randomInt } from 'node:crypto'
import { ZipArchive } from 'archiver'
import yauzl, { type Entry } from 'yauzl'
import { Transform, type Readable } from 'node:stream'
import logger from '../lib/logger'
import { runPgDump } from './pg-dump'
import { runtimeProfile } from '../lib/runtime-profile'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000
const FILENAME_RE = /^creorga-full-[\d-]+\.zip$/
type FileRecord = { name: string; size: number; sha256: string }
type BackupManifest = { version: number; databaseIncluded: boolean; files: FileRecord[]; roots?: Array<{ name: string; prefix: string; status: string }> }
export interface ArchiveInspection { valid: boolean; version: number | null; mediaStatus: 'included' | 'absent' | 'legacy-unknown'; files: FileRecord[] }
export interface FullBackupInfo { filename: string; size: number; createdAt: number; complete: boolean; verifying: boolean; formatVersion: number | null; mediaStatus: ArchiveInspection['mediaStatus'] }
const validated = new Map<string, { signature: string; result: ArchiveInspection | null }>()
const running = new Map<string, Promise<string>>()
let inspectionQueue: Promise<void> = Promise.resolve()

/** Un échec PostgreSQL ne peut jamais produire une archive annoncée complète. */
export function runFullBackup(dataDir = DATA_DIR): Promise<string> {
  const root = path.resolve(dataDir)
  const active = running.get(root)
  if (active) return active
  const task = createFullBackup(root).finally(() => running.delete(root))
  running.set(root, task)
  return task
}

async function createFullBackup(dataDir: string): Promise<string> {
  const backupDir = path.join(dataDir, 'backups', 'full')
  fs.mkdirSync(backupDir, { recursive: true })
  const startedAt = new Date().toISOString()
  const dump = await runPgDump(path.join(dataDir, 'backups', 'db'))
  const filename = `creorga-full-${startedAt.slice(0, 10)}-${Date.now()}-${randomInt(100000)}.zip`
  const destination = path.join(backupDir, filename)
  const partial = `${destination}.partial`
  const files: FileRecord[] = []
  let sourceBytes = 0
  const archive = new ZipArchive({ zlib: { level: 6 } })
  const output = fs.createWriteStream(partial, { flags: 'wx', mode: 0o600 })
  const completed = new Promise<void>((resolve, reject) => {
    output.on('close', resolve)
    output.on('error', reject)
    archive.on('error', reject)
    archive.on('warning', reject)
  })
  // L'écoute de rejet est installée avant de commencer la lecture des fichiers.
  completed.catch(() => {})
  archive.pipe(output)
  const append = async (name: string, source: string) => {
    if (!safeArchiveName(name)) throw new Error('Sauvegarde refusée : nom de fichier incompatible avec une restauration sûre')
    const before = fs.lstatSync(source)
    if (!before.isFile() || before.isSymbolicLink()) throw new Error('Sauvegarde refusée : fichier non régulier')
    if (files.length >= 99_998 || sourceBytes + before.size > 32 * 1024 ** 3) throw new Error('Sauvegarde refusée : volume hors limites')
    const digest = createHash('sha256')
    let size = 0
    const stream = new Transform({ transform(chunk, _encoding, callback) { digest.update(chunk); size += chunk.length; callback(null, chunk) } })
    const input = fs.createReadStream(source)
    const consumed = new Promise<void>((resolve, reject) => {
      const done = () => { cleanup(); resolve() }
      const failed = (error: Error) => { cleanup(); reject(error) }
      const cleanup = () => { archive.off('entry', done); archive.off('error', failed); archive.off('warning', failed); output.off('error', failed); input.off('error', failed); stream.off('error', failed) }
      archive.once('entry', done); archive.once('error', failed); archive.once('warning', failed); output.once('error', failed); input.once('error', failed); stream.once('error', failed)
    })
    archive.append(stream, { name, store: /\.(mp4|webm|mkv|mov|avi)$/i.test(name) })
    input.pipe(stream)
    try { await consumed } finally { input.destroy(); stream.destroy() }
    const after = fs.lstatSync(source)
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino || size !== before.size) {
      throw new Error('Sauvegarde refusée : un fichier a changé pendant sa lecture')
    }
    files.push({ name, size, sha256: digest.digest('hex') })
    sourceBytes += size
  }
  const visit = async (directory: string, prefix: string) => {
    const metadata = fs.lstatSync(directory)
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error('Sauvegarde refusée : répertoire non régulier')
    for (const item of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (prefix === 'data/' && item.name === 'backups') continue
      if (item.isSymbolicLink()) throw new Error('Sauvegarde refusée : lien symbolique dans les données')
      const full = path.join(directory, item.name)
      const name = prefix + item.name
      if (item.isDirectory()) await visit(full, `${name}/`)
      else if (item.isFile()) await append(name, full)
      else throw new Error('Sauvegarde refusée : entrée de données non régulière')
    }
    if (fs.lstatSync(directory).mtimeMs !== metadata.mtimeMs) throw new Error('Sauvegarde refusée : un répertoire a changé pendant sa lecture')
  }
  try {
    const mediaDir = path.resolve(dataDir, '..', 'medias')
    const mediaPresent = fs.existsSync(mediaDir)
    await visit(dataDir, 'data/')
    if (mediaPresent) await visit(mediaDir, 'medias/')
    await append(`database/${path.basename(dump.path)}`, dump.path)
    archive.append(JSON.stringify({ version: 2, startedAt, completedAt: new Date().toISOString(), databaseIncluded: true,
      roots: [{ name: 'data', prefix: 'data/', status: 'included' }, { name: 'medias', prefix: 'medias/', status: mediaPresent ? 'included' : 'absent' }],
      exclusions: [{ root: 'data', path: 'backups/', reason: 'Copies précédentes et archives récursives exclues' }],
      consistency: 'Separate database snapshot and file scan; stop application writers for a common restore point',
      files }, null, 2), { name: 'backup-manifest.json' })
    await archive.finalize()
    await completed
    const inspection = await inspectArchive(partial)
    if (!inspection.valid) throw new Error('Sauvegarde refusée : contrôle d’intégrité du ZIP échoué')
    const fd = fs.openSync(partial, 'r+')
    try { fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
    fs.renameSync(partial, destination)
    const stat = fs.statSync(destination)
    validated.set(destination, { signature: `${stat.size}:${stat.mtimeMs}`, result: { ...inspection, files: [] } })
    pruneOldBackups(dataDir)
    return filename
  } catch (err) {
    archive.abort()
    output.destroy()
    if (!output.closed) await new Promise<void>(resolve => output.once('close', resolve))
    // Seul notre fichier temporaire est concerné, aucune sauvegarde antérieure.
    if (fs.existsSync(partial)) fs.unlinkSync(partial)
    throw err
  }
}

/** Format Windows/Unix commun : aucune traversée, collision ou périphérique. */
export function safeArchiveName(name: string): boolean {
  return !!name && name.length <= 1024 && !/[\\:<>"|?*\x00-\x1f]/.test(name) && !name.startsWith('/')
    && name.replace(/\/$/, '').split('/').every(part => !!part && part.length <= 255 && part !== '.' && part !== '..'
      && !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))
}

/** Lecture de contrôle en flux ; aucune extraction ni lecture du ZIP entier en RAM. */
export async function inspectArchive(full: string): Promise<ArchiveInspection> {
  const invalid: ArchiveInspection = { valid: false, version: null, mediaStatus: 'legacy-unknown', files: [] }
  try {
    return await new Promise<ArchiveInspection>((resolve, reject) => {
      yauzl.open(full, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
        if (error || !zip) { reject(error || new Error('ZIP absent')); return }
        const names = new Set<string>(), filePaths = new Set<string>(), directoryPaths = new Set<string>(), files: FileRecord[] = []
        let manifest: BackupManifest | null = null, manifestPresent = false, dumpCount = 0, total = 0, entryCount = 0
        const failed = (err: unknown) => { zip.close(); reject(err) }
        zip.on('error', failed)
        zip.on('entry', (entry: Entry) => {
          const consume = async () => {
            const name = entry.fileName
            if (++entryCount > 100_000 || !safeArchiveName(name) || names.has(name.toLocaleLowerCase()) || ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000) throw new Error('Entrée ZIP invalide')
            names.add(name.toLocaleLowerCase())
            const normalized = name.replace(/\/$/, '').toLowerCase()
            const pieces = normalized.split('/')
            for (let index = 1; index < pieces.length; index++) {
              const ancestor = pieces.slice(0, index).join('/')
              if (filePaths.has(ancestor)) throw new Error('Collision fichier/répertoire')
              directoryPaths.add(ancestor)
            }
            if (name.endsWith('/')) {
              if (filePaths.has(normalized)) throw new Error('Collision fichier/répertoire')
              directoryPaths.add(normalized)
            } else {
              if (directoryPaths.has(normalized)) throw new Error('Collision fichier/répertoire')
              filePaths.add(normalized)
            }
            if (name.endsWith('/')) return
            total += entry.uncompressedSize
            if (total > 32 * 1024 ** 3 || (name === 'backup-manifest.json' && entry.uncompressedSize > 16 * 1024 ** 2)) throw new Error('Archive hors limites')
            const stream = await new Promise<Readable>((res, rej) => zip.openReadStream(entry, (err, source) => err || !source ? rej(err || new Error('Flux absent')) : res(source)))
            const digest = createHash('sha256'), parts: Buffer[] = []
            let size = 0, header = Buffer.alloc(0)
            for await (const value of stream) {
              const chunk = Buffer.from(value)
              size += chunk.length; digest.update(chunk)
              if (header.length < 5) header = Buffer.concat([header, chunk.subarray(0, 5 - header.length)])
              if (name === 'backup-manifest.json') parts.push(chunk)
            }
            if (size !== entry.uncompressedSize) throw new Error('Taille ZIP incorrecte')
            if (/^database\/[^/]+\.dump$/.test(name)) { if (header.toString('ascii') !== 'PGDMP') throw new Error('Dump invalide'); dumpCount++ }
            if (name === 'backup-manifest.json') { manifestPresent = true; manifest = JSON.parse(Buffer.concat(parts).toString('utf8')) }
            else files.push({ name, size, sha256: digest.digest('hex') })
          }
          consume().then(() => zip.readEntry(), failed)
        })
        zip.on('end', () => {
          try {
          if (dumpCount !== 1) { resolve(invalid); return }
          if (!manifestPresent) { resolve({ valid: true, version: 0, mediaStatus: 'legacy-unknown', files }); return }
          if (!manifest || typeof manifest !== 'object') { resolve(invalid); return }
          if (![1, 2].includes(manifest.version) || !manifest.databaseIncluded || !Array.isArray(manifest.files) || manifest.files.length !== files.length) { resolve(invalid); return }
          const actual = new Map(files.map(file => [file.name, file]))
          if (new Set(manifest.files.map(file => file.name)).size !== files.length || manifest.files.some(file => {
            const found = actual.get(file.name)
            return !found || found.size !== file.size || found.sha256 !== file.sha256
          })) { resolve(invalid); return }
          let mediaStatus: ArchiveInspection['mediaStatus'] = 'legacy-unknown'
          if (manifest.version === 2) {
            const roots = manifest.roots
            const media = roots?.find(root => root.name === 'medias')
            if (!Array.isArray(roots) || roots.length !== 2 || !roots.some(root => root.name === 'data' && root.prefix === 'data/' && root.status === 'included')
              || !media || media.prefix !== 'medias/' || !['included', 'absent'].includes(media.status)
              || files.some(file => !/^(data|medias|database)\//.test(file.name))
              || (media.status === 'absent' && files.some(file => file.name.startsWith('medias/')))) { resolve(invalid); return }
            mediaStatus = media.status as 'included' | 'absent'
          }
          resolve({ valid: true, version: manifest.version, mediaStatus, files })
          } catch { resolve(invalid) }
        })
        zip.readEntry()
      })
    })
  } catch { return invalid }
}

export async function verifyArchive(full: string): Promise<boolean> { return (await inspectArchive(full)).valid }

export function listFullBackups(dataDir = DATA_DIR): FullBackupInfo[] {
  const directory = path.join(dataDir, 'backups', 'full')
  fs.mkdirSync(directory, { recursive: true })
  return fs.readdirSync(directory).filter((name) => FILENAME_RE.test(name)).map((filename) => {
    const full = path.join(directory, filename)
    const stat = fs.statSync(full)
    const signature = `${stat.size}:${stat.mtimeMs}`
    let checked = validated.get(full)
    if (!checked || checked.signature !== signature) {
      checked = { signature, result: null }
      validated.set(full, checked)
      const pending = checked
      // L'inventaire de trente gros ZIP ne doit pas lancer trente lectures à la
      // fois ni conserver tous leurs manifestes en mémoire.
      inspectionQueue = inspectionQueue.then(async () => {
        const result = await inspectArchive(full)
        if (validated.get(full) === pending) pending.result = { ...result, files: [] }
      }).catch(() => { if (validated.get(full) === pending) pending.result = { valid: false, version: null, mediaStatus: 'legacy-unknown', files: [] } })
    }
    return { filename, size: stat.size, createdAt: stat.mtimeMs, complete: checked.result?.valid === true && checked.result.version === 2,
      verifying: checked.result === null, formatVersion: checked.result?.version ?? null, mediaStatus: checked.result?.mediaStatus ?? 'legacy-unknown' }
  }).sort((a, b) => b.createdAt - a.createdAt)
}

function pruneOldBackups(dataDir: string) {
  // Le lancement local ne reçoit aucune autorisation de supprimer des archives.
  if (!runtimeProfile().pruneBackups) return
  const backups = listFullBackups(dataDir).filter((backup) => backup.complete)
  for (const backup of backups.slice(30)) {
    if (new Date(backup.createdAt).getDate() === 1) continue
    try { fs.unlinkSync(path.join(dataDir, 'backups', 'full', backup.filename)) }
    catch (err) { logger.warn('[backup] Ancienne archive conservée : suppression impossible', err) }
  }
}

let timer: NodeJS.Timeout | null = null
let initial: NodeJS.Timeout | null = null
export function startBackupWorker(): void {
  if (timer) return
  const run = () => { runFullBackup().catch((err) => logger.error('[backup] ÉCHEC : aucune nouvelle sauvegarde complète', err)) }
  initial = setTimeout(run, 60_000)
  timer = setInterval(run, SCAN_INTERVAL_MS)
}
export function stopBackupWorker(): void {
  if (initial) clearTimeout(initial)
  if (timer) clearInterval(timer)
  timer = null
  initial = null
}
