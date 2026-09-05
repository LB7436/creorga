import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const disk = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn((_file, fallback) => fallback) }))
vi.mock('../lib/safe-json', () => ({ safeWriteJson: disk.write, safeReadJson: disk.read }))
import router, { floorCompanyContext, getFloorState } from './floorState'
import { findStaleSessions } from '../jobs/closeStaleFloorSessions'

function appFor(companyId: string) {
  const app = express().use(express.json())
  app.use((req, _res, next) => { (req as any).companyId = companyId; next() })
  app.use(floorCompanyContext)
  app.post('/delayed', async (_req, res) => {
    getFloorState().zones.push({ id: 'delayed', name: 'Conflit' })
    await new Promise((resolve) => setTimeout(resolve, 100))
    res.json(getFloorState())
  })
  app.use(router)
  return app
}
beforeEach(() => disk.write.mockReset())
describe('Salle — sauvegarde transactionnelle', () => {
  it('écrit avant le succès et conserve les données sur un nouveau GET', async () => {
    const app = appFor('persist-ok')
    const result = await request(app).post('/zones').send({ name: 'Terrasse' })
    expect(result.status).toBe(200)
    expect(disk.write).toHaveBeenCalledOnce()
    expect((await request(app).get('/')).body.zones).toEqual(result.body.zones)
  })
  it('un disque plein refuse la modification et garde le dernier état', async () => {
    const app = appFor('persist-failed')
    const before = (await request(app).get('/')).body
    disk.write.mockImplementationOnce(() => { throw new Error('ENOSPC') })
    const result = await request(app).post('/zones').send({ name: 'Non enregistrée' })
    expect(result.status).toBe(503)
    expect((await request(app).get('/')).body).toEqual(before)
  })
  it('une validation échouée ne garde pas les modifications partielles', async () => {
    const app = appFor('persist-invalid')
    await request(app).patch('/zones/salle-principale').send({ name: 'Faux', color: 'invalide' }).expect(400)
    expect((await request(app).get('/')).body.zones[0].name).toBe('Salle principale')
    expect(disk.write).not.toHaveBeenCalled()
  })
  it('refuse une version de plan périmée', async () => {
    const app = appFor('persist-version')
    await request(app).post('/zones').set('If-Match', '1').send({ name: 'Périmé' }).expect(409)
    expect(disk.write).not.toHaveBeenCalled()
  })
  it('une requête lente n’écrase pas la modification concurrente', async () => {
    const app = appFor('persist-concurrent')
    const delayed = request(app).post('/delayed').send({}).then((res) => res)
    await new Promise((resolve) => setTimeout(resolve, 30))
    await request(app).post('/zones').send({ name: 'Prioritaire' }).expect(200)
    expect((await delayed).status).toBe(409)
    expect((await request(app).get('/')).body.zones.map((z: any) => z.name)).toEqual(['Salle principale', 'Prioritaire'])
  })
  it('une vieille addition de 45 € et ses chaises restent intactes', () => {
    const state = structuredClone(getFloorState('stale-safe'))
    state.tables.push({ id: 't1', name: 'Table 1', seats: 2, section: 'Salle principale', shape: 'round', status: 'OCCUPEE', x: 100, y: 100, openedAt: Date.now() - 9 * 3600_000, items: [] })
    state.chairs.push({ id: 'c1', label: 'Chaise 1', tableId: 't1', items: [{ id: 'i1', name: 'Repas', price: 15, qty: 3, addedAt: Date.now() }] })
    const before = structuredClone(state)
    expect(findStaleSessions(state)[0].unpaidTotal).toBe(45)
    expect(state).toEqual(before)
  })
})
