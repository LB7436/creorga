import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from 'node:events'
const state = vi.hoisted(() => ({ member: { id: 'membership', companyId: 'cafe', userId: 'owner', role: 'OWNER', isActive: true, capabilities: {}, accessVersion: 3, company: { id: 'cafe' } } }))
vi.mock('../lib/prisma', () => {
  const db: any = { userCompany: { findFirst: async () => state.member, findUnique: async () => state.member,
    create: async ({ data }: any) => ({ id: 'new-membership', ...data, capabilities: data.capabilities ?? {}, accessVersion: 0, user: { id: 'new-user' } }) },
    user: { findUnique: async () => null, create: async () => ({ id: 'new-user' }) },
    businessPermissionEvent: { create: async ({ data }: any) => data },
    $queryRaw: async () => [state.member], $executeRaw: async () => 1 }
  db.$transaction = (callback: any) => callback(db)
  return { default: db }
})
vi.mock('../middleware/auth', () => ({ authenticate: (req: any, _res: any, next: any) => { req.user = { userId: 'owner' }; next() } }))
import router from './companies'
async function call(method = 'GET', url = '/access', body = {}) {
  const req = Object.assign(new EventEmitter(), { method, url, body, originalUrl: '/api/companies' + url, headers: { 'x-company-id': 'cafe' } })
  return new Promise<any>((resolve, reject) => {
    const res = Object.assign(new EventEmitter(), { writableEnded: false, statusCode: 200,
      set() { return this }, status(code: number) { this.statusCode = code; return this },
      json(body: unknown) { this.writableEnded = true; resolve({ status: this.statusCode, body }); return this } })
    router(req as any, res as any, (error?: unknown) => error ? reject(error) : resolve({ status: 404 }))
  })
}
describe('sonde authentifiée des droits courants', () => {
  it('renvoie le scope effectif courant sans les données ni la politique des autres membres', async () => {
    const response = await call()
    expect(response.status).toBe(200)
    expect(response.body.role).toBe('OWNER')
    expect(response.body.capabilities).toContain('permissions.manage')
    expect(response.body.version).toBe(3)
    expect(response.body.user).toBeUndefined()
    expect(response.body.company).toBeUndefined()
  })
  it('crée un rôle SERVER explicite sans réutiliser EMPLOYEE comme alias de caisse', async () => {
    const response = await call('POST', '/members', { email: 'server@fixture.invalid', password: 'FICTION-ONLY-NO-REAL-LOGIN-123!', firstName: 'Service', lastName: 'FICTIF', role: 'SERVER' })
    expect(response.status).toBe(201)
    expect(response.body.role).toBe('SERVER')
    expect(response.body.businessAccess.capabilities).toContain('payments.receive')
    expect(response.body.businessAccess.capabilities).not.toContain('finance.revenue.read')
  })
  it('rejette une capacité inconnue au lieu de l’ignorer silencieusement', async () => {
    const response = await call('POST', '/members', { email: 'employee@fixture.invalid', password: 'FICTION-ONLY-NO-REAL-LOGIN-123!', firstName: 'Employé', lastName: 'FICTIF', role: 'EMPLOYEE', capabilities: { platformAdmin: true } })
    expect(response.status).toBe(400)
  })
})
