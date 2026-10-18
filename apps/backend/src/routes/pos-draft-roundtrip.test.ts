import express from 'express'
import request from 'supertest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FloorState } from './floorState'

const state = vi.hoisted(() => ({ working: {} as any, original: {} as any, products: [] as any[],
  paid: [] as Array<{ companyId: string; coverId: string }>, consumed: [] as Array<{ companyId: string; sourceId: string }>,
  ordered: [] as Array<{ companyId: string; id: string }> }))
vi.mock('../lib/prisma', () => {
  const empty = async () => [], zero = async () => 0
  const database = {
    product: { findMany: async () => state.products }, posCoverPayment: {
      findMany: async (query: any) => state.paid.filter(row => row.companyId === query.where.companyId),
      count: async (query: any) => state.paid.filter(row => row.companyId === query.where.companyId && query.where.coverId.in.includes(row.coverId)).length,
    }, order: { findMany: empty },
    table: { findMany: empty }, saleOrigin: {
      findMany: async (query: any) => state.consumed.filter(row => row.companyId === query.where.companyId),
      count: async (query: any) => state.consumed.filter(row => row.companyId === query.where.companyId && query.where.sourceId.in.includes(row.sourceId)).length,
    }, orderItem: {
      findMany: async (query: any) => state.ordered.filter(row => row.companyId === query.where.order.companyId && query.where.id.in.includes(row.id)), count: zero,
    },
    serviceShare: { findMany: empty }, serviceCover: { findMany: empty }, userCompany: { findMany: empty, count: async (query: any) => query.where.userId.in.length },
    posSale: { findMany: empty }, posClosure: { findMany: empty }, reservation: { findMany: empty },
    companySettings: { findUnique: async () => null }, customer: { count: async (query: any) => query.where.id.in.length },
  }
  return { default: database, prisma: database }
})
vi.mock('./floorState', async importActual => {
  const pricing = await import('../lib/pos-pricing')
  return { ...await importActual<typeof import('./floorState')>(), getFloorState: () => state.working,
    prepareFloorPricing: async () => { pricing.canonicalizeFloorPricing(state.original, state.working, state.products) } }
})
import pos from './pos'
import { canonicalizeFloorPricing, floorLines } from '../lib/pos-pricing'
import { accessFor } from '../lib/business-permissions'

// Le stockage est une frontière de test en mémoire. Le vrai bootstrap, le parsing
// Zod, les autorisations, la tarification et la route draft sont exécutés.
// Aucun PostgreSQL, miroir réel, profil navigateur ou service externe n'est écrit.
const app = express(); app.use(express.json())
const registry = new Map<string, FloorState>()
let company = 'roundtrip-fictif', incomingCaptured: any, capturedEditor: any
app.use('/pos', (req, res, next) => {
  const id = req.get('x-company-id') || company, saved = registry.get(id)
  if (!saved) return void res.status(403).json({ error: 'Société inaccessible dans la fixture.' })
  state.original = structuredClone(saved); state.working = structuredClone(saved)
  Object.assign(req, { companyId: id, company: { name: 'SOCIÉTÉ FICTIVE' }, role: 'SERVER', user: { userId: 'caissier-fictif' },
    businessAccess: accessFor({ companyId: id, userId: 'caissier-fictif', role: 'SERVER', capabilities: { 'orders.cancel': true } }) })
  const json = res.json.bind(res)
  res.json = ((body: any) => {
    if (req.method === 'PUT' && res.statusCode < 400) {
      state.working.updatedAt = state.original.updatedAt + 1
      registry.set(id, structuredClone(state.working))
    }
    return json(body)
  }) as typeof res.json
  next()
}, pos)
const getBootstrap = async () => (await request(app).get('/pos/bootstrap').set('x-company-id', company).expect(200)).body
const sendDraft = (draft: any, revision: number, id = company) => request(app).put('/pos/draft').set('x-company-id', id).set('If-Match', String(revision)).send(draft)
const configuration = (floor: any) => ({ posEditor: floor.posEditor, zones: floor.zones, tables: floor.tables.map((table: any) => [table.id, table.name, table.shape, table.seats, table.x, table.y, table.section]) })
beforeEach(() => { state.paid = []; state.consumed = []; state.ordered = [] })

