import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, envelopes } = vi.hoisted(() => ({
  db: { userCompany: { findMany: vi.fn() }, shift: { findMany: vi.fn(), updateMany: vi.fn() } },
  envelopes: [] as Array<{ to: string; subject: string; html: string }>,
}))
vi.mock('../lib/prisma', () => ({ default: db }))
// Le template reste réel. Seul le transport externe est remplacé : aucun SMTP,
// service distant ou secret n'est nécessaire à ces tests de contrat route → HTML.
vi.mock('../lib/email', async original => ({
  ...await original<typeof import('../lib/email')>(),
  emailConfigured: () => true,
  sendEmail: async (message: { to: string; subject: string; html: string }) => {
    envelopes.push(message)
    return { id: 'message-FICTIF-' + envelopes.length, provider: 'fixture' }
  },
}))
import hr from './hr'
const app = express().use(express.json()).use('/api/hr', (req: any, _res, next) => {
  req.companyId = 'section-company-fictive'; req.company = { name: 'SOCIÉTÉ FICTIVE' }; req.role = 'MANAGER'; next()
}, hr)
const member = (userId: string) => ({ userId, companyId: 'section-company-fictive', isActive: true, role: 'EMPLOYEE',
  user: { id: userId, firstName: 'Collaborateur', lastName: userId, email: userId + '@fixture.invalid' } })
const shift = (notes: string | null, userId = 'employee-a-fictif') => ({ id: 'shift-' + userId,
  companyId: 'section-company-fictive', userId, role: 'Serveur', notes, status: 'SCHEDULED', breakMinutes: 30,
  startTime: new Date('2026-10-18T04:00:00Z'), endTime: new Date('2026-10-18T10:00:00Z'),
})
const publish = () => request(app).post('/api/hr/planning/publish').send({ startDate: '2026-10-12T00:00:00Z', endDate: '2026-10-18T23:59:59Z' })

beforeEach(() => {
  envelopes.length = 0; vi.clearAllMocks()
  db.userCompany.findMany.mockResolvedValue([member('employee-a-fictif')])
  db.shift.updateMany.mockResolvedValue({ count: 1 })
})

describe('Publication planning : la section enregistrée arrive au vrai template', () => {
  it.each([
    ['section:Bar', 'Bar'],
    ['section:Salle;source:ocr', 'Salle'],
    ['source:ocr;section:Terrasse;role-secondaire:Manager', 'Terrasse'],
    ['source:ocr;SECTION:bAr;consigne:ne pas publier', 'Bar'],
  ])('conserve la section explicite de %s dans le mail, sans transmettre les autres notes', async (notes, section) => {
    const saved = shift(notes), before = structuredClone(saved)
    db.shift.findMany.mockResolvedValue([saved])
    const response = await publish().expect(200)
    expect(response.body).toMatchObject({ recipients: 1, confirmedShifts: 1 })
    expect(envelopes).toHaveLength(1)
    expect(envelopes[0].html).toContain('Serveur · ' + section)
    expect(envelopes[0].html).not.toContain('role-secondaire')
    expect(envelopes[0].html).not.toContain('consigne:ne pas publier')
    expect(saved).toEqual(before)
  })

  it.each([null, 'note libre sans section', 'description:une section:Bar dans du texte', 'section:Inconnue;source:ocr'])('n’invente pas une section depuis la note historique %s', async notes => {
    db.shift.findMany.mockResolvedValue([shift(notes)])
    await publish().expect(200)
    expect(envelopes).toHaveLength(1)
    expect(envelopes[0].html).toContain('>Serveur</td>')
    expect(envelopes[0].html).not.toContain('Serveur ·')
    expect(envelopes[0].html).not.toContain('Inconnue')
  })

  it('chaque destinataire reçoit uniquement la section de ses propres créneaux', async () => {
    db.userCompany.findMany.mockResolvedValue([member('employee-a-fictif'), member('employee-b-fictif')])
    db.shift.findMany.mockResolvedValue([shift('section:Bar', 'employee-a-fictif'), shift('section:Terrasse', 'employee-b-fictif')])
    await publish().expect(200)
    const a = envelopes.find(message => message.to === 'employee-a-fictif@fixture.invalid')!
    const b = envelopes.find(message => message.to === 'employee-b-fictif@fixture.invalid')!
    expect(a.html).toContain('Serveur · Bar')
    expect(a.html).not.toContain('Terrasse')
    expect(b.html).toContain('Serveur · Terrasse')
    expect(b.html).not.toContain('Serveur · Bar')
  })
})
