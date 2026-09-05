import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { validateDocument } from './document-validation'

describe('documents RH : vérifier les octets sans modifier le document', () => {
  it('accepte un vrai PDF avec une page', async () => {
    const doc = await PDFDocument.create(); doc.addPage()
    const bytes = Buffer.from(await doc.save())
    expect(await validateDocument(bytes, 'application/pdf')).toBe(true)
  })
  it('refuse le faux PDF et le PDF vide ou tronqué', async () => {
    for (const value of ['', 'NOT A PDF', '%PDF-1.7\nfaux\n%%EOF', '%PDF-1.7']) {
      expect(await validateDocument(Buffer.from(value), 'application/pdf')).toBe(false)
    }
  })
  it('refuse les scripts PDF', async () => {
    const doc = await PDFDocument.create(); doc.addPage(); doc.addJavaScript('test', 'void 0')
    expect(await validateDocument(Buffer.from(await doc.save()), 'application/pdf')).toBe(false)
  })
  it.each(['png', 'jpeg', 'webp'] as const)('décode une image %s et refuse le format trompeur', async (format) => {
    const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).toFormat(format).toBuffer()
    expect(await validateDocument(bytes, 'image/' + format)).toBe(true)
    expect(await validateDocument(bytes, 'application/pdf')).toBe(false)
    expect(await validateDocument(bytes.subarray(0, 12), 'image/' + format)).toBe(false)
  })
})