function fictitiousFloor(): FloorState {
  return { zones: [{ id: 'salle', name: 'Salle café', color: '#6366f1' }], tables: [{ id: 'table', name: 'Table FICTIVE', section: 'Salle café', shape: 'round', seats: 4, x: 160, y: 140, status: 'LIBRE', items: [] }], chairs: [], photos: [], updatedAt: 123 }
}

// Option de recette locale : relire la capture Chrome autorisée, puis UNIQUEMENT
// le miroir fictif correspondant, sans recopier ces données privées dans Git.
const capturePath = process.env.CREORGA_POS_UI_REPRO
const sourceCapture = capturePath ? JSON.parse(readFileSync(capturePath, 'utf8')) : null
function capturedFloor(): FloorState {
  const id: string = sourceCapture.bootstrap.companyId
  const readable = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'company'
  const digest = createHash('sha256').update(id).digest('hex').slice(0, 12)
  const mirror = path.resolve(path.dirname(capturePath!), '..', 'runtime-backend', 'data', `floor-state.${readable}.${digest}.json`)
  const floor = JSON.parse(readFileSync(mirror, 'utf8'))
  if (String(floor.updatedAt) !== String(sourceCapture.bootstrap.revision)) throw Error('Capture et miroir de recette ne désignent plus la même révision ; ne pas tester une autre donnée.')
  company = id; incomingCaptured = structuredClone(sourceCapture.latestRejectedDraft); capturedEditor = sourceCapture.bootstrap.editor
  const byProduct = new Map(incomingCaptured.tables.flatMap((table: any) => table.covers.flatMap((cover: any) => cover.items.map((item: any) => [item.menuItemId, {
    id: item.menuItemId, name: item.name, price: item.price, taxRate: item.taxRate ?? 17, isActive: true, category: { name: 'FICTIF', icon: '' },
  }]))))
  state.products = [...byProduct.values()]
  return floor
}

