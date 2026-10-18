import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const disk = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn((_file, fallback) => fallback) }))
vi.mock('../lib/safe-json', async importOriginal => ({ ...(await importOriginal<typeof import('../lib/safe-json')>()), safeWriteJson: disk.write, readJsonStrict: disk.read }))
import { JsonStoreUnavailableError } from '../lib/safe-json'
import router, { floorCompanyContext, getFloorState } from './floorState'
import { findStaleSessions } from '../jobs/closeStaleFloorSessions'
import { accessFor } from '../lib/business-permissions'

function appFor(companyId: string, gate?: { entered: () => void; resume: Promise<void> }) {
  const app = express().use(express.json())
  app.use((req, _res, next) => { Object.assign(req, { companyId, role: 'OWNER', user: { userId: 'fixture-owner' },
    businessAccess: accessFor({ companyId, userId: 'fixture-owner', role: 'OWNER' }) }); next() })
  app.use(floorCompanyContext)
  app.post('/delayed', async (_req, res) => {
    getFloorState().zones.push({ id: 'delayed', name: 'Conflit' })
    gate?.entered()
    if (gate) await gate.resume
    res.json(getFloorState())
  })
  app.use(router)
  return app
}
beforeEach(() => { disk.write.mockReset(); disk.read.mockReset(); disk.read.mockImplementation((_file, fallback) => fallback) })
describe('Salle — sauvegarde transactionnelle', () => {
  it('conserve le fichier historique en lecture seule sans succès local de sauvegarde', async () => {
    const app = appFor('persist-ok')
    const before = (await request(app).get('/')).body
    const result = await request(app).post('/zones').send({ name: 'Terrasse' })
    expect(result.status).toBe(503)
    expect(result.body.code).toBe('FLOOR_AUTHORITY_REQUIRED')
    expect(disk.write).not.toHaveBeenCalled()
    expect((await request(app).get('/')).body).toEqual(before)
  })
  it('refuse avant toute écriture fichier et garde le dernier état même si le disque est indisponible', async () => {
    const app = appFor('persist-failed')
    const before = (await request(app).get('/')).body
    disk.write.mockImplementationOnce(() => { throw new Error('ENOSPC') })
    const result = await request(app).post('/zones').send({ name: 'Non enregistrée' })
    expect(result.status).toBe(503)
    expect(result.body.code).toBe('FLOOR_AUTHORITY_REQUIRED')
    expect(disk.write).not.toHaveBeenCalled()
    expect((await request(app).get('/')).body).toEqual(before)
  })
  it('une salle corrompue refuse lecture et écriture sans créer un plan vide', async () => {
    disk.read.mockImplementation(() => { throw new JsonStoreUnavailableError(true) })
    const app = appFor('persist-corrupt')
    const loaded = await request(app).get('/').expect(503)
    expect(loaded.body.code).toBe('FLOOR_STORAGE_UNAVAILABLE')
    expect(loaded.body.recoveryAvailable).toBe(true)
    expect(loaded.body.tables).toBeUndefined()
    await request(app).post('/zones').send({ name: 'Écrasement interdit' }).expect(503)
    expect(disk.write).not.toHaveBeenCalled()
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
  it('deux requêtes fichier concurrentes refusées ne modifient ni le cache ni le disque', async () => {
    let entered!: () => void, resume!: () => void
    const started = new Promise<void>(resolve => { entered = resolve })
    const finish = new Promise<void>(resolve => { resume = resolve })
    const app = appFor('persist-concurrent', { entered, resume: finish })
    const before = (await request(app).get('/')).body
    const delayed = request(app).post('/delayed').send({}).then((res) => res)
    await started
    const refused = await request(app).post('/zones').send({ name: 'Prioritaire' }).expect(503)
    expect(refused.body.code).toBe('FLOOR_AUTHORITY_REQUIRED')
    resume()
    expect((await delayed).status).toBe(503)
    expect((await request(app).get('/')).body).toEqual(before)
    expect(disk.write).not.toHaveBeenCalled()
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
