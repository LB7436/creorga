import { allocateMinor, moneyMinor, totalsFromTtc } from './money'

export interface AllocationGroup {
  key: string; tableId: string; label: string; kitchenNote: string; barNote: string
  lines: { itemId: string; qty: number }[]
}
export interface TenderDecision { tenderId: string; parts: { groupKey: string; amountCents: number }[] }
interface HistoricalOrder { id: string; total: number; subtotal: number; taxAmount: number; items: {
  id: string; productId: string; productName: string | null; quantity: number; unitPrice: number; taxRate: number; notes?: string | null
}[] }
const sum = (values: number[]) => values.reduce((n, x) => n + x, 0)
const fail = (reason: string): never => { throw new RangeError(reason) }

/** Projection de créance, pas une nouvelle vente ni un document fiscal.
 * Ordre stable : identifiants de ligne puis clés des groupes (comparaison binaire).
 * Le centime résiduel de net va aux premières unités, pas à un groupe implicite.
 * Les bases fiscales sont ventilées depuis les groupes historiques, jamais recalculées
 * indépendamment après découpe. Les choix d'acomptes sont obligatoirement explicites.
 */
export function buildFinancialAllocation(order: HistoricalOrder, input: AllocationGroup[], tenders: { id: string; amountCents: number }[], decisions: TenderDecision[]) {
  const groups = [...input].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  if (groups.length < 2 || groups.length > 10 || new Set(groups.map(g => g.key)).size !== groups.length) fail('Deux à dix groupes distincts sont requis.')
  const items = [...order.items].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  if (!items.length || items.some(i => !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 10000 || moneyMinor(i.unitPrice) / 100 !== i.unitPrice)) fail('Prix ou quantité historique non représentable sans décision documentaire.')
  const gross = items.map(i => moneyMinor(i.unitPrice) * i.quantity)
  const totalCents = moneyMinor(order.total), discountCents = sum(gross) - totalCents
  if (totalCents > 1_000_000_000 || gross.some(n => !Number.isSafeInteger(n)) || !Number.isSafeInteger(sum(gross))) fail('Montant historique hors limites de la caisse.')
  if (discountCents < 0 || totalCents < 0) fail('Total historique incompatible avec les lignes ; correction documentaire nécessaire.')
  const fiscal = totalsFromTtc(items.map(i => ({ price: i.unitPrice, qty: i.quantity, taxRate: i.taxRate })), discountCents)
  if (fiscal.baseCents !== moneyMinor(order.subtotal) || fiscal.taxCents !== moneyMinor(order.taxAmount)) fail('TVA historique incohérente : ne pas réinterpréter le document.')
  for (const g of groups) {
    if (!g.lines.length || new Set(g.lines.map(l => l.itemId)).size !== g.lines.length || g.lines.some(l => !items.some(i => i.id === l.itemId) || !Number.isInteger(l.qty) || l.qty < 1)) fail('Quantité ou provenance de ligne invalide.')
  }
  const lineDiscounts = allocateMinor(discountCents, gross)
  const output = groups.map(g => ({ ...g, lines: [] as { itemId: string; productId: string; name: string; price: number; taxRate: number; note: string; qty: number; grossCents: number; discountCents: number; totalCents: number; baseCents: number; taxCents: number }[], totalCents: 0, discountCents: 0, baseCents: 0, taxCents: 0, paidCents: 0, outstandingCents: 0 }))
  items.forEach((item, index) => {
    const quantities = groups.map(g => g.lines.find(l => l.itemId === item.id)?.qty || 0)
    if (sum(quantities) !== item.quantity) fail('La quantité historique doit être répartie exactement une fois.')
    const units = allocateMinor(gross[index] - lineDiscounts[index], Array(item.quantity).fill(1))
    let offset = 0
    quantities.forEach((qty, g) => {
      if (!qty) return
      const totalCents = sum(units.slice(offset, offset + qty)); offset += qty
      const grossCents = moneyMinor(item.unitPrice) * qty
      output[g].lines.push({ itemId: item.id, productId: item.productId, name: item.productName || '', price: item.unitPrice, taxRate: item.taxRate, note: item.notes || '', qty,
        grossCents, discountCents: grossCents - totalCents, totalCents, baseCents: 0, taxCents: 0 })
    })
  })
  for (const tax of fiscal.groups) {
    const lines = output.flatMap(g => g.lines.filter(l => l.taxRate === tax.taxRate))
    const taxes = allocateMinor(tax.taxCents, lines.map(l => l.totalCents))
    lines.forEach((l, i) => { l.taxCents = taxes[i]; l.baseCents = l.totalCents - taxes[i] })
  }
  const tenderParts: { tenderId: string; groupKey: string; amountCents: number }[] = []
  if (new Set(decisions.map(d => d.tenderId)).size !== decisions.length || decisions.length !== tenders.length || decisions.some(d => !tenders.some(t => t.id === d.tenderId))) fail('Une décision explicite est nécessaire pour chaque acompte / règlement d’origine.')
  for (const tender of [...tenders].sort((a, b) => a.id < b.id ? -1 : 1)) {
    const d = decisions.find(d => d.tenderId === tender.id)!
    if (new Set(d.parts.map(p => p.groupKey)).size !== d.parts.length || sum(d.parts.map(p => p.amountCents)) !== tender.amountCents || d.parts.some(p => !groups.some(g => g.key === p.groupKey) || !Number.isSafeInteger(p.amountCents) || p.amountCents <= 0)) fail('Répartition de règlement incohérente : chaque centime et sa provenance sont requis.')
    for (const part of [...d.parts].sort((a, b) => a.groupKey < b.groupKey ? -1 : 1)) tenderParts.push({ tenderId: tender.id, ...part })
  }
  for (const g of output) {
    g.totalCents = sum(g.lines.map(l => l.totalCents)); g.discountCents = sum(g.lines.map(l => l.discountCents))
    g.baseCents = sum(g.lines.map(l => l.baseCents)); g.taxCents = sum(g.lines.map(l => l.taxCents))
    g.paidCents = sum(tenderParts.filter(t => t.groupKey === g.key).map(t => t.amountCents))
    if (g.paidCents > g.totalCents) fail('Acompte affecté supérieur au montant du groupe : décision de correction nécessaire.')
    g.outstandingCents = g.totalCents - g.paidCents
  }
  return { version: 1, orderId: order.id, totalCents, discountCents, taxGroups: fiscal.groups, policy: 'historical_lines_then_group_key_unit_residual_v1', groups: output, tenderParts }
}