for (const useCapture of sourceCapture ? [false, true] : [false]) describe(`Brouillon employé : roundtrip ${useCapture ? 'capture Chrome autorisée' : 'fictif reproductible'}`, () => {
  beforeEach(() => {
    registry.clear(); company = 'roundtrip-fictif'; incomingCaptured = null; capturedEditor = null
    state.products = [{ id: 'espresso', name: 'Espresso FICTIF', price: 2.6, taxRate: 17, isActive: true, category: { name: 'FICTIF', icon: '' } }]
    registry.set(company, fictitiousFloor())
    if (useCapture) { const floor = capturedFloor(); registry.clear(); registry.set(company, floor) }
  })

  async function serviceDraft() {
    const bootstrap = await getBootstrap()
    const payload = incomingCaptured ? structuredClone(incomingCaptured) : JSON.parse(JSON.stringify({ tables: bootstrap.tables, editor: bootstrap.editor, seats: bootstrap.seats }))
    if (!incomingCaptured) {
      payload.tables[0].status = 'occupied'
      payload.tables[0].covers = [{ id: 'couvert', label: 'Service FICTIF', items: [{ id: 'nouvelle-ligne', menuItemId: 'espresso', name: 'Espresso FICTIF', price: 2.6, taxRate: 17, qty: 1, note: '', coverId: 'couvert' }] }]
    }
    return { bootstrap, payload }
  }

  it(useCapture ? 'refuse le brouillon Chrome divergent sans choisir silencieusement un côté' : 'enregistre les consommations sans matérialiser ni réordonner la configuration inchangée', async () => {
    const before = configuration(registry.get(company)), { bootstrap, payload } = await serviceDraft()
    if (capturedEditor) expect(payload.editor).toEqual(capturedEditor)
    const result = await sendDraft(payload, bootstrap.revision)
    if (useCapture) {
      // Décision explicite de reprise : les trois nouvelles lignes n'existent
      // que dans le couvert projeté. Aucun import silencieux vers la chaise.
      expect(result.status).toBe(409)
      expect(configuration(registry.get(company))).toEqual(before)
      expect(floorLines(registry.get(company)).reduce((sum, item) => sum + Math.round(item.price * 100) * item.qty, 0)).toBe(250)
      return
    }
    expect(result.status, result.body.error).toBe(200)
    expect(configuration(registry.get(company))).toEqual(before)
    const expected = payload.tables.flatMap((table: any) => table.covers.flatMap((cover: any) => cover.items.map((item: any) => [item.id, item.qty, item.price])))
    expect(floorLines(registry.get(company)).map(item => [item.id, item.qty, item.price])).toEqual(expected)
    const again = await getBootstrap()
    expect(again.tables.flatMap((table: any) => table.covers.flatMap((cover: any) => cover.items.map((item: any) => [item.id, item.qty, item.price])))).toEqual(expected)
  })

  it('refuse toujours un changement volontaire du cadre de salle', async () => {
    const before = structuredClone(registry.get(company)), { bootstrap, payload } = await serviceDraft()
    payload.editor.rooms[0].x += 1
    const response = await sendDraft(payload, bootstrap.revision)
    expect(response.status).toBe(403); expect(registry.get(company)).toEqual(before)
  })

  it('le roundtrip de scène expurgée conserve son historique côté autorité sans faux changement de configuration', async () => {
    if (useCapture) return
    const floor = registry.get(company)!
    floor.posEditor = { rooms: [], fixtures: [], background: null, scenes: [{ id: 'scene-historique', label: 'Scène fictive', createdAt: 10, rooms: [], fixtures: [], tables: [{
      id: 'ancienne-table', name: 'Ancienne', shape: 'round', seats: 2, x: 0, y: 0, section: 'salle', status: 'occupied', mergedWith: [],
      covers: [{ id: 'ancien-couvert', label: 'Payé', paidAt: 11, paidMethod: 'cash', items: [{ id: 'ancien-prix', name: 'Ancien', menuItemId: 'espresso', price: 999, qty: 1, note: '', coverId: 'ancien-couvert' }] }],
    }] }] }
    const before = structuredClone(floor.posEditor)
    const { bootstrap, payload } = await serviceDraft()
    expect(JSON.stringify(bootstrap.editor)).not.toContain('ancien-prix')
    expect(bootstrap.editor.scenes[0].tables[0].covers).toEqual([])
    await sendDraft(payload, bootstrap.revision).expect(200)
    expect(registry.get(company)!.posEditor).toEqual(before)
  })

  it('refuse toujours un déplacement volontaire de table', async () => {
    const before = structuredClone(registry.get(company)), { bootstrap, payload } = await serviceDraft()
    payload.tables[0].x += 1
    const response = await sendDraft(payload, bootstrap.revision)
    expect(response.status).toBe(403); expect(registry.get(company)).toEqual(before)
  })

  it('refuse toujours un changement volontaire de section', async () => {
    const before = structuredClone(registry.get(company)), { bootstrap, payload } = await serviceDraft()
    payload.tables[0].section = payload.editor.rooms[1]?.id || 'autre-section-interdite'
    const response = await sendDraft(payload, bootstrap.revision)
    expect(response.status).toBe(403); expect(registry.get(company)).toEqual(before)
  })

  it('refuse une révision concurrente et conserve les données précédentes', async () => {
    const before = structuredClone(registry.get(company)), { bootstrap, payload } = await serviceDraft()
    const response = await sendDraft(payload, bootstrap.revision - 1)
    expect(response.status).toBe(409); expect(registry.get(company)).toEqual(before)
  })

  it('ne permet pas de rejouer ces lignes dans une autre société', async () => {
    const { bootstrap, payload } = await serviceDraft(), other = fictitiousFloor()
    other.tables[0].id = 'table-autre-societe'; registry.set('autre-fictif', other)
    const before = structuredClone([...registry.entries()])
    const response = await sendDraft(payload, bootstrap.revision, 'autre-fictif')
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect([...registry.entries()]).toEqual(before)
  })
})

