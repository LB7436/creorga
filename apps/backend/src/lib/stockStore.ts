import fs from 'fs'
import path from 'path'
import prisma from './prisma'
import logger from './logger'
import { safeWriteJson } from './safe-json'

/**
 * Store stock centralisé — source unique pour data/inventory-stock.json.
 *
 * Toute l'app (IA, OCR, menu public, worker proactif, CAISSE) lit/écrit le
 * stock via ce module au lieu de dupliquer l'accès fichier.
 *
 * Deux règles depuis la v4.8 :
 *  1. Il n'existe qu'UNE copie en mémoire (`cache`), tenue ici. Avant,
 *     routes/inventory-ai.ts gardait la sienne (`let stock = loadStock()`)
 *     et l'écrivait telle quelle : toute écriture faite ailleurs — un
 *     décrément de vente, par exemple — aurait été écrasée à sa prochaine
 *     sauvegarde. Les routes passent désormais par `getStock()` / `mutate()`.
 *  2. La vente décrémente. C'était le trou central de l'audit : aucune vente,
 *     nulle part dans le monorepo, ne touchait au stock. `decrementerPourVente`
 *     est le seul chemin, atomique, journalisé, avec détection de rupture.
 *
 * syncStockToPrisma() réplique vers le modèle Ingredient quand la DB est là :
 * durabilité + base multi-tenant, sans casser le mode sans Docker.
 */

export interface StockEntry {
  id: string
  name: string
  category?: string
  unit?: string
  quantity: number
  avgUnitPrice?: number
  lastSupplier?: string
  lastUpdated?: number
  lowStockThreshold?: number
}

/** Un mouvement de stock, pour l'historique et l'audit. */
export interface MouvementStock {
  id: string
  horodatage: number
  type: 'vente' | 'reception' | 'ajustement' | 'perte'
  entryId: string
  name: string
  /** Négatif pour une sortie, positif pour une entrée. */
  delta: number
  quantiteApres: number
  /** Référence libre : id de vente, n° de bon de livraison… */
  reference?: string
  auteur?: string
}

/** Résultat d'un décrément de vente. */
export interface ResultatDecrement {
  /** Lignes effectivement décrémentées. */
  decrementes: Array<{ name: string; delta: number; quantiteApres: number }>
  /** Produits vendus sans entrée de stock : non suivis, rien à décrémenter. */
  nonSuivis: string[]
  /** Produits passés sous le seuil ou à zéro PAR ce décrément. */
  alertes: Array<{ name: string; quantite: number; statut: 'LOW' | 'OUT' }>
}

// Chemins résolus À L'APPEL, pas à l'import : figés au chargement du module,
// ils ignoraient tout changement de cwd — les tests isolés dans un dossier
// temporaire écrivaient en réalité dans le data/ de développement.
const storeDir = () => path.resolve(process.cwd(), 'data')
const storeFile = () => path.join(storeDir(), 'inventory-stock.json')
const mouvementsFile = () => path.join(storeDir(), 'inventory-mouvements.json')
const MOUVEMENTS_MAX = 5000

