import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { randomInt } from 'node:crypto'
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

const DUMP_RE = /^creorga-db-[\d-]+\.dump$/

export type DumpStrategy = 'native' | 'docker'

export interface PgDumpResult {
  filename: string
  path: string
  size: number
  strategy: DumpStrategy
  retainedContainerDump?: { container: string; path: string }
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

function ensureDir(directory = DB_BACKUP_DIR) {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true })
}

async function canRun(bin: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(bin, args, { timeout: 15_000, windowsHide: true })
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
export async function runPgDump(backupDirectory = DB_BACKUP_DIR): Promise<PgDumpResult> {
  const targetDirectory = path.resolve(backupDirectory)
  ensureDir(targetDirectory)
  const conn = parseDatabaseUrl()
  const filename = `creorga-db-${timestamp()}-${Date.now()}-${randomInt(100000)}.dump`
  const outPath = path.join(targetDirectory, filename)

  const strategy = await detectStrategy()
  if (!strategy) {
    throw new Error(
      'pg_dump introuvable : ni sur le PATH, ni dans le conteneur Docker ' +
        `"${process.env.PG_DUMP_DOCKER_CONTAINER || 'creorga-db'}". ` +
        'Installez postgresql-client ou definissez PG_DUMP_MODE / PG_DUMP_DOCKER_CONTAINER.'
    )
  }
  // Réservation exclusive : pg_dump / docker cp peuvent remplacer une sortie
  // existante. Nous ne leur transmettons qu'un fichier neuf possédé par cet appel.
  // Un échec conserve ce fichier (même vide) pour diagnostic, jamais unlink+retry.
  const reservation = fs.openSync(outPath, 'wx', 0o600)
  fs.closeSync(reservation)
  let retainedContainerDump: PgDumpResult['retainedContainerDump']

  if (strategy === 'native') {
    await execFileAsync(
      process.env.PG_DUMP_BIN || 'pg_dump',
      ['-h', conn.host, '-p', conn.port, '-U', conn.user, '-d', conn.database, '-Fc', '-f', outPath],
      { env: { ...process.env, PGPASSWORD: conn.password }, timeout: 10 * 60_000, windowsHide: true }
    )
  } else {
    const container = process.env.PG_DUMP_DOCKER_CONTAINER || 'creorga-db'
    const workDirectory = `/tmp/${filename}.work`, tmp = `${workDirectory}/${filename}`
    // La copie locale pourrait manquer alors que l'ancienne copie Docker existe.
    // mkdir sans -p réserve aussi le répertoire distant avant pg_dump -f.
    await execFileAsync('docker', ['exec', container, 'mkdir', '--', workDirectory], { timeout: 60_000, windowsHide: true })
    retainedContainerDump = { container, path: tmp }
    // Depuis l'interieur du conteneur, la base est joignable en local.
    await execFileAsync(
      'docker',
      ['exec', '-e', 'PGPASSWORD', container,
       'pg_dump', '-U', conn.user, '-d', conn.database, '-Fc', '-f', tmp],
      { env: { ...process.env, PGPASSWORD: conn.password }, timeout: 10 * 60_000, windowsHide: true }
    )
    await execFileAsync('docker', ['cp', `${container}:${tmp}`, outPath], { timeout: 5 * 60_000, windowsHide: true })
    // Copie intermédiaire conservée. Aucun nettoyage automatique tant que la
    // politique, les preuves et l'autorisation de suppression ne sont validés.
    logger.warn('[pg-dump] Copie de travail conservée dans le conteneur ; nettoyage opérateur non autorisé')
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
  return { filename, path: outPath, size, strategy, ...(retainedContainerDump ? { retainedContainerDump } : {}) }
}

export function listPgDumps(directory = DB_BACKUP_DIR): { filename: string; size: number; createdAt: number }[] {
  ensureDir(directory)
  return fs
    .readdirSync(directory)
    .filter((f) => DUMP_RE.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(directory, f))
      return { filename: f, size: stat.size, createdAt: stat.mtimeMs }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Compatibilité des anciens appelants ; aucune purge n'est autorisée. */
export function prunePgDumps(_directory = DB_BACKUP_DIR): string[] {
  // Pas de scan, de création de répertoire, ni de commande de suppression.
  // Une variable d'environnement ne peut pas lever ce verrou.
  return []
}