describe('Place : une seule autorité pour les lignes de service', () => {
  beforeEach(() => {
    registry.clear(); company = 'place-fictive'
    const floor = fictitiousFloor()
    floor.chairs = [{ id: 'chaise', tableId: 'table', label: 'Place FICTIVE', createdAt: 1, items: [{ id: 'ligne-place', productId: 'espresso', name: 'Espresso FICTIF', price: 2.6, qty: 1, note: '', addedAt: 1 }] } as any]
    state.products = [{ id: 'espresso', name: 'Espresso FICTIF', price: 2.6, taxRate: 17, isActive: true, category: { name: 'FICTIF', icon: '' } }]
    canonicalizeFloorPricing({ tables: [], chairs: [] }, floor, state.products, 1)
    registry.set(company, floor)
  })
  const payload = (bootstrap: any) => JSON.parse(JSON.stringify({ tables: bootstrap.tables, editor: bootstrap.editor, seats: bootstrap.seats }))

  it('refuse une quantité modifiée dans le seul couvert projeté', async () => {
    const bootstrap = await getBootstrap(), draft = payload(bootstrap), before = structuredClone(registry.get(company))
    draft.tables[0].covers[0].items[0].qty = 2
    const response = await sendDraft(draft, bootstrap.revision)
    expect(response.status).toBe(409); expect(registry.get(company)).toEqual(before)
  })

  it('refuse une note modifiée dans la seule chaise et une projection oubliée', async () => {
    const bootstrap = await getBootstrap(), draft = payload(bootstrap), before = structuredClone(registry.get(company))
    draft.seats[0].items[0].note = 'Note non projetée'
    expect((await sendDraft(draft, bootstrap.revision)).status).toBe(409)
    draft.tables[0].covers = []
    expect((await sendDraft(draft, bootstrap.revision)).status).toBe(409)
    expect(registry.get(company)).toEqual(before)
  })

  it('conserve les mêmes lignes et la cuisine après modification cohérente de la place', async () => {
    const bootstrap = await getBootstrap(), draft = payload(bootstrap)
    draft.seats[0].items[0].qty = 2; draft.seats[0].items[0].note = 'Sans sucre'
    draft.tables[0].covers[0].items[0].qty = 2; draft.tables[0].covers[0].items[0].note = 'Sans sucre'
    draft.tables[0].kitchenNote = 'Servir ensemble'
    expect((await sendDraft(draft, bootstrap.revision)).status).toBe(200)
    const again = await getBootstrap()
    expect(again.tables[0].covers[0].items[0]).toMatchObject({ id: 'ligne-place', qty: 2, note: 'Sans sucre', price: 2.6, taxRate: 17 })
    expect(again.seats[0].items[0]).toMatchObject({ id: 'ligne-place', qty: 2, note: 'Sans sucre', price: 2.6, taxRate: 17 })
    expect(Object.values((registry.get(company) as any).kitchenTickets)[0]).toMatchObject({ items: [{ id: 'ligne-place', qty: 2, note: 'Sans sucre · Servir ensemble' }] })
    expect(floorLines(registry.get(company))).toHaveLength(1)
  })

  it('refuse de rattacher la projection à une autre place ou un autre instant', async () => {
    const bootstrap = await getBootstrap(), draft = payload(bootstrap), before = structuredClone(registry.get(company))
    draft.tables[0].covers[0].id = 'seat:autre-chaise:1'
    expect((await sendDraft(draft, bootstrap.revision)).status).toBe(409)
    draft.tables[0].covers[0].id = 'seat:chaise:2'
    expect((await sendDraft(draft, bootstrap.revision)).status).toBe(409)
    expect(registry.get(company)).toEqual(before)
  })
})

