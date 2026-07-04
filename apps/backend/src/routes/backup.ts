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

    // 1. Vérifie que chaque .json contenu se parse correctement avant de toucher au disque.
    for (const entry of entries) {
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
