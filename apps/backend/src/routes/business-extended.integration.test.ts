import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import hr from './hr'
import haccp from './haccp'
import inventory from './inventory'
import pos from './pos'
import guest from './guest'
import { floorCompanyContext } from './floorState'
const companyId = 'integration-business-' + randomUUID(), owner = companyId + '-owner', staff = companyId + '-staff', colleague = companyId + '-colleague'
let token: string, staffToken: string, colleagueToken: string, productId: string
const app = express().use(express.json())
for (const [url, router] of [['hr', hr], ['haccp', haccp], ['inventory', inventory]] as const) app.use('/api/' + url, deviceOrUserAuth, requireCompany, router)
app.use('/api/pos', deviceOrUserAuth, requireCompany, floorCompanyContext, pos); app.use('/api/guest', guest)
app.get('/api/probe-device', deviceOrUserAuth, requireCompany, (req: any, res) => res.json({ companyId: req.companyId }))
const auth = (r: any, access = () => token) => r.set('Authorization', 'Bearer ' + access()).set('x-company-id', companyId)
describe('Recette étendue : parcours réellement accessibles en laboratoire', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw Error('Base fictive obligatoire')
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    await prisma.company.create({ data: { id: companyId, name: 'RECETTE ÉTENDUE FICTIVE' } })
    for (const [id, role] of [[owner, 'OWNER'], [staff, 'EMPLOYEE'], [colleague, 'EMPLOYEE']]) {
      await prisma.user.create({ data: { id, email: id + '@localhost.invalid', password: 'unused', firstName: 'Fictif', lastName: role } })
      await prisma.userCompany.create({ data: { companyId, userId: id, role } })
    }
    token = jwt.sign({ userId: owner }, process.env.JWT_SECRET!, { expiresIn: '30m' })
    staffToken = jwt.sign({ userId: staff }, process.env.JWT_SECRET!, { expiresIn: '30m' }); colleagueToken = jwt.sign({ userId: colleague }, process.env.JWT_SECRET!, { expiresIn: '30m' })
    const category = await prisma.category.create({ data: { companyId, name: 'FICTIF' } })
    productId = (await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Indisponible fictif', price: 3.5, taxRate: 3, isActive: false } })).id
  })
  afterAll(async () => {
    await prisma.leaveRequest.deleteMany({ where: { companyId } }); await prisma.haccpLog.deleteMany({ where: { companyId } }); await prisma.haccpTask.deleteMany({ where: { companyId } })
    await prisma.purchaseOrder.deleteMany({ where: { companyId } }); await prisma.ingredient.deleteMany({ where: { companyId } }); await prisma.supplier.deleteMany({ where: { companyId } })
    await prisma.product.deleteMany({ where: { companyId } }); await prisma.category.deleteMany({ where: { companyId } })
    await prisma.userCompany.deleteMany({ where: { companyId } }); await prisma.user.deleteMany({ where: { id: { in: [owner, staff, colleague] } } })
    await prisma.company.deleteMany({ where: { id: companyId } }); await prisma.$disconnect(); vi.unstubAllEnvs()
  })
  it('un congé ne fuit pas vers le collègue ; seul le responsable approuve et l’état persiste', async () => {
    const data = { userId: staff, type: 'VACATION', startDate: '2027-01-05T00:00:00Z', endDate: '2027-01-07T00:00:00Z', notes: 'FICTIF' }
    const created = (await auth(request(app).post('/api/hr/leave-requests'), () => staffToken).send(data).expect(201)).body
    await auth(request(app).post('/api/hr/leave-requests'), () => colleagueToken).send(data).expect(403)
    await auth(request(app).put(`/api/hr/leave-requests/${created.id}/status`), () => staffToken).send({ status: 'APPROVED' }).expect(403)
    expect((await auth(request(app).get('/api/hr/leave-requests'), () => colleagueToken).expect(200)).body).toEqual([])
    await auth(request(app).put(`/api/hr/leave-requests/${created.id}/status`)).send({ status: 'APPROVED' }).expect(200)
    expect((await auth(request(app).get('/api/hr/leave-requests'), () => staffToken).expect(200)).body).toMatchObject([{ id: created.id, status: 'APPROVED' }])
    expect((await prisma.leaveRequest.findUniqueOrThrow({ where: { id: created.id } })).status).toBe('APPROVED')
  })
  it('une température manquante ne devient ni zéro ni conforme ; la mesure saisie est identifiée manuelle', async () => {
    await auth(request(app).post('/api/haccp/tasks')).send({ name: 'Frigo fictif sans capteur', frequency: 'DAILY', timeOfDay: 'MORNING' }).expect(201)
    const report = (await auth(request(app).get('/api/haccp/daily-report')).expect(200)).body
    expect(report.complianceRate).toBeNull()
    await auth(request(app).post('/api/haccp/logs')).send({ type: 'FRIDGE_TEMP', value: '', isCompliant: true }).expect(400)
    for (const value of ['   ', '\t\n', false, [], {}]) await auth(request(app).post('/api/haccp/logs')).send({ type: 'FRIDGE_TEMP', value, isCompliant: true }).expect(400)
    expect(await prisma.haccpLog.count({ where: { companyId } })).toBe(0)
    const recorded = (await auth(request(app).post('/api/haccp/logs')).send({ type: 'FRIDGE_TEMP', value: 4, isCompliant: true, notes: 'Lecture manuelle FICTIVE', source: 'SENSOR' }).expect(201)).body
    expect(recorded).toMatchObject({ value: 4, source: 'MANUAL', loggedBy: owner })
    expect((await auth(request(app).get('/api/haccp/logs')).expect(200)).body[0]).toMatchObject({ value: 4, source: 'MANUAL' })
  })
  it('révoquer un jeton de caisse dans la configuration bloque immédiatement son ancien accès sans révoquer l’autre', async () => {
    vi.stubEnv('POS_DEVICE_TOKEN', '')
    vi.stubEnv('POS_DEVICE_TOKENS', `${companyId}:fixture-device-one,${companyId}:fixture-device-two`)
    const device = (value: string) => request(app).get('/api/probe-device').set('x-company-id', companyId).set('x-device-token', value)
    await device('fixture-device-one').expect(200); await device('fixture-device-two').expect(200)
    vi.stubEnv('POS_DEVICE_TOKENS', `${companyId}:fixture-device-two`)
    await device('fixture-device-one').expect(401); await device('fixture-device-two').expect(200)
  })
  it('un produit inactif ne peut être ajouté depuis un brouillon POS ni une commande QR', async () => {
    const boot = (await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body
    expect(boot.menu.some((p: any) => p.id === productId)).toBe(false)
    const tableId = randomUUID(), coverId = randomUUID()
    const table = { id: tableId, name: 'Indisponibilité fictive', shape: 'round', seats: 2, x: 0, y: 0, section: 'Salle', mergedWith: [], status: 'occupied', covers: [{ id: coverId, label: 'Fictif', items: [{ id: randomUUID(), menuItemId: productId, name: 'Inactif', price: 3.5, qty: 1, note: '', coverId }] }] }
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(boot.revision)).send({ tables: [table], seats: [] }).expect(409)
    const empty = { ...table, covers: [], status: 'available' }
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(boot.revision)).send({ tables: [empty], seats: [] }).expect(200)
    await auth(request(app).post('/api/guest/orders')).send({ requestId: randomUUID(), companyId, tableId, items: [{ productId, qty: 1 }] }).expect(409)
    expect(await prisma.order.count({ where: { companyId } })).toBe(0)
  })
  it('une demande de réception partielle non prise en charge ne crédite jamais toute la commande fournisseur', async () => {
    const supplier = (await auth(request(app).post('/api/inventory/suppliers')).send({ name: 'Fournisseur fictif' }).expect(201)).body
    const ingredient = (await auth(request(app).post('/api/inventory/ingredients')).send({ name: 'Eau fictive', unit: 'L', currentStock: 0 }).expect(201)).body
    const purchase = (await auth(request(app).post('/api/inventory/purchase-orders')).send({ supplierId: supplier.id, items: [{ ingredientId: ingredient.id, quantity: 10, unitCost: 1 }] }).expect(201)).body
    await auth(request(app).put(`/api/inventory/purchase-orders/${purchase.id}/receive`)).send({ items: [{ ingredientId: ingredient.id, quantity: 2 }] }).expect(409)
    expect((await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredient.id } })).currentStock).toBe(0)
    expect((await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchase.id } })).status).toBe('DRAFT')
  })
})
