import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import type { Cover } from '../store/posStore'
import type { PartialResult } from '../lib/floorBridge'

const payment = vi.hoisted(() => ({ send: vi.fn() }))
vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } })
})
// Seule l'opération de transport est simulée. Le panneau, ses hooks, les
// identités de session et les calculs de présentation sont ceux du produit.
vi.mock('../lib/floorBridge', () => ({ payPartServer: payment.send }))
import PartialPaymentPanel from './PartialPaymentPanel'
import { clearSession, setSession } from '../lib/server'
import { usePOS } from '../store/posStore'

const cover = (id = 'couvert-cafe', price = 10.25): Cover => ({ id, label: 'Groupe FICTIF', items: [
  { id: `ligne-${id}`, menuItemId: 'produit-fictif', name: 'Commande FICTIVE', price, qty: 1, taxRate: 3, note: '', coverId: id },
] })
const confirmed = (paidCents = 1025, outstandingCents = 0): PartialResult => ({
  requestId: 'reglement-fictif', status: outstandingCents ? 'PARTIAL' : 'SETTLED', confirmation: 'manual_declaration',
  paidCents, outstandingCents, cashChangeCents: 0, sales: [],
})
const deferred = () => {
  let resolve!: (value: PartialResult) => void
  const promise = new Promise<PartialResult>(done => { resolve = done })
  return { promise, resolve }
}
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
let renderer: ReactTestRenderer | undefined
let props: { tableId: string; covers: Cover[]; onDone: () => void }
const done = vi.fn()
const summary = () => text(renderer!.root.findAllByType('p').find(node => text(node).startsWith('Déjà enregistré'))!)
const statuses = () => renderer!.root.findAllByProps({ role: 'status' }).map(node => text(node)).join('')
const alerts = () => renderer!.root.findAllByProps({ role: 'alert' }).map(node => text(node)).join('')
const change = async (label: string, value: string) => { await act(async () => { renderer!.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }) }) }
async function mount() { await act(async () => { renderer = create(createElement(PartialPaymentPanel, props)) }) }
async function update(patch: Partial<typeof props>) {
  props = { ...props, ...patch }
  await act(async () => { renderer!.update(createElement(PartialPaymentPanel, props)) })
}
async function startPayment() {
  let operation!: Promise<void>
  await act(async () => {
    operation = renderer!.root.findAllByType('button').find(node => text(node).startsWith('Enregistrer'))!.props.onClick()
  })
  return { operation }
}
async function finish(pending: ReturnType<typeof deferred>, operation: Promise<void>, result = confirmed()) {
  await act(async () => { pending.resolve(result); await operation })
}
async function settle() {
  const pending = deferred(); payment.send.mockReturnValueOnce(pending.promise)
  const { operation } = await startPayment()
  await update({ covers: [] })
  await finish(pending, operation)
}

beforeEach(() => {
  payment.send.mockReset(); done.mockReset()
  setSession('jeton-fictif-cafe', 'societe-cafe')
  usePOS.setState({ businessAccess: { role: 'CASHIER', revision: 'paiement-fictif', version: 1, capabilities: ['service.read', 'payments.receive'] } })
  props = { tableId: 'table-cafe', covers: [cover()], onDone: done }
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; clearSession() })

