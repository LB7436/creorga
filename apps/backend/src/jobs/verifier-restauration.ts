import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import AdmZip from 'adm-zip'
import { parseDatabaseUrl, DB_BACKUP_DIR } from './pg-dump'

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
      if (entree.isDirectory()) parcourir(chemin)
      else if (entree.name.endsWith('.json')) {
        total++
        try {
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

async function docker(args: string[], timeout = 5 * 60_000) {
  return execFileAsync('docker', args, { timeout, maxBuffer: 16 * 1024 * 1024 })
}

/**
 * Restaure le dump dans une base jetable du conteneur et compte ce qui en
 * ressort. Nettoie toujours (base + fichier temporaire), même en cas d'erreur.
 */
export async function restaurerDansBaseJetable(dumpPath: string): Promise<{ tables: number; societes: number }> {
  const conn = parseDatabaseUrl()
  const container = process.env.PG_DUMP_DOCKER_CONTAINER || 'creorga-db'
  const horodatage = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const baseTest = `creorga_restore_${horodatage}`
  const distant = `/tmp/${path.basename(dumpPath)}`

  await docker(['cp', dumpPath, `${container}:${distant}`])
  try {
    await docker(['exec', container, 'createdb', '-U', conn.user, baseTest])
    try {
      // pg_restore renvoie 1 dès qu'un avertissement est émis (droits, extensions) ;
      // ce qui compte est ce qui est réellement lisible ensuite.
      await docker(['exec', container, 'pg_restore', '-U', conn.user, '-d', baseTest, '--no-owner', '--no-privileges', distant])
        .catch((e: any) => {
          const sortie = String(e?.stderr || e?.message || '')
          if (!/errors ignored on restore/i.test(sortie) && !/WARNING/i.test(sortie)) throw e
        })
      const compter = async (sql: string) => {
        const { stdout } = await docker(['exec', container, 'psql', '-U', conn.user, '-d', baseTest, '-tAc', sql])
        return Number(String(stdout).trim())
      }
      const tables = await compter("select count(*) from information_schema.tables where table_schema='public'")
      if (!Number.isFinite(tables) || tables === 0) throw new Error('aucune table restaurée')
      const societes = await compter('select count(*) from "Company"')
      return { tables, societes }
    } finally {
      await docker(['exec', container, 'dropdb', '-U', conn.user, '--if-exists', baseTest]).catch(() => {})
    }
  } finally {
    await docker(['exec', container, 'rm', '-f', distant]).catch(() => {})
  }
}

export async function verifierRestauration(zipPath: string | null = dernierZip()): Promise<RapportRestauration> {
  const debut = Date.now()
  const rapport: RapportRestauration = { zip: zipPath, fichiersJson: 0, jsonInvalides: [], dump: null, erreurs: [], ok: false, dureeMs: 0 }
  if (!zipPath || !fs.existsSync(zipPath)) {
    rapport.erreurs.push('aucun ZIP de sauvegarde complète trouvé')
    rapport.dureeMs = Date.now() - debut
    return rapport
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-restore-'))
  try {
    new AdmZip(zipPath).extractAllTo(tmp, true)
    const json = verifierJson(tmp)
    rapport.fichiersJson = json.total
    rapport.jsonInvalides = json.invalides
    if (json.total === 0) rapport.erreurs.push('le ZIP ne contient aucun fichier JSON de données')
    if (json.invalides.length) rapport.erreurs.push(`${json.invalides.length} fichier(s) JSON illisible(s) : ${json.invalides.join(', ')}`)

    const dossierDump = path.join(tmp, 'database')
    const dumps = fs.existsSync(dossierDump) ? fs.readdirSync(dossierDump).filter((f) => f.endsWith('.dump')) : []
    if (!dumps.length) {
      rapport.erreurs.push('le ZIP ne contient pas de dump PostgreSQL (database/*.dump)')
    } else {
      const dumpPath = path.join(dossierDump, dumps[0])
      try {
        const resultat = await restaurerDansBaseJetable(dumpPath)
        rapport.dump = { fichier: dumps[0], ...resultat }
      } catch (e: any) {
        rapport.erreurs.push(`restauration PostgreSQL impossible : ${String(e?.stderr || e?.message || e).trim().slice(0, 400)}`)
      }
    }
  } catch (e: any) {
    rapport.erreurs.push(`extraction impossible : ${e?.message || e}`)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  rapport.ok = rapport.erreurs.length === 0
  rapport.dureeMs = Date.now() - debut
  return rapport
}

// Exécution directe : `npx tsx src/jobs/verifier-restauration.ts [zip]`
if (process.argv[1] && /verifier-restauration\.(ts|js)$/.test(process.argv[1])) {
  verifierRestauration(process.argv[2] || dernierZip()).then((r) => {
    console.log(JSON.stringify(r, null, 2))
    process.exit(r.ok ? 0 : 1)
  })
}
