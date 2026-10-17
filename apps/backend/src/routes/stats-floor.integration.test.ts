import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { floorHash } from '../lib/floor-workspace'
import stats from './stats'

const prefix = 'stats-floor-fictive-' + randomUUID()
const companies = ['a', 'b', 'empty', 'legacy', 'invalid', 'foreign'].map(id => `${prefix}-${id}`)
const [companyA, companyB, emptyCompany, legacyCompany, invalidCompany, foreignCompany] = companies
const userId = prefix + '-owner'
const app = express().use(express.json()).use('/api/stats', stats)
let token: string
const read = (companyId: string) => request(app).get('/api/stats/today').set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
const floor = (count: number, occupied = 0) => ({
  tables: Array.from({ length: count }, (_, index) => ({ id: 'table-' + index, name: 'Table fictive ' + index,
    seats: 6, section: 'Salle fictive', shape: 'round', status: index < occupied ? 'OCCUPEE' : 'LIBRE', x: 0, y: 0, items: [] })),
  chairs: [], photos: [], zones: [], updatedAt: 1000,
})
const save = (companyId: string, snapshot: ReturnType<typeof floor>) => prisma.floorWorkspace.upsert({
  where: { companyId },
  create: { companyId, revision: BigInt(snapshot.updatedAt), snapshot, snapshotHash: floorHash(snapshot), initialSnapshot: snapshot, initialHash: floorHash(snapshot) },
  update: { revision: BigInt(snapshot.updatedAt), snapshot, snapshotHash: floorHash(snapshot) },
})

describe('Statistiques : même occupation que le workspace de salle, sans ventes inventées', () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!)
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || url.hostname !== '127.0.0.1' || url.pathname !== '/creorga_tests') throw Error('Base de laboratoire fictive obligatoire')
    await prisma.company.createMany({ data: companies.map(id => ({ id, name: 'STATISTIQUES FICTIVES ' + id.split('-').at(-1) })) })
    await prisma.user.create({ data: { id: userId, email: userId + '@fixture.invalid', password: 'unused', firstName: 'Compte', lastName: 'Fictif' } })
    await prisma.userCompany.createMany({ data: companies.filter(id => id !== foreignCompany).map(companyId => ({ companyId, userId, role: 'OWNER' })) })
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
    await save(companyA, floor(4))
    await save(companyB, floor(2, 1))
    await save(emptyCompany, floor(0))
    await save(invalidCompany, floor(3))
    for (const companyId of [emptyCompany, legacyCompany, invalidCompany]) await prisma.table.createMany({ data: [
      { companyId, name: 'Ancienne table fictive active' }, { companyId, name: 'Ancienne table fictive inactive', isActive: false },
    ] })
  })
  // Conservation des fixtures pour inspection : aucune purge ni suppression d'archive.
  afterAll(async () => { await prisma.$disconnect() })

  it('compte quatre tables de workspace quand aucune Table SQL historique n’existe', async () => {
    expect(await prisma.table.count({ where: { companyId: companyA } })).toBe(0)
    const response = await read(companyA).expect(200)
    expect(response.body).toMatchObject({ tablesTotal: 4, tablesOccupied: 0, tablesFree: 4, tablesUnavailable: 0, tablesSource: 'postgres-workspace' })
    expect(await prisma.table.count({ where: { companyId: companyA } })).toBe(0)
    expect(await prisma.order.count({ where: { companyId: companyA } })).toBe(0)
  })

  it('une table explicitement ouverte compte une table occupée sans commande ni six clients supposés', async () => {
    await save(companyA, floor(4, 1))
    const response = await read(companyA).expect(200)
    expect(response.body).toMatchObject({ tablesTotal: 4, tablesOccupied: 1, tablesFree: 3 })
    expect(response.body).not.toHaveProperty('customers')
    expect(await prisma.order.count({ where: { companyId: companyA } })).toBe(0)
  })

  it('les anciennes tables et leurs commandes ne doublent pas le workspace et ne recréent pas ses statuts', async () => {
    const table = await prisma.table.create({ data: { companyId: companyA, name: 'Miroir ancien fictif' } })
    await prisma.order.create({ data: { companyId: companyA, tableId: table.id, externalTableId: 'table-3', orderNumber: 1, status: 'OPEN' } })
    const response = await read(companyA).expect(200)
    expect(response.body).toMatchObject({ tablesTotal: 4, tablesOccupied: 1, tablesFree: 3, tablesSource: 'postgres-workspace' })
  })

  it('changer de société puis revenir lit chaque workspace sans fuite ou cache de l’autre société', async () => {
    expect((await read(companyB).expect(200)).body).toMatchObject({ tablesTotal: 2, tablesOccupied: 1, tablesFree: 1 })
    expect((await read(companyA).expect(200)).body).toMatchObject({ tablesTotal: 4, tablesOccupied: 1, tablesFree: 3 })
    await read(foreignCompany).expect(403)
  })

  it('un workspace vide reste prioritaire sur les anciennes tables SQL', async () => {
    expect((await read(emptyCompany).expect(200)).body).toMatchObject({ tablesTotal: 0, tablesOccupied: 0, tablesFree: 0, tablesSource: 'postgres-workspace' })
  })

  it('réservée et nettoyage ne sont pas annoncées libres ou occupées', async () => {
    const snapshot = floor(4, 1)
    snapshot.tables[2].status = 'RESERVEE'
    snapshot.tables[3].status = 'NETTOYAGE'
    await save(companyB, snapshot)
    expect((await read(companyB).expect(200)).body).toMatchObject({ tablesTotal: 4, tablesOccupied: 1, tablesFree: 1, tablesUnavailable: 2 })
  })

  it('sans workspace le total historique est identifié et l’occupation reste inconnue, pas inférée des commandes', async () => {
    const table = await prisma.table.findFirstOrThrow({ where: { companyId: legacyCompany, isActive: true } })
    await prisma.order.create({ data: { companyId: legacyCompany, tableId: table.id, orderNumber: 1, status: 'OPEN' } })
    expect((await read(legacyCompany).expect(200)).body).toMatchObject({ tablesTotal: 1, tablesOccupied: null, tablesFree: null, tablesUnavailable: null, tablesSource: 'legacy-sql-configuration' })
    expect(await prisma.floorWorkspace.count({ where: { companyId: legacyCompany } })).toBe(0)
  })

  it.each(['empreinte', 'revision', 'structure'])('un workspace incohérent (%s) refuse les chiffres plutôt que relire un miroir', async reason => {
    const snapshot = floor(3)
    await save(invalidCompany, snapshot)
    await prisma.floorWorkspace.update({ where: { companyId: invalidCompany }, data: reason === 'empreinte' ? { snapshotHash: 'invalide' }
      : reason === 'revision' ? { revision: 999n }
      : { snapshot: { ...snapshot, tables: [null] }, snapshotHash: floorHash({ ...snapshot, tables: [null] }) } })
    const response = await read(invalidCompany).expect(503)
    expect(response.body.code).toBe('FLOOR_WORKSPACE_INVALID')
    expect(response.body).not.toHaveProperty('tablesOccupied')
  })
})
