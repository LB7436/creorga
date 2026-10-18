import { createHash } from 'node:crypto'
import { z } from 'zod'
import prisma from './prisma'
import { emailConfigured, sendEmail } from './email'
import { escapeHtml } from './pos-ledger'
import { TrackedTasks } from './backend-lifecycle'
import { assertTransactionCapabilities, BusinessPermissionError } from './business-permission-transaction'

const deliveryTasks = new TrackedTasks()

export class DeliveryError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export const deliveryDto = (job: any) => ({ id: job.id, invoiceId: job.invoiceId, status: job.status, attempts: job.attempts, acceptedAt: job.acceptedAt,
  confirmation: job.status === 'ACCEPTED' ? 'provider_accepted_not_proven_read' : 'not_confirmed' })
export async function enqueueInvoice(companyId: string, userId: string, invoiceId: string, raw: unknown) {
  const input = z.object({ requestId: z.string().uuid(), to: z.string().trim().email().max(254) }).strict().parse(raw)
  if (process.env.EMAIL_TEST_ONLY === 'true' && !input.to.endsWith('.invalid')) throw new DeliveryError(400, 'Recette locale : destinataire fictif .invalid requis.')
  return prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`invoice-delivery:${input.requestId}`}, 0))::text`
  try { await assertTransactionCapabilities(tx, { companyId, user: { userId } }, 'invoices.read', 'invoices.write', 'exports.read') }
  catch (error) { if (error instanceof BusinessPermissionError) throw new DeliveryError(403, error.message); throw error }
  const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId } })
  if (!invoice) throw new DeliveryError(404, 'Facture introuvable.')
  if (invoice.status === 'CANCELLED') throw new DeliveryError(422, 'Document annulé : préparez le justificatif de correction avant envoi.')
  if (!invoice.issuedPdf || !invoice.issuedPdfHash || !invoice.issuedAt) throw new DeliveryError(422, 'Émettez un original figé avant l’envoi. Les anciens documents reconstitués demandent une vérification.')
  const requestHash = createHash('sha256').update(JSON.stringify({ companyId, invoiceId, userId, to: input.to, documentHash: invoice.issuedPdfHash })).digest('hex')
  const existing = await tx.invoiceDelivery.findUnique({ where: { id: input.requestId } })
  if (existing) {
    if (existing.requestHash !== requestHash) throw new DeliveryError(409, 'Cette référence concerne un autre envoi.')
    return deliveryDto(existing)
  }
  if (!emailConfigured()) throw new DeliveryError(503, 'Envoi transactionnel non configuré.')
  const job = await tx.invoiceDelivery.create({ data: { id: input.requestId, companyId, invoiceId, userId, recipient: input.to, requestHash, documentHash: invoice.issuedPdfHash } })
  return deliveryDto(job)
  })
}

/** File persistante. Une interruption après DATA est ambiguë : pas de renvoi automatique.
 * Les anciennes tâches SENDING deviennent UNCERTAIN ; la boîte destinataire doit être vérifiée.
 */
async function performInvoiceDeliveries() {
  await prisma.invoiceDelivery.updateMany({ where: { status: 'SENDING', claimedAt: { lt: new Date(Date.now() - 5 * 60000) } }, data: { status: 'UNCERTAIN', lastErrorCode: 'WORKER_INTERRUPTED' } })
  if (!emailConfigured()) return
  const jobs = await prisma.invoiceDelivery.findMany({ where: { status: 'QUEUED' }, orderBy: { createdAt: 'asc' }, take: 20 })
  for (const job of jobs) {
    const claimed = await prisma.invoiceDelivery.updateMany({ where: { id: job.id, status: 'QUEUED' }, data: { status: 'SENDING', claimedAt: new Date(), attempts: { increment: 1 } } })
    if (!claimed.count) continue
    try {
      const invoice = await prisma.$transaction(async tx => {
        try { await assertTransactionCapabilities(tx, { companyId: job.companyId, user: { userId: job.userId } }, 'invoices.read', 'invoices.write', 'exports.read') }
        catch (error) { if (error instanceof BusinessPermissionError) throw Object.assign(error, { code: 'ACCESS_REVOKED' }); throw error }
        return tx.invoice.findFirstOrThrow({ where: { id: job.invoiceId, companyId: job.companyId } })
      })
      if (invoice.status === 'CANCELLED') throw Object.assign(new Error('Document annulé avant envoi'), { code: 'DOCUMENT_CANCELLED' })
      if (!invoice.issuedPdf || createHash('sha256').update(invoice.issuedPdf).digest('hex') !== job.documentHash) throw Object.assign(new Error('Intégrité du PDF non confirmée'), { code: 'DOCUMENT_HASH_MISMATCH' })
      const result = await sendEmail({ to: job.recipient, subject: `Votre facture ${invoice.number}`, html: `<p>Votre facture ${escapeHtml(invoice.number)} est jointe en PDF.</p><p>Ce message transactionnel ne vous inscrit à aucune publicité.</p>`,
        messageId: `<creorga-${job.id}@${process.env.MAIL_MESSAGE_ID_DOMAIN || 'localhost.invalid'}>`,
        attachments: [{ filename: `facture-${invoice.number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`, content: Buffer.from(invoice.issuedPdf), contentType: 'application/pdf' }] })
      await prisma.invoiceDelivery.update({ where: { id: job.id }, data: { status: 'ACCEPTED', acceptedAt: new Date(), providerId: result.id } })
    } catch (error: any) {
      const code = String(error?.code || 'RESULT_UNKNOWN').slice(0, 80)
      const noSend = ['ACCESS_REVOKED', 'DOCUMENT_CANCELLED', 'DOCUMENT_HASH_MISMATCH', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND', 'EAUTH'].includes(code)
      await prisma.invoiceDelivery.update({ where: { id: job.id }, data: { status: noSend ? 'FAILED' : 'UNCERTAIN', lastErrorCode: code } })
    }
  }
}

export async function processInvoiceDeliveries(): Promise<void> { await deliveryTasks.run(performInvoiceDeliveries) }
export function pauseInvoiceDeliveries(): void { deliveryTasks.freeze() }
export function drainInvoiceDeliveries(): Promise<void> { return deliveryTasks.drain() }
