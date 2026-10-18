import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'

vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } })
})

import FloorPlanPage from './FloorPlanPage'
import { usePOS, type Table } from '../store/posStore'
import { useSeats } from '../store/seatStore'

let renderer: ReactTestRenderer | undefined
const openOrder = vi.fn()
const table = (status: Table['status'] = 'available'): Table => ({
  id: 'terrasse-fictive', name: 'Table terrasse FICTIVE', section: 'terrasse',
  x: 160, y: 140, seats: 4, shape: 'round', status, covers: [], mergedWith: [],
})
const text = (node: ReactTestInstance | string): string => typeof node === 'string'
  ? node : node.children.map(child => text(child)).join('')
const button = (label: string) => renderer!.root.findAllByType('button').find(node => text(node) === label)!
const selectedCovers = () => text(button('-').parent!.findByType('span'))
const click = async (label: string) => { await act(async () => { button(label).props.onClick() }) }
const refreshTables = async () => {
  // Même table, nouvelles références comme après une projection/poll du serveur.
  await act(async () => { usePOS.setState({ tables: usePOS.getState().tables.map(item => ({ ...item, covers: [...item.covers] })) }) })
}
async function mount(status: Table['status'] = 'available') {
  usePOS.setState({ tables: [table(status)] })
  await act(async () => { renderer = create(createElement(FloorPlanPage, { onOpenOrder: openOrder })) })
  const tableControl = renderer!.root.findAll(node => typeof node.type === 'string' && node.props['data-table-id'] === 'terrasse-fictive')[0]
  await act(async () => { tableControl.props.onClick({ shiftKey: false }) })
}

beforeEach(() => {
  openOrder.mockReset()
  usePOS.setState({ businessAccess: { role: 'SERVER', revision: 'service-couverts-fictif', version: 1, capabilities: ['service.read', 'service.manage'] }, tables: [], staff: [], reservations: [], ventes: [], clotures: [], editor: {
    rooms: [{ id: 'terrasse', label: 'Terrasse FICTIVE', color: '#10b981', x: 20, y: 20, w: 600, h: 636 }],
    fixtures: [], scenes: [], background: null,
  } })
  useSeats.setState({ seats: [] })
  vi.stubGlobal('window', { innerWidth: 1440, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {} })
  // Pas de bridge démarré, API ou DOM simulé : page et stores réels en mémoire.
  // L'identité des contrôles React est vérifiable ici, le focus DOM doit être rejoué dans Chrome.
})

afterEach(async () => {
  await act(async () => { renderer?.unmount() })
  renderer = undefined
  vi.unstubAllGlobals()
})

describe('Couverts : contrôles stables pendant une actualisation du plan', () => {
  it('conserve la cible du bouton moins et la sélection quand la table est reprojetée', async () => {
    await mount()
    const minus = button('-'), plus = button('+')
    expect(selectedCovers()).toBe('2')
    await refreshTables()
    expect(button('-') === minus, 'le bouton moins ne doit pas être remonté').toBe(true)
    expect(button('+') === plus, 'le bouton plus ne doit pas être remonté').toBe(true)
    expect(selectedCovers()).toBe('2')
    expect(usePOS.getState().tables[0]).toMatchObject({ status: 'available', covers: [] })
    expect(openOrder).not.toHaveBeenCalled()
  })

  it('ne remonte pas les boutons pendant la saisie au moins/plus', async () => {
    await mount()
    const minus = button('-'), plus = button('+')
    await click('-')
    expect(selectedCovers()).toBe('1')
    expect(button('-') === minus, 'la cible moins doit survivre au changement de quantité').toBe(true)
    await click('+')
    expect(selectedCovers()).toBe('2')
    expect(button('+') === plus, 'la cible plus doit survivre au changement de quantité').toBe(true)
    expect(openOrder).not.toHaveBeenCalled()
  })

  it.each(['available', 'reserved'] as const)('borne la sélection entre 1 et la capacité puis ouvre une table %s avec la valeur conservée', async status => {
    await mount(status)
    for (let count = 0; count < 3; count++) await click('-')
    expect(selectedCovers()).toBe('1')
    for (let count = 0; count < 8; count++) await click('+')
    expect(selectedCovers()).toBe('4')
    await refreshTables()
    expect(selectedCovers()).toBe('4')
    await click('Ouvrir la table')
    expect(openOrder).toHaveBeenCalledTimes(1)
    expect(openOrder).toHaveBeenCalledWith('terrasse-fictive')
    const opened = usePOS.getState().tables[0]
    expect(opened.status).toBe('occupied')
    expect(opened.covers).toHaveLength(4)
    expect(opened.covers.map(cover => cover.items)).toEqual([[], [], [], []])
    expect(usePOS.getState().ventes).toEqual([])
    expect(usePOS.getState().clotures).toEqual([])
  })
})
