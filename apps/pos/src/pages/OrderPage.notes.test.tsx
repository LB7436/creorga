import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'

const fixture = vi.hoisted(() => {
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key), clear: () => storage.clear(),
  } })
  return { api: vi.fn(), saved: {} as any, writes: [] as Array<{ companyId: string; body: any }> }
})
// Seule la frontière HTTP est remplacée par un serveur en mémoire. OrderPage,
// TextModal, BusinessGuard, React, Zustand et le bridge de brouillon sont réels.
vi.mock('../lib/server', async original => ({ ...await original<typeof import('../lib/server')>(), api: fixture.api }))

import OrderPage from './OrderPage'
import { usePOS } from '../store/posStore'
import { useSeats } from '../store/seatStore'
import { clearSession, sessionCompany, setSession } from '../lib/server'
import { flushFloor, startFloorBridge, stopFloorBridge } from '../lib/floorBridge'

const serverState = (companyId = 'societe-a', staffId = 'serveur-a') => ({
  companyId, revision: 7,
  businessAccess: { role: 'SERVER', revision: `${companyId}:${staffId}:service`, version: 1,
    capabilities: ['service.read', 'service.manage', 'crm.customers.read'] },
  currentStaff: { id: staffId, name: 'Serveur fictif', role: 'SERVER', pin: '', color: '#6366f1' },
  tables: [{ id: 'table-fictive', name: 'Table FICTIVE', section: 'Salle FICTIVE', shape: 'round', seats: 2,
    x: 160, y: 140, status: 'occupied', mergedWith: [], orderNote: 'Note ticket existante', kitchenNote: 'Note cuisine existante',
    covers: [{ id: 'couvert-fictif', label: 'Couvert FICTIF', items: [
      { id: 'ligne-1', menuItemId: 'produit-1', name: 'Produit fictif A', price: 3.5, qty: 2, note: '', coverId: 'couvert-fictif', taxRate: 17 },
      { id: 'ligne-2', menuItemId: 'produit-2', name: 'Produit fictif B', price: 2.25, qty: 1, note: '', coverId: 'couvert-fictif', taxRate: 17 },
    ] }] }],
  menu: [], editor: { rooms: [], fixtures: [], scenes: [], background: null }, seats: [], ventes: [], clotures: [],
})

let renderer: ReactTestRenderer | undefined
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const button = (label: string) => renderer!.root.findAllByType('button').find(node => text(node) === label)!
const click = async (label: string) => { await act(async () => { button(label).props.onClick() }) }
const textarea = () => renderer!.root.findByType('textarea')
const enter = async (value: string) => { await act(async () => { textarea().props.onChange({ target: { value } }) }) }
const current = () => usePOS.getState().tables[0]
const settle = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(500) }) }
const mount = async () => { await act(async () => { renderer = create(<OrderPage tableId="table-fictive" onBack={() => {}} onPay={() => {}} />) }) }

beforeEach(async () => {
  stopFloorBridge(); localStorage.clear(); fixture.api.mockReset(); fixture.writes = []
  usePOS.setState({ tables: [], menu: [], businessAccess: null, currentStaff: null }); useSeats.setState({ seats: [] })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  vi.stubGlobal('window', { innerWidth: 1440, dispatchEvent() {}, confirm: () => false,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener() {}, removeEventListener() {} })
  fixture.saved = serverState()
  fixture.api.mockImplementation(async (url: string, options?: RequestInit) => {
    if (url === '/pos/customers') return []
    if (url === '/pos/bootstrap') return structuredClone(fixture.saved)
    if (url === '/pos/draft' && options?.method === 'PUT') {
      const body = JSON.parse(String(options.body))
      fixture.writes.push({ companyId: sessionCompany(), body })
      fixture.saved = { ...fixture.saved, ...body, revision: fixture.saved.revision + 1 }
      return { updatedAt: fixture.saved.revision, posPricing: {} }
    }
    throw Error(`Transport de test inattendu : ${url}`)
  })
  setSession('jeton-fictif-a', 'societe-a')
  await startFloorBridge()
  await mount()
})
afterEach(async () => {
  await act(async () => { renderer?.unmount() }); renderer = undefined
  stopFloorBridge(); clearSession(); usePOS.setState({ tables: [], menu: [], currentStaff: null }); useSeats.setState({ seats: [] })
  vi.useRealTimers(); vi.unstubAllGlobals()
})

