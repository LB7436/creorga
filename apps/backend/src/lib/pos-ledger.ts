import { z } from 'zod'
import { moneyMinor, totalsFromTtc } from './money'

export const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export class PosError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
const id = z.string().min(1).max(100).refine(value => !['__proto__', 'constructor', 'prototype'].includes(value), 'Identifiant réservé')
const finite = z.number().finite()
export const coverSchema = z.object({
  id, label: z.string().max(100), paidAt: finite.optional(), paidMethod: z.enum(['cash', 'card', 'contactless']).optional(),
  items: z.array(z.object({ id, menuItemId: id, name: z.string().max(160), price: finite.min(0).max(1e6),
    qty: finite.int().min(1).max(50), note: z.string().max(1000), coverId: id,
    taxRate: finite.min(0).max(100).optional(), pricingStatus: z.enum(['review', 'confirmed']).optional(), pricingSource: z.string().max(40).optional() })).max(100),
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
    giftCard: z.object({ code: z.string().trim().min(1).max(100), amount: finite.positive().max(1e7) }).optional(),
    receipt: z.object({ message: z.string().max(1000), includeBrand: z.boolean(), includePromo: z.boolean() }).optional(),
    arrondiCaritatif: finite.min(0).max(100).optional(),
    remises: z.array(z.object({ type: z.enum(['promo', 'carte_cadeau', 'points', 'membre', 'geste']),
      libelle: z.string().max(200), montant: finite.min(0).max(1e7), code: z.string().max(100).optional() })).max(5).optional(),
    reglements: z.array(z.object({ methode: z.enum(['cash', 'card', 'contactless']), montant: finite.min(0).max(1e7) })).min(1).max(10).optional(),
  }).optional(),
})

export function calculateSale(lines: Array<{ price: number; qty: number; taxRate: number }>, discount: number, tip: number, charity: number) {
  const amounts = totalsFromTtc(lines, moneyMinor(discount))
  if (!lines.length || amounts.grossCents <= 0) throw new PosError('Addition ou remise invalide.')
  return { brut: amounts.grossCents / 100, sousTotal: amounts.baseCents / 100, tva: amounts.taxCents / 100,
    total: (amounts.totalCents + moneyMinor(tip) + moneyMinor(charity)) / 100 }
}

export function buildClosure(ventes: any[], id: string, now = Date.now()) {
  const sum = (fn: (v: any) => number) => cents(ventes.reduce((s, v) => s + fn(v), 0))
  const parMethode: Record<string, number> = { cash: 0, card: 0, contactless: 0 }
  for (const v of ventes) for (const p of v.reglements) parMethode[p.methode] = cents((parMethode[p.methode] || 0) + p.montant)
  return { id, horodatage: now, debut: Math.min(...ventes.map(v => v.horodatage)), nbVentes: ventes.length,
    totalTTC: sum(v => v.total - v.pourboire - v.arrondiCaritatif), totalHT: sum(v => v.sousTotal),
    totalTva: sum(v => v.tva), totalPourboires: sum(v => v.pourboire), totalArrondisCaritatifs: sum(v => v.arrondiCaritatif),
    totalRemises: sum(v => v.remises.reduce((s: number, r: any) => s + r.montant, 0)), parMethode, ventes }
}

export const escapeHtml = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
export function receiptHtml(sale: any, company: any) {
  const issuer = sale.issuer || company
  const money = (n: number) => n.toLocaleString('fr-LU', { style: 'currency', currency: sale.currency || 'EUR' })
  const methods: Record<string, string> = { cash: 'Espèces', card: 'Carte (déclaration manuelle)', contactless: 'Sans contact (déclaration manuelle)', GIFT_CARD: 'Carte cadeau prépayée' }
  const legal = issuer.legalProfile || {}
  const taxRows = Array.isArray(sale.taxGroups) ? `<table width="100%"><thead><tr><th>Taux</th><th>HT</th><th>TVA</th><th>TTC</th></tr></thead><tbody>${sale.taxGroups.map((g: any) => `<tr><td>${escapeHtml(g.taxRate)} %</td><td>${money(g.baseCents / 100)}</td><td>${money(g.taxCents / 100)}</td><td>${money(g.totalCents / 100)}</td></tr>`).join('')}</tbody></table>` : ''
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Ticket ${sale.numero}</title><body style="font-family:system-ui;max-width:600px;margin:24px auto;padding:16px">${!sale.issuer ? '<p><strong>Reconstitution d’un ancien ticket : coordonnées actuelles, identité historique non conservée.</strong></p>' : ''}${sale.receipt?.includeBrand ? '<p>CREORGA</p>' : ''}<h1>${escapeHtml(issuer.name)}</h1><p>${escapeHtml(issuer.legalName || '')}<br>${escapeHtml(issuer.address)}<br>TVA : ${escapeHtml(issuer.vatNumber || 'non renseignée')}${legal.legalForm ? `<br>${escapeHtml(legal.legalForm)}` : ''}${legal.rcsNumber ? `<br>RCS : ${escapeHtml(legal.rcsNumber)}` : ''}${legal.authorizationNumber ? `<br>Autorisation : ${escapeHtml(legal.authorizationNumber)}` : ''}${legal.legalMention ? `<br>${escapeHtml(legal.legalMention)}` : ''}</p><h2>Ticket n° ${sale.numero}</h2><p>${new Date(sale.horodatage).toLocaleString('fr-LU', { timeZone: 'Europe/Luxembourg' })} · ${escapeHtml(sale.tableName)}</p><table width="100%">${sale.lignes.map((l: any) => `<tr><td>${l.qty} × ${escapeHtml(l.name)}</td><td>${money(l.price * l.qty)}</td></tr>`).join('')}</table><p>Remises : ${money(sale.remises.reduce((s: number, r: any) => s + r.montant, 0))}<br>HT : ${money(sale.sousTotal)} · TVA : ${money(sale.tva)}<br>Pourboire : ${money(sale.pourboire)} · Arrondi à reverser : ${money(sale.arrondiCaritatif)}</p>${taxRows}<h2>Total réglé : ${money(sale.total)}</h2><p>${sale.reglements.map((p: any) => `${escapeHtml(methods[p.methode] || p.methode)} : ${money(p.montant)}`).join(' · ')}</p><p>${escapeHtml(sale.receipt?.message || issuer.receiptFooter || '')}</p>${sale.receipt?.includePromo ? sale.remises.filter((r: any) => r.type === 'promo').map((r: any) => `<p>Code utilisé : ${escapeHtml(r.libelle)}</p>`).join('') : ''}<p>Référence : ${escapeHtml(sale.id)}</p></body></html>`
}
