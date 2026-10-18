import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { shutdownEventSink } from '../lib/eventSink'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import { floorCompanyContext } from './floorState'
import { floorHash } from '../lib/floor-workspace'
import agent from './agent'
import assistant from './assistant'

// Intégration réelle : JWT, adhésions/capacités, floor PostgreSQL, lectures et
// mémoire disque ne sont pas simulés. Seul fetch fournisseur l'est explicitement.
// Les cas DST figent seulement Date, jamais les timers/réseaux/Prisma.
// Toutes les fixtures UUID sont conservées, y compris après un échec ; zéro purge.
const runId = randomUUID()
const companyIds = [randomUUID(), randomUUID(), randomUUID()]
const [companyA, companyB, companyC] = companyIds
const ownerId = randomUUID(), employeeId = randomUUID(), colleagueId = randomUUID(), ownerCId = randomUUID()
const productIds = companyIds.map(() => randomUUID())
const productNames = companyIds.map((_, i) => `ROBI_PG_${runId}_${String.fromCharCode(65 + i)}`)
const shiftIds = { own: randomUUID(), peer: randomUUID(), foreign: randomUUID() }
const providerCalls: Array<{ url: string; prompt: string; headers: Headers }> = []
let providerResponse = 'Fournisseur explicitement simulé pour le laboratoire Robi.'
let providerUnavailable = false
let providerGate: null | (() => Promise<void>) = null
let orderNumber = 0
const app = express().use(express.json({ limit: '15mb' }))
app.use('/api/agent', authenticate, requireCompany, floorCompanyContext, agent, assistant)

function post(userId: string, companyId: string, endpoint: string, body: object) {
  // Le jeton contient une identité, pas de droits faisant autorité.
  const token = jwt.sign({ userId, email: `${userId}@robi-fixture.invalid` }, process.env.JWT_SECRET!, { expiresIn: '5m' })
  return request(app).post('/api/agent/' + endpoint).set('Authorization', 'Bearer ' + token)
    .set('x-company-id', companyId).send(body)
}
const ask = (userId: string, companyId: string, question: string, currentPath = '/', extra: object = {}) =>
  post(userId, companyId, 'super-ask', { text: question, currentPath, ...extra })
const lastPrompt = () => providerCalls.filter(call => call.url.endsWith('/api/generate')).at(-1)!.prompt
async function employeeGrants(capabilities: Record<string, boolean>) {
  const membership = await prisma.userCompany.update({ where: { userId_companyId: { userId: employeeId, companyId: companyA } },
    data: { capabilities, accessVersion: { increment: 1 } } })
  expect(membership.role).toBe('EMPLOYEE')
}
async function tender(companyId: string, orderId: string, amountCents: number) {
  const attempt = await prisma.paymentAttempt.create({ data: { id: randomUUID(), companyId, orderId,
    requestId: randomUUID(), requestHash: `ROBI_FIXTURE_${runId}`, provider: 'manual', merchantId: 'manual:' + companyId,
    amountCents, currency: 'EUR', status: 'DECLARED' } })
  return prisma.orderTender.create({ data: { id: randomUUID(), companyId, orderId, attemptId: attempt.id,
    actorId: companyId === companyC ? ownerCId : ownerId, method: 'CASH', confirmation: 'manual_declaration',
    amountCents, cashReceivedCents: amountCents, cashChangeCents: 0 } })
}
async function order(companyId: string, paidAt: Date, amountCents: number, options: { status?: string; tender?: number | null } = {}) {
  const created = await prisma.order.create({ data: { id: randomUUID(), companyId, orderNumber: ++orderNumber,
    status: options.status ?? 'PAID', paidAt, total: amountCents / 100, subtotal: amountCents / 100, taxAmount: 0,
    notes: `ROBI INTÉGRATION FICTIVE ${runId} — conserver` } })
  if (options.tender !== null) await tender(companyId, created.id, options.tender ?? amountCents)
  return created
}

