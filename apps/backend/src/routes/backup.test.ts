import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { runFullBackup } from '../jobs/backup-worker'
import { validFilename } from './backup'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FULL_BACKUP_DIR = path.join(DATA_DIR, 'backups', 'full')

let produced: string | null = null

afterEach(() => {
  if (produced) {
    const f = path.join(FULL_BACKUP_DIR, produced)
    if (fs.existsSync(f)) fs.unlinkSync(f)
    produced = null
  }
})

describe('runFullBackup', () => {
  it('produit un zip non vide', async () => {
    const filename = await runFullBackup()
    produced = filename
    const full = path.join(FULL_BACKUP_DIR, filename)
    expect(fs.existsSync(full)).toBe(true)
    expect(fs.statSync(full).size).toBeGreaterThan(0)
  })
})

describe('validFilename', () => {
  it('accepte un nom de backup légitime', () => {
    expect(validFilename('creorga-full-2026-01-15-1230.zip')).toBe(true)
  })

  it('rejette une tentative de path traversal', () => {
    expect(validFilename('../../etc/passwd')).toBe(false)
    expect(validFilename('../../../etc/shadow.zip')).toBe(false)
  })

  it('rejette une extension différente', () => {
    expect(validFilename('creorga-full-2026-01-15.tar')).toBe(false)
  })
})
