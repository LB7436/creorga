import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { createHash, randomUUID } from 'node:crypto'
import { Transform, type Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import yauzl from 'yauzl'
import { parseDatabaseUrl, DB_BACKUP_DIR } from './pg-dump'
import { inspectArchive, safeArchiveName, type ArchiveInspection } from './backup-worker'

const execFileAsync = promisify(execFile)

/**
 * v5.0 — Restauration TESTÉE d'une sauvegarde.
 *
 * Une sauvegarde qu'on n'a jamais restaurée n'est qu'un espoir. Ce module
 * prend le dernier ZIP `creorga-full-*.zip` (ou celui donné), l'extrait dans un
 * dossier temporaire et vérifie :
 *  1. que chaque `data/**\/*.json` se relit (JSON valide, pas tronqué) ;
 *  2. que le dump PostgreSQL (`database/*.dump`, format custom) se restaure
 *     réellement, dans une base JETABLE `creorga_restore_<horodatage>` créée
 *     dans le conteneur, puis supprimée — la base de production n'est jamais
 *     touchée. On compte les tables et les sociétés restaurées.
 *
 * Aucun échec n'est avalé : chaque problème est listé dans `erreurs`, et
 * `ok` n'est vrai que si tout a été prouvé.
 *
 * CLI : `npx tsx src/jobs/verifier-restauration.ts [chemin.zip]`
 */

export interface RapportRestauration {
  zip: string | null
  fichiersJson: number
  jsonInvalides: string[]
  dump: { fichier: string; tables: number; societes: number } | null
  erreurs: string[]
  ok: boolean
  dureeMs: number
  versionArchive: number | null
  fichiersVerifies: number
  limites: string[]
}

export const FULL_BACKUP_DIR = path.join(path.dirname(DB_BACKUP_DIR), 'full')

/** Dernier ZIP complet par nom (horodaté), ou null. */
export function dernierZip(dir = FULL_BACKUP_DIR): string | null {
  if (!fs.existsSync(dir)) return null
  const zips = fs.readdirSync(dir).filter((f) => /^creorga-full-[\d-]+\.zip$/.test(f)).sort()
  return zips.length ? path.join(dir, zips[zips.length - 1]) : null
}

/** Vérifie que tous les JSON extraits se relisent. Pur, testable sans Docker. */
export function verifierJson(racine: string): { total: number; invalides: string[] } {
  const invalides: string[] = []
  let total = 0
  const parcourir = (dir: string) => {
    for (const entree of fs.readdirSync(dir, { withFileTypes: true })) {
      const chemin = path.join(dir, entree.name)
      if (entree.isSymbolicLink()) { invalides.push(path.relative(racine, chemin)); continue }
      if (entree.isDirectory()) parcourir(chemin)
      else if (entree.name.endsWith('.json') && entree.name !== 'backup-manifest.json') {
        total++
        try {
          if (fs.statSync(chemin).size > 64 * 1024 ** 2) throw new Error('JSON trop volumineux pour ce contrôle')
          JSON.parse(fs.readFileSync(chemin, 'utf8'))
        } catch {
          invalides.push(path.relative(racine, chemin))
        }
      }
    }
  }
  parcourir(racine)
  return { total, invalides }
}

type DockerRunner = (args: string[], timeout?: number) => Promise<{ stdout: string }>
export interface RestoreRuntime { run: DockerRunner; sourceDatabase: string; user: string; container: string }
class SafeRestoreError extends Error {}

function runtime(): RestoreRuntime {
  const conn = parseDatabaseUrl()
  return {
    sourceDatabase: conn.database, user: conn.user, container: process.env.PG_DUMP_DOCKER_CONTAINER || 'creorga-db',
    run: async (args, timeout = 5 * 60_000) => {
      const result = await execFileAsync('docker', args, { timeout, maxBuffer: 1024 * 1024, windowsHide: true, env: { ...process.env, PGPASSWORD: conn.password } })
      return { stdout: String(result.stdout) }
    },
  }
}

export function validateRestoreTarget(sourceDatabase: string, targetDatabase: string): void {
  if (!/^creorga_restore_[a-f0-9]{32}$/.test(targetDatabase) || targetDatabase === sourceDatabase) throw new Error('Destination de restauration refusée')
}

/** Extraction exclusive après contrôle de tout le ZIP ; aucun écrasement. */
export async function extractVerifiedArchive(zipPath: string, destination: string): Promise<ArchiveInspection> {
  const inspection = await inspectArchive(zipPath)
  if (!inspection.valid) throw new Error('Archive refusée : intégrité, manifeste ou dump PostgreSQL invalide')
  const root = path.resolve(destination)
  const stat = fs.lstatSync(root)
  if (!stat.isDirectory() || stat.isSymbolicLink() || fs.readdirSync(root).length) throw new Error('Le répertoire de reprise doit être neuf et vide')
  const expected = new Map(inspection.files.map(file => [file.name, file]))
  const seen = new Set<string>()
  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) { reject(new Error('Ouverture de l’archive impossible')); return }
      const failed = () => { zip.close(); reject(new Error('Extraction interrompue ou empreinte incorrecte')) }
      zip.on('error', failed)
      zip.on('entry', entry => {
        const extract = async () => {
          const name = entry.fileName
          if (!safeArchiveName(name) || ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000) throw new Error('Chemin refusé')
          if (name.endsWith('/') || name === 'backup-manifest.json') return
          const file = expected.get(name)
          if (!file || seen.has(name)) throw new Error('Archive modifiée pendant la reprise')
          const target = path.resolve(root, ...name.split('/'))
          if (!target.startsWith(root + path.sep)) throw new Error('Destination hors répertoire')
          let parent = root
          for (const part of name.split('/').slice(0, -1)) {
            parent = path.join(parent, part)
            if (!fs.existsSync(parent)) fs.mkdirSync(parent, { mode: 0o700 })
            const metadata = fs.lstatSync(parent)
            if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error('Répertoire de reprise invalide')
          }
          const stream = await new Promise<Readable>((res, rej) => zip.openReadStream(entry, (err, input) => err || !input ? rej(new Error('Lecture interrompue')) : res(input)))
          const digest = createHash('sha256')
          let size = 0
          await pipeline(stream, new Transform({ transform(chunk, _encoding, callback) {
            size += chunk.length
            if (size > file.size) { callback(new Error('Taille incorrecte')); return }
            digest.update(chunk); callback(null, chunk)
          } }), fs.createWriteStream(target, { flags: 'wx', mode: 0o600 }))
          if (size !== file.size || digest.digest('hex') !== file.sha256) throw new Error('Empreinte incorrecte')
          seen.add(name)
        }
        extract().then(() => zip.readEntry(), failed)
      })
      zip.on('end', () => seen.size === expected.size ? resolve() : failed())
      zip.readEntry()
    })
  })
  return inspection
}

