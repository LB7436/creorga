import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createHash, randomUUID } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import floorRouter, { floorCompanyContext } from './floorState'
import pos from './pos'
import accounting from './accounting'
import inventory from './inventory'
import { createPayment } from '../lib/payments/ledger'
import { lockFinancialCompany } from '../lib/financial-lock'
import { createInvoiceDocumentLink, downloadInvoiceDocument } from '../lib/invoice-document-links'
import { floorHash } from '../lib/floor-workspace'
import { partialPaymentSchema } from '../lib/pos-partial-payments'

// Cette suite conserve toutes ses fixtures UUID dans creorga_tests. Aucun reset,
// seed, nettoyage, suppression ni accès aux sociétés préexistantes.
const companyId = `capabilities-fixture-${randomUUID()}`
const owner = randomUUID(), employee = randomUUID(), cashier = randomUUID(), manager = randomUUID()
let invoiceId: string
const app = express().use(express.json())
app.use('/api/pos', authenticate, requireCompany, floorCompanyContext, pos)
app.use('/api/floor-state', authenticate, requireCompany, floorCompanyContext, floorRouter)
app.use('/api/accounting', authenticate, requireCompany, accounting)
app.use('/api/inventory', authenticate, requireCompany, inventory)
const token = (id: string) => jwt.sign({ userId: id }, process.env.JWT_SECRET!, { expiresIn: '15m' })
const auth = (r: any, id: string) => r.set('Authorization', `Bearer ${token(id)}`).set('x-company-id', companyId)
const member = (userId: string) => ({ userId_companyId: { userId, companyId } })

