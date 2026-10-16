import { moneyMinor, totalsFromHt, totalsFromTtc } from './money'
import type { PrintableInvoice, Party } from './invoice-pdf'

export class DocumentValidationError extends Error {
  constructor(public fields: string[]) { super(`Complétez ou corrigez avant émission : ${fields.join(', ')}.`) }
}
export function invoiceDocument(invoice: any, issuedAt?: Date): PrintableInvoice {
  const issuer = invoice.sourcePosSaleId ? invoice.sourceReceipt.issuer : invoice.company
  const profile = issuer.legalProfile || {}
  const company: Party = { name: issuer.name, legalName: issuer.legalName, address: issuer.address,
    vatNumber: issuer.vatNumber, email: issuer.email,
    ...Object.fromEntries(['legalForm', 'rcsNumber', 'authorizationNumber', 'profession', 'legalMention', 'rcsExemptionReason'].map(key => [key, profile[key] || undefined])) }
  const lines = invoice.items.map((i: any) => ({ price: i.unitPrice, qty: i.quantity, taxRate: i.taxRate }))
  const amounts = invoice.priceBasis === 'TTC' ? totalsFromTtc(lines, invoice.discountCents || 0) : totalsFromHt(lines)
  const fields: string[] = []
  if (issuedAt) {
    if (!company.name?.trim() || !company.address?.trim()) fields.push('nom et adresse de l’émetteur')
    if (invoice.documentMode === 'COMPLETE' || moneyMinor(invoice.total) > 10000 || invoice.customer?.businessName) {
      if (!company.legalForm) fields.push('forme juridique')
      if (!company.rcsNumber && !company.rcsExemptionReason) fields.push('RCS ou motif de non-application à valider')
      if (!company.authorizationNumber) fields.push('autorisation d’établissement')
      if (!company.vatNumber && !company.legalMention) fields.push('TVA émetteur ou mention fiscale validée')
      if (!invoice.customer?.address || !(invoice.customer.businessName || invoice.customer.firstName)) fields.push('nom et adresse du client')
    }
    if (invoice.items.some((i: any) => i.taxRate === 0 && !i.taxReason?.trim())) fields.push('motif fiscal des lignes à taux zéro')
    if (amounts.baseCents !== moneyMinor(invoice.subtotal) || amounts.taxCents !== moneyMinor(invoice.taxAmount) || amounts.totalCents !== moneyMinor(invoice.total)) fields.push('recalcul du brouillon selon la ventilation par taux')
    if (fields.length) throw new DocumentValidationError(fields)
  }
  const sourceNote = invoice.sourcePosSaleId ? `Ticket de caisse n° ${invoice.sourceReceipt.number} — règlement déclaré en caisse, sans nouvelle demande de paiement ni vérification bancaire automatique. Pourboire ${invoice.sourceReceipt.tipCents / 100} ${invoice.currency} et don ${invoice.sourceReceipt.charityCents / 100} ${invoice.currency} exclus du montant facturé.` : ''
  return { version: 1, number: invoice.number, status: issuedAt ? (invoice.sourcePosSaleId ? 'PAID' : 'SENT') : invoice.status, createdAt: (issuedAt || invoice.createdAt).toISOString(),
    dueDate: invoice.dueDate?.toISOString(), serviceDate: invoice.serviceDate?.toISOString(), company,
    customer: invoice.customer ? { firstName: invoice.customer.firstName, lastName: invoice.customer.lastName, businessName: invoice.customer.businessName,
      address: invoice.customer.address, vatNumber: invoice.customer.vatNumber, email: invoice.customer.email } : null,
    currency: invoice.currency || 'EUR', priceBasis: invoice.priceBasis || 'HT', discountCents: invoice.discountCents || 0,
    subtotal: invoice.subtotal, taxAmount: invoice.taxAmount, total: invoice.total, taxGroups: amounts.groups, notes: [sourceNote, invoice.notes].filter(Boolean).join('\n') || null,
    items: invoice.items.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate, taxReason: i.taxReason })) }
}
