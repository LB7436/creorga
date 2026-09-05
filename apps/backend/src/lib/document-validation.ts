import { PDFDocument, PDFDict, PDFName } from 'pdf-lib'
import sharp from 'sharp'

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024

/** Vérifie le contenu sans le réencoder : les octets signés du document sont préservés. */
export async function validateDocument(bytes: Buffer, mime: string): Promise<boolean> {
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) return false
  try {
    if (mime === 'application/pdf') {
      if (!bytes.subarray(0, 8).toString('ascii').startsWith('%PDF-') || !bytes.subarray(-2048).includes(Buffer.from('%%EOF'))) return false
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true })
      if (pdf.getPageCount() < 1 || pdf.getPageCount() > 500) return false
      // Les pièces RH ne doivent pas déclencher des scripts ni lancer un programme.
      for (const [, object] of pdf.context.enumerateIndirectObjects()) {
        if (object instanceof PDFDict && ['JS', 'JavaScript', 'Launch', 'RichMediaContent'].some(key => object.has(PDFName.of(key)))) return false
        if (object instanceof PDFDict && ['JavaScript', 'Launch'].includes(object.get(PDFName.of('S'))?.toString().slice(1) || '')) return false
      }
      return true
    }
    const expected = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp' }[mime]
    if (!expected) return false
    const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 40_000_000 })
    const meta = await image.metadata()
    if (meta.format !== expected || !meta.width || !meta.height || (meta.pages || 1) !== 1) return false
    await image.stats() // Force le décodage des pixels, pas uniquement celui de l'en-tête.
    return true
  } catch {
    return false // Erreur de format attendue, pas une panne d'enregistrement masquée.
  }
}
