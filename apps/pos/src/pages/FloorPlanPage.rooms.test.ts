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

const rooms = [
  { id: 'salle', label: 'Salle café', color: '#6366f1', x: 20, y: 20, w: 600, h: 636 },
  { id: 'terrasse', label: 'Terrasse', color: '#10b981', x: 380, y: 20, w: 600, h: 636 },
  { id: 'comptoir', label: 'Comptoir', color: '#f59e0b', x: 740, y: 20, w: 600, h: 636 },
]
const table = (id: string, section: string, x = 160, y = 140): Table => ({
  id, name: 'Table 1', section, x, y, seats: 4, shape: 'round', status: 'occupied', mergedWith: [],
  covers: [{ id: `couvert-${id}`, label: 'Groupe fictif', items: [{ id: `ligne-${id}`, menuItemId: 'cafe', name: 'Café fictif', price: 2.5, taxRate: 3, qty: 1, note: '', coverId: `couvert-${id}` }] }],
})
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
let renderer: ReactTestRenderer | undefined
const openOrder = vi.fn()
const tableControls = () => renderer!.root.findAll(node => typeof node.type === 'string' && (Boolean(node.props['data-table-id']) || (node.type === 'g' && node.props.role === 'button')))
const button = (label: string) => renderer!.root.findAllByType('button').find(node => text(node) === label)!
const changeRoom = async (value: string) => { await act(async () => { renderer!.root.findByProps({ 'aria-label': 'Salle affichée' }).props.onChange({ target: { value } }) }) }
const clickTable = async (id: string) => { await act(async () => { tableControls().find(node => node.props['data-table-id'] === id)!.props.onClick({ shiftKey: false }) }) }
async function mount() { await act(async () => { renderer = create(createElement(FloorPlanPage, { onOpenOrder: openOrder })) }) }

beforeEach(() => {
  openOrder.mockReset()
  usePOS.setState({ businessAccess: { role: 'SERVER', revision: 'salle-service-fictif', version: 1, capabilities: ['service.read', 'service.manage'] }, tables: [table('salle-1', 'salle'), table('terrasse-1', 'terrasse'), table('comptoir-1', 'comptoir')], editor: { rooms, fixtures: [], scenes: [], background: null }, staff: [], reservations: [] })
  useSeats.setState({ seats: [] })
  // Pas de DOM synthétique ni de transport remplacé : vrais composants et stores.
  // Ces tests n'exécutent aucun paiement, sauvegarde ou appel réseau.
  vi.stubGlobal('window', { innerWidth: 1440, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener() {}, removeEventListener() {} })
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; vi.unstubAllGlobals() })

