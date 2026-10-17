import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { createHash } from 'node:crypto'

const dump = vi.hoisted(() => vi.fn())
vi.mock('node:crypto', async importOriginal => ({ ...await importOriginal<typeof import('node:crypto')>(), randomInt: () => 123 }))
vi.mock('./pg-dump', () => ({ runPgDump: dump }))
vi.mock('../lib/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
import { listFullBackups, runFullBackup } from './backup-worker'

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

function setup() {
  // Chaque test possède un nouveau répertoire ; aucune archive existante ciblée.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-retention-sans-purge-'))
  const data = path.join(root, 'data'), backups = path.join(data, 'backups', 'full')
  fs.mkdirSync(backups, { recursive: true })
  const fixture = path.join(root, 'fixture.dump')
  fs.writeFileSync(fixture, 'PGDMP-fictif')
  dump.mockReset().mockResolvedValue({ path: fixture })
  return { root, data, backups, fixture }
}

describe('sauvegardes : gel des suppressions tous profils', () => {
  it('une sauvegarde réussie ne supprime aucun des 31 anciens ZIP même en profil complet', async () => {
    const { data, backups } = setup()
    vi.stubEnv('CREORGA_BUSINESS_ONLY', 'false')
    vi.stubEnv('CREORGA_BACKGROUND_MODE', 'full')
    vi.stubEnv('CREORGA_ALLOW_BACKUP_DELETION', 'true')
    const files = [{ name: 'database/fixture.dump', size: 12, sha256: createHash('sha256').update('PGDMP-fictif').digest('hex') }]
    files[0].size = Buffer.byteLength('PGDMP-fictif')
    const old: string[] = []
    for (let index = 0; index < 31; index++) {
      const filename = `creorga-full-2026-01-02-${1000 + index}.zip`
      const zip = new AdmZip()
      zip.addFile('database/fixture.dump', Buffer.from('PGDMP-fictif'))
      zip.addFile('backup-manifest.json', Buffer.from(JSON.stringify({ version: 2, databaseIncluded: true, files,
        roots: [{ name: 'data', prefix: 'data/', status: 'included' }, { name: 'medias', prefix: 'medias/', status: 'absent' }] })))
      const full = path.join(backups, filename)
      zip.writeZip(full)
      fs.utimesSync(full, new Date('2026-01-02T12:00:00Z'), new Date('2026-01-02T12:00:00Z'))
      old.push(filename)
    }
    listFullBackups(data)
    await vi.waitFor(() => expect(listFullBackups(data).every(item => item.complete)).toBe(true))
    await runFullBackup(data)
    expect(old.filter(filename => fs.existsSync(path.join(backups, filename)))).toHaveLength(31)
    expect(fs.readdirSync(backups).filter(name => name.endsWith('.zip'))).toHaveLength(32)
    expect(fs.readdirSync(backups).filter(name => name.endsWith('.partial'))).toHaveLength(1)
  })

  it('un ZIP partiel en échec reste disponible pour un diagnostic sans être annoncé complet', async () => {
    const { data, backups, fixture } = setup()
    // La dépendance pg_dump simulée produit volontairement des octets invalides.
    fs.writeFileSync(fixture, 'not-a-postgresql-dump')
    await expect(runFullBackup(data)).rejects.toThrow(/intégrité/)
    const files = fs.readdirSync(backups)
    expect(files.filter(name => name.endsWith('.partial'))).toHaveLength(1)
    expect(listFullBackups(data)).toEqual([])
  })
  it('une collision ZIP refuse de remplacer une archive même par des octets différents', async () => {
    const { data, backups } = setup()
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-16T14:34:46.128Z'))
    fs.writeFileSync(path.join(data, 'fixture.txt'), 'version initiale fictive')
    const filename = 'creorga-full-2026-10-16-1792161286128-123.zip', full = path.join(backups, filename)
    fs.writeFileSync(full, 'ancienne archive fictive à préserver')
    const before = fs.readFileSync(full)
    fs.writeFileSync(path.join(data, 'fixture.txt'), 'version modifiée fictive')
    await expect(runFullBackup(data)).rejects.toThrow(/exist|collision|EEXIST/i)
    expect(fs.readFileSync(full)).toEqual(before)
  })
})
