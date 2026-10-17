import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FloorState } from './floorState'

const { readFloor, database } = vi.hoisted(() => {
  const empty = async () => []
  return { readFloor: vi.fn(), database: {
    product: { findMany: empty }, posCoverPayment: { findMany: empty }, order: { findMany: empty },
    table: { findMany: empty }, saleOrigin: { findMany: empty }, orderItem: { findMany: empty },
    serviceShare: { findMany: empty }, serviceCover: { findMany: empty }, userCompany: { findMany: empty },
    posSale: { findMany: empty }, posClosure: { findMany: empty }, reservation: { findMany: empty },
    companySettings: { findUnique: async () => null },
  } }
})
// Seule la frontière de lecture des données est remplacée : vraie route Express,
// vrais adaptateurs/bootstrap, aucune connexion PostgreSQL ni écriture de fichier.
vi.mock('../lib/prisma', () => ({ default: database, prisma: database }))
vi.mock('./floorState', async importActual => ({ ...await importActual<typeof import('./floorState')>(), getFloorState: readFloor }))
import pos from './pos'

const app = express()
app.use('/pos', (req, _res, next) => {
  Object.assign(req, { companyId: 'salles-fictives', company: { name: 'Salles FICTIVES' }, user: { userId: 'responsable-fictif' } })
  next()
}, pos)
let floor: FloorState
const originalTable = (section: string) => ({ id: 'table-fictive', name: 'Table FICTIVE', section, x: 160, y: 140, shape: 'round' as const, seats: 4, status: 'LIBRE' as const, items: [] })
const bootstrap = async () => (await request(app).get('/pos/bootstrap').expect(200)).body

beforeEach(() => {
  floor = { zones: [{ id: 'salle-a', name: 'Même salle' }, { id: 'salle-b', name: 'Même salle' }], tables: [originalTable('Même salle')], chairs: [], photos: [], updatedAt: 123 }
  readFloor.mockImplementation(() => floor)
})

describe('Bootstrap POS : identité de salle sans attribution silencieuse', () => {
  it('conserve un ancien libellé ambigu pour la liste non confirmée', async () => {
    const result = await bootstrap()
    expect(result.tables[0]).toMatchObject({ id: 'table-fictive', section: 'Même salle', x: 160, y: 140 })
    expect(result.editor.rooms.map((room: any) => room.id)).toEqual(['salle-a', 'salle-b'])
  })

  it('ne remplace jamais un ID exact par la salle dont le libellé ressemble à cet ID', async () => {
    floor.zones = [{ id: 'salle-a', name: 'Salle A' }, { id: 'salle-b', name: 'salle-a' }]
    floor.tables = [originalTable('salle-a')]
    expect((await bootstrap()).tables[0].section).toBe('salle-a')
  })

  it('continue à résoudre un libellé historique lorsqu’il désigne une seule salle', async () => {
    floor.zones = [{ id: 'salle-a', name: 'Salle unique' }, { id: 'salle-b', name: 'Autre salle' }]
    floor.tables = [originalTable('Salle unique')]
    expect((await bootstrap()).tables[0].section).toBe('salle-a')
  })

  it('préfère la géométrie sauvegardée de l’ID exact à un ancien alias rencontré avant lui', async () => {
    floor.zones = [{ id: 'salle-a', name: 'Salle unique' }]
    floor.posEditor = { rooms: [{ id: 'Salle unique', x: 999, y: 999, w: 100, h: 100 }, { id: 'salle-a', x: 70, y: 80, w: 500, h: 400 }] }
    expect((await bootstrap()).editor.rooms[0]).toMatchObject({ id: 'salle-a', x: 70, y: 80, w: 500, h: 400 })
  })

  it('ne copie pas un cadre historique au nom ambigu sur deux salles distinctes', async () => {
    floor.posEditor = { rooms: [{ id: 'Même salle', x: 999, y: 999, w: 100, h: 100 }] }
    const before = structuredClone(floor)
    const result = await bootstrap()
    expect(result.editor.rooms.map((room: any) => [room.id, room.x, room.y])).toEqual([['salle-a', 20, 20], ['salle-b', 380, 20]])
    expect(floor).toEqual(before)
    expect(result.tables[0]).toMatchObject({ section: 'Même salle', x: 160, y: 140 })
  })

  it('n’utilise pas comme alias une géométrie appartenant à l’ID d’une autre salle', async () => {
    floor.zones = [{ id: 'salle-a', name: 'salle-b' }, { id: 'salle-b', name: 'Salle B' }]
    floor.posEditor = { rooms: [{ id: 'salle-b', x: 777, y: 888, w: 300, h: 400 }] }
    const result = await bootstrap()
    expect(result.editor.rooms.map((room: any) => [room.id, room.x, room.y])).toEqual([['salle-a', 20, 20], ['salle-b', 777, 888]])
  })
})
