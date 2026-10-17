import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
vi.mock('../lib/prisma', async () => {
  const { PrismaClient } = await import('@prisma/client')
  return { default: new PrismaClient({ log: [{ emit: 'event', level: 'query' }] }) }
})
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import pos from './pos'
import { floorCompanyContext } from './floorState'
import { canonicalizeFloorPricing } from '../lib/pos-pricing'
import { floorHash } from '../lib/floor-workspace'

const companyId = 'projection-fictive-' + randomUUID(), actorId = companyId + '-owner'
const tableId = companyId + '-table', queries: string[] = []
const app = express().use(express.json()).use('/api/pos', deviceOrUserAuth, requireCompany, floorCompanyContext, pos)
let token: string, firstTenderId: string, originalInitialHash: string
;(prisma as any).$on('query', (event: { query: string }) => { queries.push(event.query) })
const read = () => request(app).get('/api/pos/bootstrap').set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)

describe('Projection POS : lectures bornées, soldes et cliché initial conservés', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw Error('Base de tests fictive obligatoire')
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    await prisma.company.create({ data: { id: companyId, name: 'PROJECTION FICTIVE' } })
    await prisma.user.create({ data: { id: actorId, email: actorId + '@fixture.invalid', password: 'unused', firstName: 'Fictif', lastName: 'Projection' } })
    await prisma.userCompany.create({ data: { companyId, userId: actorId, role: 'OWNER' } })
    const category = await prisma.category.create({ data: { companyId, name: 'FICTIF' } })
    const product = await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café fictif', price: 1.17, taxRate: 17, stock: 100 } })
    await prisma.table.create({ data: { id: tableId, companyId, name: 'Table fictive', capacity: 20 } })
    const session = await prisma.serviceSession.create({ data: { companyId, tableId } })
    const covers: any[] = []
    for (let i = 0; i < 20; i++) {
      const coverId = companyId + '-cover-' + i, item = { id: randomUUID(), menuItemId: product.id, name: product.name, price: 1.17, qty: 1, taxRate: 17, note: '', coverId }
      const order = await prisma.order.create({ data: { companyId, orderNumber: i + 1, source: 'POS', total: 1.17, subtotal: 1, taxAmount: .17 } })
      await prisma.serviceCover.create({ data: { companyId, coverId, sessionId: session.id, orderId: order.id, actorId, items: [item] } })
      const attempt = await prisma.paymentAttempt.create({ data: { companyId, orderId: order.id, requestId: randomUUID(), requestHash: 'fixture',
        provider: 'manual', merchantId: 'fixture', amountCents: 32, currency: 'EUR', status: 'CONFIRMED' } })
      const tender = await prisma.orderTender.create({ data: { companyId, orderId: order.id, attemptId: attempt.id, actorId, method: 'CASH', confirmation: 'manual_declaration', amountCents: 25, tipCents: 5, charityCents: 2 } })
      if (i === 0) firstTenderId = tender.id
      covers.push({ id: coverId, label: 'Fictif ' + i, items: [item] })
    }
    const snapshot: any = { tables: [{ id: tableId, name: 'Table fictive', seats: 20, section: 'Salle', shape: 'round', status: 'OCCUPEE', x: 0, y: 0, items: [], posCovers: covers }],
      chairs: [], photos: [], zones: [], updatedAt: Date.now(), storageAuthority: 'postgres' }
    canonicalizeFloorPricing({ tables: [], chairs: [] }, snapshot, [product])
    const initial = { ...snapshot, historicalPayload: 'copie fictive non nécessaire à chaque lecture'.repeat(5000) }
    originalInitialHash = floorHash(initial)
    await prisma.floorWorkspace.create({ data: { companyId, revision: BigInt(snapshot.updatedAt), snapshot, snapshotHash: floorHash(snapshot), initialSnapshot: initial, initialHash: originalInitialHash } })
    token = jwt.sign({ userId: actorId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
  })
  // Données créées exclusivement pour cette épreuve, conservées pour inspection.
  // Aucune purge de la base ou des archives de laboratoire à la fin.
  afterAll(async () => { vi.unstubAllEnvs(); await prisma.$disconnect() })

  it('lit vingt soldes exacts avec une seule lecture de règlements, sans pourboire dans le restant dû', async () => {
    queries.length = 0
    const response = await read().expect(200)
    const covers = response.body.tables.find((t: any) => t.id === tableId).covers
    expect(covers).toHaveLength(20)
    for (const cover of covers) {
      expect(cover.payment).toMatchObject({ totalCents: 117, paidCents: 25, outstandingCents: 92, legacyPaidState: false })
      expect(cover.payment.payments).toEqual([expect.objectContaining({ amountCents: 25, tipCents: 5, charityCents: 2, confirmation: 'manual_declaration' })])
    }
    expect(queries.filter(q => /\bFROM\s+"public"\."OrderTender"/.test(q))).toHaveLength(1)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(0)
    expect((await prisma.product.findFirstOrThrow({ where: { companyId } })).stock).toBe(100)
  })

  it('ne transporte pas le cliché initial dans la lecture chaude mais le conserve intégralement en base', async () => {
    queries.length = 0
    await read().expect(200)
    const workspaceQueries = queries.filter(q => /\bFROM\s+"public"\."FloorWorkspace"/.test(q))
    expect(workspaceQueries).toHaveLength(1)
    expect(workspaceQueries[0]).not.toContain('"initialSnapshot"')
    const row = await prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId } })
    expect(row.initialHash).toBe(originalInitialHash)
    expect(floorHash(row.initialSnapshot)).toBe(originalInitialHash)
  })

  it('ne recalcule pas deux fois la même projection avant un brouillon avec commandes QR', async () => {
    const product = await prisma.product.findFirstOrThrow({ where: { companyId } })
    await prisma.order.create({ data: { companyId, orderNumber: 100, source: 'GUEST', externalTableId: tableId, publicToken: randomUUID(),
      total: 1.17, subtotal: 1, taxAmount: .17, items: { create: { productId: product.id, productName: product.name, quantity: 1, unitPrice: 1.17, taxRate: 17 } } } })
    const before = (await read().expect(200)).body
    before.tables.find((t: any) => t.id === tableId).x += 1
    queries.length = 0
    await request(app).put('/api/pos/draft').set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
      .set('If-Match', String(before.revision)).send({ tables: before.tables, seats: before.seats }).expect(200)
    // Une projection avant toute mutation et une nouvelle après, jamais un cache global.
    expect(queries.filter(q => /\bFROM\s+"public"\."OrderTender"/.test(q))).toHaveLength(2)
    const row = await prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId } })
    expect(row.initialHash).toBe(originalInitialHash)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(0)
  })

  it('refuse encore la projection incohérente si les affectations dépassent la vente', async () => {
    await prisma.orderTender.update({ where: { id: firstTenderId }, data: { amountCents: 118 } })
    await read().expect(503)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(0)
  })
})
