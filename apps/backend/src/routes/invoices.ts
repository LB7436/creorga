import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { createAvecNumero, NumerotationIndisponibleError } from '../lib/numerotation'
import { invoicePdf } from '../lib/invoice-pdf'
import { invoiceTransitionAllowed } from '../lib/invoice-status'
import { requireCapabilities } from '../lib/business-permission-transaction'
import { createHash } from 'node:crypto'
import { totalsFromHt } from '../lib/money'
import { invoiceDocument, DocumentValidationError } from '../lib/document-model'
import { enqueueInvoice, processInvoiceDeliveries, deliveryDto, DeliveryError } from '../lib/invoice-delivery'
import { z } from 'zod'
import { receiptInvoiceData, ReceiptInvoiceError } from '../lib/receipt-invoice'
import { createCreditNote, creditDto, CreditError } from '../lib/credit-notes'
import { createInvoiceDocumentLink, listInvoiceDocumentLinks, revokeInvoiceDocumentLink, DocumentLinkError } from '../lib/invoice-document-links'

const router = Router()
router.use((req, res, next) => {
  return requireCapabilities(['GET', 'HEAD'].includes(req.method) ? 'invoices.read' : 'invoices.write')(req, res, next)
})
class QuoteConflict extends Error {}

const QUOTE_STATUSES = new Set(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
const INVOICE_STATUSES = new Set(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'])

type DocumentLine = { description: string; quantity: number; unitPrice: number; taxRate: number; taxReason?: string | null }
const invoiceDto = (invoice: any) => {
  const { issuedPdf, issuedSnapshot, ...dto } = invoice
  if (issuedSnapshot?.customer && dto.customer) dto.customer = { ...dto.customer, ...issuedSnapshot.customer }
  return dto
}

function prepareLines(raw: unknown): { lines?: DocumentLine[]; subtotal?: number; taxAmount?: number; total?: number; error?: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'Ajoutez au moins une ligne au document' }
  if (raw.length > 200) return { error: 'Un document ne peut pas dépasser 200 lignes' }

  const lines: DocumentLine[] = []
  for (const value of raw) {
    const line = value as any
    const description = String(line?.description || '').trim()
    const quantity = Number(line?.quantity)
    const unitPrice = Number(line?.unitPrice)
    const taxRate = Number(line?.taxRate ?? 17)
    if (!description || description.length > 500) return { error: 'Chaque ligne doit avoir une description de 1 à 500 caractères' }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000) return { error: 'Quantité attendue : entre 0 et 100 000' }
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000) return { error: 'Prix unitaire attendu : de 0 à 1 000 000 €' }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return { error: 'Le taux de TVA doit être compris entre 0 et 100' }
    if (line.taxReason !== undefined && line.taxReason !== null && typeof line.taxReason !== 'string') return { error: 'Le motif fiscal doit être un texte.' }
    lines.push({ description, quantity, unitPrice, taxRate, ...(line.taxReason !== undefined ? { taxReason: typeof line.taxReason === 'string' ? line.taxReason.trim().slice(0, 500) || null : null } : {}) })
  }

  const amounts = totalsFromHt(lines.map(line => ({ price: line.unitPrice, qty: line.quantity, taxRate: line.taxRate })))
  return { lines, subtotal: amounts.baseCents / 100, taxAmount: amounts.taxCents / 100, total: amounts.totalCents / 100 }
}

async function validateCustomer(companyId: string, customerId: unknown): Promise<boolean> {
  if (customerId === undefined || customerId === null || customerId === '') return true
  if (typeof customerId !== 'string') return false
  return Boolean(await prisma.customer.findFirst({ where: { id: customerId, companyId }, select: { id: true } }))
}

function parseOptionalDate(value: unknown): { value?: Date | null; error?: string } {
  if (value === undefined) return { value: undefined }
  if (value === null || value === '') return { value: null }
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? { error: 'Date invalide' } : { value: date }
}

