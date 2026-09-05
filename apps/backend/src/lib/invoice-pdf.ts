import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

type Party = { name?: string; firstName?: string; lastName?: string; address?: string | null; city?: string | null; postalCode?: string | null; email?: string | null; vatNumber?: string | null }
export interface PrintableInvoice {
  number: string; status: string; createdAt: Date; dueDate?: Date | null
  company: Party; customer?: Party | null; notes?: string | null
  subtotal: number; taxAmount: number; total: number
  items: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>
}
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
export async function invoicePdf(invoice: PrintableInvoice): Promise<Buffer> {
  fontBytes ||= readFileSync(invoiceFontPath())
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(fontBytes, { subset: true })
  pdf.setTitle(`Facture ${invoice.number}`)
  pdf.setAuthor(invoice.company.name || 'Creorga')
  pdf.setLanguage('fr-LU')
  let page = pdf.addPage([595.28, 841.89])
  let y = 790
  const ink = rgb(0.12, 0.15, 0.22)
  const purple = rgb(0.35, 0.22, 0.65)
  const clean = (value: unknown) => String(value ?? '').normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/\t/g, ' ')
  const line = (value: unknown, size = 10, color = ink) => {
    const text = clean(value)
    // Mesure réelle de la police : les textes longs et les accents ne se chevauchent pas.
    for (const paragraph of text.split('\n')) {
      let current = ''
      for (const letter of paragraph) {
        if (font.widthOfTextAtSize(current + letter, size) > 495) { draw(current, size, color); current = '' }
        current += letter
      }
      draw(current || ' ', size, color)
    }
  }
  const draw = (text: string, size: number, color: ReturnType<typeof rgb>) => {
    if (y < 65) { page = pdf.addPage([595.28, 841.89]); y = 790 }
    page.drawText(text, { x: 50, y, font, size, color })
    y -= size * 1.65
  }
  const money = (amount: number) => amount.toLocaleString('fr-LU', { style: 'currency', currency: 'EUR' })
  const date = (value: Date) => new Date(value).toLocaleDateString('fr-LU', { timeZone: 'Europe/Luxembourg' })
  const party = (value: Party) => {
    line(value.name || `${value.firstName || ''} ${value.lastName || ''}`.trim(), 12)
    if (value.address) line(value.address)
    if (value.postalCode || value.city) line(`${value.postalCode || ''} ${value.city || ''}`.trim())
    if (value.email) line(value.email)
    if (value.vatNumber) line(`TVA : ${value.vatNumber}`)
  }
  line('CREORGA · FACTURE', 21, purple)
  line(invoice.number, 16)
  const statuses: Record<string, string> = { DRAFT: 'Brouillon', SENT: 'Émise', PAID: 'Payée', OVERDUE: 'En retard', CANCELLED: 'Annulée' }
  line(`${statuses[invoice.status] || invoice.status} · Date : ${date(invoice.createdAt)}${invoice.dueDate ? ` · Échéance : ${date(invoice.dueDate)}` : ''}`)
  y -= 15
  party(invoice.company)
  y -= 15
  line('CLIENT', 10, purple)
  if (invoice.customer) party(invoice.customer)
  else line('Client de passage')
  y -= 15
  line('DÉSIGNATION · QUANTITÉ · PRIX HT · TVA · MONTANT HT', 10, purple)
  for (const item of invoice.items) {
    line(item.description, 11)
    line(`${item.quantity.toLocaleString('fr-LU')} × ${money(item.unitPrice)}  ·  TVA ${item.taxRate.toLocaleString('fr-LU')} %  ·  ${money(Math.round(item.quantity * item.unitPrice * 100) / 100)}`)
    y -= 5
  }
  y -= 10
  line(`Total HT : ${money(invoice.subtotal)}`, 12)
  line(`TVA : ${money(invoice.taxAmount)}`, 12)
  line(`TOTAL TTC : ${money(invoice.total)}`, 17, purple)
  if (invoice.notes) { y -= 15; line('NOTES', 10, purple); line(invoice.notes) }
  for (const [index, sheet] of pdf.getPages().entries()) {
    sheet.drawText(`${invoice.number} · ${index + 1} / ${pdf.getPageCount()}`, { x: 50, y: 30, font, size: 8, color: ink })
  }
  return Buffer.from(await pdf.save())
}
