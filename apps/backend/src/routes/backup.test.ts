import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import AdmZip from 'adm-zip'
const dump = vi.hoisted(() => vi.fn())
vi.mock('../jobs/pg-dump', () => ({ runPgDump: dump }))
import { runFullBackup, listFullBackups, verifyArchive } from '../jobs/backup-worker'
import { validFilename } from './backup'

let directory: string
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-backup-test-'))
  const fixture = path.join(directory, 'fixture.dump')
  fs.writeFileSync(fixture, 'PGDMP-fixture-locale')
  dump.mockReset().mockResolvedValue({ path: fixture })
})
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }))

describe('runFullBackup', () => {
  it('produit un ZIP contrôlé avec base, fichiers et empreintes', async () => {
    fs.writeFileSync(path.join(directory, 'document.txt'), 'Pièce sauvegardée')
    const filename = await runFullBackup(directory)
    const full = path.join(directory, 'backups', 'full', filename)
    expect(fs.existsSync(full)).toBe(true)
    expect(verifyArchive(full)).toBe(true)
    const zip = new AdmZip(full)
    expect(zip.readAsText('document.txt')).toBe('Pièce sauvegardée')
    expect(JSON.parse(zip.readAsText('backup-manifest.json')).databaseIncluded).toBe(true)
    expect(listFullBackups(directory)[0].complete).toBe(true)
  })
  it('ne publie aucune sauvegarde complète quand PostgreSQL échoue', async () => {
    dump.mockRejectedValueOnce(new Error('PostgreSQL indisponible'))
    await expect(runFullBackup(directory)).rejects.toThrow('PostgreSQL indisponible')
    expect(listFullBackups(directory)).toEqual([])
  })
  it('rejette une archive dont le contenu a été altéré', async () => {
    const filename = await runFullBackup(directory)
    const full = path.join(directory, 'backups', 'full', filename)
    const zip = new AdmZip(full)
    zip.updateFile('fixture.dump', Buffer.from('modification'))
    zip.writeZip(full)
    expect(verifyArchive(full)).toBe(false)
  })
  it('ne confond pas une ancienne archive sans base avec une sauvegarde complète', async () => {
    const dir = path.join(directory, 'backups', 'full')
    fs.mkdirSync(dir, { recursive: true })
    const zip = new AdmZip()
    zip.addFile('floor-state.json', Buffer.from('{}'))
    zip.writeZip(path.join(dir, 'creorga-full-2026-01-01-1200.zip'))
    expect(listFullBackups(directory)[0].complete).toBe(false)
  })
  it('regroupe deux demandes simultanées dans une même opération', async () => {
    const [a, b] = await Promise.all([runFullBackup(directory), runFullBackup(directory)])
    expect(a).toBe(b)
    expect(dump).toHaveBeenCalledOnce()
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
