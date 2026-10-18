import { afterEach, describe, expect, it, vi } from 'vitest'
import { accessFor, type BusinessMember, type Capability } from './business-permissions'
import { floorHash, saveFloorWorkspace } from './floor-workspace'

// Le vrai verrou, les décisions de droits et la sauvegarde sont exécutés ; seule
// la frontière PostgreSQL est remplacée par des lignes de fixture en mémoire.
// Supprimer la relecture après verrou doit rétablir le commit non autorisé.
const companyId = 'floor-permissions-fictif', userId = 'floor-member-fictif'
const floor = () => {
  const item = { id: 'line', name: 'Café fictif', productId: 'coffee', menuItemId: 'coffee', price: 5, qty: 2, addedAt: 10, note: '', coverId: 'cover' }
  return { tables: [{ id: 'table', name: 'Fictive', seats: 2, section: 'Salle', shape: 'round', status: 'OCCUPEE', x: 10, y: 10,
    items: [item], posCovers: [{ id: 'cover', label: 'Fictif', items: [item] }] }], chairs: [], zones: [{ id: 'room', name: 'Salle' }], photos: [], updatedAt: 10,
    posEditor: { rooms: [], fixtures: [], scenes: [], background: null } } as any
}
function fixture(overrides: Partial<Record<Capability, boolean>> = {}) {
  const before = floor(), draft = structuredClone(before); draft.updatedAt = 11; draft.tables[0].orderNote = 'Note fictive'
  let member: BusinessMember = { companyId, userId, role: 'SERVER', capabilities: overrides, accessVersion: 1, isActive: true }
  let snapshot = structuredClone(before), changes = 0
  const req = { companyId, method: 'PUT', originalUrl: '/api/pos/draft', user: { userId },
    businessAccess: accessFor(member), get: (_header: string) => undefined as string | undefined }
  let release!: () => void, arrived!: () => void
  const blocked = new Promise<void>(resolve => { arrived = resolve }), resume = new Promise<void>(resolve => { release = resolve })
  const empty = async () => []
  const tx: any = {
    $queryRaw: async (parts: TemplateStringsArray, ...values: string[]) => {
      if (parts.join('').includes('pg_advisory_xact_lock')) { arrived(); await resume; return [] }
      if (parts.join('').includes('UserCompany')) return member.isActive && member.companyId === values[0] && member.userId === values[1] ? [structuredClone(member)] : []
      throw Error('Requête hors fixture')
    },
    floorWorkspace: { updateMany: async (query: any) => {
      if (query.where.companyId !== companyId || query.where.snapshotHash !== floorHash(snapshot)) return { count: 0 }
      snapshot = structuredClone(query.data.snapshot); return { count: 1 }
    } },
    serviceCover: { findMany: empty, groupBy: empty, upsert: async () => ({}) },
    serviceSession: { findMany: empty, findFirst: async () => null, create: async () => ({ id: 'session', tableId: 'table' }), updateMany: async () => ({ count: 1 }) },
    posCoverPayment: { findMany: empty }, saleOrigin: { findMany: empty }, orderItem: { findMany: empty },
    floorChange: { create: async () => { changes += 1 } },
  }
  const save = () => saveFloorWorkspace(tx, companyId, before, draft, userId, 'PUT /api/pos/draft', req)
    .then(() => ({ status: 200 }), (error: any) => { if (!error.status) throw error; return { status: error.status, error } })
  return { before, draft, req, tx, save, blocked, release, revoke: (patch: Partial<BusinessMember>) => { member = { ...member, ...patch, accessVersion: 2 } },
    retained: () => ({ snapshot, changes }) }
}
afterEach(() => vi.unstubAllEnvs())

