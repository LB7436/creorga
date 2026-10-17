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
  vi.unstubAllEnvs()
  process.chdir(CWD)
  // Les fixtures exclusives sont conservées pendant le gel de suppression.
  tmpRoot = ''
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

describe('prunePgDumps — conservation sans autorisation de suppression', () => {
  it.each(['business', 'essential'])('le profil local %s ne purge aucun dump préexistant', async profile => {
    const { prunePgDumps, listPgDumps, DB_BACKUP_DIR, timestamp } = await loadModule()
    vi.stubEnv(profile === 'business' ? 'CREORGA_BUSINESS_ONLY' : 'CREORGA_BACKGROUND_MODE', profile === 'business' ? 'true' : 'essential')
    fs.mkdirSync(DB_BACKUP_DIR, { recursive: true })
    for (let i = 0; i < 20; i++) {
      const when = new Date(Date.now() - i * 86_400_000), file = path.join(DB_BACKUP_DIR, `creorga-db-${timestamp(when)}.dump`)
      fs.writeFileSync(file, 'PGDMP'); fs.utimesSync(file, when, when)
    }
    expect(prunePgDumps()).toEqual([])
    expect(listPgDumps()).toHaveLength(20)
  })
  it.each(['full', 'environment-opt-in'])('conserve les 60 dumps en profil %s sans dérogation par environnement', async profile => {
    const { prunePgDumps, listPgDumps, DB_BACKUP_DIR, timestamp } = await loadModule()
    vi.stubEnv('CREORGA_BUSINESS_ONLY', 'false')
    vi.stubEnv('CREORGA_BACKGROUND_MODE', 'full')
    if (profile === 'environment-opt-in') {
      vi.stubEnv('CREORGA_ALLOW_BACKUP_DELETION', 'true')
      vi.stubEnv('CREORGA_BACKUP_RETENTION_APPROVED', 'true')
    }
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

    expect(prunePgDumps()).toEqual([])
    const kept = listPgDumps()
    expect(kept).toHaveLength(60)

    const keptNames = new Set(kept.map((k) => k.filename))
    for (let i = 0; i < 7; i++) {
      expect(keptNames.has(`creorga-db-${timestamp(new Date(now - i * day))}.dump`)).toBe(true)
    }
    expect(keptNames.has(`creorga-db-${timestamp(new Date(now - 59 * day))}.dump`)).toBe(true)
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
