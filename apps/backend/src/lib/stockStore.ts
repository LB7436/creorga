import fs from 'fs'
import path from 'path'
import prisma from './prisma'
import logger from './logger'

/**
 * Store stock centralisé — source unique pour data/inventory-stock.json.
 *
 * Toute l'app (IA, OCR, menu public, worker proactif) lit/écrit le stock via
 * ce module au lieu de dupliquer l'accès fichier. Écritures atomiques
 * (tmp + rename) pour éviter un JSON corrompu en cas de crash.
 *
 * syncStockToPrisma() réplique le stock vers le modèle Ingredient quand la
 * DB est disponible : durabilité + base pour le multi-tenant, sans casser
 * le mode sans-Docker (le JSON reste la source de vérité runtime).
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

const STORE_DIR = path.resolve(process.cwd(), 'data')
const STORE_FILE = path.join(STORE_DIR, 'inventory-stock.json')

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })
}

export function stockFilePath() {
  return STORE_FILE
}

export function loadStock(): StockEntry[] {
  ensureStore()
  if (!fs.existsSync(STORE_FILE)) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStock(entries: StockEntry[]) {
  ensureStore()
  const tmp = STORE_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2), 'utf8')
  fs.renameSync(tmp, STORE_FILE)
}

/** Statut de stock d'un produit du menu par correspondance de nom. */
export function stockStatusFor(productName: string, stock: StockEntry[] = loadStock()) {
  const normalized = productName.toLowerCase()
  const entry = stock.find((e) => {
    const name = String(e.name || '').toLowerCase()
    return name && (normalized.includes(name) || name.includes(normalized))
  })
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

/**
 * Réplique le stock JSON vers Prisma (Ingredient) pour la société donnée.
 * No-op silencieux si la DB est injoignable (mode sans Docker).
 */
export async function syncStockToPrisma(companyId?: string) {
  const entries = loadStock()
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
