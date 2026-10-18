import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { db, envelopes } = vi.hoisted(() => ({
  db: { userCompany: { findMany: vi.fn() }, shift: { findMany: vi.fn(), updateMany: vi.fn() } },
  envelopes: [] as Array<{ to: string; subject: string; html: string }>,
}))
vi.mock('../lib/prisma', () => ({ default: db }))
// Real route and HTML template; only storage and email transport are fixtures.
// No SMTP connection, database or real recipient is used.
vi.mock('../lib/email', async original => ({
  ...await original<typeof import('../lib/email')>(),
  emailConfigured: () => true,
  sendEmail: async (message: { to: string; subject: string; html: string }) => {
    if (message.to !== 'planning-employee@fixture.invalid') throw Error('Unapproved planning fixture recipient')
    envelopes.push(message)
    return { id: 'planning-message-FICTIF', provider: 'fixture' }
  },
}))
import hr from './hr'
import { accessFor } from '../lib/business-permissions'

const app = express().use(express.json()).use('/api/hr', (req: any, _res, next) => {
  req.companyId = 'planning-dates-company-fictive'; req.company = { name: 'ÉTABLISSEMENT FICTIF' }; req.role = 'MANAGER'; req.businessAccess = accessFor({ role: 'MANAGER', companyId: req.companyId }); next()
}, hr)
beforeEach(() => {
  vi.stubEnv('TZ', 'Europe/Luxembourg'); vi.clearAllMocks(); envelopes.length = 0
  db.userCompany.findMany.mockResolvedValue([{ userId: 'planning-employee-fictif', companyId: 'planning-dates-company-fictive', isActive: true,
    user: { id: 'planning-employee-fictif', firstName: 'Recette', lastName: 'Fictive', email: 'planning-employee@fixture.invalid' } }])
  db.shift.updateMany.mockResolvedValue({ count: 1 })
})
afterEach(() => vi.unstubAllEnvs())

async function publish(start: string, end: string) {
  const saved = { id: 'planning-shift-fictif', companyId: 'planning-dates-company-fictive', userId: 'planning-employee-fictif', role: 'Serveur',
    notes: 'section:Bar', status: 'SCHEDULED', breakMinutes: 0, startTime: new Date(start), endTime: new Date(end) }
  const before = structuredClone(saved)
  db.shift.findMany.mockResolvedValue([saved])
  const response = await request(app).post('/api/hr/planning/publish').send({ startDate: start, endDate: end }).expect(200)
  expect(response.body).toMatchObject({ recipients: 1, confirmedShifts: 1, failedRecipients: 0 })
  expect(saved).toEqual(before)
  expect(envelopes).toHaveLength(1)
  return envelopes[0].html
}

describe('Planning publié : date de fin explicite dans le vrai HTML', () => {
  it.each([
    ['2026-10-17T21:00:00Z', '2026-10-18T01:00:00Z', '23:00 – 03:00 (18/10/2026)'],
    ['2026-01-17T22:00:00Z', '2026-01-18T02:00:00Z', '23:00 – 03:00 (18/01/2026)'],
    ['2026-07-17T21:00:00Z', '2026-07-18T01:00:00Z', '23:00 – 03:00 (18/07/2026)'],
    ['2026-03-28T22:00:00Z', '2026-03-29T01:30:00Z', '23:00 – 03:30 (29/03/2026)'],
    ['2026-10-24T21:00:00Z', '2026-10-25T02:30:00Z', '23:00 – 03:30 (25/10/2026)'],
    ['2026-07-17T21:00:00Z', '2026-07-19T01:00:00Z', '23:00 – 03:00 (19/07/2026)'],
  ])('publie %s → %s avec la date locale correcte', async (start, end, expected) => {
    expect(await publish(start, end)).toContain(expected)
  })

  it('conserve un horaire de journée sans ajouter une date de fin redondante', async () => {
    const html = await publish('2026-10-18T04:00:00Z', '2026-10-18T10:00:00Z')
    expect(html).toContain('06:00 – 12:00</td>')
    expect(html).toContain('Serveur · Bar')
  })

  it('conserve les heures et la date de Luxembourg même sur un serveur configuré en UTC', async () => {
    vi.stubEnv('TZ', 'UTC')
    expect(await publish('2026-10-17T21:00:00Z', '2026-10-18T01:00:00Z')).toContain('23:00 – 03:00 (18/10/2026)')
  })
})