/**
 * Restaure le dump dans une base jetable du conteneur et compte ce qui en
 * ressort. Nettoie toujours (base + fichier temporaire), même en cas d'erreur.
 */
export async function restaurerDansBaseJetable(dumpPath: string, execution: RestoreRuntime = runtime()): Promise<{ tables: number; societes: number }> {
  const { run, container, user, sourceDatabase } = execution
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(container)) throw new Error('Conteneur de restauration refusé')
  const nonce = randomUUID().replace(/-/g, '')
  const baseTest = `creorga_restore_${nonce}`
  validateRestoreTarget(sourceDatabase, baseTest)
  const distant = `/tmp/creorga-restore-${nonce}.dump`
  let copied = false, created = false, phase = 'copie du dump', result: { tables: number; societes: number } | null = null
  let failure: Error | null = null
  const docker = (args: string[]) => run(['exec', '-e', 'PGPASSWORD', container, ...args])
  try {
    await run(['cp', dumpPath, `${container}:${distant}`]); copied = true
    phase = 'création de la base jetable'
    await docker(['createdb', '-U', user, '--maintenance-db=postgres', '--template=template0', baseTest]); created = true
    phase = 'restauration PostgreSQL'
    await docker(['pg_restore', '-U', user, '-d', baseTest, '--no-owner', '--no-privileges', '--exit-on-error', '--single-transaction', distant])
    phase = 'vérification des tables restaurées'
      const compter = async (sql: string) => {
        const { stdout } = await docker(['psql', '-U', user, '-d', baseTest, '-v', 'ON_ERROR_STOP=1', '-tAc', sql])
        const value = String(stdout).trim()
        if (!/^\d+$/.test(value)) throw new Error('Comptage absent ou invalide')
        return Number(value)
      }
      const tables = await compter("select count(*) from information_schema.tables where table_schema='public'")
      if (!Number.isFinite(tables) || tables === 0) throw new Error('aucune table restaurée')
      const societes = await compter('select count(*) from "Company"')
      if (!Number.isSafeInteger(tables) || !Number.isSafeInteger(societes) || societes < 0) throw new Error('Comptage incohérent')
      result = { tables, societes }
  } catch {
    // stderr peut contenir des valeurs métier ou des identifiants : phase seule.
    failure = new SafeRestoreError(`Échec : ${phase}. La restauration n’est pas validée.`)
  } finally {
    if (created) {
      try { await docker(['dropdb', '-U', user, '--maintenance-db=postgres', baseTest]) }
      catch { failure ||= new SafeRestoreError('Nettoyage de la base jetable non confirmé') }
    }
    if (copied) {
      try { await docker(['rm', '-f', '--', distant]) }
      catch { failure ||= new SafeRestoreError('Nettoyage du dump temporaire non confirmé') }
    }
  }
  if (failure) throw failure
  if (!result) throw new Error('Résultat de restauration absent')
  return result
}

