import fs from 'fs'
import path from 'path'
import { createHash, randomInt } from 'node:crypto'
import { ZipArchive } from 'archiver'
import AdmZip from 'adm-zip'
import logger from '../lib/logger'
import { runPgDump } from './pg-dump'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000
const FILENAME_RE = /^creorga-full-[\d-]+\.zip$/
const hash = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex')
export interface FullBackupInfo { filename: string; size: number; createdAt: number; complete: boolean }
const validated = new Map<string, { signature: string; complete: boolean }>()
const running = new Map<string, Promise<string>>()

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
  const dump = await runPgDump() // propagation obligatoire, aucun ZIP partiel présenté comme réussi
  const database = fs.readFileSync(dump.path)
  if (database.subarray(0, 5).toString('ascii') !== 'PGDMP') throw new Error('Sauvegarde refusée : export PostgreSQL invalide')
  const filename = `creorga-full-${startedAt.slice(0, 10)}-${Date.now()}-${randomInt(100000)}.zip`
  const destination = path.join(backupDir, filename)
  const partial = `${destination}.partial`
  const files: Array<{ name: string; size: number; sha256: string }> = []
  const archive = new ZipArchive({ zlib: { level: 9 } })
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
  const append = (name: string, content: Buffer) => {
    files.push({ name, size: content.length, sha256: hash(content) })
    archive.append(content, { name })
  }
  const visit = (directory: string, prefix = '') => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!prefix && item.name === 'backups') continue
      if (item.isSymbolicLink()) throw new Error('Sauvegarde refusée : lien symbolique dans les données')
      const full = path.join(directory, item.name)
      const name = prefix + item.name
      if (item.isDirectory()) visit(full, `${name}/`)
      else if (item.isFile()) append(name, fs.readFileSync(full))
    }
  }
  try {
    visit(dataDir)
    append(`database/${path.basename(dump.path)}`, database)
    archive.append(JSON.stringify({ version: 1, startedAt, completedAt: new Date().toISOString(), databaseIncluded: true, files }, null, 2), { name: 'backup-manifest.json' })
    await archive.finalize()
    await completed
    if (!verifyArchive(partial)) throw new Error('Sauvegarde refusée : contrôle d’intégrité du ZIP échoué')
    fs.renameSync(partial, destination)
    pruneOldBackups(dataDir)
    return filename
  } catch (err) {
    archive.abort()
    output.destroy()
    // Seul notre fichier temporaire est concerné, aucune sauvegarde antérieure.
    if (fs.existsSync(partial)) fs.unlinkSync(partial)
    throw err
  }
}

export function verifyArchive(full: string): boolean {
  try {
    const zip = new AdmZip(full)
    const entries = zip.getEntries()
    const database = entries.filter((entry) => /^database\/[^/]+\.dump$/.test(entry.entryName))
    if (database.length !== 1 || database[0].getData().subarray(0, 5).toString('ascii') !== 'PGDMP') return false
    const manifestEntry = zip.getEntry('backup-manifest.json')
    // Les anciennes archives sont signalées complètes seulement si un vrai dump est présent.
    if (!manifestEntry) return zip.test()
    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'))
    if (manifest.version !== 1 || manifest.databaseIncluded !== true || !Array.isArray(manifest.files)) return false
    const actual = entries.filter((entry) => !entry.isDirectory && entry.entryName !== 'backup-manifest.json')
    if (actual.length !== manifest.files.length || new Set(manifest.files.map((file: any) => file.name)).size !== actual.length) return false
    return manifest.files.every((file: any) => {
      const entry = zip.getEntry(file.name)
      if (!entry || entry.isDirectory) return false
      const bytes = entry.getData()
      return bytes.length === file.size && hash(bytes) === file.sha256
    })
  } catch { return false }
}

export function listFullBackups(dataDir = DATA_DIR): FullBackupInfo[] {
  const directory = path.join(dataDir, 'backups', 'full')
  fs.mkdirSync(directory, { recursive: true })
  return fs.readdirSync(directory).filter((name) => FILENAME_RE.test(name)).map((filename) => {
    const full = path.join(directory, filename)
    const stat = fs.statSync(full)
    const signature = `${stat.size}:${stat.mtimeMs}`
    let checked = validated.get(full)
    if (!checked || checked.signature !== signature) {
      checked = { signature, complete: verifyArchive(full) }
      validated.set(full, checked)
    }
    return { filename, size: stat.size, createdAt: stat.mtimeMs, complete: checked.complete }
  }).sort((a, b) => b.createdAt - a.createdAt)
}

function pruneOldBackups(dataDir: string) {
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
