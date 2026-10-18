import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from './prisma'
import { documentCapabilityId, signDocumentCapability, verifyDocumentCapability } from './document-link-token'
import { BusinessPermissionError, transactionBusinessAccess } from './business-permission-transaction'

export class DocumentLinkError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
const unavailable = () => new DocumentLinkError(404, 'Lien expiré, révoqué ou indisponible. Demandez un nouveau lien au responsable.')
const createInput = z.object({ requestId: z.string().uuid().transform(id => id.toLowerCase()), ttlMinutes: z.union([z.literal(15), z.literal(60)]).default(15) }).strict()
const revokeInput = z.object({ reason: z.string().trim().min(3).max(300) }).strict()
const tokenInput = z.object({ token: z.string().min(1).max(200) }).strict()
const secret = () => process.env.JWT_SECRET || ''
type Tx = Prisma.TransactionClient

async function manager(tx: Tx, companyId: string, actorId: string) {
  try {
    const access = await transactionBusinessAccess(tx, companyId, actorId)
    if (!access.capabilities.includes('invoices.read') || !access.capabilities.includes('exports.read')) throw new BusinessPermissionError()
  } catch (error) {
    if (error instanceof BusinessPermissionError) throw new DocumentLinkError(403, 'L’accès aux documents et à leur export doit être encore autorisé dans cette société.')
    throw error
  }
}
async function original(tx: Tx, companyId: string, invoiceId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "companyId" = ${companyId} AND "id" = ${invoiceId} FOR SHARE`
  const invoice = await tx.invoice.findFirst({ where: { companyId, id: invoiceId } })
  if (!invoice) throw new DocumentLinkError(404, 'Facture introuvable.')
  if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED' || !invoice.issuedAt || !invoice.issuedPdf || !invoice.issuedPdfHash) throw new DocumentLinkError(422, 'Seul un PDF original émis, non annulé et figé peut être partagé.')
  const bytes = Buffer.from(invoice.issuedPdf)
  if (bytes.subarray(0, 5).toString() !== '%PDF-' || createHash('sha256').update(bytes).digest('hex') !== invoice.issuedPdfHash) throw new DocumentLinkError(503, 'Intégrité du PDF non confirmée. Aucun lien ni fichier communiqué.')
  return { invoice, bytes }
}
export const documentLinkDto = (link: any) => ({
  id: link.id, invoiceId: link.invoiceId, documentHash: link.documentHash,
  createdAt: link.createdAt, expiresAt: link.expiresAt, revokedAt: link.revokedAt,
  revokedBy: link.revokedBy, revocationReason: link.revocationReason,
})

export async function createInvoiceDocumentLink(companyId: string, actorId: string, invoiceId: string, raw: unknown) {
  const input = createInput.parse(raw)
  return prisma.$transaction(async tx => {
    // Même référence globale : une reprise réseau ne rallonge jamais sa durée.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`document-link:${input.requestId}`}, 0))`
    await manager(tx, companyId, actorId)
    const { invoice } = await original(tx, companyId, invoiceId)
    const requestHash = createHash('sha256').update(JSON.stringify([companyId, actorId, invoiceId, invoice.issuedPdfHash, input.ttlMinutes])).digest('hex')
    let link = await tx.invoiceDocumentLink.findUnique({ where: { id: input.requestId } })
    if (link && link.requestHash !== requestHash) throw new DocumentLinkError(409, 'Cette référence correspond à une autre demande de lien.')
    if (link?.revokedAt || (link && link.expiresAt.getTime() <= Date.now())) throw new DocumentLinkError(410, 'Cette demande de lien est expirée ou révoquée. Créez explicitement un nouveau lien.')
    if (!link) {
      const createdAt = new Date(Math.floor(Date.now() / 1000) * 1000)
      link = await tx.invoiceDocumentLink.create({ data: {
        id: input.requestId, companyId, invoiceId, actorId, requestHash, documentHash: invoice.issuedPdfHash!,
        createdAt, expiresAt: new Date(createdAt.getTime() + input.ttlMinutes * 60000),
        events: { create: { action: 'CREATED', actorId } },
      } })
    }
    // Signer avant commit : une configuration absente ne laisse pas un lien créé.
    return { ...documentLinkDto(link), downloadPath: '/api/document-download', capability: signDocumentCapability(link, secret()) }
  })
}

export async function listInvoiceDocumentLinks(companyId: string, actorId: string, invoiceId: string) {
  return prisma.$transaction(async tx => {
    await manager(tx, companyId, actorId)
    if (!await tx.invoice.findFirst({ where: { id: invoiceId, companyId }, select: { id: true } })) throw new DocumentLinkError(404, 'Facture introuvable.')
    return (await tx.invoiceDocumentLink.findMany({ where: { companyId, invoiceId }, orderBy: { createdAt: 'desc' }, take: 100 })).map(documentLinkDto)
  })
}

export async function revokeInvoiceDocumentLink(companyId: string, actorId: string, invoiceId: string, linkId: string, raw: unknown) {
  const input = revokeInput.parse(raw)
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`document-link:${linkId}`}, 0))`
    await manager(tx, companyId, actorId)
    await tx.$queryRaw`SELECT "id" FROM "InvoiceDocumentLink" WHERE "id" = ${linkId} AND "companyId" = ${companyId} AND "invoiceId" = ${invoiceId} FOR UPDATE`
    const link = await tx.invoiceDocumentLink.findFirst({ where: { id: linkId, companyId, invoiceId } })
    if (!link) throw new DocumentLinkError(404, 'Lien introuvable dans cette facture et cette société.')
    if (link.revokedAt) return documentLinkDto(link)
    const revoked = await tx.invoiceDocumentLink.update({ where: { id: link.id }, data: {
      revokedAt: new Date(), revokedBy: actorId, revocationReason: input.reason,
      events: { create: { action: 'REVOKED', actorId } },
    } })
    return documentLinkDto(revoked)
  })
}

/** Admission atomique : la révocation sérialise les demandes suivantes, pas les octets déjà reçus. */
export async function downloadInvoiceDocument(raw: unknown) {
  const { token } = tokenInput.parse(raw), id = documentCapabilityId(token)
  if (!id) throw unavailable()
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "InvoiceDocumentLink" WHERE "id" = ${id} FOR SHARE`
    const link = await tx.invoiceDocumentLink.findUnique({ where: { id } })
    if (!link || link.revokedAt || !verifyDocumentCapability(token, link, secret(), new Date())) throw unavailable()
    const { invoice, bytes } = await original(tx, link.companyId, link.invoiceId)
    await manager(tx, link.companyId, link.actorId)
    if (invoice.issuedPdfHash !== link.documentHash) throw unavailable()
    await tx.invoiceDocumentLinkEvent.create({ data: { companyId: link.companyId, linkId: link.id, action: 'DOWNLOADED' } })
    return { bytes, hash: link.documentHash, filename: `facture-${invoice.number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf` }
  })
}