describe('Récapitulatif du règlement déclaré : composant React réel', () => {
  it('conserve 10,25 € confirmés après 4 € puis 6,25 € mixtes et le vidage des couverts', async () => {
    await mount()
    await change('Montant acompte', '4')
    const deposit = deferred(); payment.send.mockReturnValueOnce(deposit.promise)
    const first = await startPayment()
    await update({ covers: [{ ...cover(), payment: { orderId: 'commande-fictive', totalCents: 1025, paidCents: 400, outstandingCents: 625 } }] })
    await finish(deposit, first.operation, confirmed(400, 625))
    expect(summary()).toBe('Déjà enregistré : 4.00 € · Restant dû : 6.25 €')
    await change('Moyen acompte', 'MIXED')
    await change('Part espèces acompte', '2')
    const balance = deferred(); payment.send.mockReturnValueOnce(balance.promise)
    const second = await startPayment()
    expect(payment.send.mock.calls[1][0]).toEqual({ tableId: 'table-cafe', coverIds: ['couvert-cafe'], amountCents: 625, expectedOutstandingCents: 625,
      method: 'MIXED', cashReceivedCents: 200, allocations: [{ method: 'CASH', amountCents: 200 }, { method: 'CARD', amountCents: 425 }] })
    await update({ covers: [] }) // La projection serveur arrive avant le retour de payPartServer.
    await finish(balance, second.operation)
    expect(summary()).toBe('Déjà enregistré : 10.25 € · Restant dû : 0.00 €')
    expect(statuses()).toContain('10.25 €')
    expect(renderer!.root.findAllByProps({ 'aria-label': 'Montant acompte' })).toHaveLength(0)
    expect(text(renderer!.root)).toContain('Aucun débit bancaire automatique')
    expect(done).not.toHaveBeenCalled()
  })

  it('ne transporte pas le résultat confirmé vers une autre table', async () => {
    await mount(); await settle()
    await update({ tableId: 'table-restaurant', covers: [cover('autre-groupe', 5)] })
    expect(summary()).toBe('Déjà enregistré : 0.00 € · Restant dû : 5.00 €')
    expect(statuses()).toBe('')
  })

  it('ne fige pas un solde partiel quand une projection plus récente arrive sur le même groupe', async () => {
    await mount(); await change('Montant acompte', '4')
    const deposit = deferred(); payment.send.mockReturnValueOnce(deposit.promise)
    const { operation } = await startPayment()
    await update({ covers: [{ ...cover(), payment: { orderId: 'commande-fictive', totalCents: 1025, paidCents: 400, outstandingCents: 625 } }] })
    await finish(deposit, operation, confirmed(400, 625))
    await update({ covers: [{ ...cover(), payment: { orderId: 'commande-fictive', totalCents: 1025, paidCents: 500, outstandingCents: 525 } }] })
    expect(summary()).toBe('Déjà enregistré : 5.00 € · Restant dû : 5.25 €')
    expect(renderer!.root.findByProps({ 'aria-label': 'Montant acompte' }).props.placeholder).toBe('Solde : 5.25')
  })

  it('ne transporte pas le résultat vers une autre société utilisant le même identifiant de table', async () => {
    await mount(); await settle()
    await act(async () => { setSession('jeton-fictif-boulangerie', 'societe-boulangerie'); usePOS.setState({ businessAccess: { role: 'CASHIER', revision: 'paiement-boulangerie-fictif', version: 1, capabilities: ['service.read', 'payments.receive'] } }) })
    await update({ covers: [] })
    expect(summary()).toBe('Déjà enregistré : 0.00 € · Restant dû : 0.00 €')
    expect(statuses()).toBe('')
  })

  it('retire le résultat à la reconnexion d’un autre utilisateur de la même société', async () => {
    await mount(); await settle()
    await act(async () => { setSession('jeton-fictif-autre-employe', 'societe-cafe'); usePOS.setState({ businessAccess: { role: 'CASHIER', revision: 'paiement-autre-employe-fictif', version: 1, capabilities: ['service.read', 'payments.receive'] } }) })
    await update({ covers: [] })
    expect(statuses()).toBe('')
    expect(summary()).toContain('Déjà enregistré : 0.00 €')
  })

  it('ne réaffiche pas un ancien solde après une nouvelle sélection puis son retrait', async () => {
    await mount(); await settle()
    await update({ covers: [cover('nouvelle-tournee', 3.5)] })
    expect(statuses()).toBe('')
    expect(summary()).toBe('Déjà enregistré : 0.00 € · Restant dû : 3.50 €')
    await update({ covers: [] })
    expect(statuses()).toBe('')
    expect(summary()).toContain('Déjà enregistré : 0.00 €')
  })

  it('distingue le groupe soldé du groupe suivant quand des parts QR restent ouvertes', async () => {
    props.covers = [cover('guest:share:a', 10.25), cover('guest:share:b', 5)]
    await mount(); await change('Groupe à encaisser', 'guest:share:a')
    const pending = deferred(); payment.send.mockReturnValueOnce(pending.promise)
    const { operation } = await startPayment()
    await update({ covers: [cover('guest:share:b', 5)] })
    await finish(pending, operation)
    expect(summary()).toBe('Déjà enregistré : 10.25 € · Restant dû : 0.00 €')
    await change('Groupe à encaisser', 'guest:share:b')
    expect(statuses()).toBe('')
    expect(summary()).toBe('Déjà enregistré : 0.00 € · Restant dû : 5.00 €')
    expect(payment.send.mock.calls[0][0].coverIds).toEqual(['guest:share:a'])
  })

  it('ignore une réponse tardive après changement de table', async () => {
    await mount()
    const pending = deferred(); payment.send.mockReturnValueOnce(pending.promise)
    const { operation } = await startPayment()
    await update({ tableId: 'autre-table', covers: [cover('autre-groupe', 5)] })
    await finish(pending, operation)
    expect(statuses()).toBe('')
    expect(summary()).toBe('Déjà enregistré : 0.00 € · Restant dû : 5.00 €')
    expect(renderer!.root.findByProps({ 'aria-label': 'Montant acompte' }).props.disabled).toBe(false)
  })

  it('ignore une confirmation reçue après changement de session même sans nouveau rendu parent', async () => {
    await mount()
    const pending = deferred(); payment.send.mockReturnValueOnce(pending.promise)
    const { operation } = await startPayment()
    await act(async () => { setSession('jeton-fictif-autre', 'autre-societe') })
    await finish(pending, operation)
    expect(statuses()).toBe('')
  })

  it('n’affiche pas une réponse tardive dans une autre sélection de couverts', async () => {
    await mount()
    const pending = deferred(); payment.send.mockReturnValueOnce(pending.promise)
    const { operation } = await startPayment()
    await update({ covers: [cover('autre-selection', 6)] })
    await finish(pending, operation)
    expect(statuses()).toBe('')
    expect(summary()).toBe('Déjà enregistré : 0.00 € · Restant dû : 6.00 €')
  })

  it('traduit l’erreur réseau générique sans annoncer un refus de paiement', async () => {
    await mount(); payment.send.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { operation } = await startPayment(); await act(async () => { await operation })
    expect(alerts()).toMatch(/connexion.*serveur/i)
    expect(alerts()).toMatch(/résultat.*vérifier/i)
    expect(alerts()).toMatch(/référence conservée/i)
    expect(alerts()).not.toContain('Failed to fetch')
    expect(statuses()).toBe('')
  })

  it.each([
    ['Le solde serveur a changé. Aucun nouveau règlement créé : actualisez.', 409],
    ['Failed to fetch', 403],
  ])('conserve l’erreur serveur exacte : %s', async (message, status) => {
    await mount(); payment.send.mockRejectedValueOnce(Object.assign(new Error(message), { status }))
    const { operation } = await startPayment(); await act(async () => { await operation })
    expect(alerts()).toBe(message)
    expect(statuses()).toBe('')
  })
})