describe('Capacités métier : projections et révocation transactionnelle PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL || 'http://invalid')
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || target.hostname !== '127.0.0.1' || target.port !== '5450' || target.pathname !== '/creorga_tests') throw Error('Base fictive gardée obligatoire')
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    await prisma.company.create({ data: { id: companyId, name: 'CAPACITÉS — SOCIÉTÉ FICTIVE CONSERVÉE' } })
    for (const [id, role] of [[owner, 'OWNER'], [employee, 'EMPLOYEE'], [cashier, 'CASHIER'], [manager, 'MANAGER']]) {
      await prisma.user.create({ data: { id, email: `${id}@localhost.invalid`, password: 'unused-fixture', firstName: 'Fictif', lastName: role } })
      await prisma.userCompany.create({ data: { companyId, userId: id, role } })
    }
    await prisma.posSale.create({ data: { id: randomUUID(), companyId, userId: owner, number: 1, snapshot: { total: 4321, fixture: true } } })
    await prisma.posClosure.create({ data: { id: randomUUID(), companyId, userId: owner, snapshot: { totalTTC: 8765, fixture: true } } })
    const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = Buffer.from(await pdf.save())
    invoiceId = (await prisma.invoice.create({ data: { companyId, number: 'FICTIF-CAP-001', status: 'SENT', total: 10,
      issuedAt: new Date(), issuedPdf: bytes, issuedPdfHash: createHash('sha256').update(bytes).digest('hex') } })).id
  })
  afterAll(async () => { vi.unstubAllEnvs(); await prisma.$disconnect() })

  it('EMPLOYEE garde son rôle et ne reçoit aucun CA ; OWNER conserve ses historiques', async () => {
    const restricted = await auth(request(app).get('/api/pos/bootstrap'), employee).expect(200)
    expect(restricted.headers['cache-control']).toBe('private, no-store')
    expect(restricted.body.ventes).toEqual([]); expect(restricted.body.clotures).toEqual([])
    expect(restricted.body.currentStaff.role).toBe('EMPLOYEE')
    expect(restricted.body.businessAccess.capabilities).not.toContain('finance.revenue.read')
    const full = await auth(request(app).get('/api/pos/bootstrap'), owner).expect(200)
    expect(full.body.ventes).toEqual([{ total: 4321, fixture: true }])
    expect(full.body.clotures).toEqual([{ totalTTC: 8765, fixture: true }])
  })

  it('les quantités restent lisibles sans exposer les fournisseurs et leurs conditions privées', async () => {
    const supplier = await prisma.supplier.create({ data: { companyId, name: 'Fournisseur fictif conservé',
      email: 'supplier@localhost.invalid', notes: 'Conditions commerciales fictives' } })
    const ingredient = await prisma.ingredient.create({ data: { companyId, name: 'Ingrédient fictif conservé',
      supplierId: supplier.id, costPerUnit: 12.75, currentStock: 9, minStockLevel: 2 } })
    await auth(request(app).get('/api/inventory/suppliers'), employee).expect(403)
    const quantities = (await auth(request(app).get('/api/inventory/ingredients'), employee).expect(200)).body
    const visible = quantities.find((item: any) => item.id === ingredient.id)
    expect(visible).toMatchObject({ currentStock: 9, supplierId: supplier.id })
    expect(visible).not.toHaveProperty('costPerUnit')
    expect(visible).not.toHaveProperty('supplier')
    const full = (await auth(request(app).get('/api/inventory/ingredients'), owner).expect(200)).body
    expect(full.find((item: any) => item.id === ingredient.id)).toMatchObject({ costPerUnit: 12.75,
      supplier: { id: supplier.id, notes: 'Conditions commerciales fictives' } })
    expect(await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredient.id } })).toMatchObject({ currentStock: 9, costPerUnit: 12.75 })
  })

  it('un grant de lecture est révoqué dès la requête suivante et change la révision', async () => {
    await prisma.userCompany.update({ where: member(employee), data: { capabilities: { 'finance.revenue.read': true }, accessVersion: { increment: 1 } } })
    const granted = (await auth(request(app).get('/api/pos/bootstrap'), employee).expect(200)).body
    expect(granted.ventes).toHaveLength(1)
    await prisma.userCompany.update({ where: member(employee), data: { capabilities: { 'finance.revenue.read': false }, accessVersion: { increment: 1 } } })
    const revoked = (await auth(request(app).get('/api/pos/bootstrap'), employee).expect(200)).body
    expect(revoked.ventes).toEqual([]); expect(revoked.clotures).toEqual([])
    expect(revoked.businessAccess.revision).not.toBe(granted.businessAccess.revision)
  })

  it('EMPLOYEE ne peut encaisser et CASHIER ne peut produire un Z global', async () => {
    const before = await prisma.posSale.count({ where: { companyId } })
    await auth(request(app).post('/api/pos/checkout'), employee).send({ requestId: randomUUID() }).expect(403)
    await auth(request(app).post('/api/pos/close'), cashier).send({ requestId: randomUUID() }).expect(403)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(before)
  })

  it('CASHIER ouvre et clôture son tiroir sans CA ni snapshot financier', async () => {
    const opened = (await auth(request(app).post('/api/accounting/cash-drawers/open'), cashier).send({ requestId: randomUUID(), openAmount: 20 }).expect(201)).body
    expect(opened).not.toHaveProperty('totalSales'); expect(opened).not.toHaveProperty('closeSnapshot')
    const report = (await auth(request(app).get(`/api/accounting/cash-drawers/${opened.id}/report`), cashier).expect(200)).body
    expect(report).toMatchObject({ openingCents: 2000, expectedCents: 2000, financialDetailsRestricted: true })
    expect(report).not.toHaveProperty('payments'); expect(report).not.toHaveProperty('byMethod')
    const closed = (await auth(request(app).put(`/api/accounting/cash-drawers/${opened.id}/close`), cashier).send({ requestId: randomUUID(), closeAmount: 20, notes: 'Comptage fictif' }).expect(200)).body
    expect(closed.closedAt).toBeTruthy(); expect(closed).not.toHaveProperty('closeSnapshot'); expect(closed).not.toHaveProperty('totalSales')
  })

  it('révoquer après l’attente du verrou refuse même le replay PENDING et conserve sa référence', async () => {
    const actor = randomUUID()
    await prisma.user.create({ data: { id: actor, email: `${actor}@localhost.invalid`, password: 'unused-fixture', firstName: 'Fictif', lastName: 'Attente' } })
    await prisma.userCompany.create({ data: { companyId, userId: actor, role: 'CASHIER' } })
    const order = await prisma.order.create({ data: { companyId, userId: actor, orderNumber: 1, total: 5 } })
    const input = { requestId: randomUUID(), provider: 'sumup', orderId: order.id }
    const attempt = await prisma.paymentAttempt.create({ data: { companyId, userId: actor,
      ...input, requestHash: createHash('sha256').update(JSON.stringify(input)).digest('hex'), merchantId: `manual-terminal:${companyId}`, amountCents: 500, currency: 'EUR', status: 'PENDING' } })
    await expect(createPayment(companyId, actor, input)).resolves.toMatchObject({ httpStatus: 200 })
    let release!: () => void, locked!: () => void
    const lockReady = new Promise<void>(resolve => { locked = resolve })
    const releaseLock = new Promise<void>(resolve => { release = resolve })
    const holder = prisma.$transaction(async tx => { await lockFinancialCompany(tx, companyId); locked(); await releaseLock }, { timeout: 15000 })
    await lockReady
    const pending = createPayment(companyId, actor, input).then(value => ({ value, error: null }), error => ({ value: null, error }))
    try {
      await vi.waitFor(async () => {
        const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND classid = hashtext(${companyId})::oid AND objid = hashtext('pos-ledger')::oid AND NOT granted) AS waiting`
        expect(rows[0].waiting).toBe(true)
      }, { timeout: 5000, interval: 30 })
      await prisma.userCompany.update({ where: member(actor), data: { capabilities: { 'payments.receive': false }, accessVersion: { increment: 1 } } })
    } finally { release(); await holder }
    expect((await pending).error).toMatchObject({ status: 403 })
    const retained = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })
    expect(retained.status).toBe('PENDING'); expect(retained.requestId).toBe(input.requestId); expect(retained.amountCents).toBe(500)
    expect(await prisma.paymentAttempt.count({ where: { companyId, requestId: input.requestId } })).toBe(1)
    expect(await prisma.paymentSettlement.count({ where: { companyId, attemptId: attempt.id } })).toBe(0)
  })

  it('le retrait exports.read au MANAGER révoque ses liens PDF existants sans modifier l’original', async () => {
    const link = await createInvoiceDocumentLink(companyId, manager, invoiceId, { requestId: randomUUID(), ttlMinutes: 15 })
    const original = await downloadInvoiceDocument({ token: link.capability })
    expect(original.bytes.subarray(0, 5).toString()).toBe('%PDF-')
    await prisma.userCompany.update({ where: member(manager), data: { capabilities: { 'exports.read': false }, accessVersion: { increment: 1 } } })
    await expect(downloadInvoiceDocument({ token: link.capability })).rejects.toMatchObject({ status: 403 })
    await expect(createInvoiceDocumentLink(companyId, manager, invoiceId, { requestId: randomUUID(), ttlMinutes: 15 })).rejects.toMatchObject({ status: 403 })
    const preserved = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })
    expect(preserved.issuedPdfHash).toBe(original.hash)
    expect(await prisma.invoiceDocumentLinkEvent.count({ where: { companyId, linkId: link.id, action: 'DOWNLOADED' } })).toBe(1)
  })

  it('20 rejeux POS attendent le verrou financier sans verrouiller la salle ; une révocation en attente reste refusée', async () => {
    const actor = randomUUID()
    await prisma.user.create({ data: { id: actor, email: `${actor}@localhost.invalid`, password: 'unused-fixture', firstName: 'Fictif', lastName: 'Rejeu' } })
    await prisma.userCompany.create({ data: { companyId, userId: actor, role: 'CASHIER' } })
    const input = partialPaymentSchema.parse({ requestId: randomUUID(), tableId: 'table-replay-fixture', coverIds: ['cover-replay-fixture'], amountCents: 500, expectedOutstandingCents: 500, method: 'CARD' })
    const response = { requestId: input.requestId, confirmation: 'manual_declaration', status: 'SETTLED', paidCents: 500, outstandingCents: 0, cashChangeCents: 0, sales: [] }
    const order = await prisma.order.create({ data: { companyId, userId: actor, orderNumber: 2, total: 5, status: 'PAID', paidAt: new Date() } })
    const attempt = await prisma.paymentAttempt.create({ data: { companyId, userId: actor, orderId: order.id, requestId: input.requestId, requestHash: floorHash(input), scope: 'POS_PARTIAL', provider: 'manual', merchantId: `manual:${companyId}`, amountCents: 500, currency: 'EUR', status: 'DECLARED', response } })
    const salesBefore = await prisma.posSale.count({ where: { companyId } })
    const replays = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post('/api/pos/payments'), actor).send(input)))
    expect(replays.map(result => result.status)).toEqual(Array(20).fill(200))
    for (const result of replays) expect(result.body).toEqual(response)
    let release!: () => void, locked!: () => void
    const lockReady = new Promise<void>(resolve => { locked = resolve }), releaseLock = new Promise<void>(resolve => { release = resolve })
    const holder = prisma.$transaction(async tx => { await lockFinancialCompany(tx, companyId); locked(); await releaseLock }, { timeout: 15000 })
    await lockReady
    const pending = auth(request(app).post('/api/pos/payments'), actor).send(input).then((result: any) => result)
    try {
      await vi.waitFor(async () => {
        const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND classid = hashtext(${companyId})::oid AND objid = hashtext('pos-ledger')::oid AND NOT granted) AS waiting`
        expect(rows[0].waiting).toBe(true)
      }, { timeout: 5000, interval: 30 })
      await prisma.userCompany.update({ where: member(actor), data: { capabilities: { 'payments.receive': false }, accessVersion: { increment: 1 } } })
    } finally { release(); await holder }
    expect((await pending).status).toBe(403)
    expect((await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).response).toEqual(response)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(salesBefore)
    expect(await prisma.paymentAttempt.count({ where: { companyId, requestId: input.requestId } })).toBe(1)
  }, 30000)

  it('projette le plan et le prix après commit sans perdre provenance active ni archives privées lors du roundtrip ERP/POS', async () => {
    const floorCompanyId = `floor-capability-fixture-${randomUUID()}`
    await prisma.company.create({ data: { id: floorCompanyId, name: 'DTO SALLE — FICTIVE CONSERVÉE' } })
    await prisma.userCompany.create({ data: { companyId: floorCompanyId, userId: cashier, role: 'CASHIER', capabilities: { 'settings.manage': true, 'catalog.prices.write': true } } })
    const category = await prisma.category.create({ data: { companyId: floorCompanyId, name: 'FICTIF' } })
    const product = await prisma.product.create({ data: { companyId: floorCompanyId, categoryId: category.id, name: 'Café DTO fictif', price: 5, taxRate: 17 } })
    const line = { id: 'dto-live-line', menuItemId: product.id, productId: product.id, name: product.name, price: 5, qty: 1, note: '', coverId: 'dto-live-cover', taxRate: 17, addedAt: 42 }
    const quote = { version: 1, status: 'confirmed', source: 'catalog', productId: product.id, name: product.name, priceCents: 500, taxRate: 17, quotedAt: 42 }
    const historicalScene = { id: 'dto-old-scene', label: 'Ancienne scène fictive', createdAt: 1, rooms: [], fixtures: [], tables: [{ id: 'dto-old-table', name: 'Ancienne', section: 'dto-room', shape: 'round', seats: 2, x: 0, y: 0, status: 'occupied', mergedWith: [], covers: [{ id: 'dto-old-cover', label: 'Ancien', items: [{ ...line, id: 'dto-secret-old-line', price: 999 }] }] }] }
    const initial = { tables: [{ id: 'dto-table', name: 'DTO fictif', section: 'dto-room', shape: 'round', seats: 2, x: 0, y: 0, status: 'OCCUPEE', items: [line], posCovers: [{ id: 'dto-live-cover', label: 'Ouvert', items: [line] }] }], chairs: [], zones: [{ id: 'dto-room', name: 'Salle DTO' }], photos: [], updatedAt: 100, storageAuthority: 'postgres',
      posPricing: { 'dto-live-line': quote, 'dto-secret-old-line': { ...quote, priceCents: 99900 } }, lineOrigins: { 'dto-live-line': 'dto-origin-live', 'dto-secret-old-line': 'dto-origin-old' },
      kitchenTickets: { 'dto-old-ticket': { id: 'dto-old-ticket', status: 'served', items: [{ ...line, id: 'dto-secret-old-line', price: 999 }] } }, kitchenBaselines: { 'dto-old': [{ ...line, id: 'dto-secret-old-line', price: 999 }] },
      posEditor: { rooms: [], fixtures: [], background: null, scenes: [historicalScene] } }
    await prisma.floorWorkspace.create({ data: { companyId: floorCompanyId, revision: 100n, snapshot: initial, snapshotHash: floorHash(initial), initialSnapshot: initial, initialHash: floorHash(initial) } })
    const scoped = (r: any) => r.set('Authorization', `Bearer ${token(cashier)}`).set('x-company-id', floorCompanyId)
    const first = (await scoped(request(app).get('/api/floor-state')).expect(200)).body
    expect(first.lineOrigins).toEqual({ 'dto-live-line': 'dto-origin-live' })
    expect(first.posPricing).toEqual({ 'dto-live-line': quote })
    expect(JSON.stringify(first)).not.toContain('dto-secret-old-line')
    expect(first).not.toHaveProperty('kitchenTickets'); expect(first).not.toHaveProperty('kitchenBaselines')
    expect((await prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId: floorCompanyId } })).snapshot).toEqual(initial)
    const saved = (await scoped(request(app).put('/api/floor-state')).set('If-Match', '100').send({ ...first, tables: first.tables.map((table: any) => ({ ...table, x: 10 })) }).expect(200)).body
    expect(saved.updatedAt).toBeGreaterThan(100)
    expect(saved.tables[0].items[0].addedAt).toBe(42)
    const afterLayout: any = (await prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId: floorCompanyId } })).snapshot
    expect(afterLayout.posEditor.scenes).toEqual([historicalScene])
    expect(afterLayout.kitchenTickets).toEqual(initial.kitchenTickets)
    expect(afterLayout.posPricing['dto-secret-old-line']).toEqual(initial.posPricing['dto-secret-old-line'])
    const boot = (await scoped(request(app).get('/api/pos/bootstrap')).expect(200)).body
    expect(JSON.stringify(boot.editor)).not.toContain('dto-secret-old-line')
    const drafted = (await scoped(request(app).put('/api/pos/draft')).set('If-Match', String(boot.revision)).send({ tables: boot.tables.map((table: any) => ({ ...table, orderNote: 'Note active fictive' })), seats: boot.seats, editor: boot.editor }).expect(200)).body
    expect(Object.keys(drafted).sort()).toEqual(['lineOrigins', 'posPricing', 'updatedAt'])
    expect(drafted.updatedAt).toBeGreaterThan(boot.revision)
    expect(drafted.posPricing).toEqual({ 'dto-live-line': quote })
    expect(drafted.lineOrigins).toEqual({ 'dto-live-line': 'dto-origin-live' })
    const retained: any = (await prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId: floorCompanyId } })).snapshot
    expect(retained.updatedAt).toBe(drafted.updatedAt)
    expect(retained.posEditor.scenes).toEqual([historicalScene])
    expect(retained.posPricing['dto-secret-old-line']).toEqual(initial.posPricing['dto-secret-old-line'])
  }, 30000)
})
