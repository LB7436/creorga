import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import logger from '../lib/logger'

const execFileAsync = promisify(execFile)

/**
 * Sauvegarde PostgreSQL (pg_dump) — comble le manque documenté dans
 * RAPPORT-AUDIT.md §5.1 : commandes, factures, clients, employes et releves
 * HACCP vivent en base et n'etaient dans aucune archive.
 *
 * Deux strategies, car pg_dump n'est pas toujours installe sur l'hote :
 *  - "native" : binaire pg_dump present sur le PATH ;
 *  - "docker" : pg_dump execute DANS le conteneur Postgres, puis docker cp.
 *
 * Le dump n'est jamais lu via un pipe : il est ecrit avec -f puis recupere.
 * Un pipe binaire est ininterpretable sous PowerShell 5.1 (Windows) et
 * corrompt l'archive.
 */

const DATA_DIR = path.resolve(process.cwd(), 'data')
export const DB_BACKUP_DIR = path.join(DATA_DIR, 'backups', 'db')

/** Retention demandee : 7 quotidiens + 4 hebdomadaires. */
export const DAILY_RETENTION = 7
export const WEEKLY_RETENTION = 4

const DUMP_RE = /^creorga-db-[\d-]+\.dump$/

export type DumpStrategy = 'native' | 'docker'

export interface PgDumpResult {
  filename: string
  path: string
  size: number
  strategy: DumpStrategy
}

export interface DbConnection {
  user: string
  password: string
  host: string
  port: string
  database: string
}

export function parseDatabaseUrl(url = process.env.DATABASE_URL): DbConnection {
  if (!url) throw new Error('DATABASE_URL absent : impossible de sauvegarder la base')
  const u = new URL(url)
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port || '5432',
    database: u.pathname.replace(/^\//, ''),
  }
}

export function timestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

function ensureDir() {
  if (!fs.existsSync(DB_BACKUP_DIR)) fs.mkdirSync(DB_BACKUP_DIR, { recursive: true })
}

async function canRun(bin: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(bin, args, { timeout: 15_000 })
    return true
  } catch {
    return false
  }
}

/** Determine la strategie utilisable. `PG_DUMP_MODE` force le choix. */
export async function detectStrategy(): Promise<DumpStrategy | null> {
  const forced = process.env.PG_DUMP_MODE
  if (forced === 'native' || forced === 'docker') return forced

  if (await canRun(process.env.PG_DUMP_BIN || 'pg_dump', ['--version'])) return 'native'

  const container = process.env.PG_DUMP_DOCKER_CONTAINER || 'creorga-db'
  if (await canRun('docker', ['exec', container, 'pg_dump', '--version'])) return 'docker'

  return null
}

/**
 * Produit un dump compresse (format custom PostgreSQL, deja compresse).
 * Leve une erreur explicite si aucune strategie n'est disponible : une
 * sauvegarde qui echoue en silence est pire que pas de sauvegarde.
 */
export async function runPgDump(): Promise<PgDumpResult> {
  ensureDir()
  const conn = parseDatabaseUrl()
  const filename = `creorga-db-${timestamp()}.dump`
  const outPath = path.join(DB_BACKUP_DIR, filename)

  const strategy = await detectStrategy()
  if (!strategy) {
    throw new Error(
      'pg_dump introuvable : ni sur le PATH, ni dans le conteneur Docker ' +
        `"${process.env.PG_DUMP_DOCKER_CONTAINER || 'creorga-db'}". ` +
        'Installez postgresql-client ou definissez PG_DUMP_MODE / PG_DUMP_DOCKER_CONTAINER.'
    )
  }

  if (strategy === 'native') {
    await execFileAsync(
      process.env.PG_DUMP_BIN || 'pg_dump',
      ['-h', conn.host, '-p', conn.port, '-U', conn.user, '-d', conn.database, '-Fc', '-f', outPath],
      { env: { ...process.env, PGPASSWORD: conn.password }, timeout: 10 * 60_000 }
    )
  } else {
    const container = process.env.PG_DUMP_DOCKER_CONTAINER || 'creorga-db'
    const tmp = `/tmp/${filename}`
    // Depuis l'interieur du conteneur, la base est joignable en local.
    await execFileAsync(
      'docker',
      ['exec', '-e', `PGPASSWORD=${conn.password}`, container,
       'pg_dump', '-U', conn.user, '-d', conn.database, '-Fc', '-f', tmp],
      { timeout: 10 * 60_000 }
    )
    await execFileAsync('docker', ['cp', `${container}:${tmp}`, outPath], { timeout: 5 * 60_000 })
    await execFileAsync('docker', ['exec', container, 'rm', '-f', tmp], { timeout: 60_000 }).catch(() => {})
  }

  if (!fs.existsSync(outPath)) throw new Error(`pg_dump n'a produit aucun fichier (${outPath})`)
  const size = fs.statSync(outPath).size
  if (size === 0) throw new Error(`pg_dump a produit un fichier vide (${outPath})`)

  // Un dump custom valide commence par la signature "PGDMP".
  const head = Buffer.alloc(5)
  const fd = fs.openSync(outPath, 'r')
  try { fs.readSync(fd, head, 0, 5, 0) } finally { fs.closeSync(fd) }
  if (head.toString('ascii') !== 'PGDMP') {
    throw new Error(`dump invalide : signature "${head.toString('ascii')}" au lieu de "PGDMP"`)
  }

  logger.info(`[pg-dump] ${filename} — ${size} octets (strategie: ${strategy})`)
  prunePgDumps()
  return { filename, path: outPath, size, strategy }
}

export function listPgDumps(): { filename: string; size: number; createdAt: number }[] {
  ensureDir()
  return fs
    .readdirSync(DB_BACKUP_DIR)
    .filter((f) => DUMP_RE.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(DB_BACKUP_DIR, f))
      return { filename: f, size: stat.size, createdAt: stat.mtimeMs }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

function weekKey(ms: number): string {
  const d = new Date(ms)
  // Cle ISO annee-semaine, suffisante pour regrouper par semaine.
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Conserve les 7 plus recents, puis 1 dump par semaine sur 4 semaines. */
export function prunePgDumps(): string[] {
  const all = listPgDumps()
  const keep = new Set(all.slice(0, DAILY_RETENTION).map((x) => x.filename))

  const weeklySeen = new Set<string>()
  for (const item of all.slice(DAILY_RETENTION)) {
    const k = weekKey(item.createdAt)
    if (weeklySeen.has(k)) continue
    weeklySeen.add(k)
    if (weeklySeen.size <= WEEKLY_RETENTION) keep.add(item.filename)
  }

  const removed: string[] = []
  for (const item of all) {
    if (keep.has(item.filename)) continue
    try {
      fs.unlinkSync(path.join(DB_BACKUP_DIR, item.filename))
      removed.push(item.filename)
    } catch {
      /* best effort */
    }
  }
  if (removed.length) logger.info(`[pg-dump] retention : ${removed.length} dump(s) supprime(s)`)
  return removed
}
