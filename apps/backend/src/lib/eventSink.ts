import prisma from './prisma'
import logger from './logger'

/**
 * Puits d'événements de la console créateur.
 *
 * Portage du patron d'audit-log.ts (drapeau + setTimeout 2 s + unref) vers
 * Prisma : push() n'écrit jamais directement, ne bloque jamais, ne lève
 * jamais — les lignes s'accumulent en mémoire et partent par lots via
 * createMany toutes les 2 secondes.
 *
 * Un échec d'écriture est journalisé (jamais avalé, règle du CLAUDE.md) et le
 * lot est remis en tête de tampon pour le prochain vidage ; le tampon est
 * borné : base indisponible longtemps → on préfère perdre des événements
 * d'usage que la mémoire du service.
 */

export type TableEvenement = 'activityEvent' | 'loginEvent' | 'errorLog'

const INTERVALLE_MS = 2000
const TAMPON_MAX = 5000

const tampons: Record<TableEvenement, Record<string, unknown>[]> = {
  activityEvent: [],
  loginEvent: [],
  errorLog: [],
}
let minuteur: NodeJS.Timeout | null = null
let vidageEnCours = false

export function push(table: TableEvenement, ligne: Record<string, unknown>): void {
  try {
    const tampon = tampons[table]
    if (tampon.length >= TAMPON_MAX) return
    tampon.push(ligne)
    planifier()
  } catch {
    // La collecte ne doit jamais casser la requête métier.
  }
}

function planifier() {
  if (minuteur) return
  minuteur = setTimeout(() => {
    minuteur = null
    void flush()
  }, INTERVALLE_MS)
  minuteur.unref?.()
}

export async function flush(): Promise<void> {
  if (vidageEnCours) return
  vidageEnCours = true
  try {
    for (const table of Object.keys(tampons) as TableEvenement[]) {
      const lot = tampons[table]
      if (lot.length === 0) continue
      tampons[table] = []
      try {
        await (prisma as any)[table].createMany({ data: lot, skipDuplicates: true })
      } catch (e: any) {
        logger.error(`[eventSink] écriture ${table} impossible (${lot.length} lignes): ${e?.message || e}`)
        const place = TAMPON_MAX - tampons[table].length
        if (place > 0) tampons[table].unshift(...lot.slice(0, place))
      }
    }
  } finally {
    vidageEnCours = false
  }
}

/**
 * À appeler une fois au démarrage : sans ce vidage d'arrêt, les 2 dernières
 * secondes d'événements disparaissent à chaque redémarrage du service.
 */
let arretBranche = false
export function brancherVidageArret(): void {
  if (arretBranche) return
  arretBranche = true
  process.once('SIGTERM', () => {
    void flush()
  })
  process.once('beforeExit', () => {
    void flush()
  })
}

/** Réservé aux tests : vide tampons et minuteur. */
export function _reinitialiserPourTests(): void {
  tampons.activityEvent = []
  tampons.loginEvent = []
  tampons.errorLog = []
  if (minuteur) {
    clearTimeout(minuteur)
    minuteur = null
  }
  vidageEnCours = false
}