describe('Section stable dans un service employé', () => {
  it('conserve un ID déjà stocké au lieu de le remplacer par son libellé de présentation', async () => {
    company = 'roundtrip-fictif'; registry.clear(); state.products = []
    const floor = fictitiousFloor(); floor.tables[0].section = 'salle'; registry.set(company, floor)
    const bootstrap = await getBootstrap(), before = configuration(floor)
    const response = await sendDraft({ tables: bootstrap.tables, editor: bootstrap.editor, seats: bootstrap.seats }, bootstrap.revision)
    expect(response.status, response.body.error).toBe(200)
    expect(configuration(registry.get(company))).toEqual(before)
  })
})

describe('Ouverture vide : couverts natifs conservés au bootstrap sans résurrection de ventes', () => {
  const group = (id: string, items: any[] = []) => ({ id, label: `Groupe FICTIF ${id}`, items })
  const line = (id: string, coverId: string) => ({ id, menuItemId: 'espresso', productId: 'espresso', name: 'Espresso FICTIF',
    price: 2.6, taxRate: 17, qty: 1, note: '', coverId, addedAt: 222 })
  beforeEach(() => {
    registry.clear(); company = 'ouverture-fictive'
    state.products = [{ id: 'espresso', name: 'Espresso FICTIF', price: 2.6, taxRate: 17, isActive: true, category: { name: 'FICTIF', icon: '' } }]
    registry.set(company, fictitiousFloor())
  })
  const draftFrom = (bootstrap: any) => JSON.parse(JSON.stringify({ tables: bootstrap.tables, editor: bootstrap.editor, seats: bootstrap.seats }))
  const savedGroups = (groups: any[]) => {
    const floor = registry.get(company)!
    Object.assign(floor.tables[0], { status: 'OCCUPEE', openedAt: 111, posCovers: groups })
    canonicalizeFloorPricing({ tables: [], chairs: [] }, floor, state.products, 1)
    return floor
  }

  it('conserve les deux identités vides d’une table ouverte par un employé après PUT puis rechargements', async () => {
    const initial = await getBootstrap(), draft = draftFrom(initial), before = configuration(registry.get(company))
    Object.assign(draft.tables[0], { status: 'occupied', openedAt: 111, covers: [group('couvert-a'), group('couvert-b')] })
    const response = await sendDraft(draft, initial.revision)
    expect(response.status, response.body.error).toBe(200)
    expect((registry.get(company)!.tables[0] as any).posCovers).toEqual([group('couvert-a'), group('couvert-b')])
    for (let reload = 0; reload < 2; reload++) {
      const reloaded = await getBootstrap()
      expect(reloaded.tables[0]).toMatchObject({ status: 'occupied', openedAt: 111, covers: [group('couvert-a'), group('couvert-b')] })
      expect(reloaded.ventes).toEqual([])
    }
    expect(floorLines(registry.get(company))).toEqual([])
    expect(configuration(registry.get(company))).toEqual(before)
    expect(Object.keys((registry.get(company) as any).kitchenTickets || {})).toEqual([])
  })

  it('permet le premier article dans un groupe vide sans changer l’autre groupe ni une ligne historique', async () => {
    const old = line('historique', 'groupe-existant')
    savedGroups([group('groupe-existant', [old]), group('groupe-vide')])
    const bootstrap = await getBootstrap(), draft = draftFrom(bootstrap)
    const empty = draft.tables[0].covers.find((cover: any) => cover.id === 'groupe-vide')
    expect(empty).toEqual(group('groupe-vide'))
    empty.items.push(line('premiere-commande', empty.id))
    expect((await sendDraft(draft, bootstrap.revision)).status).toBe(200)
    const reloaded = await getBootstrap()
    expect(reloaded.tables[0].covers.map((cover: any) => [cover.id, cover.items.map((item: any) => item.id)])).toEqual([
      ['groupe-existant', ['historique']], ['groupe-vide', ['premiere-commande']],
    ])
    expect(floorLines(registry.get(company)).filter(item => item.id === 'historique')).toEqual([expect.objectContaining(old)])
    expect(new Set(floorLines(registry.get(company)).map(item => item.id)).size).toBe(2)
  })

  it('exclut un groupe réglé même vide et ne recrée pas de groupe pour une table soldée', async () => {
    const floor = savedGroups([group('groupe-regle'), { ...group('regle-historique'), paidAt: 0 },
      { ...group('regle-par-methode'), paidMethod: 'cash' }, group('groupe-encore-vide')])
    state.paid = [{ companyId: company, coverId: 'groupe-regle' }]
    expect((await getBootstrap()).tables[0].covers.map((cover: any) => cover.id)).toEqual(['groupe-encore-vide'])
    Object.assign(floor.tables[0], { status: 'NETTOYAGE', posCovers: [group('vide-ancien-service')] })
    const before = structuredClone(floor), closed = await getBootstrap()
    expect(closed.tables[0]).toMatchObject({ status: 'dirty', covers: [] })
    expect(floor).toEqual(before)
  })

  it('ne ressuscite pas un groupe rendu vide par le filtre des lignes vendues ou déjà en commande', async () => {
    savedGroups([group('vente-consommee', [line('ligne-vendue', 'vente-consommee')]),
      group('deja-commande', [line('ligne-commande', 'deja-commande')]), group('reellement-vide')])
    state.consumed = [{ companyId: company, sourceId: 'ligne-vendue' }]
    state.ordered = [{ companyId: company, id: 'ligne-commande' }]
    const before = structuredClone(registry.get(company)), bootstrap = await getBootstrap()
    expect(bootstrap.tables[0].covers).toEqual([group('reellement-vide')])
    expect(registry.get(company)).toEqual(before)
  })

  it('isole les couverts ouverts et les marqueurs de règlement entre deux sociétés', async () => {
    savedGroups([group('meme-identifiant')])
    state.paid = [{ companyId: company, coverId: 'meme-identifiant' }]
    const other = fictitiousFloor()
    Object.assign(other.tables[0], { status: 'OCCUPEE', posCovers: [group('meme-identifiant')] })
    registry.set('autre-ouverture-fictive', other)
    expect((await getBootstrap()).tables[0].covers).toEqual([])
    const response = await request(app).get('/pos/bootstrap').set('x-company-id', 'autre-ouverture-fictive').expect(200)
    expect(response.body.companyId).toBe('autre-ouverture-fictive')
    expect(response.body.tables[0].covers).toEqual([group('meme-identifiant')])
    await request(app).get('/pos/bootstrap').set('x-company-id', 'societe-inaccessible').expect(403)
  })
})

