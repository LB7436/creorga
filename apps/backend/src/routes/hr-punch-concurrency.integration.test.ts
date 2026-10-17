import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Client PostgreSQL réel dédié au fichier ; le middleware de faute appelle le
// vrai SQL puis échoue seulement sur les identifiants fictifs explicitement ciblés.
vi.mock('../lib/prisma', async () => {
  const { PrismaClient } = await import('@prisma/client')
  return { default: new PrismaClient() }
})
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import hr from './hr'

const prefix = 'punch-concurrency-fictive-' + randomUUID()
const companyA = prefix + '-a', companyB = prefix + '-b', foreignCompany = prefix + '-foreign'
let beforeHandler: (() => Promise<void>) | undefined
const app = express().use(express.json()).use('/api/hr', authenticate, requireCompany,
  async (_req, _res, next) => { if (beforeHandler) await beforeHandler(); next() }, hr)
const failAfterCreateUsers = new Set<string>(), failAfterCloseIds = new Set<string>()
prisma.$use(async (params, next) => {
  const result = await next(params)
  if (params.model === 'TimePunch' && params.action === 'create' && failAfterCreateUsers.has(params.args.data.userId)) throw Error('Panne fictive après insertion SQL du pointage')
  if (params.model === 'TimePunch' && ['update', 'updateMany'].includes(params.action) && failAfterCloseIds.has(params.args.where.id)) throw Error('Panne fictive après fermeture SQL du pointage')
  return result
})
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
const newMember = async (role = 'EMPLOYEE', companies = [companyA]) => {
  const userId = prefix + '-' + randomUUID()
  await prisma.user.create({ data: { id: userId, email: userId + '@fixture.invalid', password: 'unused', firstName: 'Pointage', lastName: 'FICTIF' } })
  await prisma.userCompany.createMany({ data: companies.map(companyId => ({ userId, companyId, role })) })
  return { userId, token: jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' }) }
}
type Member = Awaited<ReturnType<typeof newMember>>
const call = (actor: Member, direction: 'in' | 'out', companyId = companyA, target = actor.userId) => request(app).post('/api/hr/punch/' + direction)
  .set('Authorization', 'Bearer ' + actor.token).set('x-company-id', companyId).send({ userId: target })
const rows = (userId: string, companyId = companyA) => prisma.timePunch.findMany({ where: { companyId, userId }, orderBy: [{ clockIn: 'asc' }, { id: 'asc' }] })
const open = (userId: string, companyId = companyA) => prisma.timePunch.create({ data: { companyId, userId, clockIn: new Date('2026-10-01T06:00:00Z'), note: 'Entrée FICTIVE conservée' } })

describe('Pointages : concurrence, reprises et historiques préservés', () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!)
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || url.hostname !== '127.0.0.1' || url.port !== '5450' || url.pathname !== '/creorga_tests') throw Error('Seule la base fictive creorga_tests sur loopback:5450 est autorisée')
    await prisma.company.createMany({ data: [companyA, companyB, foreignCompany].map(id => ({ id, name: 'POINTAGES CONCURRENTS FICTIFS' })) })
  })
  // Fixtures et preuves laissées en place : aucune purge, reset ou suppression.
  afterAll(async () => { beforeHandler = undefined; await prisma.$disconnect() })

  it('vingt entrées simultanées créent exactement un pointage et dix-neuf conflits', async () => {
    const actor = await newMember()
    const responses = await Promise.all(Array.from({ length: 20 }, () => call(actor, 'in')))
    expect(responses.filter(response => response.status === 201)).toHaveLength(1)
    expect(responses.filter(response => response.status === 409)).toHaveLength(19)
    const saved = await rows(actor.userId)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ companyId: companyA, userId: actor.userId, clockOut: null })
  })

  it('rejouer une entrée dont la réponse est perdue conserve la même ligne sans réécriture', async () => {
    const actor = await newMember()
    await call(actor, 'in').expect(201) // Accusé volontairement non réutilisé par le client fictif.
    const before = await rows(actor.userId)
    await call(actor, 'in').expect(409)
    expect(await rows(actor.userId)).toEqual(before)
  })

  it('vingt sorties concurrentes ne ferment qu’une fois et un rejeu ne réécrit pas l’horodatage', async () => {
    const actor = await newMember(), original = await open(actor.userId)
    const responses = await Promise.all(Array.from({ length: 20 }, () => call(actor, 'out')))
    const successful = responses.filter(response => response.status === 200)
    expect(successful).toHaveLength(1)
    expect(responses.filter(response => response.status === 404)).toHaveLength(19)
    const saved = await rows(actor.userId)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ id: original.id, clockIn: original.clockIn, clockOut: new Date(successful[0].body.clockOut) })
    await call(actor, 'out').expect(404)
    expect(await rows(actor.userId)).toEqual(saved)
  })

  it('la même identité peut pointer séparément dans deux sociétés sans mélange des lignes', async () => {
    const actor = await newMember('EMPLOYEE', [companyA, companyB])
    const responses = await Promise.all([companyA, companyB].flatMap(companyId => Array.from({ length: 10 }, () => call(actor, 'in', companyId))))
    expect(responses.filter(response => response.status === 201)).toHaveLength(2)
    expect(responses.filter(response => response.status === 409)).toHaveLength(18)
    expect(await rows(actor.userId, companyA)).toHaveLength(1)
    expect(await rows(actor.userId, companyB)).toHaveLength(1)
    await call(actor, 'out', companyA).expect(200)
    expect((await rows(actor.userId, companyB))[0].clockOut).toBeNull()
  })

  it('le salarié ne pointe pas un collègue et une société étrangère refuse avant écriture', async () => {
    const actor = await newMember(), colleague = await newMember()
    for (const direction of ['in', 'out'] as const) {
      await call(actor, direction, companyA, colleague.userId).expect(403)
      await call(actor, direction, foreignCompany).expect(403)
    }
    expect(await rows(actor.userId)).toEqual([])
    expect(await rows(colleague.userId)).toEqual([])
  })

  it.each(['OWNER', 'MANAGER'])('%s conserve le droit existant de pointer un membre actif', async role => {
    const actor = await newMember(role), target = await newMember()
    const entered = await call(actor, 'in', companyA, target.userId).expect(201)
    const exited = await call(actor, 'out', companyA, target.userId).expect(200)
    expect(exited.body.id).toBe(entered.body.id)
    expect(await rows(target.userId)).toHaveLength(1)
  })

  it.each(['in', 'out'] as const)('historique doublé : %s renvoie un conflit explicite sans choisir ou corriger une ligne', async direction => {
    const actor = await newMember()
    await open(actor.userId)
    await prisma.timePunch.create({ data: { companyId: companyA, userId: actor.userId, clockIn: new Date('2026-10-01T06:01:00Z'), note: 'Doublon historique FICTIF à conserver' } })
    const before = await rows(actor.userId)
    const response = await call(actor, direction).expect(409)
    expect(response.body.code).toBe('TIME_PUNCH_HISTORY_CONFLICT')
    expect(await rows(actor.userId)).toEqual(before)
  })

  it.each(['in', 'out'] as const)('relit le rôle après attente du verrou pour %s au lieu de croire l’ancien middleware', async direction => {
    const actor = await newMember('MANAGER'), target = await newMember()
    if (direction === 'out') await open(target.userId)
    const before = await rows(target.userId)
    const held = deferred(), releaseLock = deferred(), arrived = deferred(), releaseHandler = deferred()
    const holder = prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'creorga:time-punch:' + companyA}), hashtext(${target.userId}))`
      held.resolve()
      await releaseLock.promise
    }, { maxWait: 15000, timeout: 20000 })
    await held.promise
    beforeHandler = async () => { arrived.resolve(); await releaseHandler.promise }
    const pending = call(actor, direction, companyA, target.userId).then(response => response)
    try {
      await arrived.promise // L'ancien req.role MANAGER a réellement traversé requireCompany.
      await prisma.userCompany.update({ where: { userId_companyId: { userId: actor.userId, companyId: companyA } }, data: { role: 'EMPLOYEE' } })
    } finally {
      beforeHandler = undefined; releaseHandler.resolve(); releaseLock.resolve()
    }
    await holder
    expect((await pending).status).toBe(403)
    expect(await rows(target.userId)).toEqual(before)
  })

  it('une panne après l’insertion SQL annule la transaction puis permet une reprise unique', async () => {
    const actor = await newMember()
    failAfterCreateUsers.add(actor.userId)
    try { await call(actor, 'in').expect(500) } finally { failAfterCreateUsers.delete(actor.userId) }
    expect(await rows(actor.userId)).toEqual([])
    await call(actor, 'in').expect(201)
    expect(await rows(actor.userId)).toHaveLength(1)
  })

  it('une panne après la fermeture SQL laisse l’entrée ouverte et sa reprise la ferme une seule fois', async () => {
    const actor = await newMember(), original = await open(actor.userId)
    const before = await rows(actor.userId)
    failAfterCloseIds.add(original.id)
    try { await call(actor, 'out').expect(500) } finally { failAfterCloseIds.delete(original.id) }
    expect(await rows(actor.userId)).toEqual(before)
    await call(actor, 'out').expect(200)
    expect(await rows(actor.userId)).toHaveLength(1)
  })
})
