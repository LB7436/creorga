import { z } from 'zod'

export const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export class PosError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
const id = z.string().min(1).max(100)
const finite = z.number().finite()
export const coverSchema = z.object({
  id, label: z.string().max(100), paidAt: finite.optional(), paidMethod: z.enum(['cash', 'card', 'contactless']).optional(),
  items: z.array(z.object({ id, menuItemId: id, name: z.string().max(160), price: finite.min(0).max(1e6),
    qty: finite.int().min(1).max(50), note: z.string().max(1000), coverId: id })).max(100),
})
export const posTableSchema = z.object({
  id, name: z.string().min(1).max(60), shape: z.enum(['round', 'square', 'rect', 'bar']),
  seats: finite.int().min(1).max(30), x: finite.min(-1e5).max(1e5), y: finite.min(-1e5).max(1e5),
  status: z.enum(['available', 'occupied', 'reserved', 'dirty']), covers: z.array(coverSchema).max(100),
  openedAt: finite.optional(), section: z.string().min(1).max(80), mergedWith: z.array(id).max(100),
  isMergedInto: id.optional(), rotation: finite.optional(),
  waiterId: id.optional(), vip: z.boolean().optional(),
  customerId: id.nullable().optional(), orderNote: z.string().max(1000).optional(), kitchenNote: z.string().max(1000).optional(), onHold: z.boolean().optional(),
  orderDiscount: z.object({ type: z.enum(['percent', 'amount', 'free']), value: finite.min(0).max(1e6) }).nullable().optional(), offeredItemIds: z.array(id).max(1000).optional(),
})
export const seatSchema = z.object({ id, tableId: id.nullable(), position: finite.int().min(0).max(29).optional(),
  status: z.enum(['free', 'occupied', 'reserved']), customerName: z.string().max(120).optional(),
  items: coverSchema.shape.items, x: finite.optional(), y: finite.optional(), createdAt: finite })
export type PosCover = z.infer<typeof coverSchema>
export type PosTable = z.infer<typeof posTableSchema>
export const checkoutSchema = z.object({
  requestId: z.string().uuid(), tableId: id, coverIds: z.array(id).min(1).max(100),
  method: z.enum(['cash', 'card', 'contactless']), tip: finite.min(0).max(10000),
  expectedTotal: finite.min(0).max(1e7), cashReceived: finite.min(0).max(1e7).optional(),
  options: z.object({
    receipt: z.object({ message: z.string().max(1000), includeBrand: z.boolean(), includePromo: z.boolean() }).optional(),
    arrondiCaritatif: finite.min(0).max(100).optional(),
    remises: z.array(z.object({ type: z.enum(['promo', 'carte_cadeau', 'points', 'membre', 'geste']),
      libelle: z.string().max(200), montant: finite.min(0).max(1e7), code: z.string().max(100).optional() })).max(5).optional(),
    reglements: z.array(z.object({ methode: z.enum(['cash', 'card', 'contactless']), montant: finite.min(0).max(1e7) })).min(1).max(10).optional(),
  }).optional(),
})

export function calculateSale(lines: Array<{ price: number; qty: number; taxRate: number }>, discount: number, tip: number, charity: number) {
  const brut = cents(lines.reduce((s, l) => s + l.price * l.qty, 0))
  if (!lines.length || brut <= 0 || discount > brut) throw new PosError('Addition ou remise invalide.')
  const net = cents(brut - discount)
  const ht = cents(lines.reduce((s, l) => s + (l.price * l.qty * net / brut) / (1 + l.taxRate / 100), 0))
  return { brut, sousTotal: ht, tva: cents(net - ht), total: cents(net + tip + charity) }
}

export function buildClosure(ventes: any[], id: string, now = Date.now()) {
  const sum = (fn: (v: any) => number) => cents(ventes.reduce((s, v) => s + fn(v), 0))
  const parMethode = { cash: 0, card: 0, contactless: 0 }
  for (const v of ventes) for (const p of v.reglements) parMethode[p.methode as keyof typeof parMethode] = cents(parMethode[p.methode as keyof typeof parMethode] + p.montant)
  return { id, horodatage: now, debut: Math.min(...ventes.map(v => v.horodatage)), nbVentes: ventes.length,
    totalTTC: sum(v => v.total - v.pourboire - v.arrondiCaritatif), totalHT: sum(v => v.sousTotal),
    totalTva: sum(v => v.tva), totalPourboires: sum(v => v.pourboire), totalArrondisCaritatifs: sum(v => v.arrondiCaritatif),
    totalRemises: sum(v => v.remises.reduce((s: number, r: any) => s + r.montant, 0)), parMethode, ventes }
}

export const escapeHtml = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
export function receiptHtml(sale: any, company: any) {
  const money = (n: number) => n.toLocaleString('fr-LU', { style: 'currency', currency: 'EUR' })
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Ticket ${sale.numero}</title><body style="font-family:system-ui;max-width:600px;margin:24px auto;padding:16px">${sale.receipt?.includeBrand ? '<p>CREORGA</p>' : ''}<h1>${escapeHtml(company.name)}</h1><p>${escapeHtml(company.address)}<br>TVA : ${escapeHtml(company.vatNumber || 'non renseignée')}</p><h2>Ticket n° ${sale.numero}</h2><p>${new Date(sale.horodatage).toLocaleString('fr-LU')} · ${escapeHtml(sale.tableName)}</p><table width="100%">${sale.lignes.map((l: any) => `<tr><td>${l.qty} × ${escapeHtml(l.name)}</td><td>${money(l.price * l.qty)}</td></tr>`).join('')}</table><p>Remises : ${money(sale.remises.reduce((s: number, r: any) => s + r.montant, 0))}<br>HT : ${money(sale.sousTotal)} · TVA : ${money(sale.tva)}<br>Pourboire : ${money(sale.pourboire)} · Arrondi à reverser : ${money(sale.arrondiCaritatif)}</p><h2>Total encaissé : ${money(sale.total)}</h2><p>${sale.reglements.map((p: any) => `${escapeHtml(p.methode)} : ${money(p.montant)}`).join(' · ')}</p><p>${escapeHtml(sale.receipt?.message || company.receiptFooter || '')}</p>${sale.receipt?.includePromo ? sale.remises.filter((r: any) => r.type === 'promo').map((r: any) => `<p>Code utilisé : ${escapeHtml(r.libelle)}</p>`).join('') : ''}<p>Référence : ${escapeHtml(sale.id)}</p></body></html>`
}
