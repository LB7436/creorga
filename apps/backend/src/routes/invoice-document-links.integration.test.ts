import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createHash, randomUUID } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import invoices from './invoices'
import documentDownload from './invoice-document-download'

const app = express()
app.use(express.json())
app.use('/api/invoices', authenticate, requireCompany, invoices)
app.use('/api/document-download', documentDownload)
const companyId = 'integration-document-links', otherId = 'integration-document-links-other'
const ownerId = 'integration-document-links-owner', employeeId = 'integration-document-links-employee'
let ownerToken: string, employeeToken: string, invoiceId: string
const auth = (r: any, token = ownerToken, company = companyId) => r.set('Authorization', 'Bearer ' + token).set('x-company-id', company)
const createLink = async (data: any = {}) => (await auth(request(app).post(`/api/invoices/${invoiceId}/document-links`)).send({ requestId: randomUUID(), ttlMinutes: 15, ...data }).expect(201)).body
const download = (token: string) => request(app).post('/api/document-download').send({ token }).buffer(true).parse((res: any, callback: any) => {
  const chunks: Buffer[] = []; res.on('data', (chunk: Buffer) => chunks.push(chunk)); res.on('end', () => callback(null, Buffer.concat(chunks)))
})

describe('Liens documentaires : capacité limitée au PDF historique', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw Error('Base de tests obligatoire')
    await prisma.company.createMany({ data: [{ id: companyId, name: 'Liens FICTIFS', address: 'Adresse de laboratoire' }, { id: otherId, name: 'Autre société FICTIVE' }] })
    await prisma.user.createMany({ data: [ownerId, employeeId].map((id) => ({ id, email: id + '@fixture.invalid', password: 'unused', firstName: 'Recette', lastName: 'FICTIVE' })) })
    await prisma.userCompany.createMany({ data: [{ userId: ownerId, companyId, role: 'OWNER' }, { userId: ownerId, companyId: otherId, role: 'MANAGER' }, { userId: employeeId, companyId, role: 'EMPLOYEE' }] })
    ownerToken = jwt.sign({ userId: ownerId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
    employeeToken = jwt.sign({ userId: employeeId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
    invoiceId = (await auth(request(app).post('/api/invoices')).send({ items: [{ description: 'Prestation FICTIVE', quantity: 1, unitPrice: 10, taxRate: 17 }] }).expect(201)).body.id
    await auth(request(app).put(`/api/invoices/${invoiceId}/status`)).send({ status: 'SENT' }).expect(200)
  })
  afterAll(async () => {
    // Uniquement les fixtures créées dans cette suite, jamais une base réinitialisée.
    await prisma.invoiceDocumentLinkEvent.deleteMany({ where: { companyId } })
    await prisma.invoiceDocumentLink.deleteMany({ where: { companyId } })
    await prisma.invoice.deleteMany({ where: { companyId: { in: [companyId, otherId] } } })
    await prisma.userCompany.deleteMany({ where: { userId: { in: [ownerId, employeeId] } } })
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, employeeId] } } })
    await prisma.company.deleteMany({ where: { id: { in: [companyId, otherId] } } })
    await prisma.$disconnect()
  })
  it('crée explicitement une capacité courte sur un original émis, sans changer la facture', async () => {
    const before = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })
    const started = Date.now()
    const result = await auth(request(app).post(`/api/invoices/${invoiceId}/document-links`)).send({ requestId: randomUUID(), ttlMinutes: 15 }).expect(201)
    expect(result.body.capability).toMatch(/^v1\.[a-f0-9-]{36}\.\d+\.[A-Za-z0-9_-]{43}$/)
    expect(result.body.downloadPath).toBe('/api/document-download')
    expect(new Date(result.body.expiresAt).getTime()).toBeGreaterThanOrEqual(started + 899000)
    expect(new Date(result.body.expiresAt).getTime()).toBeLessThan(Date.now() + 901000)
    expect(result.body.documentHash).toBe(before.issuedPdfHash)
    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })
    expect(after.updatedAt).toEqual(before.updatedAt)
    expect(Buffer.compare(after.issuedPdf!, before.issuedPdf!)).toBe(0)
  })
  it('refuse la création sans connexion et au salarié, même avec une facture connue', async () => {
    const body = { requestId: randomUUID(), ttlMinutes: 15 }
    await request(app).post(`/api/invoices/${invoiceId}/document-links`).send(body).expect(401)
    await auth(request(app).post(`/api/invoices/${invoiceId}/document-links`), employeeToken).send(body).expect(403)
  })
  it('ne crée pas un lien vers une facture d’une autre société active du même responsable', async () => {
    await auth(request(app).post(`/api/invoices/${invoiceId}/document-links`), ownerToken, otherId).send({ requestId: randomUUID(), ttlMinutes: 15 }).expect(404)
  })
  it('déduplique douze créations simultanées et une reprise réseau sans prolonger le lien', async () => {
    const requestId = randomUUID(), body = { requestId, ttlMinutes: 15 }
    const responses = await Promise.all(Array.from({ length: 12 }, () => auth(request(app).post(`/api/invoices/${invoiceId}/document-links`)).send(body)))
    expect(responses.every(response => response.status === 201)).toBe(true)
    expect(new Set(responses.map(response => response.body.capability)).size).toBe(1)
    expect(new Set(responses.map(response => response.body.expiresAt)).size).toBe(1)
    expect(await prisma.invoiceDocumentLink.count({ where: { id: requestId } })).toBe(1)
    expect(await prisma.invoiceDocumentLinkEvent.count({ where: { linkId: requestId, action: 'CREATED' } })).toBe(1)
    await auth(request(app).post(`/api/invoices/${invoiceId}/document-links`)).send({ ...body, ttlMinutes: 60 }).expect(409)
  })
  it('normalise un UUID majuscule accepté pour ne jamais créer une capacité inutilisable', async () => {
    const requestId = randomUUID().toUpperCase(), link = await createLink({ requestId })
    await download(link.capability).expect(200)
    const replay = await createLink({ requestId: requestId.toLowerCase() })
    expect(link.id).toBe(requestId.toLowerCase())
    expect(link.capability === replay.capability).toBe(true)
  })
  it('télécharge deux fois exactement le vrai PDF original sans login ni changement de facture', async () => {
    const link = await createLink(), before = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })
    for (let i = 0; i < 2; i++) {
      const response = await download(link.capability).expect(200).expect('Content-Type', /application\/pdf/).expect('Cache-Control', 'private, no-store')
      expect(Buffer.compare(response.body, before.issuedPdf!)).toBe(0)
      expect(createHash('sha256').update(response.body).digest('hex')).toBe(before.issuedPdfHash)
      expect((await PDFDocument.load(response.body)).getPageCount()).toBeGreaterThan(0)
    }
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })).updatedAt).toEqual(before.updatedAt)
    const listed = (await auth(request(app).get(`/api/invoices/${invoiceId}/document-links`)).expect(200)).body
    expect(listed.some((entry: any) => entry.id === link.id)).toBe(true)
    expect(JSON.stringify(listed)).not.toContain(link.capability)
  })
  it('refuse l’altération du document et les paramètres supplémentaires sans octets PDF', async () => {
    const link = await createLink(), parts = link.capability.split('.')
    parts[1] = randomUUID()
    for (const token of [parts.join('.'), link.capability.slice(0, -2) + 'xx']) {
      const response = await download(token).expect(404)
      expect(response.headers['content-type']).not.toContain('application/pdf')
      expect(response.body.subarray(0, 5).toString()).not.toBe('%PDF-')
    }
    await request(app).post('/api/document-download').send({ token: link.capability, invoiceId: 'autre', companyId: otherId }).expect(400)
    await request(app).post('/api/document-download?token=interdit').send({ token: link.capability }).expect(400)
  })
  it('ne transforme jamais la capacité PDF en identité Bearer de session', async () => {
    const link = await createLink()
    await auth(request(app).get('/api/invoices'), link.capability).expect(401)
    await request(app).post('/api/document-download').send({ token: ownerToken }).expect(404)
  })
  it('refuse à l’échéance décidée par le serveur, indépendamment de l’horloge du navigateur', async () => {
    const link = await createLink()
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date(link.expiresAt))
      const response = await download(link.capability).expect(404)
      expect(response.headers['content-type']).not.toContain('application/pdf')
      expect(response.body.subarray(0, 5).toString()).not.toBe('%PDF-')
      expect(await prisma.invoiceDocumentLinkEvent.count({ where: { linkId: link.id, action: 'DOWNLOADED' } })).toBe(0)
    } finally { vi.useRealTimers() }
  })
  it('révoque avec droits et motif, conserve le premier événement et bloque le rejeu', async () => {
    const link = await createLink(), url = `/api/invoices/${invoiceId}/document-links/${link.id}/revoke`
    await auth(request(app).post(url), employeeToken).send({ reason: 'Refus fictif' }).expect(403)
    await auth(request(app).post(url), ownerToken, otherId).send({ reason: 'Autre société fictive' }).expect(404)
    await auth(request(app).post(url)).send({ reason: '' }).expect(400)
    const result = await auth(request(app).post(url)).send({ reason: 'Destinataire fictif changé' }).expect(200)
    expect(result.body.revokedAt).toBeTruthy()
    expect(result.body.revocationReason).toBe('Destinataire fictif changé')
    const again = await auth(request(app).post(url)).send({ reason: 'Deuxième demande fictive' }).expect(200)
    expect(again.body.revokedAt).toBe(result.body.revokedAt)
    expect(again.body.revocationReason).toBe('Destinataire fictif changé')
    await download(link.capability).expect(404)
    expect(await prisma.invoiceDocumentLinkEvent.count({ where: { linkId: link.id, action: 'REVOKED' } })).toBe(1)
  })
  it('sérialise téléchargement/révocation et refuse toutes les demandes après révocation confirmée', async () => {
    const link = await createLink()
    const simultaneous = await Promise.all([
      ...Array.from({ length: 8 }, () => download(link.capability)),
      auth(request(app).post(`/api/invoices/${invoiceId}/document-links/${link.id}/revoke`)).send({ reason: 'Fin de recette concurrente' }),
    ])
    expect(simultaneous.at(-1)!.status).toBe(200)
    expect(simultaneous.slice(0, -1).every(response => [200, 404].includes(response.status))).toBe(true)
    expect(await prisma.invoiceDocumentLinkEvent.count({ where: { linkId: link.id, action: 'DOWNLOADED' } })).toBe(simultaneous.slice(0, -1).filter(response => response.status === 200).length)
    const after = await Promise.all(Array.from({ length: 8 }, () => download(link.capability)))
    expect(after.every(response => response.status === 404 && !response.headers['content-type'].includes('application/pdf'))).toBe(true)
  })
  it('une reprise de création concurrente à sa révocation ne renouvelle ni durée ni capacité', async () => {
    const requestId = randomUUID(), link = await createLink({ requestId })
    const responses = await Promise.all([
      ...Array.from({ length: 8 }, () => auth(request(app).post(`/api/invoices/${invoiceId}/document-links`)).send({ requestId, ttlMinutes: 15 })),
      auth(request(app).post(`/api/invoices/${invoiceId}/document-links/${link.id}/revoke`)).send({ reason: 'Révocation pendant reprise FICTIVE' }),
    ])
    expect(responses[responses.length - 1].status).toBe(200)
    expect(responses.slice(0, -1).every(response => response.status === 410 || (response.status === 201 && response.body.capability === link.capability && response.body.expiresAt === link.expiresAt))).toBe(true)
    await auth(request(app).post(`/api/invoices/${invoiceId}/document-links`)).send({ requestId, ttlMinutes: 15 }).expect(410)
    await download(link.capability).expect(404)
    expect(await prisma.invoiceDocumentLinkEvent.count({ where: { linkId: link.id, action: 'CREATED' } })).toBe(1)
    expect(await prisma.invoiceDocumentLinkEvent.count({ where: { linkId: link.id, action: 'REVOKED' } })).toBe(1)
  })
  it('refuse après retrait de l’adhésion ou du rôle de l’auteur sans déléguer ses droits au porteur', async () => {
    const link = await createLink(), where = { userId_companyId: { userId: ownerId, companyId } }
    try {
      await prisma.userCompany.update({ where, data: { isActive: false } })
      await download(link.capability).expect(403)
      await prisma.userCompany.update({ where, data: { isActive: true, role: 'EMPLOYEE' } })
      await download(link.capability).expect(403)
      await auth(request(app).get(`/api/invoices/${invoiceId}/document-links`)).expect(403)
    } finally { await prisma.userCompany.update({ where, data: { isActive: true, role: 'OWNER' } }) }
  })
  it('ne partage ni brouillon, ni PDF incohérent, ni durée non approuvée', async () => {
    const draft = (await auth(request(app).post('/api/invoices')).send({ items: [{ description: 'Brouillon FICTIF', quantity: 1, unitPrice: 1, taxRate: 17 }] }).expect(201)).body
    await auth(request(app).post(`/api/invoices/${draft.id}/document-links`)).send({ requestId: randomUUID(), ttlMinutes: 15 }).expect(422)
    const original = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })
    const corruptFixture = await prisma.invoice.create({ data: { companyId, number: 'FICTIF-CORROMPU-' + randomUUID(), issuedAt: new Date(), status: 'SENT', issuedPdf: original.issuedPdf, issuedPdfHash: '0'.repeat(64) } })
    await auth(request(app).post(`/api/invoices/${corruptFixture.id}/document-links`)).send({ requestId: randomUUID(), ttlMinutes: 15 }).expect(503)
    for (const ttlMinutes of [0, 1, 30, 61, true, '15']) await auth(request(app).post(`/api/invoices/${invoiceId}/document-links`)).send({ requestId: randomUUID(), ttlMinutes }).expect(400)
    expect(await prisma.invoiceDocumentLink.count({ where: { invoiceId: { in: [draft.id, corruptFixture.id] } } })).toBe(0)
  })
  it('la relation en base interdit elle-même une facture étrangère à la société du lien', async () => {
    await expect(prisma.invoiceDocumentLink.create({ data: { id: randomUUID(), companyId: otherId, invoiceId, actorId: ownerId, requestHash: 'fixture', documentHash: 'a'.repeat(64), createdAt: new Date('2026-10-16T12:00:00Z'), expiresAt: new Date('2026-10-16T12:15:00Z') } })).rejects.toMatchObject({ code: 'P2003' })
  })
  it.each([
    { label: 'motif NULL', date: new Date(), actor: ownerId, reason: null },
    { label: 'auteur NULL', date: new Date(), actor: null, reason: 'Motif FICTIF' },
    { label: 'état partiel sans date', date: null, actor: ownerId, reason: 'Motif FICTIF' },
  ])('la base refuse une révocation incomplète : $label', async ({ date, actor, reason }) => {
    const link = await createLink()
    await expect(prisma.$executeRaw`UPDATE "InvoiceDocumentLink" SET "revokedAt" = ${date}, "revokedBy" = ${actor}, "revocationReason" = ${reason} WHERE "id" = ${link.id}`).rejects.toMatchObject({ code: 'P2010', meta: { code: '23514' } })
  })
  it('sert une page privée sans dépendance tierce et n’accepte pas le secret dans une query', async () => {
    const response = await request(app).get('/api/document-download').expect(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    expect(response.headers['content-security-policy']).toContain("default-src 'none'")
    await request(app).get('/api/document-download?token=interdit').expect(400)
  })
})