function ensureStore() {
  const dir = storeDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function stockFilePath() {
  return storeFile()
}

/* ------------------------------------------------------------------ */
/* Cache unique                                                        */
/* ------------------------------------------------------------------ */

let cache: StockEntry[] | null = null

function lireDisque(): StockEntry[] {
  ensureStore()
  if (!fs.existsSync(storeFile())) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(storeFile(), 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    // Un JSON corrompu n'est PAS « un stock vide » : on le dit, et on
    // repart de vide plutôt que d'écraser la trace au prochain enregistrement.
    logger.error(`[stock] ${storeFile()} illisible — stock repris à vide, fichier conservé`, e)
    return []
  }
}

/** Le stock courant (référence partagée : ne pas muter hors `mutate`). */
export function getStock(): StockEntry[] {
  if (cache === null) cache = lireDisque()
  return cache
}

/** Compat : même chose que getStock() — conservé pour les appelants existants. */
export function loadStock(): StockEntry[] {
  return getStock()
}

/** Écrit et remplace le cache. Écriture atomique (tmp + rename + .bak). */
export function saveStock(entries: StockEntry[]) {
  ensureStore()
  safeWriteJson(storeFile(), entries)
  cache = entries
}

/**
 * Applique une mutation au stock sous forme d'une fonction pure, puis
 * sauvegarde. Toute modification passe par ici : c'est ce qui garantit
 * qu'aucune copie périmée ne peut écraser une autre écriture.
 */
export function mutate<T>(fn: (stock: StockEntry[]) => T): T {
  const courant = getStock()
  const resultat = fn(courant)
  saveStock(courant)
  return resultat
}

/* ------------------------------------------------------------------ */
/* Correspondance produit ↔ entrée de stock                            */
/* ------------------------------------------------------------------ */

function normaliser(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Trouve l'entrée de stock d'un produit du menu.
 *
 * Priorité au nom EXACT (normalisé). Le repli « inclusion » historique
 * (« Cola » ⊂ « Cola Zero ») est conservé pour ne pas casser les cartes
 * existantes, mais il ne s'applique que s'il n'existe qu'UN candidat : avec
 * plusieurs, on refuse de deviner et on déclare le produit non suivi. Un
 * Coca vendu ne doit jamais décrémenter le Coca Zero.
 */
export function trouverEntree(productName: string, stock: StockEntry[] = getStock()): StockEntry | undefined {
  const cible = normaliser(productName)
  if (!cible) return undefined
  const exact = stock.find((e) => normaliser(e.name) === cible)
  if (exact) return exact
  const candidats = stock.filter((e) => {
    const n = normaliser(e.name)
    return n && (cible.includes(n) || n.includes(cible))
  })
  return candidats.length === 1 ? candidats[0] : undefined
}

/** Statut de stock d'un produit du menu. */
export function stockStatusFor(productName: string, stock: StockEntry[] = getStock()) {
  const entry = trouverEntree(productName, stock)
  const qty = Number(entry?.quantity ?? NaN)
  const tracked = Number.isFinite(qty)
  const low = tracked && qty > 0 && qty <= Number(entry?.lowStockThreshold ?? 0)
  return {
    tracked,
    qty: tracked ? qty : null,
    unit: entry?.unit ?? null,
    status: !tracked ? 'UNTRACKED' : qty <= 0 ? 'OUT' : low ? 'LOW' : ('OK' as const),
    isAvailable: !tracked || qty > 0,
  }
}

/* ------------------------------------------------------------------ */
/* Mouvements                                                          */
/* ------------------------------------------------------------------ */

let cacheMouvements: MouvementStock[] | null = null

export function getMouvements(): MouvementStock[] {
  if (cacheMouvements === null) {
    ensureStore()
    if (!fs.existsSync(mouvementsFile())) cacheMouvements = []
    else {
      try {
        const parsed = JSON.parse(fs.readFileSync(mouvementsFile(), 'utf8'))
        cacheMouvements = Array.isArray(parsed) ? parsed : []
      } catch (e) {
        logger.error(`[stock] ${mouvementsFile()} illisible — historique repris à vide`, e)
        cacheMouvements = []
      }
    }
  }
  return cacheMouvements
}

function ajouterMouvements(nouveaux: MouvementStock[]) {
  if (!nouveaux.length) return
  const tous = [...nouveaux, ...getMouvements()].slice(0, MOUVEMENTS_MAX)
  safeWriteJson(mouvementsFile(), tous)
  cacheMouvements = tous
}

const uid = () => Math.random().toString(36).slice(2, 10)

/* ------------------------------------------------------------------ */
/* Décrément de vente                                                  */
/* ------------------------------------------------------------------ */

/**
 * Décrémente le stock pour les lignes d'une vente.
 *
 * - Idempotent par référence : rejouer la même `reference` (id de vente)
 *   ne décrémente pas deux fois — la caisse peut renvoyer une vente après
 *   une coupure réseau sans risque.
 * - Ne descend jamais sous zéro : une vente qui dépasse le stock met la
 *   quantité à 0 et le signale (rupture), elle n'invente pas du négatif.
 * - Détecte les alertes DÉCLENCHÉES par ce décrément (franchissement du
 *   seuil ou passage à zéro), pas les états déjà en cours : sinon chaque
 *   vente re-notifierait une rupture connue.
 */
export function decrementerPourVente(
  lignes: Array<{ name: string; qty: number }>,
  reference: string,
  auteur?: string,
): ResultatDecrement {
  const dejaFait = getMouvements().some((m) => m.type === 'vente' && m.reference === reference)
  if (dejaFait) return { decrementes: [], nonSuivis: [], alertes: [] }

  const resultat: ResultatDecrement = { decrementes: [], nonSuivis: [], alertes: [] }
  const mouvements: MouvementStock[] = []
  const maintenant = Date.now()

  mutate((stock) => {
    for (const ligne of lignes) {
      const qty = Number(ligne.qty)
      if (!Number.isFinite(qty) || qty <= 0) continue
      const entree = trouverEntree(ligne.name, stock)
      if (!entree) {
        resultat.nonSuivis.push(ligne.name)
        continue
      }
      const avant = Number(entree.quantity ?? 0)
      const seuil = Number(entree.lowStockThreshold ?? 0)
      const apres = Math.max(0, avant - qty)
      entree.quantity = apres
      entree.lastUpdated = maintenant
      resultat.decrementes.push({ name: entree.name, delta: -(avant - apres), quantiteApres: apres })
      mouvements.push({
        id: uid(),
        horodatage: maintenant,
        type: 'vente',
        entryId: entree.id,
        name: entree.name,
        delta: -(avant - apres),
        quantiteApres: apres,
        reference,
        auteur,
      })
      // Alerte uniquement au FRANCHISSEMENT.
      if (avant > 0 && apres <= 0) resultat.alertes.push({ name: entree.name, quantite: apres, statut: 'OUT' })
      else if (seuil > 0 && avant > seuil && apres <= seuil) resultat.alertes.push({ name: entree.name, quantite: apres, statut: 'LOW' })
    }
  })

  ajouterMouvements(mouvements)
  return resultat
}

/* ------------------------------------------------------------------ */
/* Réplication Prisma                                                  */
/* ------------------------------------------------------------------ */

/**
 * Réplique le stock JSON vers Prisma (Ingredient) pour la société donnée.
 * No-op journalisé si la DB est injoignable (mode sans Docker).
 */
export async function syncStockToPrisma(companyId?: string) {
  const entries = getStock()
  if (!entries.length) return { synced: 0 }
  try {
    const targetCompanyId =
      companyId || (await prisma.company.findFirst({ select: { id: true } }))?.id
    if (!targetCompanyId) return { synced: 0 }

    let synced = 0
    for (const entry of entries) {
      if (!entry.name) continue
      const existing = await prisma.ingredient.findFirst({
        where: { companyId: targetCompanyId, name: entry.name },
      })
      const data = {
        unit: entry.unit || 'kg',
        costPerUnit: entry.avgUnitPrice ?? 0,
        currentStock: entry.quantity ?? 0,
        minStockLevel: entry.lowStockThreshold ?? 0,
      }
      if (existing) {
        await prisma.ingredient.update({ where: { id: existing.id }, data })
      } else {
        await prisma.ingredient.create({
          data: { companyId: targetCompanyId, name: entry.name, ...data },
        })
      }
      synced++
    }
    logger.info(`[stock-sync] ${synced} entrées répliquées vers Prisma`)
    return { synced }
  } catch (e: any) {
    logger.warn(`[stock-sync] DB indisponible, réplication ignorée: ${e?.message || e}`)
    return { synced: 0 }
  }
}

/** Démarre la réplication périodique (démarrage + toutes les 15 min). */
export function startStockSyncJob() {
  void syncStockToPrisma()
  setInterval(() => void syncStockToPrisma(), 15 * 60 * 1000).unref?.()
}

/** Réservé aux tests : vide les caches pour repartir d'un disque propre. */
export function _resetCachesPourTests() {
  cache = null
  cacheMouvements = null
}
