import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import floorRouter, { floorCompanyContext, remplacerPlanDeSalle } from './floorState'

const companyId = 'chair-occupancy-fictive-' + randomUUID(), actorId = companyId + '-owner'
const app = express().use(express.json())
app.use('/api/floor-state', deviceOrUserAuth, requireCompany, floorCompanyContext, floorRouter)
let token: string, productId: string
const auth = (r: any) => r.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
const read = () => auth(request(app).get('/api/floor-state')).expect(200)
const saved = () => prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId } })
const createTable = async () => {
  const response = await auth(request(app).post('/api/floor-state/tables')).send({
    name: 'Table fictive ' + randomUUID(), section: 'Salle fictive', shape: 'round', seats: 6, x: 100, y: 100,
  }).expect(201)
  return response.body.tables.at(-1).id as string
}
const addChair = async (tableId: string, customerName?: string) => {
  const response = await auth(request(app).post('/api/floor-state/chairs')).send({ tableId, customerName }).expect(200)
  return response.body.chairs.at(-1).id as string
}
const tableIn = (floor: any, id: string) => floor.tables.find((table: any) => table.id === id)
const chairIn = (floor: any, id: string) => floor.chairs.find((chair: any) => chair.id === id)

describe('Chaises : agencement neutre et occupation explicite au début du service', () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!)
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || url.hostname !== '127.0.0.1' || url.pathname !== '/creorga_tests') {
      throw Error('Seule une base fictive nommée creorga_tests sur loopback est autorisée')
    }
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    await prisma.company.create({ data: { id: companyId, name: 'AGENCEMENT CHAISES FICTIF' } })
    await prisma.user.create({ data: { id: actorId, email: actorId + '@fixture.invalid', password: 'unused', firstName: 'Fictif', lastName: 'Chaises' } })
    await prisma.userCompany.create({ data: { userId: actorId, companyId, role: 'OWNER' } })
    const category = await prisma.category.create({ data: { companyId, name: 'Catalogue fictif' } })
    productId = (await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café fictif', price: 2.34, taxRate: 17, stock: 100 } })).id
    token = jwt.sign({ userId: actorId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
    remplacerPlanDeSalle({ tables: [], chairs: [], photos: [], zones: [{ id: 'salle-fictive', name: 'Salle fictive' }], updatedAt: 1000 }, companyId)
  })
  // Les fixtures sont conservées pour inspection ; aucune purge ni archive supprimée.
  afterAll(async () => { vi.unstubAllEnvs(); await prisma.$disconnect() })

  it('configurer six chaises vides laisse la table libre sans démarrer de service ni de vente', async () => {
    const tableId = await createTable()
    for (let i = 0; i < 6; i++) {
      await addChair(tableId)
      expect(tableIn((await read()).body, tableId)).toMatchObject({ status: 'LIBRE', items: [] })
      expect(tableIn((await read()).body, tableId).openedAt).toBeUndefined()
    }
    const persisted: any = (await saved()).snapshot
    expect(persisted.chairs.filter((chair: any) => chair.tableId === tableId)).toHaveLength(6)
    expect(persisted.chairs.filter((chair: any) => chair.tableId === tableId).flatMap((chair: any) => chair.items)).toEqual([])
    expect(tableIn(persisted, tableId)).toMatchObject({ status: 'LIBRE', items: [] })
    expect(tableIn(persisted, tableId).openedAt).toBeUndefined()
    expect(await prisma.serviceSession.count({ where: { companyId } })).toBe(0)
    expect(await prisma.serviceCover.count({ where: { companyId } })).toBe(0)
    expect(await prisma.order.count({ where: { companyId } })).toBe(0)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(0)
    expect(await prisma.paymentAttempt.count({ where: { companyId } })).toBe(0)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(100)
  })

  it.each(['RESERVEE', 'NETTOYAGE'])('ajouter une chaise de configuration conserve le statut %s', async status => {
    const tableId = await createTable()
    await auth(request(app).post(`/api/floor-state/tables/${tableId}/status`)).send({ status }).expect(200)
    await addChair(tableId)
    expect(tableIn((await read()).body, tableId)).toMatchObject({ status })
    expect(tableIn((await read()).body, tableId).openedAt).toBeUndefined()
  })

  it('un client nommé explicitement à la création conserve le début de service existant', async () => {
    const tableId = await createTable()
    const chairId = await addChair(tableId, 'Client fictif')
    const response = await read()
    expect(tableIn(response.body, tableId).status).toBe('OCCUPEE')
    expect(tableIn(response.body, tableId).openedAt).toEqual(expect.any(Number))
    expect(chairIn(response.body, chairId)).toMatchObject({ customerName: 'Client fictif', items: [] })
  })

  it('le premier article validé occupe explicitement une table jusque-là libre', async () => {
    const tableId = await createTable(), chairId = await addChair(tableId)
    // Le statut doit rester libre jusqu'à l'article, pas dépendre de l'ajout de chaise.
    expect(tableIn((await read()).body, tableId).status).toBe('LIBRE')
    const response = await auth(request(app).post(`/api/floor-state/chairs/${chairId}/items`)).send({
      productId, name: 'Prix client non fiable', price: 0.01, qty: 2, note: 'Consigne fictive bar',
    }).expect(200)
    expect(tableIn(response.body, tableId).status).toBe('OCCUPEE')
    expect(tableIn(response.body, tableId).openedAt).toEqual(expect.any(Number))
    expect(chairIn(response.body, chairId).items).toEqual([expect.objectContaining({ productId, name: 'Café fictif', price: 2.34, taxRate: 17, qty: 2, note: 'Consigne fictive bar' })])
    const persisted: any = (await saved()).snapshot
    expect(tableIn(persisted, tableId)).toEqual(tableIn(response.body, tableId))
    expect(chairIn(persisted, chairId).items).toEqual(chairIn(response.body, chairId).items)
    expect(await prisma.serviceCover.count({ where: { companyId, state: 'OPEN' } })).toBe(1)
    expect(await prisma.order.count({ where: { companyId } })).toBe(0)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(0)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(100)
  })

  it('ajouter une chaise ou un article ne réinitialise pas l’heure d’une table déjà ouverte', async () => {
    const tableId = await createTable()
    const opened = await auth(request(app).post(`/api/floor-state/tables/${tableId}/open`)).expect(200)
    const openedAt = tableIn(opened.body, tableId).openedAt
    const chairId = await addChair(tableId)
    const response = await auth(request(app).post(`/api/floor-state/chairs/${chairId}/items`)).send({ productId, name: 'Café fictif', price: 2.34 }).expect(200)
    expect(tableIn(response.body, tableId)).toMatchObject({ status: 'OCCUPEE', openedAt })
    expect(tableIn((await read()).body, tableId)).toMatchObject({ status: 'OCCUPEE', openedAt })
  })

  it('un article de catalogue refusé ne change ni statut, ni lignes, ni révision persistée', async () => {
    const tableId = await createTable(), chairId = await addChair(tableId)
    const before = await saved()
    const response = await auth(request(app).post(`/api/floor-state/chairs/${chairId}/items`)).send({
      productId: 'catalogue-inconnu-fictif', name: 'Ne doit pas être enregistré', price: 0.01,
    }).expect(409)
    expect(response.body.error).toBeTruthy()
    const after = await saved()
    expect(after).toEqual(before)
    expect(tableIn((await read()).body, tableId)).toMatchObject({ status: 'LIBRE', items: [] })
    expect(tableIn((await read()).body, tableId).openedAt).toBeUndefined()
    expect(chairIn((await read()).body, chairId).items).toEqual([])
  })

  it('supprimer une chaise vide ne ferme pas la table ou les autres clients', async () => {
    const tableId = await createTable(), clientChair = await addChair(tableId, 'Client fictif présent'), emptyChair = await addChair(tableId)
    const before = tableIn((await read()).body, tableId)
    const response = await auth(request(app).delete(`/api/floor-state/chairs/${emptyChair}`)).expect(200)
    expect(tableIn(response.body, tableId)).toEqual(before)
    expect(chairIn(response.body, clientChair).customerName).toBe('Client fictif présent')
    expect(chairIn(response.body, emptyChair)).toBeUndefined()
  })

  it('deux agencements concurrents conservent le CAS sans occuper la table', async () => {
    const tableId = await createTable(), initial = (await read()).body
    const results = await Promise.all(['A', 'B'].map(label => auth(request(app).post('/api/floor-state/chairs'))
      .set('If-Match', String(initial.updatedAt)).send({ tableId, label })))
    expect(results.map(response => response.status).sort()).toEqual([200, 409])
    const floor = (await read()).body
    expect(floor.chairs.filter((chair: any) => chair.tableId === tableId)).toHaveLength(1)
    expect(tableIn(floor, tableId)).toMatchObject({ status: 'LIBRE', items: [] })
    expect(tableIn(floor, tableId).openedAt).toBeUndefined()
  })
})