describe('Salle PostgreSQL : autorisation fraîche après attente du verrou', () => {
  it.each([
    ['retrait service.manage', { capabilities: { 'service.manage': false } }],
    ['désactivation', { isActive: false }],
    ['adhésion déplacée vers une autre société', { companyId: 'other-fictif' }],
    ['rôle devenu EMPLOYEE', { role: 'EMPLOYEE', capabilities: {} }],
  ])('refuse %s sans modifier le plan ni son journal', async (_name, patch) => {
    const f = fixture(), pending = f.save()
    await f.blocked; f.revoke(patch); f.release()
    expect((await pending).status).toBe(403)
    expect(f.retained()).toEqual({ snapshot: f.before, changes: 0 })
  })

  const extraCases: Array<[string, Capability, (f: ReturnType<typeof fixture>) => void]> = [
    ['déplacement de table', 'settings.manage', f => { f.draft.tables[0].x = 12 }],
    ['édition des salles', 'settings.manage', f => { f.draft.posEditor.rooms = [{ id: 'room', label: 'Salle' }] }],
    ['diminution de quantité', 'orders.cancel', f => { f.draft.tables[0].posCovers[0].items[0].qty = 1 }],
    ['ajout de remise', 'discounts.grant', f => { f.draft.tables[0].orderDiscount = { type: 'percent', value: 10 } }],
    ['retrait de remise lors du passage en offert', 'discounts.grant', f => { f.before.tables[0].orderDiscount = { type: 'percent', value: 10 }; f.draft.tables[0].orderDiscount = { type: 'free', value: 0 } }],
    ['ajout d’offert global', 'complimentary.grant', f => { f.draft.tables[0].orderDiscount = { type: 'free', value: 0 } }],
    ['retrait d’article offert', 'complimentary.grant', f => { f.before.tables[0].offeredItemIds = ['line']; f.draft.tables[0].offeredItemIds = [] }],
    ['édition de scène historique', 'finance.revenue.read', f => { f.draft.posEditor.scenes = [{ id: 'scene', tables: [] }] }],
    ['revue tarifaire', 'catalog.prices.write', f => { f.req.method = 'POST'; f.req.originalUrl = '/api/pos/pricing/line/review' }],
  ]
  it.each(extraCases)('recontrôle le droit précis après révocation : %s', async (_name, capability, mutate) => {
    const grants = { 'settings.manage': true, 'orders.cancel': true, 'discounts.grant': true, 'complimentary.grant': true,
      'finance.revenue.read': true, 'catalog.prices.write': true } as const
    const f = fixture(grants); mutate(f)
    // Les fixtures « retrait » modifient l’avant avant le démarrage du commit.
    const row = structuredClone(f.before)
    f.tx.floorWorkspace.updateMany = async (query: any) => { Object.assign(row, query.data.snapshot); return { count: 1 } }
    const pending = f.save(); await f.blocked
    f.revoke({ capabilities: { ...grants, [capability]: false } }); f.release()
    expect((await pending).status).toBe(403)
    expect(row).toEqual(f.before); expect(f.retained().changes).toBe(0)
  })

  it('préserve une sauvegarde de service autorisée sans exiger les droits de configuration ou d’annulation', async () => {
    const f = fixture(), pending = f.save(); await f.blocked; f.release()
    expect(await pending).toEqual({ status: 200 })
    expect(f.retained()).toEqual({ snapshot: f.draft, changes: 1 })
  })

  it('n’utilise jamais un rôle ou des capacités périmées pour une société différente', async () => {
    const f = fixture(); f.req.companyId = 'other-fictif'
    f.req.businessAccess = accessFor({ companyId, userId, role: 'OWNER' })
    const pending = f.save(); await f.blocked; f.release()
    expect((await pending).status).toBe(403)
    expect(f.retained()).toEqual({ snapshot: f.before, changes: 0 })
  })

  it('la disparition d’un miroir déjà payé ne demande pas orders.cancel', async () => {
    const f = fixture(); f.draft.tables[0].items = []; f.draft.tables[0].posCovers = []
    f.tx.posCoverPayment.findMany = async () => [{ coverId: 'cover' }]
    const pending = f.save(); await f.blocked; f.release()
    expect(await pending).toEqual({ status: 200 })
    expect(f.retained().snapshot.tables[0].posCovers).toEqual([])
  })
})
