import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import GuestCallButtons from './GuestCallButtons'

// Identifiants et capacités entièrement artificiels ; aucune banque n'est appelée.
const companyId = 'guest-call-fixture', tableId = 'table-fixture'
const values = new Map<string, string>()
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
const accessKey = (company = companyId, table = tableId) => `creorga-guest-visit:${company}:${table}`
const access = (token = 'a', company = companyId, table = tableId) => values.set(accessKey(company, table), JSON.stringify({ visitId: 'visit-fixture', token: token.repeat(64) }))
const bill = (total = 11) => ({ total, orderIds: ['order-fixture'], paymentProviders: ['stripe'] })
const json = (value: unknown, status = 200) => Response.json(value, { status })
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
let renderer: ReactTestRenderer | undefined, calls: Array<{ path: string; init: RequestInit }>
let nextBill: (() => Promise<Response>) | undefined, nextCall: (() => Promise<Response>) | undefined, nextPay: (() => Promise<Response>) | undefined
let releases: Array<() => void>, assign: ReturnType<typeof vi.fn>
function hold(value: unknown, status = 200) {
  let release!: () => void
  const pending = new Promise<Response>(resolve => { release = () => resolve(json(value, status)) })
  releases.push(release)
  // La simulation ignore volontairement le signal, comme une réponse déjà reçue.
  return { request: () => pending, release }
}
const button = (name: string) => renderer!.root.findAllByType('button').find(node => text(node).trim() === name)!
const payCalls = () => calls.filter(call => call.path === '/api/guest/pay')
const paymentKeys = () => [...values.keys()].filter(key => key.startsWith('creorga-payment-visit:'))
async function mount() { await act(async () => { renderer = create(createElement(GuestCallButtons, { companyId, tableId })) }) }

beforeEach(() => {
  values.clear(); access(); values.set('creorga.guest.lang', 'fr')
  calls = []; releases = []; nextBill = undefined; nextCall = undefined; nextPay = undefined; assign = vi.fn()
  vi.stubGlobal('localStorage', storage); vi.stubGlobal('sessionStorage', storage)
  vi.stubGlobal('window', { location: { hash: '', assign }, localStorage: storage, sessionStorage: storage, addEventListener() {}, removeEventListener() {} })
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    const path = new URL(String(input)).pathname; calls.push({ path, init })
    if (path.startsWith('/api/guest/bill/')) { const response = nextBill; nextBill = undefined; return response ? response() : json(bill()) }
    if (path === '/api/guest/call-waiter') return nextCall ? nextCall() : json({ ok: true })
    if (path === '/api/guest/pay') return nextPay ? nextPay() : json({ url: 'https://checkout.stripe.com/c/fixture-only' })
    throw Error(`Destination hors fixture : ${path}`)
  })
})
afterEach(async () => { releases.forEach(release => release()); await act(async () => { renderer?.unmount() }); renderer = undefined; vi.unstubAllGlobals() })

describe('Boutons réels de visite : réponses tardives et référence de paiement', () => {
  it('verrouille deux appels synchrones avant le rerendu', async () => {
    const pending = hold({ ok: true }); nextCall = pending.request
    await mount()
    const call = button('Appeler le serveur').props.onClick
    await act(async () => { call(); call() })
    expect(calls.filter(call => call.path === '/api/guest/call-waiter')).toHaveLength(1)
    await act(async () => { pending.release() })
    expect(text(renderer!.root)).toContain('Le serveur arrive')
  })
  it('retire immédiatement l’ancienne addition au changement de société/table et ignore son retour', async () => {
    await mount(); expect(text(renderer!.root)).toContain('11,00')
    access('b', 'other-company-fixture', 'other-table-fixture')
    const pending = hold(bill(22)); nextBill = pending.request
    await act(async () => { renderer!.update(createElement(GuestCallButtons, { companyId: 'other-company-fixture', tableId: 'other-table-fixture' })) })
    expect(text(renderer!.root)).not.toContain('11,00')
    expect(renderer!.root.findAllByType('select')).toHaveLength(0)
    await act(async () => { pending.release() })
    expect(text(renderer!.root)).toContain('22,00')
  })
  it('invalide aussi une capacité renouvelée pour la même visite', async () => {
    const old = hold(bill(11)); nextBill = old.request
    await mount()
    access('b'); nextBill = async () => json(bill(22))
    await act(async () => { renderer!.update(createElement(GuestCallButtons, { companyId, tableId })) })
    await act(async () => { old.release() })
    expect(text(renderer!.root)).toContain('22,00')
    expect(text(renderer!.root)).not.toContain('11,00')
    expect(calls[0].init.signal?.aborted).toBe(true)
  })
  it('efface l’addition affichée lorsque le serveur refuse la visite révoquée', async () => {
    await mount()
    nextCall = async () => json({ error: 'Visite fictive révoquée.' }, 403)
    await act(async () => { button('Appeler le serveur').props.onClick() })
    expect(text(renderer!.root)).toContain('Visite fictive révoquée.')
    expect(text(renderer!.root)).not.toContain('11,00')
    expect(renderer!.root.findAllByType('select')).toHaveLength(0)
    expect(renderer!.root.findAllByType('button').every(node => node.props.disabled)).toBe(true)
  })
  it('ne crée pas de tentative après une lecture d’addition devenue obsolète', async () => {
    await mount()
    const pending = hold(bill()); nextBill = pending.request
    await act(async () => { button("Payer l'addition").props.onClick() })
    access('b') // Pas de rerendu : la garde vérifie aussi la capacité courante.
    await act(async () => { pending.release() })
    expect(payCalls()).toHaveLength(0); expect(paymentKeys()).toHaveLength(0)
    expect(assign).not.toHaveBeenCalled()
  })
  it('ignore une redirection après fermeture et conserve la référence pour vérification/rejeu', async () => {
    await mount()
    const pending = hold({ url: 'https://checkout.stripe.com/c/fixture-only' }); nextPay = pending.request
    await act(async () => { button("Payer l'addition").props.onClick() })
    expect(payCalls()).toHaveLength(1)
    const keys = paymentKeys(); expect(keys).toHaveLength(1)
    await act(async () => { renderer!.unmount() }); renderer = undefined
    await act(async () => { pending.release() })
    expect(assign).not.toHaveBeenCalled(); expect(paymentKeys()).toEqual(keys)
    expect(payCalls()[0].init.signal?.aborted).toBe(true)
  })
  it('ignore aussi le corps bancaire reçu après fermeture, même si HTTP était déjà terminé', async () => {
    await mount()
    let release!: () => void
    const body = new Promise<unknown>(resolve => { release = () => resolve({ url: 'https://checkout.stripe.com/c/fixture-only' }) })
    releases.push(release)
    nextPay = async () => ({ ok: true, status: 200, json: () => body }) as Response
    await act(async () => { button("Payer l'addition").props.onClick() })
    const keys = paymentKeys()
    await act(async () => { renderer!.unmount() }); renderer = undefined
    await act(async () => { release() })
    expect(assign).not.toHaveBeenCalled(); expect(paymentKeys()).toEqual(keys)
  })
  it('n’affiche pas une addition en retard après un refus courant de la visite', async () => {
    const old = hold(bill()); nextBill = old.request
    await mount()
    nextCall = async () => json({ error: 'Visite fictive révoquée.' }, 403)
    await act(async () => { button('Appeler le serveur').props.onClick() })
    await act(async () => { old.release() })
    expect(text(renderer!.root)).toContain('Visite fictive révoquée.')
    expect(text(renderer!.root)).not.toContain('11,00')
    expect(renderer!.root.findAllByType('select')).toHaveLength(0)
  })
})
