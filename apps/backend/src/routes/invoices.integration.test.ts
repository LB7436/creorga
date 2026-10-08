import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { PDFDocument } from 'pdf-lib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import invoices from './invoices'
import companies from './companies'

const app = express(); app.use(express.json()); app.use('/api/invoices', deviceOrUserAuth, requireCompany, invoices)
app.use('/api/companies', companies)
const companyId = 'integration-invoices', otherId = 'integration-invoices-other', userId = 'integration-invoices-owner'
let token: string
const auth = (r: any) => r.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
const line = { description: 'Prestation fictive', quantity: 1, unitPrice: 10, taxRate: 17 }
describe('Documents : calcul exact et émission historique', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base de tests obligatoire')
    await prisma.company.createMany({ data: [{ id: companyId, name: 'Émetteur historique fictif', legalName: 'Société fictive', address: 'Adresse de recette uniquement', vatNumber: 'TVA-RECETTE' }, { id: otherId, name: 'Autre société fictive' }] })
    await prisma.user.create({ data: { id: userId, email: 'invoices-test@localhost.invalid', firstName: 'Test', lastName: 'Owner', password: 'unused' } })
    await prisma.userCompany.create({ data: { userId, companyId, role: 'OWNER' } })
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
  })
  afterAll(async () => {
    await prisma.invoice.deleteMany({ where: { companyId: { in: [companyId, otherId] } } })
    await prisma.customer.deleteMany({ where: { companyId } })
    await prisma.userCompany.deleteMany({ where: { userId } }); await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.company.deleteMany({ where: { id: { in: [companyId, otherId] } } }); await prisma.$disconnect()
  })
  it('arrondit par taux sans inventer un centime entre deux groupes', async () => {
    // 0,03 HT à 17 % génère réellement 1 ct. Le cas inter-groupes correct est :
    // 0,02 HT à 17 % et 0,03 HT à 8 %, chacun arrondi à 0 ct de TVA.
    const result = await auth(request(app).post('/api/invoices')).send({ items: [{ ...line, unitPrice: 0.02 }, { ...line, unitPrice: 0.03, taxRate: 8 }] }).expect(201)
    expect({ ht: result.body.subtotal, tva: result.body.taxAmount, total: result.body.total }).toEqual({ ht: 0.05, tva: 0, total: 0.05 })
  })
  it('un PDF émis ne change pas après la modification de la société', async () => {
    const created = await auth(request(app).post('/api/invoices')).send({ items: [line] }).expect(201)
    await auth(request(app).put(`/api/invoices/${created.body.id}/status`)).send({ status: 'SENT' }).expect(200)
    const before = await prisma.invoice.findUniqueOrThrow({ where: { id: created.body.id } }) as any
    expect(before.issuedPdf).toBeTruthy(); expect(before.issuedSnapshot).toBeTruthy()
    const pdf = await PDFDocument.load(before.issuedPdf)
    await prisma.company.update({ where: { id: companyId }, data: { name: 'Nouveau nom fictif', address: 'Nouvelle adresse de recette' } })
    const download = await auth(request(app).get(`/api/invoices/${created.body.id}/pdf`)).buffer(true).parse((res: any, callback: any) => {
      const chunks: Buffer[] = []; res.on('data', (chunk: Buffer) => chunks.push(chunk)); res.on('end', () => callback(null, Buffer.concat(chunks)))
    }).expect(200).expect('Content-Type', /application\/pdf/)
    expect(Buffer.compare(download.body, before.issuedPdf)).toBe(0)
    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: created.body.id } }) as any
    expect(after.issuedPdfHash).toBe(before.issuedPdfHash)
    expect(Buffer.compare(before.issuedPdf, after.issuedPdf)).toBe(0)
    expect(pdf.getAuthor()).toBe('Émetteur historique fictif')
  }, 60000)
  it('n’émet pas une facture complète sans les mentions de société nécessaires', async () => {
    const created = await auth(request(app).post('/api/invoices')).send({ items: [{ ...line, unitPrice: 100 }] }).expect(201)
    const result = await auth(request(app).put(`/api/invoices/${created.body.id}/status`)).send({ status: 'SENT' })
    expect(result.status).toBe(422)
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: created.body.id } })).status).toBe('DRAFT')
  })
  it('un document d’une autre société est inaccessible', async () => {
    const doc = await prisma.invoice.create({ data: { companyId: otherId, number: 'OTHER-TEST', total: 1 } })
    await auth(request(app).get(`/api/invoices/${doc.id}/pdf`)).expect(404)
  })
  it('vingt créations concurrentes obtiennent vingt numéros différents', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post('/api/invoices')).send({ items: [line] })))
    expect(results.every(r => r.status === 201)).toBe(true)
    expect(new Set(results.map(r => r.body.number)).size).toBe(20)
  }, 60000)
  it('la fiche légale sauvegardée par le formulaire est utilisée pour émettre la facture société', async () => {
    const legalProfile = { legalForm: 'Forme fictive', rcsNumber: 'FICTIF', authorizationNumber: 'FICTIVE', profession: '', legalMention: '', rcsExemptionReason: '' }
    const saved = await auth(request(app).put(`/api/companies/${companyId}`)).send({ name: 'Émetteur fictif final', legalProfile }).expect(200)
    expect(saved.body.legalProfile).toEqual(legalProfile)
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyId } })).legalProfile).toEqual(legalProfile)
    const customer = await prisma.customer.create({ data: { companyId, firstName: '', lastName: '', businessName: 'Client fictif', address: 'Adresse fictive' } })
    const created = await auth(request(app).post('/api/invoices')).send({ customerId: customer.id, documentMode: 'COMPLETE', items: [line] }).expect(201)
    const issued = await auth(request(app).put(`/api/invoices/${created.body.id}/status`)).send({ status: 'SENT' }).expect(200)
    expect(issued.body.customer.businessName).toBe('Client fictif')
    expect(issued.body.items).toHaveLength(1)
    expect(issued.body.issuedAt).toBeTruthy()
    const snapshot = (await prisma.invoice.findUniqueOrThrow({ where: { id: created.body.id } })).issuedSnapshot as any
    expect(snapshot.company.rcsNumber).toBe('FICTIF')
  })
})