// La numérotation vit désormais dans `lib/numerotation.ts`, pour être partagée
// avec les avoirs et couverte par `lib/numerotation.test.ts`. Ré-exportée ici
// afin de ne casser aucun import existant.
export { createAvecNumero, NumerotationIndisponibleError }
const documentLinkFailure = (error: unknown, res: Response) => {
  if (error instanceof z.ZodError) return res.status(400).json({ message: 'Référence, durée (15 ou 60 minutes) ou motif de révocation invalide.' })
  if (error instanceof DocumentLinkError) return res.status(error.status).json({ message: error.message })
  return res.status(503).json({ message: 'Opération documentaire non confirmée. Reprenez avec la même référence.' })
}
router.get('/:id/document-links', requireCapabilities('invoices.read', 'exports.read'), async (req: any, res) => {
  try { return res.set('Cache-Control', 'private, no-store').json(await listInvoiceDocumentLinks(req.companyId, req.user.userId, req.params.id)) }
  catch (error) { return documentLinkFailure(error, res) }
})
router.post('/:id/document-links', async (req: any, res) => {
  try { return res.status(201).set('Cache-Control', 'private, no-store').json(await createInvoiceDocumentLink(req.companyId, req.user.userId, req.params.id, req.body)) }
  catch (error) { return documentLinkFailure(error, res) }
})
router.post('/:id/document-links/:linkId/revoke', async (req: any, res) => {
  try { return res.set('Cache-Control', 'private, no-store').json(await revokeInvoiceDocumentLink(req.companyId, req.user.userId, req.params.id, req.params.linkId, req.body)) }
  catch (error) { return documentLinkFailure(error, res) }
})
router.get('/deliveries/:id', async (req: any, res) => {
  const job = await prisma.invoiceDelivery.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
  if (!job) return res.status(404).json({ message: 'Envoi introuvable.' })
  res.set('Cache-Control', 'private, no-store').json(deliveryDto(job))
})
router.post('/:id/email', async (req: any, res) => {
  try {
    const job = await enqueueInvoice(req.companyId, req.user.userId, req.params.id, req.body)
    res.status(202).json(job)
    void processInvoiceDeliveries().catch(() => logger.warn('[documents] file conservée pour reprise'))
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Adresse ou référence d’envoi invalide.' })
    if (error instanceof DeliveryError) return res.status(error.status).json({ message: error.message })
    if ((error as any)?.code === 'P2002') return res.status(409).json({ message: 'Envoi déjà réservé : vérifiez sa référence.' })
    return res.status(503).json({ message: 'Envoi non confirmé.' })
  }
})

// ─── QUOTES ───────────────────────────────────────────

