import fs from 'fs'
import path from 'path'
import { randomUUID } from 'node:crypto'

/** Aucune donnée ou contenu de fichier dans cette erreur destinée au diagnostic. */
export class JsonStoreUnavailableError extends Error {
  readonly code = 'JSON_STORE_UNAVAILABLE'
  constructor(readonly recoveryAvailable: boolean) {
    super(recoveryAvailable
      ? 'Données indisponibles : une copie précédente doit être vérifiée avant récupération.'
      : 'Données indisponibles : vérifier le fichier et restaurer une sauvegarde validée.')
    this.name = 'JsonStoreUnavailableError'
  }
}

function syncDirectory(directory: string): void {
  // Windows ne permet pas à Node d'ouvrir puis fsync un répertoire. Les fichiers
  // sont flushés ci-dessous ; la résistance à une coupure électrique du renommage
  // dépend encore du système de fichiers et de l'alimentation de l'installation.
  if (process.platform === 'win32') return
  const fd = fs.openSync(directory, 'r')
  try { fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
}

function writeFlushed(filePath: string, contents: string | Buffer): void {
  const fd = fs.openSync(filePath, 'wx', 0o600)
  try {
    fs.writeFileSync(fd, contents)
    fs.fsyncSync(fd)
  } finally { fs.closeSync(fd) }
}

/**
 * Écriture atomique et flushée avant le retour de succès. Le précédent JSON
 * valide devient .bak par le même mécanisme ; un échec de flush reste visible.
 * Les temporaires uniques évitent de réutiliser un reste d'un autre processus.
 * Cette fonction n'est pas un verrou multiprocessus ni une sauvegarde externe.
 */
export function safeWriteJson(filePath: string, data: unknown): void {
  const contents = JSON.stringify(data, null, 2)
  if (contents === undefined) throw new TypeError('Valeur JSON absente')
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tmp = `${filePath}.${randomUUID()}.tmp`
  const backupTmp = `${filePath}.${randomUUID()}.bak.tmp`
  try {
    writeFlushed(tmp, contents)
    if (fs.existsSync(filePath)) {
      const previous = fs.readFileSync(filePath)
      // Ne pas remplacer une sauvegarde exploitable par le JSON corrompu que
      // certains anciens lecteurs ont pu récupérer depuis cette sauvegarde.
      let valid = false
      try { JSON.parse(previous.toString('utf8')); valid = true } catch { /* préserver .bak */ }
      if (valid) {
        writeFlushed(backupTmp, previous)
        fs.renameSync(backupTmp, filePath + '.bak')
        syncDirectory(dir)
      }
    }
    fs.renameSync(tmp, filePath)
    syncDirectory(dir)
  } finally {
    // Uniquement les deux noms aléatoires de cet appel, jamais d'autre fichier.
    for (const candidate of [tmp, backupTmp]) {
      try { fs.unlinkSync(candidate) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          // Le temporaire peut rester pour diagnostic ; ne masquer ni l'erreur
          // d'écriture initiale, ni un enregistrement déjà confirmé.
        }
      }
    }
  }
}

/**
 * Données métier : seul un fichier réellement absent peut initialiser un état.
 * Un .bak n'est jamais adopté silencieusement : il peut précéder un paiement ou
 * une tournée. La récupération doit être explicite après rapprochement.
 */
export function readJsonStrict<T>(filePath: string, fallback: T, validate?: (value: unknown) => boolean): T {
  let missing = false
  try {
    const value: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (!validate || validate(value)) return value as T
  } catch (error) {
    missing = (error as NodeJS.ErrnoException).code === 'ENOENT'
  }
  let backupMissing = false
  let recoveryAvailable = false
  try {
    const backup: unknown = JSON.parse(fs.readFileSync(filePath + '.bak', 'utf8'))
    recoveryAvailable = !validate || validate(backup)
  } catch (error) {
    backupMissing = (error as NodeJS.ErrnoException).code === 'ENOENT'
  }
  if (missing && backupMissing) return fallback
  throw new JsonStoreUnavailableError(recoveryAvailable)
}

/** Lecture JSON avec fallback + récupération auto depuis .bak si corrompu. */
export function safeReadJson<T>(filePath: string, fallback: T): T {
  for (const candidate of [filePath, filePath + '.bak']) {
    try {
      if (fs.existsSync(candidate)) return JSON.parse(fs.readFileSync(candidate, 'utf8')) as T
    } catch { /* essaie le suivant */ }
  }
  return fallback
}