for (const [field, action, initial] of [
  ['orderNote', 'NoteF2', 'Note ticket existante'], ['kitchenNote', 'CuisineF3', 'Note cuisine existante'],
] as const) describe(action, () => {
  it('préremplit le texte déjà enregistré', async () => {
    await click(action)
    expect(textarea().props.value).toBe(initial)
    expect(fixture.writes).toEqual([])
  })

  it('Enregistrer sans saisie conserve la note et toutes les lignes sans nouveau PUT', async () => {
    const before = structuredClone(current())
    await click(action)
    await click('Enregistrer'); await settle()
    expect(current()).toEqual(before)
    expect(fixture.saved.tables[0][field]).toBe(initial)
    expect(fixture.writes).toEqual([])
  })

  it('Annuler abandonne le texte saisi et retrouve la note enregistrée à la réouverture', async () => {
    const before = structuredClone(current())
    await click(action); await enter('Texte fictif abandonné')
    await click('Annuler'); await settle()
    expect(current()).toEqual(before)
    expect(fixture.writes).toEqual([])
    await click(action)
    expect(textarea().props.value).toBe(initial)
  })

  it('une vraie modification est transmise puis préremplie sans changer les lignes ni l’autre note', async () => {
    const before = structuredClone(current()), changed = 'Nouvelle note fictive\nDeuxième ligne'
    await click(action); await enter(changed)
    await click('Enregistrer'); await settle()
    expect(current()).toEqual({ ...before, [field]: changed })
    expect(fixture.writes).toHaveLength(1)
    expect(fixture.writes[0].body.tables[0]).toEqual({ ...before, [field]: changed })
    expect(fixture.saved.tables[0][field]).toBe(changed)
    await click(action)
    expect(textarea().props.value).toBe(changed)
  })

  it('ouvrir l’autre note pendant la fermeture ne réutilise pas le texte du premier champ', async () => {
    const otherAction = field === 'orderNote' ? 'CuisineF3' : 'NoteF2'
    const otherInitial = field === 'orderNote' ? 'Note cuisine existante' : 'Note ticket existante'
    await click(action); await enter('Saisie abandonnée du premier champ')
    await click('Annuler')
    await click(otherAction)
    const otherTitle = field === 'orderNote' ? 'Message cuisine' : 'Note sur le ticket'
    const otherDialog = renderer!.root.findAllByType('div').find(node => node.props.role === 'dialog' && node.props['aria-label'] === otherTitle)!
    expect(otherDialog.findByType('textarea').props.value).toBe(otherInitial)
    await act(async () => { otherDialog.findAllByType('button').find(node => text(node) === 'Enregistrer')!.props.onClick() })
    await settle()
    expect(fixture.writes).toEqual([])
  })

  for (const scope of ['société', 'utilisateur'] as const) it(`le changement de ${scope} remonte la vue sans conserver le texte privé précédent`, async () => {
    await click(action); await enter('Saisie privée A non validée')
    // Garder le même renderer et le même id de table : c'est le vrai garde
    // de session qui doit démonter la modale et retirer son état local.
    await act(async () => { stopFloorBridge(); setSession('jeton-fictif-b', scope === 'société' ? 'societe-b' : 'societe-a') })
    expect(renderer!.root.findAllByType('textarea')).toHaveLength(0)
    fixture.saved = serverState(scope === 'société' ? 'societe-b' : 'societe-a', scope === 'société' ? 'serveur-a' : 'serveur-b')
    fixture.saved.tables[0][field] = 'Note du nouveau contexte B'
    await act(async () => { await startFloorBridge() })
    await click(action)
    expect(textarea().props.value).toBe('Note du nouveau contexte B')
    expect(JSON.stringify(current())).not.toContain('Saisie privée A')
    await click('Enregistrer'); await settle(); await flushFloor()
    expect(fixture.saved.tables[0][field]).toBe('Note du nouveau contexte B')
    expect(fixture.writes).toEqual([])
  })
})
