import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import AdmZip from 'adm-zip'
import { createHash } from 'node:crypto'
const dump = vi.hoisted(() => vi.fn())
vi.mock('../jobs/pg-dump', () => ({ runPgDump: dump }))
import { runFullBackup, listFullBackups, verifyArchive, inspectArchive, safeArchiveName } from '../jobs/backup-worker'
import { validFilename } from './backup'

let directory: string
let root: string
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-backup-test-'))
  directory = path.join(root, 'data')
  fs.mkdirSync(directory)
  const fixture = path.join(root, 'fixture.dump')
  fs.writeFileSync(fixture, 'PGDMP-fixture-locale')
  dump.mockReset().mockResolvedValue({ path: fixture })
})
afterEach(() => {
  const resolved = path.resolve(root)
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('creorga-backup-test-')) throw new Error('Répertoire temporaire inattendu')
  fs.rmSync(resolved, { recursive: true, force: true })
})

describe('runFullBackup', () => {
  it('produit un ZIP contrôlé avec base, fichiers et empreintes', async () => {
    fs.writeFileSync(path.join(directory, 'document.txt'), 'Pièce sauvegardée')
    const filename = await runFullBackup(directory)
    const full = path.join(directory, 'backups', 'full', filename)
    expect(fs.existsSync(full)).toBe(true)
    expect(await verifyArchive(full)).toBe(true)
    const zip = new AdmZip(full)
    expect(zip.readAsText('data/document.txt')).toBe('Pièce sauvegardée')
    expect(JSON.parse(zip.readAsText('backup-manifest.json')).databaseIncluded).toBe(true)
    expect(listFullBackups(directory)[0].complete).toBe(true)
    expect(listFullBackups(directory)[0].mediaStatus).toBe('absent')
    expect(dump).toHaveBeenCalledWith(path.join(directory, 'backups', 'db'))
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
    zip.updateFile('database/fixture.dump', Buffer.from('modification'))
    zip.writeZip(full)
    expect(await verifyArchive(full)).toBe(false)
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
  it('inclut les octets des médias voisins et exclut les archives récursives', async () => {
    fs.mkdirSync(path.join(root, 'medias', 'companies', 'fixture'), { recursive: true })
    const media = Buffer.from([0, 1, 255, 128, 13, 10])
    fs.writeFileSync(path.join(root, 'medias', 'companies', 'fixture', 'visuel.png'), media)
    fs.mkdirSync(path.join(directory, 'backups'), { recursive: true })
    fs.writeFileSync(path.join(directory, 'backups', 'ancienne.zip'), 'archive exclue')
    const filename = await runFullBackup(directory)
    const full = path.join(directory, 'backups', 'full', filename)
    const checked = await inspectArchive(full)
    expect(checked).toMatchObject({ valid: true, version: 2, mediaStatus: 'included' })
    expect(checked.files.find(file => file.name === 'medias/companies/fixture/visuel.png')?.sha256).toBe(createHash('sha256').update(media).digest('hex'))
    expect(checked.files.some(file => file.name.includes('ancienne.zip'))).toBe(false)
    expect(new AdmZip(full).readFile('medias/companies/fixture/visuel.png')).toEqual(media)
  })
  it('contrôle un ancien manifeste v1 sans inventer une couverture des médias', async () => {
    const zip = new AdmZip()
    const files = [{ name: 'floor-state.json', content: '{}' }, { name: 'database/fixture.dump', content: 'PGDMP-fixture' }]
    for (const file of files) zip.addFile(file.name, Buffer.from(file.content))
    zip.addFile('backup-manifest.json', Buffer.from(JSON.stringify({ version: 1, databaseIncluded: true, files: files.map(file => ({ name: file.name, size: Buffer.byteLength(file.content), sha256: createHash('sha256').update(file.content).digest('hex') })) })))
    const full = path.join(root, 'legacy.zip')
    zip.writeZip(full)
    expect(await inspectArchive(full)).toMatchObject({ valid: true, version: 1, mediaStatus: 'legacy-unknown' })
  })
  it('refuse les collisions de noms Windows et un manifeste illisible', async () => {
    const zip = new AdmZip()
    zip.addFile('database/fixture.dump', Buffer.from('PGDMP-fixture'))
    zip.addFile('data/A.txt', Buffer.from('A'))
    zip.addFile('data/a.txt', Buffer.from('B'))
    const full = path.join(root, 'invalid.zip')
    zip.writeZip(full)
    expect(await verifyArchive(full)).toBe(false)
    zip.deleteFile('data/a.txt')
    zip.addFile('backup-manifest.json', Buffer.from('null'))
    zip.writeZip(full)
    expect(await verifyArchive(full)).toBe(false)
  })
  it('refuse tout chemin pouvant sortir du dossier restauré ou cibler un périphérique', () => {
    for (const name of ['../secret', 'data/../../secret', '/root/file', 'C:/file', 'data\\file', 'data/NUL.txt', 'data/a.']) expect(safeArchiveName(name)).toBe(false)
    expect(safeArchiveName('medias/companies/fixture/été.png')).toBe(true)
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