describe('Robi PostgreSQL : identité humaine, société et capacités réellement admises', () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!)
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || url.hostname !== '127.0.0.1'
      || url.port !== '5450' || url.pathname !== '/creorga_tests' || process.env.CREORGA_VALIDATION_ALLOW_PG !== 'true'
      || process.env.OLLAMA_URL !== 'http://127.0.0.1:0') throw Error('Laboratoire PostgreSQL gardé et fournisseur fictif obligatoires')
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    vi.stubEnv('FALLBACK_ADMIN_ENABLED', 'false')
    vi.stubEnv('SINGLE_TENANT_MODE', 'false')
    vi.stubGlobal('fetch', async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input)
      if (!['http://127.0.0.1:0/api/generate', 'http://127.0.0.1:0/api/tags'].includes(url)) {
        throw Error('ROBI_PROVIDER_FIXTURE_REFUSES_OTHER_NETWORK')
      }
      const prompt = init.body ? JSON.parse(String(init.body)).prompt ?? '' : ''
      providerCalls.push({ url, prompt, headers: new Headers(init.headers) })
      if (providerUnavailable) throw Error('FOURNISSEUR ABSENT SIMULÉ — aucun appel réel')
      if (url.endsWith('/api/tags')) return Response.json({ models: [] })
      await providerGate?.()
      return Response.json({ response: providerResponse })
    })
    const password = await bcrypt.hash('Identité-de-fixture-sans-connexion-réelle-' + randomUUID(), 4)
    for (const [id, firstName] of [[ownerId, 'Propriétaire'], [employeeId, 'Employé'], [colleagueId, 'Collègue'], [ownerCId, 'Autre']]) {
      await prisma.user.create({ data: { id, email: `${id}@robi-fixture.invalid`, password, firstName, lastName: `FICTIF ROBI ${runId}` } })
    }
    for (const [i, companyId] of companyIds.entries()) {
      await prisma.company.create({ data: { id: companyId, name: `ROBI INTÉGRATION FICTIVE ${String.fromCharCode(65 + i)} ${runId}` } })
      const snapshot = { tables: [{ id: 'table-' + companyId, name: `ROBI Table ${String.fromCharCode(65 + i)}`, seats: 2,
        section: 'FICTIF', shape: 'square', status: 'LIBRE', x: 0, y: 0, items: [] }], chairs: [], zones: [], photos: [], updatedAt: 1, storageAuthority: 'postgres' }
      await prisma.floorWorkspace.create({ data: { companyId, revision: 1n, snapshot, snapshotHash: floorHash(snapshot), initialSnapshot: snapshot, initialHash: floorHash(snapshot) } })
      const category = await prisma.category.create({ data: { id: randomUUID(), companyId, name: `ROBI CATÉGORIE FICTIVE ${runId}` } })
      await prisma.product.create({ data: { id: productIds[i], companyId, categoryId: category.id, name: productNames[i], price: 321.09, stock: 11 + i } })
    }
    for (const [userId, companyId, role] of [[ownerId, companyA, 'OWNER'], [ownerId, companyB, 'OWNER'],
      [employeeId, companyA, 'EMPLOYEE'], [colleagueId, companyA, 'EMPLOYEE'], [ownerCId, companyC, 'OWNER']]) {
      await prisma.userCompany.create({ data: { id: randomUUID(), userId, companyId, role } })
    }
    const startTime = new Date(Date.now() + 3_600_000), endTime = new Date(Date.now() + 7_200_000)
    for (const [id, companyId, userId] of [[shiftIds.own, companyA, employeeId], [shiftIds.peer, companyA, colleagueId], [shiftIds.foreign, companyB, ownerId]]) {
      await prisma.shift.create({ data: { id, companyId, userId, role: 'SERVICE FICTIF', startTime, endTime, notes: `ROBI ${runId} — conserver` } })
    }
    console.info(JSON.stringify({ fixture: 'ROBI_POSTGRES_RETAINED', runId, companyIds, userIds: [ownerId, employeeId, colleagueId, ownerCId], provider: 'MOCK_ONLY_NOT_QUALIFIED' }))
  })
  afterEach(() => { providerCalls.length = 0; providerUnavailable = false; providerGate = null; providerResponse = 'Fournisseur explicitement simulé pour le laboratoire Robi.'; vi.useRealTimers() })
  afterAll(async () => { await shutdownEventSink(); await prisma.$disconnect(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers() })

  it('refuse sans identité et hors société avant le fournisseur', async () => {
    await request(app).post('/api/agent/super-ask').send({ text: 'état des stocks' }).expect(401)
    await ask(employeeId, companyC, 'état des stocks', '/inventory/stock').expect(403)
    await ask(ownerId, companyC, 'état des stocks', '/inventory/stock').expect(403)
    expect(providerCalls).toEqual([])
  })

  it('ignore société, utilisateur et rôle du corps ; ne transmet que les quantités autorisées', async () => {
    const response = await ask(employeeId, companyA, 'état des produits disponibles', '/inventory/stock', {
      companyId: companyC, userId: ownerCId, role: 'OWNER', capabilities: ['finance.revenue.read'],
    }).expect(200)
    expect(response.body.text).toContain('explicitement simulé')
    expect(lastPrompt()).toContain(productNames[0])
    expect(lastPrompt()).not.toContain(productNames[1]); expect(lastPrompt()).not.toContain(productNames[2])
    expect(lastPrompt()).not.toContain('321.09')
    for (const call of providerCalls) {
      expect(call.headers.has('x-internal-token')).toBe(false)
      expect(call.headers.has('authorization')).toBe(false)
    }
    await ask(employeeId, companyA, 'chiffre d’affaires aujourd’hui', '/', { role: 'OWNER', companyId: companyB }).expect(403)
  })

  it('change réellement de société sans réutiliser le cache ni la mémoire de la précédente', async () => {
    const question = 'état des stocks pour cette société'
    providerResponse = 'Fournisseur simulé : MARQUEUR_MEMOIRE_A'
    await ask(ownerId, companyA, question, '/inventory/stock').expect(200)
    expect(lastPrompt()).toContain(productNames[0])
    providerResponse = 'Fournisseur simulé : société B'
    const second = await ask(ownerId, companyB, question, '/inventory/stock').expect(200)
    expect(second.body.cached).not.toBe(true)
    expect(lastPrompt()).toContain(productNames[1])
    expect(lastPrompt()).not.toContain(productNames[0])
    expect(lastPrompt()).not.toContain('MARQUEUR_MEMOIRE_A')
  })

  it('accorde puis retire les finances au même EMPLOYEE sans modifier son rôle', async () => {
    await ask(employeeId, companyA, 'chiffre d’affaires aujourd’hui').expect(403)
    await employeeGrants({ 'finance.revenue.read': true })
    const granted = await ask(employeeId, companyA, 'chiffre d’affaires aujourd’hui').expect(200)
    expect(granted.body.source).toBe('local-business-read')
    await employeeGrants({ 'finance.revenue.read': false })
    await ask(employeeId, companyA, 'chiffre d’affaires aujourd’hui').expect(403)
    expect(providerCalls).toEqual([])
  })

  it('le retrait puis réoctroi de stock invalide cache et mémoire même au même rôle', async () => {
    await employeeGrants({ 'inventory.quantities.read': true })
    const question = 'état des stocks pour contrôle des droits'
    providerResponse = 'Fournisseur simulé : ANCIEN_DROIT_CONFIDENTIEL'
    await ask(employeeId, companyA, question, '/inventory/stock').expect(200)
    const cached = await ask(employeeId, companyA, question, '/inventory/stock').expect(200)
    expect(cached.body.cached).toBe(true)
    const beforeRevoke = providerCalls.length
    await employeeGrants({ 'inventory.quantities.read': false })
    await ask(employeeId, companyA, question, '/inventory/stock').expect(403)
    expect(providerCalls).toHaveLength(beforeRevoke)
    await employeeGrants({ 'inventory.quantities.read': true })
    providerResponse = 'Fournisseur simulé : droits relus'
    const refreshed = await ask(employeeId, companyA, question, '/inventory/stock').expect(200)
    expect(refreshed.body.cached).not.toBe(true)
    expect(lastPrompt()).not.toContain('ANCIEN_DROIT_CONFIDENTIEL')
    expect(providerCalls.length).toBeGreaterThan(beforeRevoke)
  })

  it('planning propre par défaut ; équipe seulement avec délégation, jamais une autre société', async () => {
    await employeeGrants({ 'hr.schedule.manage': false })
    const question = 'mes horaires prévus'
    await ask(employeeId, companyA, question, '/hr/planning', { userId: colleagueId }).expect(200)
    expect(lastPrompt()).toContain(shiftIds.own)
    expect(lastPrompt()).not.toContain(shiftIds.peer); expect(lastPrompt()).not.toContain(shiftIds.foreign)
    await employeeGrants({ 'hr.schedule.manage': true })
    providerResponse = 'Fournisseur simulé : ANCIEN_PLANNING_EQUIPE'
    await ask(employeeId, companyA, question, '/hr/planning').expect(200)
    expect(lastPrompt()).toContain(shiftIds.own); expect(lastPrompt()).toContain(shiftIds.peer)
    expect(lastPrompt()).not.toContain(shiftIds.foreign)
    await employeeGrants({ 'hr.schedule.manage': false })
    const ownAgain = await ask(employeeId, companyA, question, '/hr/planning').expect(200)
    expect(ownAgain.body.cached).not.toBe(true)
    expect(lastPrompt()).not.toContain(shiftIds.peer)
    expect(lastPrompt()).not.toContain('ANCIEN_PLANNING_EQUIPE')
  })

  it('les flux intent/smart-query/stream/execute respectent les mêmes refus financiers', async () => {
    await employeeGrants({ 'finance.revenue.read': false })
    for (const endpoint of ['intent', 'smart-query', 'smart-query-stream']) {
      await post(employeeId, companyA, endpoint, { text: 'chiffre d’affaires aujourd’hui', question: 'chiffre d’affaires aujourd’hui', currentPath: '/' }).expect(403)
    }
    for (const commandId of ['home.day-summary', 'pos.day-stats']) await post(employeeId, companyA, 'execute', { commandId }).expect(403)
    await ask(employeeId, companyA, 'tables libres', '/pos').expect(200)
    expect(providerCalls).toEqual([])
  })

  it('additionne seulement les commandes PAID cohérentes du jour et de la société', async () => {
    const now = new Date(), previous = new Date(Date.now() - 3 * 86_400_000)
    const paid = await order(companyA, now, 1234)
    await prisma.order.update({ where: { id: paid.id }, data: { subtotal: 12, taxAmount: 0.34 } })
    await order(companyA, now, 8888, { status: 'OPEN', tender: 100 })
    await order(companyA, previous, 5555)
    await order(companyB, now, 9876)
    const result = await ask(ownerId, companyA, 'chiffre d’affaires aujourd’hui').expect(200)
    expect(result.body).toMatchObject({ source: 'local-business-read', data: { salesCents: 1234, baseCents: 1200, taxCents: 34,
      orderCount: 1, currency: 'EUR', sources: [paid.id], sourceCount: 1, sourcesTruncated: false,
      period: { timeZone: 'Europe/Luxembourg' }, basis: 'finalized_paid_orders_documents_separate_not_certified_accounting' } })
    expect(result.body.text).toContain('sans IA générative')
    expect(result.body.data.limits).toMatch(/Factures et tickets non additionnés/)
    expect(providerCalls).toEqual([])
  })

  it('refuse un total PAID sans journal puis un règlement incomplet, jamais zéro inventé', async () => {
    const incomplete = await order(companyC, new Date(), 1200, { tender: null })
    const absent = await ask(ownerCId, companyC, 'chiffre d’affaires aujourd’hui').expect(503)
    expect(absent.body.code).toBe('ASSISTANT_REVENUE_INCONSISTENT')
    await tender(companyC, incomplete.id, 1199)
    const short = await ask(ownerCId, companyC, 'chiffre d’affaires aujourd’hui').expect(503)
    expect(short.body.code).toBe('ASSISTANT_REVENUE_INCONSISTENT')
    expect(short.body.data).toBeUndefined()
    expect(providerCalls).toEqual([])
  })

  it.each([
    { day: '2026-03-29T12:00:00Z', from: '2026-03-28T23:00:00.000Z', to: '2026-03-29T22:00:00.000Z', hours: 23 },
    { day: '2026-10-25T12:00:00Z', from: '2026-10-24T22:00:00.000Z', to: '2026-10-25T23:00:00.000Z', hours: 25 },
  ])('les bornes PostgreSQL du jour Luxembourg suivent le changement DST de $hours h', async ({ day, from, to, hours }) => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(day))
    const first = await order(companyB, new Date(from), 101)
    const last = await order(companyB, new Date(new Date(to).getTime() - 1), 202)
    await order(companyB, new Date(new Date(from).getTime() - 1), 400)
    await order(companyB, new Date(to), 800)
    const result = await ask(ownerId, companyB, 'chiffre d’affaires aujourd’hui').expect(200)
    expect(result.body.data).toMatchObject({ salesCents: 303, orderCount: 2, period: { from, toExclusive: to, timeZone: 'Europe/Luxembourg' } })
    expect(result.body.data.sources.sort()).toEqual([first.id, last.id].sort())
    expect((new Date(to).getTime() - new Date(from).getTime()) / 3_600_000).toBe(hours)
    expect(providerCalls).toEqual([])
  })

  it('un fournisseur indisponible reste un 503 explicite sans succès IA revendiqué', async () => {
    providerUnavailable = true
    const response = await ask(ownerId, companyB, 'état des stocks si fournisseur absent', '/inventory/stock').expect(503)
    expect(response.body.code).toBe('ASSISTANT_PROVIDER_UNAVAILABLE')
    expect(response.body.data).toBeUndefined()
    expect(providerCalls.some(call => call.url.endsWith('/api/generate'))).toBe(true)
  })

  it.each(['revision', 'regrant', 'inactive', 'company'])('refuse une réponse fournisseur en attente après changement PostgreSQL réel : %s', async change => {
    const humanId = randomUUID()
    await prisma.user.create({ data: { id: humanId, email: `${humanId}@robi-fixture.invalid`,
      password: await bcrypt.hash('Compte de course fictive ' + randomUUID(), 4), firstName: 'Course', lastName: `ROBI FICTIF ${change} ${runId}` } })
    const member = await prisma.userCompany.create({ data: { id: randomUUID(), userId: humanId, companyId: companyA, role: 'EMPLOYEE' } })
    const chatDirectory = path.join(process.cwd(), 'data', 'companies', companyA, 'assistant', 'chats')
    const chatFiles = async () => {
      try { return (await fs.readdir(chatDirectory)).sort() }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error }
    }
    const before = await chatFiles()
    let release!: () => void, reached!: () => void
    const held = new Promise<void>(done => { release = done })
    const entered = new Promise<void>(done => { reached = done })
    providerGate = async () => { reached(); await held }
    providerResponse = `PRIVATE_REVOKED_PROVIDER_${change}`
    const question = `état des stocks pendant la course ${change} ${humanId}`
    const pending = ask(humanId, companyA, question, '/inventory/stock').then(response => response)
    try {
      await entered
      if (change === 'regrant') {
        await prisma.userCompany.update({ where: { id: member.id }, data: { capabilities: { 'inventory.quantities.read': false }, accessVersion: { increment: 1 } } })
        await prisma.userCompany.update({ where: { id: member.id }, data: { capabilities: {}, accessVersion: { increment: 1 } } })
      } else {
        await prisma.userCompany.update({ where: { id: member.id }, data: {
          accessVersion: { increment: 1 }, ...(change === 'inactive' ? { isActive: false } : change === 'company' ? { companyId: companyB } : {}),
        } })
      }
    } finally { release() }
    const response = await pending
    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({ kind: 'error', code: 'ASSISTANT_SCOPE_CHANGED' })
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_REVOKED_PROVIDER')
    expect(await chatFiles()).toEqual(before)
    expect(providerCalls.filter(call => call.url.endsWith('/api/generate'))).toHaveLength(1)
  })
})
