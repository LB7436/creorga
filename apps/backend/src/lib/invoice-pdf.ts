import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { moneyMinor, totalsFromHt, totalsFromTtc, type TaxGroup } from './money'

export type Party = { name?: string; legalName?: string | null; businessName?: string | null; firstName?: string; lastName?: string; address?: string | null; city?: string | null; postalCode?: string | null; email?: string | null; vatNumber?: string | null;
  legalForm?: string; rcsNumber?: string; authorizationNumber?: string; profession?: string; legalMention?: string; rcsExemptionReason?: string }
export interface PrintableInvoice {
  version?: number; number: string; status: string; createdAt: Date | string; dueDate?: Date | string | null; serviceDate?: Date | string | null
  company: Party; customer?: Party | null; notes?: string | null
  currency?: string; priceBasis?: string; discountCents?: number; taxGroups?: TaxGroup[]; reconstructed?: boolean
  subtotal: number; taxAmount: number; total: number
  items: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number; taxReason?: string | null }>
}
export type PaperFormat = 'A4' | '58' | '80'
let fontBytes: Buffer | undefined
export function invoiceFontPath(): string {
  const candidates = [
    fileURLToPath(new URL('../../assets/fonts/NotoSans-Regular.ttf', import.meta.url)),
    fileURLToPath(new URL('../../../assets/fonts/NotoSans-Regular.ttf', import.meta.url)),
    path.resolve(process.cwd(), 'assets/fonts/NotoSans-Regular.ttf'),
  ]
  const found = candidates.find(candidate => existsSync(candidate))
  if (!found) throw new Error('Police PDF absente du déploiement : assets/fonts/NotoSans-Regular.ttf requis.')
  return found
}
export async function invoicePdf(invoice: PrintableInvoice, format: PaperFormat = 'A4'): Promise<Buffer> {
  fontBytes ||= readFileSync(invoiceFontPath())
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(fontBytes, { subset: true })
  pdf.setTitle(`Facture ${invoice.number}`)
  pdf.setAuthor(invoice.company.name || 'Creorga')
  pdf.setLanguage('fr-LU')
  const thermal = format !== 'A4', width = thermal ? Number(format) * 72 / 25.4 : 595.28
  const printableWidth = thermal ? (format === '58' ? 48 : 72) * 72 / 25.4 : 495.28
  const margin = (width - printableWidth) / 2
  // Rouleau ajusté ensuite à la hauteur effectivement utilisée ; limite de page explicite.
  const height = thermal ? 2880 : 841.89
  let page = pdf.addPage([width, height])
  let y = height - (thermal ? 25 : 52)
  const ink = rgb(0.12, 0.15, 0.22)
  const purple = rgb(0.35, 0.22, 0.65)
  const clean = (value: unknown) => String(value ?? '').normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/\t/g, ' ')
  const widths = new Map<string, number>()
  const line = (value: unknown, size = thermal ? 8.5 : 10, color = ink) => {
    const text = clean(value)
    // Mesure réelle de la police : les textes longs et les accents ne se chevauchent pas.
    for (const paragraph of text.split('\n')) {
      let current = ''
      let currentWidth = 0
      for (const letter of paragraph) {
        const key = `${size}:${letter}`
        if (!widths.has(key)) widths.set(key, font.widthOfTextAtSize(letter, size))
        const letterWidth = widths.get(key)!
        // Éviter le recalcul de toute la chaîne à chaque caractère (quadratique).
        if (currentWidth + letterWidth > printableWidth) {
          const space = current.lastIndexOf(' ')
          if (space > 0) { draw(current.slice(0, space), size, color); current = current.slice(space + 1) }
          else { draw(current, size, color); current = '' }
          currentWidth = Array.from(current).reduce((sum, ch) => sum + widths.get(`${size}:${ch}`)!, 0)
        }
        current += letter
        currentWidth += letterWidth
      }
      draw(current || ' ', size, color)
    }
  }
  const draw = (text: string, size: number, color: ReturnType<typeof rgb>) => {
    // Contrôle final avec le crénage réel : aucune troncature par approximation.
    if (font.widthOfTextAtSize(text, size) > printableWidth && text.length > 1) {
      let cut = text.length - 1
      while (cut > 1 && font.widthOfTextAtSize(text.slice(0, cut), size) > printableWidth) cut--
      draw(text.slice(0, cut), size, color); draw(text.slice(cut), size, color); return
    }
    if (y < 55) { page = pdf.addPage([width, height]); y = height - (thermal ? 25 : 52) }
    page.drawText(text, { x: margin, y, font, size, color })
    y -= size * 1.55
  }
  const money = (amount: number) => amount.toLocaleString('fr-LU', { style: 'currency', currency: invoice.currency || 'EUR' })
  const amountRow = (label: string, amount: number, size = thermal ? 9 : 11, color = ink) => {
    const value = money(amount), valueWidth = font.widthOfTextAtSize(value, size)
    if (font.widthOfTextAtSize(label, size) + valueWidth + 12 > printableWidth) line(label, size, color)
    else {
      if (y < 55) { page = pdf.addPage([width, height]); y = height - (thermal ? 25 : 52) }
      page.drawText(label, { x: margin, y, font, size, color })
    }
    if (y < 55) { page = pdf.addPage([width, height]); y = height - (thermal ? 25 : 52) }
    page.drawText(value, { x: width - margin - valueWidth, y, font, size, color }); y -= size * 1.55
  }
  const date = (value: Date | string) => new Date(value).toLocaleDateString('fr-LU', { timeZone: 'Europe/Luxembourg' })
  const party = (value: Party) => {
    line(value.businessName || value.name || `${value.firstName || ''} ${value.lastName || ''}`.trim(), thermal ? 10 : 12)
    if (value.legalName && value.legalName !== value.name) line(value.legalName)
    if (value.legalForm) line(value.legalForm)
    if (value.address) line(value.address)
    if (value.postalCode || value.city) line(`${value.postalCode || ''} ${value.city || ''}`.trim())
    if (value.email) line(value.email)
    if (value.vatNumber) line(`TVA : ${value.vatNumber}`)
    if (value.rcsNumber) line(`R.C.S. Luxembourg : ${value.rcsNumber}`)
    if (value.authorizationNumber) line(`Autorisation d'établissement : ${value.authorizationNumber}`)
    if (value.profession) line(`Profession : ${value.profession}`)
    if (value.legalMention) line(value.legalMention)
  }
  line('FACTURE', thermal ? 13 : 21, purple)
  line(invoice.number, thermal ? 10 : 16)
  const statuses: Record<string, string> = { DRAFT: 'Brouillon', SENT: 'Émise', PAID: 'Payée', OVERDUE: 'En retard', CANCELLED: 'Annulée' }
  line(`${statuses[invoice.status] || invoice.status} · Date : ${date(invoice.createdAt)}${invoice.dueDate ? ` · Échéance : ${date(invoice.dueDate)}` : ''}`)
  if (invoice.serviceDate) line(`Date de prestation : ${date(invoice.serviceDate)}`)
  if (invoice.reconstructed) line('COPIE RECONSTITUÉE - informations historiques non prouvées.', thermal ? 8 : 10, purple)
  y -= 15
  party(invoice.company)
  y -= 15
  line('CLIENT', 10, purple)
  if (invoice.customer) party(invoice.customer)
  else line('Client de passage')
  y -= 15
  const basis = invoice.priceBasis === 'TTC' ? 'TTC' : 'HT'
  line(thermal ? `ARTICLES - PRIX ${basis}` : `DÉSIGNATION - QUANTITÉ - PRIX ${basis} - TVA`, thermal ? 8 : 10, purple)
  for (const item of invoice.items) {
    line(item.description, thermal ? 9 : 11)
    const extended = totalsFromHt([{ price: item.unitPrice, qty: item.quantity, taxRate: 0 }]).baseCents
    line(`${item.quantity.toLocaleString('fr-LU')} × ${money(item.unitPrice)} - TVA ${item.taxRate.toLocaleString('fr-LU')} %`)
    amountRow(`Ligne ${basis}`, extended / 100)
    if (item.taxReason) line(`Motif fiscal : ${item.taxReason}`)
    y -= 5
  }
  y -= 10
  const lines = invoice.items.map(i => ({ price: i.unitPrice, qty: i.quantity, taxRate: i.taxRate }))
  const groups = invoice.taxGroups || (basis === 'TTC' ? totalsFromTtc(lines, invoice.discountCents || 0) : totalsFromHt(lines)).groups
  line('VENTILATION TVA', thermal ? 9 : 11, purple)
  for (const group of groups) { amountRow(`Base HT (${group.taxRate} %)`, group.baseCents / 100); amountRow(`TVA (${group.taxRate} %)`, group.taxCents / 100) }
  if (invoice.discountCents) amountRow('Remise TTC', invoice.discountCents / 100)
  amountRow('Total HT', invoice.subtotal, thermal ? 10 : 12)
  amountRow('TVA', invoice.taxAmount, thermal ? 10 : 12)
  amountRow('TOTAL TTC', invoice.total, thermal ? 12 : 17, purple)
  if (invoice.notes) { y -= 15; line('NOTES', 10, purple); line(invoice.notes) }
  let finalPageShift = 0
  if (thermal) {
    const usedHeight = Math.ceil(height - y + 55)
    finalPageShift = usedHeight - height
    page.translateContent(0, finalPageShift)
    page.setSize(width, usedHeight)
  }
  for (const [index, sheet] of pdf.getPages().entries()) {
    sheet.drawText(`${invoice.number} | ${index + 1}/${pdf.getPageCount()}`, { x: margin, y: 25 - (thermal && index === pdf.getPageCount() - 1 ? finalPageShift : 0), font, size: thermal ? 6 : 8, color: ink })
  }
  return Buffer.from(await pdf.save())
}
