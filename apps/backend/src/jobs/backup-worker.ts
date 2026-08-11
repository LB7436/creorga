import fs from 'fs'
import path from 'path'
import { ZipArchive } from 'archiver'
import logger from '../lib/logger'
import { runPgDump } from './pg-dump'

/**
 * v4.7 — Sauvegarde ZIP complète de data/ (hors data/backups/) toutes les 6h.
 * Rétention : 30 derniers + 1 par mois au-delà (zips datés du 1er du mois conservés).
 */

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FULL_BACKUP_DIR = path.join(DATA_DIR, 'backups', 'full')
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000

export interface FullBackupInfo {
  filename: string
  size: number
  createdAt: number
}

function ensureDir() {
  if (!fs.existsSync(FULL_BACKUP_DIR)) fs.mkdirSync(FULL_BACKUP_DIR, { recursive: true })
}

function timestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

export async function runFullBackup(): Promise<string> {
  ensureDir()
  const filename = `creorga-full-${timestamp()}.zip`
  const outPath = path.join(FULL_BACKUP_DIR, filename)

  // Dump PostgreSQL AVANT le ZIP, pour l'y inclure (RAPPORT-AUDIT.md §5.1).
  // Un echec ne doit pas priver l'exploitant de la sauvegarde des fichiers,
  // mais il doit etre bruyant : c'est toute la comptabilite qui n'est pas
  // sauvegardee. Jamais de `catch {}` silencieux ici.
  let dumpPath: string | null = null
  try {
    const dump = await runPgDump()
    dumpPath = dump.path
  } catch (err: any) {
    logger.error(
      `[backup] ECHEC du dump PostgreSQL : ${err?.message || err} — ` +
        "l'archive ne contiendra QUE les fichiers data/, pas la base."
    )
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })

    output.on('close', () => {
      pruneOldBackups()
      resolve(filename)
    })
    archive.on('error', (err: Error) => reject(err))
    archive.pipe(output)

    // Zippe tout data/ sauf data/backups/
    const entries = fs.readdirSync(DATA_DIR)
    for (const entry of entries) {
      if (entry === 'backups') continue
      const full = path.join(DATA_DIR, entry)
      const stat = fs.statSync(full)
      if (stat.isDirectory()) archive.directory(full, entry)
      else archive.file(full, { name: entry })
    }

    // Le dump vit sous data/backups/db/, exclu du parcours ci-dessus :
    // on l'ajoute explicitement dans database/ a l'interieur de l'archive.
    if (dumpPath && fs.existsSync(dumpPath)) {
      archive.file(dumpPath, { name: `database/${path.basename(dumpPath)}` })
    }

    archive.finalize()
  })
}

function pruneOldBackups(): void {
  ensureDir()
  const files = fs.readdirSync(FULL_BACKUP_DIR)
    .filter((f) => /^creorga-full-[\d-]+\.zip$/.test(f))
    .map((f) => ({ f, stat: fs.statSync(path.join(FULL_BACKUP_DIR, f)) }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)

  const recent30 = files.slice(0, 30)
  const rest = files.slice(30)
  const keptFilenames = new Set(recent30.map((x) => x.f))

  for (const item of rest) {
    const day = new Date(item.stat.mtimeMs).getDate()
    if (day === 1) {
      keptFilenames.add(item.f)
      continue
    }
    try { fs.unlinkSync(path.join(FULL_BACKUP_DIR, item.f)) } catch { /* best effort */ }
  }
}

export function listFullBackups(): FullBackupInfo[] {
  ensureDir()
  return fs.readdirSync(FULL_BACKUP_DIR)
    .filter((f) => /^creorga-full-[\d-]+\.zip$/.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(FULL_BACKUP_DIR, f))
      return { filename: f, size: stat.size, createdAt: stat.mtimeMs }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

let timer: NodeJS.Timeout | null = null

export function startBackupWorker(): void {
  if (timer) return
  // Un échec complet de la sauvegarde ne doit JAMAIS être avalé (règle du
  // CLAUDE.md) : sans ce log, le gérant peut rester des semaines sans aucune
  // archive produite et ne le découvrir qu'au moment d'en avoir besoin.
  const echec = (e: any) => logger.error(`[backup] ÉCHEC complet du snapshot: ${e?.message || e}`)
  setTimeout(() => {
    runFullBackup().catch(echec)
  }, 60_000)
  timer = setInterval(() => {
    runFullBackup().catch(echec)
  }, SCAN_INTERVAL_MS)
}

export function stopBackupWorker(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