router.get('/quotes', async (req: any, res: Response) => {
  try {
    const { status, customerId } = req.query
    const where: any = { companyId: req.companyId }
    if (status) where.status = status
    if (customerId) where.customerId = customerId
    const quotes = await prisma.quote.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(quotes)
  } catch (error) {
    logger.error('Erreur GET /quotes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/quotes', async (req: any, res: Response) => {
  try {
    const { customerId, validUntil, notes, items } = req.body
    const prepared = prepareLines(items)
    if (prepared.error) { res.status(400).json({ message: prepared.error }); return }
    if (!(await validateCustomer(req.companyId, customerId))) { res.status(400).json({ message: "Le client n'appartient pas à cette entreprise" }); return }
    const validity = parseOptionalDate(validUntil)
    if (validity.error) { res.status(400).json({ message: 'Date de validité invalide' }); return }
    const quote = await createAvecNumero(req.companyId, 'QUO', (number) => prisma.quote.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        number,
        validUntil: validity.value ?? null,
        total: prepared.total!,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 10_000) || null : null,
        items: { create: prepared.lines!.map(({ taxReason, ...line }) => line) },
      },
      include: { customer: true, items: true },
    }))
    res.status(201).json(quote)
  } catch (error) {
    if (error instanceof NumerotationIndisponibleError) {
      res.status(503).json({ message: error.message })
      return
    }
    logger.error('Erreur POST /quotes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/quotes/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Devis non trouvé' }); return }
    if (existing.status === 'ACCEPTED') return res.status(409).json({ message: 'Un devis converti ne peut plus être modifié.' })
    const { customerId, validUntil, notes, status, items } = req.body
    if (status !== undefined && (!QUOTE_STATUSES.has(status) || status === 'ACCEPTED')) {
      res.status(400).json({ message: status === 'ACCEPTED' ? 'Convertissez le devis pour le marquer accepté' : 'Statut de devis invalide' })
      return
    }
    if (!(await validateCustomer(req.companyId, customerId))) { res.status(400).json({ message: "Le client n'appartient pas à cette entreprise" }); return }
    const validity = parseOptionalDate(validUntil)
    if (validity.error) { res.status(400).json({ message: 'Date de validité invalide' }); return }
    const prepared = items === undefined ? null : prepareLines(items)
    if (prepared?.error) { res.status(400).json({ message: prepared.error }); return }
    const quote = await prisma.quote.update({
      where: { id: req.params.id, status: existing.status, updatedAt: existing.updatedAt },
      data: {
        customerId: customerId === undefined ? existing.customerId : (customerId || null),
        validUntil: validity.value === undefined ? existing.validUntil : validity.value,
        notes: notes === undefined ? existing.notes : (typeof notes === 'string' ? notes.trim().slice(0, 10_000) || null : null),
        status: status ?? existing.status,
        total: prepared?.total ?? existing.total,
        ...(prepared && { items: { deleteMany: {}, create: prepared.lines!.map(({ taxReason, ...line }) => line) } }),
      },
      include: { customer: true, items: true },
    })
    res.json(quote)
  } catch (error) {
    logger.error('Erreur PUT /quotes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/quotes/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Devis non trouvé' }); return }
    if (existing.status === 'ACCEPTED') return res.status(409).json({ message: 'Un devis converti doit être conservé.' })
    await prisma.quote.delete({ where: { id: req.params.id, status: existing.status, updatedAt: existing.updatedAt } })
    res.json({ message: 'Devis supprimé' })
  } catch (error) {
    logger.error('Erreur DELETE /quotes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/quotes/:id/convert', async (req: any, res: Response) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { items: true },
    })
    if (!quote) { res.status(404).json({ message: 'Devis non trouvé' }); return }
    if (quote.status === 'ACCEPTED' && quote.convertedInvoiceId) {
      const invoice = await prisma.invoice.findFirst({ where: { companyId: req.companyId, id: quote.convertedInvoiceId }, include: { customer: true, items: true } })
      if (!invoice) return res.status(409).json({ message: 'Lien de conversion incohérent : rapprochement responsable requis.' })
      return res.json(invoice)
    }

    if (!['DRAFT', 'SENT'].includes(quote.status)) {
      res.status(409).json({ message: 'Ce devis a déjà été converti en facture' })
      return
    }

    // Un devis déjà accepté a été converti et ne peut pas générer une seconde
    // facture depuis l'interface ou l'API.

    // Les montants sont arrondis au centime : 47,617 € n'est pas une somme
    // d'argent, et l'écart se propagerait au récapitulatif TVA.
    const amounts = totalsFromHt(quote.items.map(i => ({ price: i.unitPrice, qty: i.quantity, taxRate: i.taxRate })))
    const subtotal = amounts.baseCents / 100, taxAmount = amounts.taxCents / 100
    const invoice = await createAvecNumero(req.companyId, 'INV', (number) => prisma.$transaction(async (tx) => {
      const locked = await tx.quote.updateMany({
        where: { id: quote.id, companyId: req.companyId, status: { in: ['DRAFT', 'SENT'] }, updatedAt: quote.updatedAt },
        data: { status: 'ACCEPTED' },
      })
      if (locked.count !== 1) throw new QuoteConflict()
      const created = await tx.invoice.create({
      data: {
        companyId: req.companyId,
        customerId: quote.customerId,
        number,
        subtotal,
        taxAmount,
        total: amounts.totalCents / 100,
        notes: quote.notes,
        items: {
          create: quote.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
          })),
        },
      },
      include: { customer: true, items: true },
      })
      await tx.quote.update({ where: { id: quote.id }, data: { convertedInvoiceId: created.id, convertedAt: new Date() } })
      return created
    }))
    res.status(201).json(invoice)
  } catch (error) {
    if (error instanceof NumerotationIndisponibleError) {
      res.status(503).json({ message: error.message })
      return
    }
    if (error instanceof QuoteConflict) return res.status(409).json({ message: 'Ce devis a changé ou a déjà été converti. Aucune deuxième facture créée.' })
    logger.error('Erreur POST /quotes/:id/convert:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── INVOICES ─────────────────────────────────────────

router.post('/:id/credit-notes', async (req: any, res) => {
  res.set('Cache-Control', 'private, no-store')
  try {
    const result = await createCreditNote(req.companyId, req.user.userId, req.params.id, req.body)
    res.status(result.created ? 201 : 200).json(creditDto(result.credit))
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Référence, montant en centimes et motif de cinq caractères minimum requis.' })
    if (error instanceof CreditError) return res.status(error.status).json({ message: error.message, ...error.notIssuedProof })
    if (error instanceof NumerotationIndisponibleError) return res.status(503).json({ message: error.message })
    logger.warn('[documents] avoir non confirmé')
    res.status(503).json({ message: 'Émission non confirmée. Réessayez la même référence avant toute nouvelle demande.' })
  }
})
router.get('/:id/credit-notes', requireCapabilities('invoices.read'), async (req: any, res) => {
  try {
    if (!await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.companyId } })) return res.status(404).json({ message: 'Facture introuvable.' })
    res.set('Cache-Control', 'private, no-store').json((await prisma.creditNote.findMany({ where: { invoiceId: req.params.id, companyId: req.companyId }, orderBy: { createdAt: 'asc' } })).map(creditDto))
  } catch { res.status(503).json({ message: 'Avoirs indisponibles.' }) }
})
router.get('/credit-notes/:id/pdf', requireCapabilities('invoices.read'), async (req: any, res) => {
  try {
    const credit = await prisma.creditNote.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!credit) return res.status(404).json({ message: 'Avoir introuvable.' })
    const format = z.enum(['A4', '58', '80']).default('A4').parse(req.query.format)
    if (createHash('sha256').update(credit.pdf).digest('hex') !== credit.pdfHash) return res.status(503).json({ message: 'Intégrité de l’avoir non confirmée.' })
    const bytes = format === 'A4' ? credit.pdf : await invoicePdf(credit.snapshot as any, format)
    res.set('Cache-Control', 'private, no-store').set('Content-Disposition', `attachment; filename="avoir-${credit.number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf"`).type('pdf').send(bytes)
  } catch { res.status(503).json({ message: 'PDF de l’avoir indisponible.' }) }
})

