import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import dossier from './rh-dossier'
import hr from './hr'
const app = express(); app.use(express.json()); app.use('/api/hr-dossier', authenticate, requireCompany, dossier); app.use('/api/hr', authenticate, requireCompany, hr)
const companyId = 'hr-document-fixture-a', companyB = 'hr-document-fixture-b'
const ids = ['hr-doc-owner', 'hr-doc-alice', 'hr-doc-bob', 'hr-doc-other']
let owner: string, alice: string, bob: string, membershipAlice: string, membershipBob: string, membershipOther: string, png: Buffer
const documentRoot = path.resolve(process.cwd(), 'data/rh-documents'), owned = new Set<string>()
function filePath(name: string) {
  if (!/^[a-f0-9]{32}\.(png|pdf|jpg|webp)$/.test(name)) throw new Error('Fixture filename refused')
  const target = path.resolve(documentRoot, name)
  if (path.dirname(target) !== documentRoot) throw new Error('Fixture path refused')
  return target
}
function cleanOwnedFiles() {
  for (const target of owned) {
    if (path.dirname(target) !== documentRoot) throw new Error('Fixture cleanup refused')
    if (!fs.existsSync(target)) continue
    if (fs.lstatSync(target).isDirectory()) fs.rmdirSync(target) // Empty directory created by this test only.
    else fs.unlinkSync(target)
  }
  owned.clear()
}
const auth = (builder: any, token = owner, company = companyId) => builder.set('Authorization', 'Bearer ' + token).set('x-company-id', company)
async function upload(membership = membershipAlice, bytes = png, mime = 'image/png') {
  const response = await auth(request(app).post(`/api/hr-dossier/employes/${membership}/documents`))
    .set('Content-Type', mime).set('x-nom-fichier', encodeURIComponent('Contrat été — fictif.png')).set('x-type-document', 'CONTRAT').send(bytes)
  if (response.status === 201) {
    const doc = await prisma.employeeDocument.findUniqueOrThrow({ where: { id: response.body.id } })
    owned.add(filePath(doc.fichier))
  }
  return response
}
async function cleanDatabase() {
  await prisma.userCompany.deleteMany({ where: { companyId: { in: [companyId, companyB] } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.company.deleteMany({ where: { id: { in: [companyId, companyB] } } })
}
describe('Documents RH : vraies écritures et droits', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw new Error('Isolated database required')
    await cleanDatabase()
    await prisma.company.createMany({ data: [{ id: companyId, name: 'RH fictif A' }, { id: companyB, name: 'RH fictif B' }] })
    await prisma.user.createMany({ data: ids.map(id => ({ id, email: id + '@localhost.invalid', password: 'unused', firstName: id, lastName: 'Fixture' })) })
    const memberships = []
    for (let i = 0; i < ids.length; i++) memberships.push(await prisma.userCompany.create({ data: { userId: ids[i], companyId: i === 3 ? companyB : companyId, role: i === 0 ? 'OWNER' : 'EMPLOYEE' } }))
    membershipAlice = memberships[1].id; membershipBob = memberships[2].id; membershipOther = memberships[3].id
    for (const member of memberships) await prisma.employeeProfile.create({ data: { userCompanyId: member.id, salaireBrut: 1234, iban: 'FICTION-ONLY', numSecu: 'FICTION-ONLY' } })
    ;[owner, alice, bob] = ids.slice(0, 3).map(userId => jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '10m' }))
    png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#fff' } }).png().toBuffer()
  })
  beforeEach(async () => {
    await prisma.employeeDocument.deleteMany({ where: { profile: { userCompany: { companyId: { in: [companyId, companyB] } } } } })
    cleanOwnedFiles()
  })
  afterAll(async () => { cleanOwnedFiles(); await cleanDatabase(); await prisma.$disconnect() })
  it('ne divulgue aucun profil RH par le chemin annuaire équipe', async () => {
    const result = await auth(request(app).get('/api/hr/team'), alice).expect(200)
    expect(result.body.map((member: any) => member.userId)).toEqual([ids[1]])
    expect(JSON.stringify(result.body)).not.toContain('FICTION-ONLY')
  })
  it('réserve les profils de l’équipe aux responsables de la société', async () => {
    const result = await auth(request(app).get('/api/hr/team')).expect(200)
    expect(result.body).toHaveLength(3)
    expect(result.body.some((member: any) => member.userId === ids[3])).toBe(false)
    expect(result.body.some((member: any) => member.profile?.salaireBrut === 1234)).toBe(true)
  })
  it('enregistre les octets originaux et les retrouve après une nouvelle requête authentifiée', async () => {
    const result = await upload(); expect(result.status).toBe(201)
    expect(result.body.nom).toBe('Contrat été — fictif.png')
    expect(result.body.fichier).toBeUndefined()
    const download = await auth(request(app).get(`/api/hr-dossier/documents/${result.body.id}/fichier`), alice).buffer(true).expect(200)
    expect(download.body.equals(png)).toBe(true)
    expect(download.headers['cache-control']).toContain('no-store')
    const doc = await prisma.employeeDocument.findUniqueOrThrow({ where: { id: result.body.id } })
    expect(doc.sha256).toMatch(/^[a-f0-9]{64}$/)
  })
  it('refuse lecture, téléchargement et écriture hors de son propre dossier', async () => {
    const result = await upload(); expect(result.status).toBe(201)
    await auth(request(app).get(`/api/hr-dossier/documents/${result.body.id}/fichier`), bob).expect(404)
    await auth(request(app).get(`/api/hr-dossier/employes/${membershipBob}`), alice).expect(404)
    await auth(request(app).delete(`/api/hr-dossier/documents/${result.body.id}`), alice).expect(403)
    await auth(request(app).get(`/api/hr-dossier/employes/${membershipOther}`)).expect(404)
    await request(app).get(`/api/hr-dossier/documents/${result.body.id}/fichier`).expect(401)
  })
  it('refuse fichier vide, corrompu et format trompeur avant toute métadonnée', async () => {
    expect((await upload(membershipAlice, Buffer.alloc(0))).status).toBe(400)
    expect((await upload(membershipAlice, Buffer.from('not-an-image'))).status).toBe(422)
    expect((await upload(membershipAlice, png, 'application/pdf')).status).toBe(422)
    expect(await prisma.employeeDocument.count({ where: { profile: { userCompanyId: membershipAlice } } })).toBe(0)
  })
  it('refuse de délivrer un fichier altéré après son enregistrement', async () => {
    const result = await upload(); expect(result.status).toBe(201)
    const doc = await prisma.employeeDocument.findUniqueOrThrow({ where: { id: result.body.id } })
    const corrupt = Buffer.from(png); corrupt[corrupt.length - 1] ^= 1
    fs.writeFileSync(filePath(doc.fichier), corrupt)
    await auth(request(app).get(`/api/hr-dossier/documents/${result.body.id}/fichier`), alice).expect(409)
  })
  it('conserve une suppression incomplète et permet sa reprise sans annoncer un faux succès', async () => {
    const result = await upload(); expect(result.status).toBe(201)
    const doc = await prisma.employeeDocument.findUniqueOrThrow({ where: { id: result.body.id } }), target = filePath(doc.fichier)
    fs.unlinkSync(target); fs.mkdirSync(target)
    await auth(request(app).delete(`/api/hr-dossier/documents/${result.body.id}`)).expect(503)
    expect((await prisma.employeeDocument.findUniqueOrThrow({ where: { id: doc.id } })).deletedAt).not.toBeNull()
    const personal = await auth(request(app).get(`/api/hr-dossier/employes/${membershipAlice}`), alice).expect(200)
    expect(personal.body.documents).toEqual([]); expect(personal.body.profil).toBeNull()
    const manager = await auth(request(app).get(`/api/hr-dossier/employes/${membershipAlice}`)).expect(200)
    expect(manager.body.documents[0].deletedAt).toBeTruthy()
    await auth(request(app).get(`/api/hr-dossier/documents/${doc.id}/fichier`), alice).expect(410)
    fs.rmdirSync(target)
    await auth(request(app).delete(`/api/hr-dossier/documents/${doc.id}`)).expect(200)
    expect(await prisma.employeeDocument.findUnique({ where: { id: doc.id } })).toBeNull()
  })
  it('signale les fichiers historiques sans fabriquer une preuve d’intégrité', async () => {
    const result = await upload(); expect(result.status).toBe(201)
    await prisma.employeeDocument.update({ where: { id: result.body.id }, data: { sha256: null } })
    const download = await auth(request(app).get(`/api/hr-dossier/documents/${result.body.id}/fichier`), alice).expect(200)
    expect(download.headers['x-creorga-integrity']).toBe('legacy-unverified')
  })
})
