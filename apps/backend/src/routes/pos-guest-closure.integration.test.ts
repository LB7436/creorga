import express from 'express'
import request, { type Response } from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import { floorHash } from '../lib/floor-workspace'
import { lockFinancialCompany } from '../lib/financial-lock'
import { guestTokenHash } from '../lib/guest-visits'
import pos from './pos'
import visits from './guestVisits'
import guest from './guest'
import floorRouter, { floorCompanyContext } from './floorState'

let delayEntered: (() => void) | undefined, delayResume: Promise<void> | undefined
const app = express().use(express.json())
app.use('/api/pos', deviceOrUserAuth, requireCompany, floorCompanyContext, async (req, _res, next) => {
  if (req.headers['x-fixture-pause']) { delayEntered?.(); await delayResume }
  next()
}, pos)
app.use('/api/guest-visits', visits); app.use('/api/guest', guest)
app.use('/api/floor-state', deviceOrUserAuth, requireCompany, floorCompanyContext, floorRouter)
const auth = (f: any, r: any, companyId = f.companyId) => r.set('Authorization', 'Bearer ' + f.token).set('x-company-id', companyId)
const boot = async (f: any) => (await auth(f, request(app).get('/api/pos/bootstrap')).expect(200)).body
const bill = (f: any, cap = f.access.token, tableId = f.tableId) => request(app).get(`/api/guest/bill/${tableId}?companyId=${f.companyId}`).set('x-guest-access', cap)
const order = (f: any, cap = f.access.token, tableId = f.tableId, qty = 1) => request(app).post('/api/guest/orders').set('x-guest-access', cap)
  .send({ companyId: f.companyId, tableId, requestId: randomUUID(), items: [{ productId: f.productId, qty }] })
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
const open = async (f: any, tableId = f.tableId) => {
  const visit = (await auth(f, request(app).post('/api/guest-visits')).send({ tableId }).expect(201)).body
  const access = (await auth(f, request(app).post(`/api/guest-visits/${visit.id}/link`)).expect(200)).body
  return { visit, access }
}
async function fixture(qty = 1) {
  const companyId = 'qr-end-' + randomUUID(), userId = companyId + '-owner', tableId = randomUUID(), otherTable = randomUUID(), spare = randomUUID()
  await prisma.company.create({ data: { id: companyId, name: 'FIN DE VISITE FICTIVE' } })
  await prisma.user.create({ data: { id: userId, email: companyId + '@localhost.invalid', password: 'unused-fixture', firstName: 'Test', lastName: 'Owner' } })
  await prisma.userCompany.create({ data: { userId, companyId, role: 'OWNER' } })
  const category = await prisma.category.create({ data: { companyId, name: 'FICTIF' } })
  const productId = (await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café FICTIF', price: 11.7, taxRate: 17, stock: 100 } })).id
  // Nouvelle société uniquement : adoption explicite d'un cliché vide, sans lecture d'archive/profil ni nettoyage.
  const empty = { tables: [], chairs: [], photos: [], zones: [{ id: 'salle', name: 'Salle FICTIVE' }], updatedAt: 1000, storageAuthority: 'postgres' }
  await prisma.floorWorkspace.create({ data: { companyId, revision: 1000n, snapshot: empty, snapshotHash: floorHash(empty), initialSnapshot: empty, initialHash: floorHash(empty) } })
  const f: any = { companyId, userId, tableId, otherTable, spare, productId, token: jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' }) }
  const initial = await boot(f), coverId = randomUUID(), lineId = randomUUID()
  const table = (id: string) => ({ id, name: 'Table FICTIVE ' + id.slice(-6), shape: 'round', seats: 4, section: 'Salle FICTIVE', x: 100, y: 100, status: 'available', covers: [], mergedWith: [] })
  const tables: any[] = [table(tableId), table(otherTable), table(spare)]
  tables[0].status = 'occupied'; tables[0].covers = [{ id: coverId, label: 'Natif FICTIF', items: [{ id: lineId, menuItemId: productId, name: 'Café FICTIF', price: 11.7, qty: 1, note: '', coverId }] }]
  await auth(f, request(app).put('/api/pos/draft')).set('If-Match', String(initial.revision)).send({ tables, seats: [] }).expect(200)
  Object.assign(f, await open(f), { coverId })
  f.qr = (await order(f, f.access.token, tableId, qty).expect(201)).body
  f.qrOrder = await prisma.order.findUniqueOrThrow({ where: { publicToken: f.qr.id }, include: { items: true } })
  return f
}
async function input(f: any, tableId = f.tableId, selected?: string[]) {
  const table = (await boot(f)).tables.find((t: any) => t.id === tableId)
  const covers = table.covers.filter((c: any) => !selected || selected.includes(c.id))
  return { requestId: randomUUID(), tableId, coverIds: covers.map((c: any) => c.id), expectedTotal: Math.round(covers.flatMap((c: any) => c.items).reduce((n: number, i: any) => n + i.price * i.qty, 0) * 100) / 100,
    method: 'cash', tip: 0 }
}
const checkout = (f: any, body: any) => auth(f, request(app).post('/api/pos/checkout')).send(body)
async function assertOpen(f: any, cap = f.access.token, visitId = f.visit.id) {
  expect((await prisma.guestVisit.findUniqueOrThrow({ where: { id: visitId } })).closedAt).toBeNull()
  expect((await prisma.guestVisitAccess.findUniqueOrThrow({ where: { tokenHash: guestTokenHash(cap) } })).revokedAt).toBeNull()
  await bill(f, cap).expect(200)
}
async function waitForQueue(companyId: string, n: number) {
  await vi.waitFor(async () => {
    const rows: any[] = await prisma.$queryRaw`SELECT count(*)::int AS count FROM pg_locks WHERE locktype='advisory' AND NOT granted AND classid=(hashtext(${companyId})::bigint & 4294967295)::oid AND objid=(hashtext('pos-ledger')::bigint & 4294967295)::oid`
    expect(rows[0].count).toBe(n)
  }, { timeout: 5000, interval: 20 })
}

describe('Fin de table POS : capacités QR closes dans la transaction finale', () => {
  beforeAll(() => {
    const url = new URL(process.env.DATABASE_URL || 'about:blank')
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || url.hostname !== '127.0.0.1' || url.port !== '5450' || url.pathname !== '/creorga_tests'
      || process.env.EMAIL_TEST_ONLY !== 'true' || process.env.CREORGA_VALIDATION_ALLOW_PG !== 'true') throw Error('Laboratoire gardé creorga_tests uniquement')
    for (const key of ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'STRIPE_PAYMENT_KEY', 'STRIPE_SECRET_KEY', 'SMTP_PASS']) if (process.env[key]) throw Error('Prestataires réels interdits')
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
  })
  afterAll(async () => { await prisma.$disconnect(); vi.unstubAllEnvs() }) // Les fixtures uniques restent disponibles pour preuve.

  it('ferme toutes les visites fusionnées après le checkout natif+QR, avec auteur et corrélation, sans toucher les autres tables/sociétés', async () => {
    const f = await fixture(), b = await open(f, f.otherTable), untouched = await open(f, f.spare), other = await fixture()
    await order(f, b.access.token, f.otherTable).expect(201)
    await auth(f, request(app).post('/api/pos/table-movements')).send({ requestId: randomUUID(), kind: 'MERGE', fromTableId: f.tableId, intoTableId: f.otherTable, expectedRevision: (await boot(f)).revision }).expect(200)
    const links = []
    for (const v of [f.visit, b.visit]) links.push((await auth(f, request(app).post(`/api/guest-visits/${v.id}/link`)).expect(200)).body)
    const oldTokenHashes = [f.access.token, b.access.token].map(guestTokenHash)
    const previousRevocations = await prisma.guestVisitAccess.findMany({ where: { tokenHash: { in: oldTokenHashes } }, orderBy: { id: 'asc' } })
    const beforeUntouched = await prisma.guestVisit.findUniqueOrThrow({ where: { id: untouched.visit.id } })
    const beforeOther = await prisma.guestVisit.findUniqueOrThrow({ where: { id: other.visit.id } })
    const body = await input(f, f.otherTable)
    expect(body.expectedTotal).toBe(35.1)
    // Une fusion rattache les commandes aux couverts : vrai parcours de solde,
    // sans assouplir le refus du checkout classique sur un couvert lié.
    const paid = await auth(f, request(app).post('/api/pos/payments')).send({ requestId: body.requestId, tableId: body.tableId,
      coverIds: body.coverIds, amountCents: 3510, expectedOutstandingCents: 3510, method: 'CASH' })
    expect(paid.status, JSON.stringify(paid.body)).toBe(200)
    for (const link of links) {
      const visit = await prisma.guestVisit.findUniqueOrThrow({ where: { id: link.visitId } })
      expect(visit.closedAt).not.toBeNull(); expect(visit.closedBy).toBe(f.userId); expect(visit.closeReason).toContain(body.requestId)
      const access = await prisma.guestVisitAccess.findUniqueOrThrow({ where: { tokenHash: guestTokenHash(link.token) } })
      expect(access.revokedAt).not.toBeNull(); expect(access.revokeReason).toContain(body.requestId)
      await bill(f, link.token, f.otherTable).expect(403)
      await order(f, link.token, f.otherTable).expect(403)
      await request(app).get(`/api/guest/orders/${f.qr.id}?companyId=${f.companyId}`).set('x-guest-access', link.token).expect(403)
      await request(app).post('/api/guest/call-waiter').set('x-guest-access', link.token).send({ companyId: f.companyId, tableId: f.otherTable, type: 'waiter' }).expect(403)
    }
    expect(await prisma.guestVisit.findUniqueOrThrow({ where: { id: untouched.visit.id } })).toEqual(beforeUntouched)
    expect(await prisma.guestVisit.findUniqueOrThrow({ where: { id: other.visit.id } })).toEqual(beforeOther)
    expect(await prisma.guestVisitAccess.findMany({ where: { tokenHash: { in: oldTokenHashes } }, orderBy: { id: 'asc' } })).toEqual(previousRevocations)
    const sales = await prisma.posSale.findMany({ where: { companyId: f.companyId } })
    expect(sales).toHaveLength(3) // Une vente par commande d'origine dans le parcours solde.
    expect(sales.reduce((sum, sale) => sum + Math.round((sale.snapshot as any).total * 100), 0)).toBe(3510)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(97)
    await auth(f, request(app).get('/api/pos/bootstrap'), other.companyId).expect(403)
  })

  it('le checkout classique natif+QR clôt les accès quand toute la table est réglée', async () => {
    const f = await fixture(), body = await input(f)
    await checkout(f, body).expect(200)
    await bill(f).expect(403); await order(f).expect(403)
    const visit = await prisma.guestVisit.findUniqueOrThrow({ where: { id: f.visit.id } })
    expect(visit.closedBy).toBe(f.userId); expect(visit.closeReason).toContain(body.requestId)
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(1)
  })

  it('le salarié autorisé à encaisser termine aussi les accès sans obtenir un rôle propriétaire', async () => {
    const f = await fixture(), body = await input(f)
    await prisma.userCompany.update({ where: { userId_companyId: { userId: f.userId, companyId: f.companyId } }, data: { role: 'EMPLOYEE', capabilities: { 'service.manage': true, 'payments.receive': true }, accessVersion: { increment: 1 } } })
    await checkout(f, body).expect(200)
    await bill(f).expect(403)
    expect((await prisma.userCompany.findUniqueOrThrow({ where: { userId_companyId: { userId: f.userId, companyId: f.companyId } } })).role).toBe('EMPLOYEE')
    expect((await prisma.guestVisit.findUniqueOrThrow({ where: { id: f.visit.id } })).closedBy).toBe(f.userId)
  })

  it('un paiement par couvert laisse les autres tournées de la même visite accessibles', async () => {
    const f = await fixture(), body = await input(f), next = (await order(f).expect(201)).body
    await checkout(f, body).expect(200)
    await assertOpen(f)
    expect((await bill(f).expect(200)).body).toMatchObject({ total: 11.7, orderIds: [next.id] })
    await order(f).expect(201)
  })

  it('un acompte et une part encore due ne deviennent pas une fin de visite lors du règlement natif', async () => {
    const f = await fixture()
    await auth(f, request(app).post('/api/pos/payments')).send({ requestId: randomUUID(), tableId: f.tableId, coverIds: ['guest:' + f.qrOrder.id], amountCents: 500, expectedOutstandingCents: 1170, method: 'CASH' }).expect(200)
    const tenders = await prisma.orderTender.findMany({ where: { companyId: f.companyId, orderId: f.qrOrder.id } })
    await checkout(f, await input(f, f.tableId, [f.coverId])).expect(200)
    await assertOpen(f)
    expect((await bill(f).expect(200)).body.total).toBe(6.7)
    expect(await prisma.orderTender.findMany({ where: { companyId: f.companyId, orderId: f.qrOrder.id } })).toEqual(tenders)
  })

  it('préserve les accès d’une créance répartie restant due et son allocation historique', async () => {
    const f = await fixture(2), groups = [f.tableId, f.spare].map((tableId: string, i: number) => ({ key: randomUUID(), tableId, label: 'Groupe FICTIF ' + i, lines: [{ itemId: f.qrOrder.items[0].id, qty: 1 }] }))
    const allocation = { requestId: randomUUID(), orderId: f.qrOrder.id, expectedRevision: (await boot(f)).revision, reason: 'Répartition FICTIVE explicite pour le test de fin de visite', groups, tenderDecisions: [] }
    const preview = (await auth(f, request(app).post('/api/pos/financial-allocations/preview')).send(allocation).expect(200)).body
    await auth(f, request(app).post('/api/pos/financial-allocations')).send({ ...allocation, confirmHash: preview.confirmHash, managerAcknowledged: true }).expect(200)
    const cap = (await auth(f, request(app).post(`/api/guest-visits/${groups[0].key}/link`)).expect(200)).body
    const otherCap = (await auth(f, request(app).post(`/api/guest-visits/${groups[1].key}/link`)).expect(200)).body
    const before = await prisma.serviceAllocation.findUniqueOrThrow({ where: { id: allocation.requestId } })
    await checkout(f, await input(f, f.tableId, [f.coverId])).expect(200)
    await assertOpen(f, cap.token, groups[0].key)
    expect((await bill(f, cap.token).expect(200)).body.total).toBe(11.7)
    expect(await prisma.serviceAllocation.findUniqueOrThrow({ where: { id: allocation.requestId } })).toEqual(before)
    const finalId = randomUUID()
    await auth(f, request(app).post('/api/pos/payments')).send({ requestId: finalId, tableId: f.tableId, coverIds: ['guest:share:' + groups[0].key],
      amountCents: 1170, expectedOutstandingCents: 1170, method: 'CASH' }).expect(200)
    await bill(f, cap.token).expect(403)
    expect((await prisma.guestVisit.findUniqueOrThrow({ where: { id: groups[0].key } })).closeReason).toContain(finalId)
    expect((await prisma.guestVisit.findUniqueOrThrow({ where: { id: groups[1].key } })).closedAt).toBeNull()
    expect((await bill(f, otherCap.token, f.spare).expect(200)).body.total).toBe(11.7)
    expect(await prisma.serviceAllocation.findUniqueOrThrow({ where: { id: allocation.requestId } })).toEqual(before)
  })

  it('préserve les accès et réservations lorsqu’une capture sélectionnée est incertaine', async () => {
    const f = await fixture(), attempt = await prisma.paymentAttempt.create({ data: { companyId: f.companyId, orderId: f.qrOrder.id, guestVisitId: f.visit.id, tableId: f.tableId,
      requestId: randomUUID(), requestHash: 'fixture', provider: 'paypal', merchantId: 'fixture', status: 'UNKNOWN', amountCents: 1170, currency: 'EUR', allocations: { create: { orderId: f.qrOrder.id, amountCents: 1170 } } } })
    const before = await prisma.paymentAllocation.findMany({ where: { companyId: f.companyId, attemptId: attempt.id } })
    await checkout(f, await input(f)).expect(409)
    await assertOpen(f)
    expect(await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).toEqual(attempt)
    expect(await prisma.paymentAllocation.findMany({ where: { companyId: f.companyId, attemptId: attempt.id } })).toEqual(before)
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(0)
  })

  it.each(['checkout', 'partial'])('refuse une fin %s ambiguë si une ancienne commande de la visite reste réservée malgré son statut payé', async mode => {
    const f = await fixture(), old = await prisma.order.create({ data: { companyId: f.companyId, guestVisitId: f.visit.id, externalTableId: f.tableId, source: 'GUEST', publicToken: randomUUID(), orderNumber: 99, total: 1, status: 'PAID', paidAt: new Date() } })
    const attempt = await prisma.paymentAttempt.create({ data: { companyId: f.companyId, orderId: old.id, guestVisitId: f.visit.id, tableId: f.tableId,
      requestId: randomUUID(), requestHash: 'fixture', provider: 'paypal', merchantId: 'fixture', status: 'REVIEW', amountCents: 100, currency: 'EUR', allocations: { create: { orderId: old.id, amountCents: 100 } } } })
    const body = await input(f)
    const paying = mode === 'checkout' ? checkout(f, body) : auth(f, request(app).post('/api/pos/payments')).send({ requestId: body.requestId, tableId: body.tableId,
      coverIds: body.coverIds, amountCents: 2340, expectedOutstandingCents: 2340, method: 'CASH' })
    await paying.expect(409)
    await assertOpen(f)
    expect(await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).toEqual(attempt)
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.orderTender.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.order.count({ where: { companyId: f.companyId } })).toBe(2)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(100)
  })

  it.each(['checkout', 'partial'])('le rejeu %s ne ferme jamais la nouvelle visite et ne réécrit pas la fermeture précédente', async mode => {
    const f = await fixture(), body = await input(f)
    const send = () => mode === 'checkout' ? checkout(f, body) : auth(f, request(app).post('/api/pos/payments')).send({ requestId: body.requestId, tableId: body.tableId,
      coverIds: body.coverIds, amountCents: 2340, expectedOutstandingCents: 2340, method: 'CASH' })
    const paid = (await send().expect(200)).body
    const ended = await prisma.guestVisit.findUniqueOrThrow({ where: { id: f.visit.id } })
    const next = await open(f)
    expect((await send().expect(200)).body).toEqual(paid)
    await assertOpen(f, next.access.token, next.visit.id)
    expect(await prisma.guestVisit.findUniqueOrThrow({ where: { id: f.visit.id } })).toEqual(ended)
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(mode === 'checkout' ? 1 : 2)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(98)
  })

  it('le chemin garder ouvert ne fait que sauvegarder : aucun paiement ni accès fermé', async () => {
    const f = await fixture(), before = await boot(f)
    await auth(f, request(app).put('/api/pos/draft')).set('If-Match', String(before.revision)).send({ tables: before.tables, seats: before.seats }).expect(200)
    await assertOpen(f)
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(0)
    await order(f).expect(201)
  })

  it.each(['checkout-first', 'order-first', 'partial-first'])('sérialise commande QR et checkout sans perte ni commande parasite : %s', async mode => {
    const f = await fixture(), body = await input(f), locked = deferred(), release = deferred()
    const holder = prisma.$transaction(async tx => { await lockFinancialCompany(tx, f.companyId); locked.resolve(); await release.promise }, { timeout: 15000 })
    await locked.promise
    let pay: Promise<any> | undefined, added: Promise<any> | undefined
    try {
      if (mode === 'partial-first') pay = auth(f, request(app).post('/api/pos/payments')).send({ requestId: body.requestId, tableId: body.tableId,
        coverIds: body.coverIds, amountCents: 2340, expectedOutstandingCents: 2340, method: 'CASH' }).then((r: Response) => r)
      else if (mode === 'checkout-first') pay = checkout(f, body).then((r: Response) => r)
      else added = order(f).then(r => r)
      await waitForQueue(f.companyId, 1)
      if (mode !== 'order-first') added = order(f).then(r => r)
      else pay = checkout(f, body).then((r: Response) => r)
      await waitForQueue(f.companyId, 2)
    } finally { release.resolve() }
    await holder
    const [paid, created] = await Promise.all([pay!, added!])
    expect(paid.status).toBe(200)
    expect(created.status).toBe(mode !== 'order-first' ? 403 : 201)
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(mode === 'partial-first' ? 2 : 1)
    if (mode === 'order-first') { await assertOpen(f); expect((await bill(f).expect(200)).body.total).toBe(11.7) }
  })

  it.each(['checkout', 'partial'])('un conflit PostgreSQL tardif %s annule paiement, stock, fermeture et révocation ensemble', async mode => {
    const f = await fixture(), body = await input(f), entered = deferred(), resume = deferred()
    delayEntered = entered.resolve; delayResume = resume.promise
    const paying = auth(f, request(app).post(mode === 'checkout' ? '/api/pos/checkout' : '/api/pos/payments')).set('x-fixture-pause', 'yes')
      .send(mode === 'checkout' ? body : { requestId: body.requestId, tableId: body.tableId, coverIds: body.coverIds,
        amountCents: 2340, expectedOutstandingCents: 2340, method: 'CASH' }).then((r: Response) => r)
    await entered.promise
    try { await auth(f, request(app).post('/api/floor-state/zones')).send({ name: 'Conflit FICTIF conservé' }).expect(200) }
    finally { resume.resolve(); delayEntered = undefined; delayResume = undefined }
    expect((await paying).status).toBe(409)
    await assertOpen(f)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.qrOrder.id } })).paidAt).toBeNull()
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(100)
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.orderTender.count({ where: { companyId: f.companyId } })).toBe(0)
  })
})