describe('Chronologie de service : dates serveur et historique conservé', () => {
  const now = 1_800_000_000_000
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(now)
    registry.clear(); company = 'chronologie-fictive'
    state.products = [{ id: 'espresso', name: 'Espresso FICTIF', price: 2.6, taxRate: 17, isActive: true, category: { name: 'FICTIF', icon: '' } }]
    const floor = fictitiousFloor(), nativeCover = 'natif', seatCover = 'seat:chaise:1'
    Object.assign(floor.tables[0], { posCovers: [{ id: nativeCover, label: 'Groupe FICTIF', items: [{ id: 'ligne-native', menuItemId: 'espresso', name: 'Espresso FICTIF', price: 2.6, qty: 1, note: '', coverId: nativeCover, addedAt: 222 }] }] })
    floor.chairs = [{ id: 'chaise', tableId: 'table', label: 'Place FICTIVE', createdAt: 1, items: [{ id: 'ligne-chaise', productId: 'espresso', menuItemId: 'espresso', name: 'Espresso FICTIF', price: 2.6, qty: 1, note: '', coverId: seatCover, addedAt: 111 }] } as any]
    canonicalizeFloorPricing({ tables: [], chairs: [] }, floor, state.products, 1)
    registry.set(company, floor)
  })
  afterEach(() => { vi.restoreAllMocks() })
  const draftFrom = (bootstrap: any) => JSON.parse(JSON.stringify({ tables: bootstrap.tables, editor: bootstrap.editor, seats: bootstrap.seats }))

  it('conserve les dates des lignes POS et chaise après quantité/note et horodate les ajouts côté serveur', async () => {
    const bootstrap = await getBootstrap(), draft = draftFrom(bootstrap), originalQuotes = structuredClone((registry.get(company) as any).posPricing)
    const native = draft.tables[0].covers.find((cover: any) => cover.id === 'natif')
    const projectedSeat = draft.tables[0].covers.find((cover: any) => cover.id === 'seat:chaise:1')
    native.items[0].qty = 2; native.items[0].note = 'Note native'; native.items[0].addedAt = 999
    draft.seats[0].items[0].qty = 2; draft.seats[0].items[0].note = 'Note chaise'; draft.seats[0].items[0].addedAt = 999
    projectedSeat.items[0].qty = 2; projectedSeat.items[0].note = 'Note chaise'
    native.items.push({ ...native.items[0], id: 'ajout-natif', qty: 1, note: '', addedAt: 123456789 })
    draft.seats[0].items.push({ ...draft.seats[0].items[0], id: 'ajout-chaise', qty: 1, note: '', addedAt: 123456789 })
    projectedSeat.items.push({ ...draft.seats[0].items[1] })
    expect((await sendDraft(draft, bootstrap.revision)).status).toBe(200)
    const saved: any = registry.get(company)
    expect(saved.tables[0].posCovers[0].items.map((item: any) => [item.id, item.addedAt])).toEqual([['ligne-native', 222], ['ajout-natif', now]])
    expect(saved.tables[0].items.map((item: any) => [item.id, item.addedAt])).toEqual([['ligne-native', 222], ['ajout-natif', now]])
    expect(saved.chairs[0].items.map((item: any) => [item.id, item.addedAt])).toEqual([['ligne-chaise', 111], ['ajout-chaise', now]])
    expect(saved.posPricing['ligne-native']).toEqual(originalQuotes['ligne-native'])
    expect(saved.posPricing['ligne-chaise']).toEqual(originalQuotes['ligne-chaise'])
  })

  it('reprend la date du miroir serveur lorsqu’elle manque seulement au couvert natif', async () => {
    const original: any = registry.get(company)
    delete original.tables[0].posCovers[0].items[0].addedAt
    original.tables[0].items[0].addedAt = 777
    const bootstrap = await getBootstrap(), draft = draftFrom(bootstrap)
    expect((await sendDraft(draft, bootstrap.revision)).status).toBe(200)
    expect((registry.get(company) as any).tables[0].posCovers[0].items[0].addedAt).toBe(777)
    expect(registry.get(company)!.tables[0].items[0].addedAt).toBe(777)
  })

  it('préserve un instant0 valide au lieu de le remplacer par le jour de sauvegarde', async () => {
    const original: any = registry.get(company)
    original.tables[0].posCovers[0].items[0].addedAt = 0; original.tables[0].items[0].addedAt = 0
    original.chairs[0].items[0].addedAt = 0
    const bootstrap = await getBootstrap(), draft = draftFrom(bootstrap)
    expect((await sendDraft(draft, bootstrap.revision)).status).toBe(200)
    const saved: any = registry.get(company)
    expect(saved.tables[0].posCovers[0].items[0].addedAt).toBe(0)
    expect(saved.tables[0].items[0].addedAt).toBe(0)
    expect(saved.chairs[0].items[0].addedAt).toBe(0)
  })

  it('refuse une date historique introuvable plutôt que d’en inventer une dans le miroir requis', async () => {
    const original: any = registry.get(company)
    delete original.tables[0].posCovers[0].items[0].addedAt
    original.tables[0].items = []
    const before = structuredClone(original), bootstrap = await getBootstrap(), draft = draftFrom(bootstrap)
    draft.tables[0].covers.find((cover: any) => cover.id === 'natif').items[0].addedAt = 555
    const response = await sendDraft(draft, bootstrap.revision)
    expect(response.status).toBe(409)
    expect(registry.get(company)).toEqual(before)
  })
})
