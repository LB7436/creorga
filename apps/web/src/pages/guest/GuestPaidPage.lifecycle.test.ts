import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router-dom'
import GuestPaidPage from './GuestPaidPage'

const companyId = 'guest-paid-fixture', tableId = 'table-fixture'
const route = (attempt = '') => `/c/paid?companyId=${companyId}&table=${tableId}${attempt ? `&attempt=${attempt}` : ''}`
const values = new Map<string, string>()
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
let renderer: ReactTestRenderer | undefined, navigate: NavigateFunction, calls: Array<RequestInit>, releases: Array<() => void>
let respond: (init: RequestInit) => Promise<Response>
const verified = { status: 'succeeded', confirmation: 'provider_verified' }
function hold(value = verified) {
  let release!: () => void
  const pending = new Promise<Response>(resolve => { release = () => resolve(Response.json(value)) })
  releases.push(release)
  return { request: () => pending, release }
}
function MountedPage() { navigate = useNavigate(); return createElement(GuestPaidPage) }
async function mount(attempt = 'attempt-a-fixture') { await act(async () => { renderer = create(createElement(MemoryRouter, { initialEntries: [route(attempt)] }, createElement(MountedPage))) }) }
beforeEach(() => {
  values.clear(); values.set(`creorga-guest-visit:${companyId}:${tableId}`, JSON.stringify({ visitId: 'visit-fixture', token: 'a'.repeat(64) }))
  calls = []; releases = []; respond = async () => Response.json(verified)
  vi.stubGlobal('sessionStorage', storage)
  vi.stubGlobal('window', { location: { hash: '' }, sessionStorage: storage })
  vi.stubGlobal('fetch', async (_input: string | URL, init: RequestInit) => { calls.push(init); return respond(init) })
})
afterEach(async () => { releases.forEach(release => release()); await act(async () => { renderer?.unmount() }); renderer = undefined; vi.unstubAllGlobals() })

describe('Retour bancaire réel : une ancienne vérification ne prouve pas le nouveau lien', () => {
  it('ignore une ancienne réponse positive après navigation vers un lien sans preuve', async () => {
    const old = hold(); respond = old.request
    await mount()
    await act(async () => { navigate(route()) })
    expect(text(renderer!.root)).toContain('Paiement non confirmé')
    await act(async () => { old.release() })
    expect(text(renderer!.root)).not.toContain('Paiement reçu')
    expect(text(renderer!.root)).toContain('Aucune preuve')
    expect(calls[0].signal?.aborted).toBe(true)
  })
  it('remplace immédiatement un succès ancien par la vérification de la nouvelle tentative', async () => {
    await mount(); expect(text(renderer!.root)).toContain('Paiement reçu')
    const next = hold(); respond = next.request
    await act(async () => { navigate(route('attempt-b-fixture')) })
    expect(text(renderer!.root)).toContain('Vérification du paiement')
    expect(text(renderer!.root)).not.toContain('Paiement reçu')
    await act(async () => { next.release() })
    expect(text(renderer!.root)).toContain('Paiement reçu')
  })
  it('ne confirme ni une réponse après renouvellement de capacité ni une preuve serveur insuffisante', async () => {
    const old = hold(); respond = old.request
    await mount()
    values.set(`creorga-guest-visit:${companyId}:${tableId}`, JSON.stringify({ visitId: 'visit-fixture', token: 'b'.repeat(64) }))
    await act(async () => { old.release() })
    expect(text(renderer!.root)).not.toContain('Paiement reçu')
    respond = async () => Response.json({ status: 'succeeded', confirmation: 'browser_return_only' })
    await act(async () => { navigate(route('attempt-b-fixture')) })
    expect(text(renderer!.root)).toContain('Paiement non confirmé')
  })
  it('ne remplace pas la preuve de la nouvelle tentative par le refus tardif de l’ancienne', async () => {
    let release!: () => void
    const old = new Promise<Response>(resolve => { release = () => resolve(Response.json({ error: 'Ancienne tentative fictive refusée.' }, { status: 403 })) })
    releases.push(release); respond = () => old
    await mount()
    respond = async () => Response.json(verified)
    await act(async () => { navigate(route('attempt-b-fixture')) })
    expect(text(renderer!.root)).toContain('Paiement reçu')
    await act(async () => { release() })
    expect(text(renderer!.root)).toContain('Paiement reçu')
    expect(text(renderer!.root)).not.toContain('Ancienne tentative')
  })
})