describe('Sélection de table par salle sans conversion des coordonnées historiques', () => {
  it('ne superpose pas les trois tables de salles différentes au même point', async () => {
    await mount()
    expect(tableControls()).toHaveLength(1)
    expect(tableControls().map(node => node.props['data-table-id'])).toEqual(['salle-1'])
    expect(tableControls()[0].props['aria-label']).toContain('Salle café')
    await clickTable('salle-1')
    await act(async () => { button('Voir la commande').props.onClick() })
    expect(openOrder).toHaveBeenCalledWith('salle-1')
  })

  it('ouvre le bon identifiant après changement de salle sans modifier une ligne ni une position', async () => {
    const original = usePOS.getState().tables, before = structuredClone(original)
    await mount()
    await changeRoom('room:comptoir')
    expect(tableControls().map(node => node.props['data-table-id'])).toEqual(['comptoir-1'])
    await clickTable('comptoir-1')
    await act(async () => { button('Voir la commande').props.onClick() })
    expect(openOrder).toHaveBeenCalledWith('comptoir-1')
    expect(usePOS.getState().tables).toBe(original)
    expect(usePOS.getState().tables).toEqual(before)
  })

  it('impose des boutons distincts quand deux tables de la même salle se recouvrent', async () => {
    usePOS.setState({ tables: [table('groupe-a', 'salle'), table('groupe-b', 'salle')] })
    await mount()
    expect(tableControls().map(node => node.type)).toEqual(['button', 'button'])
    expect(renderer!.root.findAllByProps({ role: 'status' }).some(node => /superpos|géométrie/i.test(text(node)))).toBe(true)
    await clickTable('groupe-b')
    await act(async () => { button('Voir la commande').props.onClick() })
    expect(openOrder).toHaveBeenCalledWith('groupe-b')
    expect(usePOS.getState().tables.map(item => [item.x, item.y])).toEqual([[160, 140], [160, 140]])
  })

  it('offre aussi une liste explicite et conserve la navigation clavier pour un plan non ambigu', async () => {
    await mount()
    expect(tableControls()[0].type).toBe('g')
    await act(async () => { tableControls()[0].props.onKeyDown({ key: 'Enter', preventDefault() {} }) })
    await act(async () => { button('Voir la commande').props.onClick() })
    expect(openOrder).toHaveBeenCalledWith('salle-1')
    await act(async () => { button('Liste des tables').props.onClick() })
    expect(tableControls()[0].type).toBe('button')
  })

  it('ne rattache pas silencieusement une ancienne section au libellé de deux salles', async () => {
    usePOS.setState({ tables: [table('ancienne', 'Salle répétée')], editor: { rooms: [{ ...rooms[0], label: 'Salle répétée' }, { ...rooms[1], label: 'Salle répétée' }], fixtures: [], scenes: [], background: null } })
    await mount()
    expect(tableControls()).toHaveLength(0)
    const options = renderer!.root.findAllByType('option')
    const unresolved = options.find(option => text(option).includes('Salle à confirmer'))!
    expect(unresolved).toBeDefined()
    await changeRoom(unresolved.props.value)
    expect(tableControls().map(node => node.props['data-table-id'])).toEqual(['ancienne'])
    expect(tableControls()[0].type).toBe('button')
  })

  it('garde les centimes dans le CA en cours et le libellé de table', async () => {
    usePOS.setState({ businessAccess: { role: 'OWNER', revision: 'salle-revenu-fictif', version: 1, capabilities: ['service.read', 'service.manage', 'finance.revenue.read'] }, tables: [table('salle-1', 'salle')] })
    await mount()
    const totals = renderer!.root.findAllByType('span').filter(node => text(node) === '2.50 €')
    expect(totals.length).toBeGreaterThan(0)
    expect(renderer!.root.findAllByType('text').some(node => text(node).includes('2.50 €'))).toBe(true)
    expect(usePOS.getState().tables[0].covers[0].items[0].price).toBe(2.5)
  })

  it('présente les chaises sans salle dans un espace indépendant accessible', async () => {
    useSeats.setState({ seats: [{ id: 'chaise-seule', tableId: null, status: 'free', items: [], x: 160, y: 140, createdAt: 1 }] })
    await mount()
    await changeRoom('standalone')
    expect(tableControls()).toHaveLength(0)
    expect(renderer!.root.findAllByProps({ 'data-seat-id': 'chaise-seule' })).toHaveLength(1)
    expect(renderer!.root.findByProps({ 'data-seat-id': 'chaise-seule' }).type).toBe('button')
  })

  it('garde chaque place accessible quand le plan est remplacé par une liste sûre', async () => {
    usePOS.setState({ tables: [table('groupe-a', 'salle'), table('groupe-b', 'salle')] })
    useSeats.setState({ seats: [{ id: 'place-b', tableId: 'groupe-b', position: 0, status: 'free', customerName: 'PLACE FICTIVE B', items: [], createdAt: 1 }] })
    await mount()
    const seatButton = renderer!.root.findByProps({ 'aria-label': 'Table 1 — Salle café — place 1', 'data-seat-table-id': 'groupe-b' })
    await act(async () => { seatButton.props.onClick() })
    expect(renderer!.root.findAll(node => typeof node.type === 'string' && text(node) === 'PLACE FICTIVE B').length).toBeGreaterThan(0)
    expect(useSeats.getState().seats.find(seat => seat.id === 'place-b')).toMatchObject({ tableId: 'groupe-b', position: 0 })
    expect(openOrder).not.toHaveBeenCalled()
  })

  it('garde une intention de transfert intersalles et annonce les salles malgré des noms identiques', async () => {
    const questions: string[] = []
    Object.assign(window, { confirm: (question: string) => { questions.push(question); return false } })
    const network = vi.fn(() => { throw Error('Aucun appel réseau ne doit suivre une annulation') })
    vi.stubGlobal('fetch', network)
    await mount()
    await act(async () => { tableControls()[0].props.onContextMenu({ preventDefault() {}, clientX: 0, clientY: 0 }) })
    await act(async () => { button('↔Transférer').props.onClick() })
    await changeRoom('room:comptoir')
    await clickTable('comptoir-1')
    expect(questions).toHaveLength(1)
    expect(questions[0]).toContain('Table 1 (Salle café) → Table 1 (Comptoir)')
    expect(network).not.toHaveBeenCalled()
    expect(openOrder).not.toHaveBeenCalled()
    expect(renderer!.root.findAllByType('button').some(node => text(node) === 'Voir la commande')).toBe(false)
    expect(usePOS.getState().tables.map(item => [item.id, item.section, item.covers.length])).toEqual([
      ['salle-1', 'salle', 1], ['terrasse-1', 'terrasse', 1], ['comptoir-1', 'comptoir', 1],
    ])
  })
})
