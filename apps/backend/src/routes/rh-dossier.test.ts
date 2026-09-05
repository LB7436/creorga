import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
const db = vi.hoisted(() => ({ userCompany: { findMany: vi.fn(), findFirst: vi.fn() }, employeeDocument: { findFirst: vi.fn() } }))
vi.mock('../lib/prisma', () => ({ default: db }))
import router from './rh-dossier'
function app(role = 'EMPLOYEE', userId = 'alice') {
  const a = express(); a.use(express.json()); a.use((req: any, _res, next) => { req.role = role; req.user = { userId }; req.companyId = 'A'; next() }); a.use(router); return a
}
beforeEach(() => vi.clearAllMocks())
describe('droits dossiers RH', () => {
  it('filtre la liste sur le salarié connecté', async () => {
    db.userCompany.findMany.mockResolvedValue([])
    const r = await request(app()).get('/employes')
    expect(r.status).toBe(200); expect(r.body.permissions.canManage).toBe(false)
    expect(db.userCompany.findMany.mock.calls[0][0].where).toEqual({ companyId: 'A', userId: 'alice' })
  })
  it.each(['OWNER', 'MANAGER'])('autorise la gestion %s, limitée à la société', async role => {
    db.userCompany.findMany.mockResolvedValue([])
    const r = await request(app(role)).get('/employes')
    expect(r.body.permissions.canManage).toBe(true)
    expect(db.userCompany.findMany.mock.calls[0][0].where).toEqual({ companyId: 'A' })
  })
  it('empêche de lire le dossier d’un collègue ou d’une autre société', async () => {
    db.userCompany.findFirst.mockResolvedValue(null)
    expect((await request(app()).get('/employes/bob-membership')).status).toBe(404)
    expect(db.userCompany.findFirst.mock.calls[0][0].where).toEqual({ id: 'bob-membership', companyId: 'A', userId: 'alice' })
  })
  it('restreint également le téléchargement direct à son propre dossier', async () => {
    db.employeeDocument.findFirst.mockResolvedValue(null)
    expect((await request(app()).get('/documents/doc-bob/fichier')).status).toBe(404)
    expect(db.employeeDocument.findFirst.mock.calls[0][0].where.profile.userCompany).toEqual({ companyId: 'A', userId: 'alice' })
  })
  it.each([['put','/employes/bob'],['post','/employes/alice/notes'],['delete','/notes/note-bob'],['post','/employes/alice/documents'],['delete','/documents/doc-bob']])('refuse toute écriture salarié %s %s', async (method, url) => {
    expect((await (request(app()) as any)[method](url).send({ texte: 'Interdit' })).status).toBe(403)
    expect(db.userCompany.findFirst).not.toHaveBeenCalled()
  })
})
