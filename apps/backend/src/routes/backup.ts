import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { runFullBackup, listFullBackups } from '../jobs/backup-worker'

/**
 * v4.7 — Endpoints de sauvegarde/restauration intégrale de data/.
 */

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FULL_BACKUP_DIR = path.join(DATA_DIR, 'backups', 'full')
const FILENAME_RE = /^creorga-full-[\d-]+\.zip$/
const MAX_RESTORE_ENTRIES = 5_000
const MAX_RESTORE_BYTES = 100 * 1024 * 1024

const router = Router()

export function validFilename(filename: string): boolean {
  return FILENAME_RE.test(filename)
}

router.get('/full', (_req, res) => {
  res.json({ backups: listFullBackups() })
})

router.post('/full', async (_req, res) => {
  try {
    const filename = await runFullBackup()
    res.json({ ok: true, filename })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'backup failed' })
  }
})

router.get('/full/:filename/download', (req, res) => {
  const { filename } = req.params
  if (!validFilename(filename)) return res.status(400).json({ error: 'invalid filename' })
  const full = path.join(FULL_BACKUP_DIR, filename)
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'not found' })
  res.download(full)
})

router.post('/full/:filename/restore', (req, res) => {
  const { filename } = req.params
  if (!validFilename(filename)) return res.status(400).json({ error: 'invalid filename' })
  const zipPath = path.join(FULL_BACKUP_DIR, filename)
  if (!fs.existsSync(zipPath)) return res.status(404).json({ error: 'not found' })

  try {
    const zip = new AdmZip(zipPath)
    const entries = zip.getEntries()
    if (entries.length > MAX_RESTORE_ENTRIES) {
      return res.status(400).json({ error: 'backup refusé : trop de fichiers' })
    }

    let totalBytes = 0

    // 1. Vérifie les chemins, la taille et chaque .json avant de toucher au disque.
    // Les archives de sauvegarde sont générées localement, mais un propriétaire
    // peut aussi en importer une : aucun chemin ne doit sortir de data/.
    for (const entry of entries) {
      const name = entry.entryName
      if (!name || name.includes('\\') || name.includes('\0') || path.isAbsolute(name) || /^[a-zA-Z]:/.test(name)) {
        return res.status(400).json({ error: 'backup refusé : chemin interne invalide' })
      }
      const destination = path.resolve(DATA_DIR, name)
      const relative = path.relative(DATA_DIR, destination)
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        return res.status(400).json({ error: 'backup refusé : chemin hors du dossier data' })
      }

      const size = Number(entry.header.size)
      if (!Number.isSafeInteger(size) || size < 0 || (totalBytes += size) > MAX_RESTORE_BYTES) {
        return res.status(400).json({ error: 'backup refusé : taille décompressée excessive' })
      }
      if (entry.isDirectory) continue
      if (entry.entryName.endsWith('.json')) {
        JSON.parse(zip.readAsText(entry))
      }
    }

    // 2. Sauvegarde l'état actuel avant d'écraser quoi que ce soit.
    const preRestoreDir = path.join(DATA_DIR, 'backups', `pre-restore-${Date.now()}`)
    fs.mkdirSync(preRestoreDir, { recursive: true })
    for (const entry of fs.readdirSync(DATA_DIR)) {
      if (entry === 'backups') continue
      const src = path.join(DATA_DIR, entry)
      const dest = path.join(preRestoreDir, entry)
      fs.cpSync(src, dest, { recursive: true })
    }

    // 3. Extrait le zip par-dessus data/.
    zip.extractAllTo(DATA_DIR, true)

    res.json({ ok: true, restoredFrom: filename, preRestoreSnapshot: path.basename(preRestoreDir) })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'restore failed — backup corrompu ou invalide' })
  }
})

router.delete('/full/:filename', (req, res) => {
  const { filename } = req.params
  if (!validFilename(filename)) return res.status(400).json({ error: 'invalid filename' })
  const full = path.join(FULL_BACKUP_DIR, filename)
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'not found' })
  fs.unlinkSync(full)
  res.json({ ok: true })
})

export default router
