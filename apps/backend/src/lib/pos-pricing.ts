import { moneyMinor } from './money'

export class PosPricingError extends Error {
  constructor(message: string) { super(message) }
}
export interface LineQuote {
  version: 1
  status: 'confirmed' | 'review'
  source: 'catalog' | 'legacy-unverified' | 'legacy-reviewed'
  productId?: string
  name: string
  priceCents: number
  taxRate?: number
  quotedAt: number
  review?: { actorId: string; reason: string; at: number; observedPriceCents: number }
}
export interface PricingProduct { id: string; name: string; price: number; taxRate: number; isActive: boolean }
const own = (obj: Record<string, LineQuote> | undefined, id: string) => obj && Object.prototype.hasOwnProperty.call(obj, id) ? obj[id] : undefined

/** Les items de table sont un miroir des couverts, pas une seconde commande. */
export function floorLines(floor: any): any[] {
  return [...(floor.tables || []).flatMap((t: any) => Array.isArray(t.posCovers)
    ? t.posCovers.filter((c: any) => !c.id.startsWith('guest:') && !c.id.startsWith('seat:')).flatMap((c: any) => c.items)
    : t.items || []), ...(floor.chairs || []).flatMap((c: any) => c.items || [])]
}
export function quoteFor(floor: any, item: any): LineQuote | undefined { return own(floor.posPricing, item.id) }
export function pricedItem(floor: any, item: any) {
  const quote = quoteFor(floor, item)
  return quote ? { ...item, name: quote.name, price: quote.priceCents / 100, taxRate: quote.taxRate, pricingStatus: quote.status,
    menuItemId: quote.productId || item.menuItemId || item.productId, pricingSource: quote.source }
    : { ...item, pricingStatus: 'review' as const, pricingSource: 'legacy-unverified' as const }
}

/** Appelé avant toute persistance. Le registre n'est jamais importé depuis une requête. */
export function canonicalizeFloorPricing(before: any, draft: any, products: PricingProduct[] = [], now = Date.now(), serverQuotes: Record<string, LineQuote> = {}) {
  const previous = new Map(floorLines(before).map(i => [i.id, i]))
  const current = floorLines(draft)
  if (current.some(i => ['__proto__', 'constructor', 'prototype'].includes(i.id))) throw new PosPricingError('Référence de ligne invalide.')
  if (new Set(current.map(i => i.id)).size !== current.length) throw new PosPricingError('Une même ligne ne peut apparaître dans deux additions.')
  // `draft` peut contenir des données de requête : son registre n'est JAMAIS une source.
  const registry: Record<string, LineQuote> = { ...(before.posPricing || {}), ...serverQuotes }
  for (const item of current) {
    const old = previous.get(item.id)
    if (!old && own(before.posPricing, item.id)) throw new PosPricingError('Cette référence de ligne a déjà été retirée ou réglée. Ajoutez un nouvel article.')
    let quote = own(registry, item.id)
    const productId = item.menuItemId || item.productId
    if (!quote && old) {
      quote = { version: 1, status: 'review', source: 'legacy-unverified', name: old.name, priceCents: moneyMinor(old.price),
        ...(old.menuItemId || old.productId ? { productId: old.menuItemId || old.productId } : {}), quotedAt: now }
    }
    if (!quote) {
      const product = products.find(p => p.id === productId && p.isActive)
      if (!product) throw new PosPricingError('Nouvel article non vérifié : choisissez un produit actif du catalogue de cette société.')
      quote = { version: 1, status: 'confirmed', source: 'catalog', productId: product.id, name: product.name,
        priceCents: moneyMinor(product.price), taxRate: product.taxRate, quotedAt: now }
    }
    if (quote.productId && productId && quote.productId !== productId) throw new PosPricingError('Le produit d’une ligne enregistrée ne peut pas être remplacé. Ajoutez une nouvelle ligne.')
    if (old && item.qty > old.qty) {
      const product = products.find(p => p.id === quote.productId)
      if (!product || !product.isActive || quote.status !== 'confirmed' || moneyMinor(product.price) !== quote.priceCents || product.taxRate !== quote.taxRate) {
        throw new PosPricingError('Le tarif ou la disponibilité a changé. Conservez cette ligne et ajoutez les quantités supplémentaires depuis le catalogue actualisé.')
      }
    }
    Object.defineProperty(registry, item.id, { value: quote, enumerable: true, configurable: true, writable: true })
    Object.assign(item, pricedItem({ posPricing: registry }, item), { productId: quote.productId || productId })
  }
  draft.posPricing = registry
  for (const table of draft.tables || []) if (Array.isArray(table.posCovers)) {
    table.items = table.posCovers.filter((c: any) => !c.id.startsWith('guest:') && !c.id.startsWith('seat:'))
      .flatMap((c: any) => c.items.map((i: any) => ({ ...i, addedAt: i.addedAt || now })))
  }
  return registry
}
