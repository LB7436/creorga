import { z } from 'zod'
import { moneyMinor, totalsFromTtc } from './money'

const amount = z.number().finite().nonnegative().max(1_000_000)
const receipt = z.object({
  version: z.literal(2), id: z.string(), numero: z.number().int().positive(), horodatage: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/), confirmation: z.literal('manual_declaration'),
  issuer: z.object({ name: z.string().trim().min(1).max(500), legalName: z.string().max(500).nullable().optional(),
    address: z.string().max(2000).nullable().optional(), vatNumber: z.string().max(100).nullable().optional(), email: z.string().max(254).nullable().optional(),
    legalProfile: z.record(z.string().max(2000).nullable()).nullable().optional() }),
  lignes: z.array(z.object({ name: z.string().min(1).max(500), price: amount, qty: z.number().positive().max(100_000), taxRate: z.number().min(0).max(100) })).min(1).max(200),
  taxGroups: z.array(z.object({ taxRate: z.number(), baseCents: z.number().int(), taxCents: z.number().int(), totalCents: z.number().int() })),
  brut: amount, sousTotal: amount, tva: amount, total: amount, pourboire: amount, arrondiCaritatif: amount,
  reglements: z.array(z.object({ methode: z.string().min(1).max(50), montant: amount })).min(1),
})
export class ReceiptInvoiceError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function receiptInvoiceData(sale: { id: string; number: number; snapshot: unknown }) {
  const parsed = receipt.safeParse(sale.snapshot)
  if (!parsed.success) throw new ReceiptInvoiceError(422, 'Ticket ancien ou incomplet : vérification manuelle nécessaire. Aucun taux ni émetteur ne sera inventé.')
  const s = parsed.data
  const lines = s.lignes.map(l => ({ description: l.name, quantity: l.qty, unitPrice: l.price, taxRate: l.taxRate }))
  const gross = totalsFromTtc(s.lignes).grossCents
  const fiscalCents = moneyMinor(s.total) - moneyMinor(s.pourboire) - moneyMinor(s.arrondiCaritatif)
  const discountCents = gross - fiscalCents
  if (s.id !== sale.id || s.numero !== sale.number || discountCents < 0 || discountCents > gross || !Number.isFinite(new Date(s.horodatage).getTime())) {
    throw new ReceiptInvoiceError(422, 'Montants ou référence du ticket incohérents : conversion refusée.')
  }
  const amounts = totalsFromTtc(s.lignes, discountCents)
  if (gross !== moneyMinor(s.brut) || amounts.baseCents !== moneyMinor(s.sousTotal) || amounts.taxCents !== moneyMinor(s.tva)
    || s.reglements.reduce((sum, p) => sum + moneyMinor(p.montant), 0) !== moneyMinor(s.total)
    || JSON.stringify([...s.taxGroups].sort((a, b) => a.taxRate - b.taxRate)) !== JSON.stringify(amounts.groups)) {
    throw new ReceiptInvoiceError(422, 'Ventilation fiscale ou règlements du ticket incohérents : conversion refusée.')
  }
  return { priceBasis: 'TTC', currency: s.currency, discountCents, documentMode: 'COMPLETE', serviceDate: new Date(s.horodatage),
    subtotal: amounts.baseCents / 100, taxAmount: amounts.taxCents / 100, total: amounts.totalCents / 100,
    sourcePosSaleId: sale.id, sourceReceipt: { version: 1, saleId: sale.id, number: sale.number, issuer: s.issuer,
      confirmation: s.confirmation, tipCents: moneyMinor(s.pourboire), charityCents: moneyMinor(s.arrondiCaritatif) },
    items: { create: lines } }
}