export async function verifierRestauration(zipPath: string | null = dernierZip(), restore = restaurerDansBaseJetable): Promise<RapportRestauration> {
  const debut = Date.now()
  const rapport: RapportRestauration = { zip: zipPath ? path.basename(zipPath) : null, fichiersJson: 0, jsonInvalides: [], dump: null, erreurs: [], ok: false, dureeMs: 0, versionArchive: null, fichiersVerifies: 0,
    limites: ['Le comptage des tables ne remplace pas le rapprochement des lignes, totaux et PDF avec une source figée.', 'Un fichier JSON de plus de 64 Mio rend ce contrôle incomplet et exige un outil adapté.'] }
  if (!zipPath || !fs.existsSync(zipPath)) {
    rapport.erreurs.push('aucun ZIP de sauvegarde complète trouvé')
    rapport.dureeMs = Date.now() - debut
    return rapport
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-restore-'))
  try {
    const inspection = await extractVerifiedArchive(zipPath, tmp)
    rapport.versionArchive = inspection.version
    rapport.fichiersVerifies = inspection.files.length
    if (inspection.version !== 2) rapport.limites.push('Archive historique : couverture des médias inconnue et garanties du manifeste limitées.')
    const json = verifierJson(tmp)
    rapport.fichiersJson = json.total
    rapport.jsonInvalides = json.invalides
    if (json.invalides.length) rapport.erreurs.push(`${json.invalides.length} fichier(s) JSON illisible(s) : ${json.invalides.join(', ')}`)

    const dossierDump = path.join(tmp, 'database')
    const dumps = fs.existsSync(dossierDump) ? fs.readdirSync(dossierDump).filter((f) => f.endsWith('.dump')) : []
    if (dumps.length !== 1) {
      rapport.erreurs.push('le ZIP doit contenir exactement un dump PostgreSQL (database/*.dump)')
    } else if (rapport.erreurs.length) {
      rapport.erreurs.push('Restauration PostgreSQL non lancée : données de fichiers invalides')
    } else {
      const dumpPath = path.join(dossierDump, dumps[0])
      try {
        const resultat = await restore(dumpPath)
        rapport.dump = { fichier: dumps[0], ...resultat }
      } catch (error) {
        rapport.erreurs.push(error instanceof SafeRestoreError ? error.message : 'Restauration PostgreSQL ou nettoyage non confirmé ; aucun succès partiel accepté')
      }
    }
  } catch {
    rapport.erreurs.push('Archive refusée ou extraction impossible : intégrité, structure ou dump PostgreSQL invalide')
  } finally {
    const resolved = path.resolve(tmp)
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('creorga-restore-')) throw new Error('Nettoyage temporaire refusé')
    try { fs.rmSync(resolved, { recursive: true, force: true }) }
    catch { rapport.erreurs.push('Nettoyage du dossier temporaire non confirmé') }
  }
  rapport.ok = rapport.erreurs.length === 0
  rapport.dureeMs = Date.now() - debut
  return rapport
}

// Exécution directe : `npx tsx src/jobs/verifier-restauration.ts [zip]`
if (process.argv[1] && /verifier-restauration\.(ts|js)$/.test(process.argv[1])) {
  verifierRestauration(process.argv[2] || dernierZip()).then((r) => {
    console.log(JSON.stringify(r, null, 2))
    process.exitCode = r.ok ? 0 : 1
  }).catch(() => {
    console.error(JSON.stringify({ ok: false, erreurs: ['Vérification interrompue ; aucun résultat de restauration validée.'] }))
    process.exitCode = 1
  })
}
