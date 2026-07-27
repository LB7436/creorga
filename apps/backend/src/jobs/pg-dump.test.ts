import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

vi.mock('../lib/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const CWD = process.cwd()
let tmpRoot = ''

// pg-dump.ts resout data/ depuis process.cwd() a l'import : on isole dans un
// dossier temporaire avant de charger le module.
async function loadModule() {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-pgdump-'))
  process.chdir(tmpRoot)
  vi.resetModules()
  return import('./pg-dump')
}

afterEach(() => {
  process.chdir(CWD)
  if (tmpRoot) {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
    tmpRoot = ''
  }
})

describe('parseDatabaseUrl', () => {
  it('extrait les parametres de connexion', async () => {
    const { parseDatabaseUrl } = await loadModule()
    expect(parseDatabaseUrl('postgresql://creorga:s3cr3t@localhost:5433/creorga_dev')).toEqual({
      user: 'creorga',
      password: 's3cr3t',
      host: 'localhost',
      port: '5433',
      database: 'creorga_dev',
    })
  })

  it('refuse explicitement une URL absente', async () => {
    const { parseDatabaseUrl } = await loadModule()
    expect(() => parseDatabaseUrl(undefined)).toThrow(/DATABASE_URL/)
  })
})

describe('prunePgDumps — retention 7 quotidiens + 4 hebdomadaires', () => {
  it('conserve les 7 plus recents et 1 dump par semaine sur 4 semaines', async () => {
    const { prunePgDumps, listPgDumps, DB_BACKUP_DIR, timestamp } = await loadModule()
    fs.mkdirSync(DB_BACKUP_DIR, { recursive: true })

    const day = 86_400_000
    const now = Date.now()
    for (let i = 0; i < 60; i++) {
      const when = new Date(now - i * day)
      const p = path.join(DB_BACKUP_DIR, `creorga-db-${timestamp(when)}.dump`)
      fs.writeFileSync(p, 'PGDMP')
      fs.utimesSync(p, when, when)
    }
    expect(listPgDumps()).toHaveLength(60)

    prunePgDumps()
    const kept = listPgDumps()

    expect(kept.length).toBeGreaterThanOrEqual(7)
    expect(kept.length).toBeLessThanOrEqual(7 + 4)

    const keptNames = new Set(kept.map((k) => k.filename))
    for (let i = 0; i < 7; i++) {
      expect(keptNames.has(`creorga-db-${timestamp(new Date(now - i * day))}.dump`)).toBe(true)
    }
    expect(keptNames.has(`creorga-db-${timestamp(new Date(now - 59 * day))}.dump`)).toBe(false)
  })

  it('ne supprime rien quand il y a moins de 7 dumps', async () => {
    const { prunePgDumps, listPgDumps, DB_BACKUP_DIR, timestamp } = await loadModule()
    fs.mkdirSync(DB_BACKUP_DIR, { recursive: true })
    for (let i = 0; i < 5; i++) {
      const when = new Date(Date.now() - i * 86_400_000)
      const p = path.join(DB_BACKUP_DIR, `creorga-db-${timestamp(when)}.dump`)
      fs.writeFileSync(p, 'PGDMP')
      fs.utimesSync(p, when, when)
    }
    expect(prunePgDumps()).toEqual([])
    expect(listPgDumps()).toHaveLength(5)
  })

  it('ignore les fichiers hors convention de nommage', async () => {
    const { prunePgDumps, DB_BACKUP_DIR } = await loadModule()
    fs.mkdirSync(DB_BACKUP_DIR, { recursive: true })
    fs.writeFileSync(path.join(DB_BACKUP_DIR, 'notes.txt'), 'a garder')

    prunePgDumps()

    expect(fs.existsSync(path.join(DB_BACKUP_DIR, 'notes.txt'))).toBe(true)
  })
})