router.get('/pos-receipts', requireCapabilities('invoices.read'), async (req: any, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : ''
    if (search && !/^\d+$/.test(search)) return res.status(400).json({ message: 'Recherchez par numéro de ticket.' })
    const number = search ? Number(search) : undefined
    if (number !== undefined && (!Number.isSafeInteger(number) || number > 2147483647)) return res.status(400).json({ message: 'Numéro de ticket invalide.' })
    const sales = await prisma.posSale.findMany({ where: { companyId: req.companyId, ...(number !== undefined ? { number } : {}) },
      orderBy: { number: 'desc' }, take: 100, include: { invoice: { select: { id: true, number: true } } } })
    res.set('Cache-Control', 'private, no-store').json(sales.map(s => ({ id: s.id, number: s.number, createdAt: s.createdAt,
      tableName: (s.snapshot as any)?.tableName || '', invoice: s.invoice })))
  } catch { res.status(503).json({ message: 'Tickets indisponibles.' }) }
})

router.post('/from-pos/:saleId', async (req: any, res) => {
  try {
    const input = z.object({ customerId: z.string().min(1).max(200) }).strict().parse(req.body)
    const result = await createAvecNumero(req.companyId, 'INV', number => prisma.$transaction(async tx => {
      // Même ticket = une seule pièce, y compris après perte de réponse ou clôture du journal.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${req.companyId}), hashtext(${`receipt-invoice:${req.params.saleId}`}))::text`
      const sale = await tx.posSale.findFirst({ where: { id: req.params.saleId, companyId: req.companyId } })
      if (!sale) throw new ReceiptInvoiceError(404, 'Ticket introuvable dans cette société.')
      const customer = await tx.customer.findFirst({ where: { id: input.customerId, companyId: req.companyId } })
      if (!customer) throw new ReceiptInvoiceError(400, 'Le client n’appartient pas à cette société.')
      if (!customer.businessName?.trim() || !customer.address?.trim()) throw new ReceiptInvoiceError(422, 'Complétez le nom de société et l’adresse du client avant de créer la facture.')
      const existing = await tx.invoice.findUnique({ where: { sourcePosSaleId: sale.id }, include: { customer: true, items: true } })
      if (existing) {
        if (existing.customerId !== customer.id) throw new ReceiptInvoiceError(409, 'Ce ticket possède déjà une facture pour un autre client. Consultez la pièce existante.')
        return { invoice: existing, created: false }
      }
      const data = receiptInvoiceData(sale)
      const invoice = await tx.invoice.create({ data: { ...data, companyId: req.companyId, number, customerId: customer.id }, include: { customer: true, items: true } })
      return { invoice, created: true }
    }, { maxWait: 15000, timeout: 15000 }))
    res.status(result.created ? 201 : 200).json(invoiceDto(result.invoice))
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Choisissez un client société. Les lignes et montants viennent uniquement du ticket.' })
    if (error instanceof ReceiptInvoiceError) return res.status(error.status).json({ message: error.message })
    if (error instanceof NumerotationIndisponibleError) return res.status(503).json({ message: error.message })
    logger.warn('[documents] création depuis ticket non confirmée')
    res.status(503).json({ message: 'Création non confirmée : réessayez avec le même ticket, sans créer une facture manuelle en doublon.' })
  }
})

