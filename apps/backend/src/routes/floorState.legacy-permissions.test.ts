import express from 'express'
import request from 'supertest'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const disk = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn() }))
vi.mock('../lib/safe-json', async importActual => ({ ...await importActual<typeof import('../lib/safe-json')>(), safeWriteJson: disk.write, readJsonStrict: disk.read }))
import router, { floorCompanyContext, getFloorState } from './floorState'
import { accessFor } from '../lib/business-permissions'

const initial = () => ({ tables: [{ id: 'table', name: 'Table fictive', seats: 2, section: 'Salle', shape: 'round', status: 'LIBRE', x: 10, y: 10, items: [] }],
  chairs: [], zones: [{ id: 'room', name: 'Salle' }], photos: [], updatedAt: 10 })
function appFor(role: string, gate?: { entered(): void; resume: Promise<void> }) {
  const companyId = `legacy-floor-permission-${randomUUID()}`, app = express().use(express.json())
  app.use((req, _res, next) => {
    Object.assign(req, { companyId, user: { userId: 'fictitious-member' }, role,
      businessAccess: accessFor({ companyId, userId: 'fictitious-member', role }) }); next()
  })
  app.use('/api/floor-state', floorCompanyContext)
  app.post('/api/floor-state/delayed', async (_req, res) => {
    getFloorState().tables[0].status = 'RESERVEE'; gate!.entered(); await gate!.resume; res.json(getFloorState())
  })
  app.use('/api/floor-state', router)
  return app
}
beforeEach(() => {
  vi.stubEnv('CREORGA_FLOOR_AUTHORITY', '')
  disk.write.mockReset(); disk.read.mockReset(); disk.read.mockImplementation(() => initial())
})
afterEach(() => vi.unstubAllEnvs())

describe('Salle sur fichier : lecture conservée, écritures sans autorité couplée refusées', () => {
  it.each(['ADMIN', 'OWNER'])('refuse l’import %s avec remise sans modifier le fichier ni le cache', async role => {
    const app = appFor(role), before = (await request(app).get('/api/floor-state').expect(200)).body
    const body = structuredClone(before); body.tables[0].orderDiscount = { type: 'percent', value: 10 }
    const result = await request(app).put('/api/floor-state').set('If-Match', '10').send(body).expect(503)
    expect(result.body.code).toBe('FLOOR_AUTHORITY_REQUIRED')
    expect((await request(app).get('/api/floor-state').expect(200)).body).toEqual(before)
    expect(disk.write).not.toHaveBeenCalled()
  })

  it('refuse aussi une mutation ordinaire de service sans autorité PostgreSQL', async () => {
    const app = appFor('SERVER'), before = (await request(app).get('/api/floor-state').expect(200)).body
    const result = await request(app).post('/api/floor-state/tables/table/status').send({ status: 'RESERVEE' }).expect(503)
    expect(result.body.code).toBe('FLOOR_AUTHORITY_REQUIRED')
    expect((await request(app).get('/api/floor-state').expect(200)).body).toEqual(before)
    expect(disk.write).not.toHaveBeenCalled()
  })

  it('un brouillon retardé ne confirme jamais un succès fichier', async () => {
    let entered!: () => void, resume!: () => void
    const started = new Promise<void>(resolve => { entered = resolve }), finish = new Promise<void>(resolve => { resume = resolve })
    const app = appFor('OWNER', { entered, resume: finish }), before = (await request(app).get('/api/floor-state').expect(200)).body
    const pending = request(app).post('/api/floor-state/delayed').send({}).then(result => result)
    await started; resume()
    expect((await pending).status).toBe(503)
    expect((await request(app).get('/api/floor-state').expect(200)).body).toEqual(before)
    expect(disk.write).not.toHaveBeenCalled()
  })

  it.each(['/api/pos/checkout', '/api/agent/confirm'])('refuse %s avant toute mutation métier du gestionnaire', async route => {
    const app = express().use(express.json()), companyId = `legacy-before-handler-${randomUUID()}`
    const businessEntries: Array<{ amountCents: number }> = []
    app.use((req, _res, next) => {
      Object.assign(req, { companyId, user: { userId: 'fictitious-owner' }, role: 'OWNER',
        businessAccess: accessFor({ companyId, userId: 'fictitious-owner', role: 'OWNER' }) }); next()
    }, floorCompanyContext)
    app.post(route, (_req, res) => {
      businessEntries.push({ amountCents: 500 })
      getFloorState().tables[0].status = 'RESERVEE'
      res.json(getFloorState())
    })
    const result = await request(app).post(route).send({}).expect(503)
    expect(result.body.code).toBe('FLOOR_AUTHORITY_REQUIRED')
    expect(businessEntries).toEqual([])
    expect(disk.write).not.toHaveBeenCalled()
    expect(getFloorState(companyId)).toEqual(initial())
  })
})