router.get('/', async (req: any, res: Response) => {
  try {
    const { status, customerId, startDate, endDate } = req.query
    const where: any = { companyId: req.companyId }
    if (status) where.status = status
    if (customerId) where.customerId = customerId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) where.createdAt.lte = new Date(endDate as string)
    }
    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(invoices.map(invoiceDto))
  } catch (error) {
    logger.error('Erreur GET /invoices:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/', async (req: any, res: Response) => {
  try {
    const { customerId, dueDate, notes, orderId, items, serviceDate, documentMode = 'AUTO' } = req.body
    if (!['AUTO', 'COMPLETE'].includes(documentMode)) return res.status(400).json({ message: 'Mode de document invalide.' })
    if (orderId && !await prisma.order.findFirst({ where: { id: String(orderId), companyId: req.companyId }, select: { id: true } })) {
      return res.status(400).json({ message: 'Commande introuvable dans cette société' })
    }
    const prepared = prepareLines(items)
    if (prepared.error) { res.status(400).json({ message: prepared.error }); return }
    if (!(await validateCustomer(req.companyId, customerId))) { res.status(400).json({ message: "Le client n'appartient pas à cette entreprise" }); return }
    const deadline = parseOptionalDate(dueDate)
    if (deadline.error) { res.status(400).json({ message: "Date d'échéance invalide" }); return }
    const service = parseOptionalDate(serviceDate)
    if (service.error) return res.status(400).json({ message: 'Date de prestation invalide.' })
    const invoice = await createAvecNumero(req.companyId, 'INV', (number) => prisma.invoice.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        number,
        dueDate: deadline.value ?? null,
        serviceDate: service.value ?? null, documentMode, currency: req.company.currency || 'EUR',
        subtotal: prepared.subtotal!,
        taxAmount: prepared.taxAmount!,
        total: prepared.total!,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 10_000) || null : null,
        orderId: orderId || null,
        items: { create: prepared.lines! },
      },
      include: { customer: true, items: true },
    }))
    res.status(201).json(invoice)
  } catch (error) {
    if (error instanceof NumerotationIndisponibleError) {
      res.status(503).json({ message: error.message })
      return
    }
    logger.error('Erreur POST /invoices:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

/**
 * Facture unique.
 *
 * Absente jusqu'ici alors que le crochet `useInvoice` la supposait : un GET sur
 * `/invoices/<id>` ne correspondait à aucune route et repartait en 404.
 * Déclarée après le bloc `/quotes`, elle ne l'éclipse donc pas.
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const facture = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true, items: true },
    })
    if (!facture) {
      res.status(404).json({ message: 'Facture introuvable' })
      return
    }
    res.json(invoiceDto(facture))
  } catch (error) {
    logger.error('Erreur GET /invoices/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Facture non trouvée' }); return }
    if (existing.status !== 'DRAFT') return res.status(409).json({ message: 'Seule une facture brouillon peut être modifiée. Une facture émise doit être conservée.' })
    if (existing.sourcePosSaleId && Object.keys(req.body).some(key => !['customerId', 'dueDate', 'notes'].includes(key))) return res.status(409).json({ message: 'Les lignes, dates et montants issus du ticket sont figés. Seuls client, échéance et notes restent modifiables avant émission.' })
    const { customerId, dueDate, notes, items, serviceDate, documentMode } = req.body
    if (documentMode !== undefined && !['AUTO', 'COMPLETE'].includes(documentMode)) return res.status(400).json({ message: 'Mode de document invalide.' })
    if (!(await validateCustomer(req.companyId, customerId))) { res.status(400).json({ message: "Le client n'appartient pas à cette entreprise" }); return }
    const deadline = parseOptionalDate(dueDate)
    if (deadline.error) { res.status(400).json({ message: "Date d'échéance invalide" }); return }
    const service = parseOptionalDate(serviceDate)
    if (service.error) return res.status(400).json({ message: 'Date de prestation invalide.' })
    const prepared = items === undefined ? null : prepareLines(items)
    if (prepared?.error) { res.status(400).json({ message: prepared.error }); return }
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id, status: 'DRAFT', updatedAt: existing.updatedAt },
      data: {
        customerId: customerId === undefined ? existing.customerId : (customerId || null),
        dueDate: deadline.value === undefined ? existing.dueDate : deadline.value,
        serviceDate: service.value === undefined ? existing.serviceDate : service.value,
        documentMode: documentMode ?? existing.documentMode,
        notes: notes === undefined ? existing.notes : (typeof notes === 'string' ? notes.trim().slice(0, 10_000) || null : null),
        subtotal: prepared?.subtotal ?? existing.subtotal,
        taxAmount: prepared?.taxAmount ?? existing.taxAmount,
        total: prepared?.total ?? existing.total,
        ...(prepared && { items: { deleteMany: {}, create: prepared.lines! } }),
      },
      include: { customer: true, items: true },
    })
    res.json(invoiceDto(invoice))
  } catch (error) {
    logger.error('Erreur PUT /invoices/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/:id/status', async (req: any, res: Response) => {
  try {
    if (!INVOICE_STATUSES.has(req.body?.status)) {
      res.status(400).json({ message: 'Statut de facture invalide' })
      return
    }
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.companyId }, include: { company: true, customer: true, items: true } })
    if (!existing) { res.status(404).json({ message: 'Facture non trouvée' }); return }
    if (existing.sourcePosSaleId && !['DRAFT', 'PAID', 'CANCELLED'].includes(req.body.status)) return res.status(409).json({ message: 'Cette vente a déjà un règlement déclaré en caisse. Émettez la facture avec ce statut, sans nouvelle créance.' })
    if (!invoiceTransitionAllowed(existing.status, req.body.status)) {
      return res.status(409).json({ message: 'Transition refusée : une facture payée ou annulée ne peut pas redevenir un brouillon.' })
    }
    let issue: any = {}
    if (existing.status === 'DRAFT' && req.body.status !== 'CANCELLED' && req.body.status !== 'DRAFT') {
      const issuedAt = new Date(), snapshot = invoiceDocument(existing, issuedAt)
      const bytes = await invoicePdf(snapshot)
      issue = { issuedAt, issuedSnapshot: JSON.parse(JSON.stringify(snapshot)), issuedPdf: bytes, issuedPdfHash: createHash('sha256').update(bytes).digest('hex') }
    }
    const invoice = await prisma.$transaction(async tx => {
      if (issue.issuedAt) {
        const company = await tx.company.findUniqueOrThrow({ where: { id: req.companyId } })
        if (company.updatedAt.getTime() !== existing.company.updatedAt.getTime()) throw new QuoteConflict('La fiche société a changé pendant l’émission.')
        if (existing.customer) {
          const customer = await tx.customer.findUniqueOrThrow({ where: { id: existing.customer.id } })
          if (customer.updatedAt.getTime() !== existing.customer.updatedAt.getTime()) throw new QuoteConflict('La fiche client a changé pendant l’émission.')
        }
      }
      return tx.invoice.update({ where: { id: req.params.id, status: existing.status, updatedAt: existing.updatedAt }, data: { status: req.body.status, ...issue }, include: { customer: true, items: true } })
    })
    res.json(invoiceDto(invoice))
  } catch (error) {
    if (error instanceof DocumentValidationError) return res.status(422).json({ message: error.message, fields: error.fields })
    if (error instanceof QuoteConflict || (error as any)?.code === 'P2025') return res.status(409).json({ message: 'Le document ou une fiche a changé : rechargez avant émission.' })
    logger.error('Erreur PUT /invoices/:id/status:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.get('/:id/pdf', async (req: any, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true, items: true, company: true },
    })
    if (!invoice) { res.status(404).json({ message: 'Facture non trouvée' }); return }
    const format = String(req.query.format || 'A4')
    if (!['A4', '58', '80'].includes(format)) return res.status(400).json({ message: 'Format attendu : A4, 58 ou 80.' })
    let bytes: Buffer
    if (invoice.issuedPdf && format === 'A4') {
      bytes = Buffer.from(invoice.issuedPdf)
      if (createHash('sha256').update(bytes).digest('hex') !== invoice.issuedPdfHash) return res.status(503).json({ message: 'Intégrité du PDF non confirmée : restauration ou vérification nécessaire.' })
      res.setHeader('X-Creorga-Document-State', 'original-frozen')
      res.setHeader('X-Creorga-Document-Hash', invoice.issuedPdfHash!)
    } else {
      const document = invoice.issuedSnapshot ? invoice.issuedSnapshot as any : invoiceDocument(invoice)
      if (invoice.status !== 'DRAFT' && !invoice.issuedSnapshot) document.reconstructed = true
      bytes = await invoicePdf(document, format as 'A4' | '58' | '80')
      res.setHeader('X-Creorga-Document-State', invoice.issuedSnapshot ? 'frozen-content-render' : invoice.status === 'DRAFT' ? 'draft' : 'reconstructed')
    }
    const filename = `facture-${invoice.number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.send(bytes)
  } catch (error) {
    logger.error('Erreur GET /invoices/:id/pdf:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
