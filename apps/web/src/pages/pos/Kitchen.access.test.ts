import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import type { BusinessAccess, UserCompany } from '@/types'

vi.hoisted(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } })
})
const { default: Kitchen } = await import('./Kitchen')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const { authDataScope } = await import('@/lib/authScope')
const savedAdapter = api.defaults.adapter
const read = 'service.read', manage = 'service.manage', cancel = 'orders.cancel'
type Ticket = { id: string; tableName: string; coverLabel: string; status: string; createdAt: number; updatedAt: number;
  items: Array<{ id: string; name: string; qty: number; note: string }>;
  routing?: Array<{ tableName: string; coverLabel: string; name: string; qty: number; kitchenNote?: string; barNote?: string }> }
type Plan = { wait?: Promise<void>; status?: number; data?: unknown }
type Call = { method: string; url: string; company: string; body: any; signal: { readonly aborted: boolean } | undefined }
let renderer: ReactTestRenderer | undefined, calls: Call[], reads: Plan[], patch: Plan
let tickets: Record<string, Ticket[]>, releaseAll: Array<() => void>, revision: number
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const content = () => text(renderer!.root)
const buttons = (label: string) => renderer!.root.findAllByType('button').filter(node => text(node) === label)
const getCalls = () => calls.filter(call => call.method === 'get')
const patchCalls = () => calls.filter(call => call.method === 'patch')
function held() { let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve }); releaseAll.push(release); return { wait, release } }
function policy(capabilities: string[], companyId: string, role: BusinessAccess['role'] = 'MANAGER'): BusinessAccess {
  return { role, capabilities, revision: `kitchen-${companyId}-${++revision}`, version: revision }
}
function identify(capabilities = [read, manage, cancel], role: UserCompany['role'] = 'MANAGER', human = 'kitchen-human') {
  useAuthStore.setState({ logoutRevocationPending: false })
  useAuthStore.getState().setAuth({ accessToken: 'FICTITIOUS-TOKEN',
    user: { id: human, email: 'kitchen@fixture.invalid', firstName: 'Cuisine', lastName: 'FICTIVE', avatar: null },
    companies: ['company-a', 'company-b'].map(companyId => ({ id: `${human}-${companyId}`, userId: human, companyId, role, isActive: true,
      businessAccess: policy(capabilities, companyId, role), company: { id: companyId, name: `Société FICTIVE ${companyId}`, legalName: null, vatNumber: null, currency: 'EUR' } })) })
}
function rights(capabilities: string[]) {
  const current = useAuthStore.getState()
  current.setBusinessAccess(policy(capabilities, current.companyId!), current.companyId!, current.user!.id)
}
function ticket(company = 'company-a', status = 'waiting'): Ticket {
  return { id: `ticket:${company}`, tableName: `Table FICTIVE ${company}`, coverLabel: 'Groupe FICTIF', status,
    createdAt: Date.parse('2026-10-18T10:00:00Z'), updatedAt: 100,
    items: [{ id: `line-${company}`, name: `Soupe FICTIVE ${company}`, qty: 2, note: 'Sans lait — note saisie, non diagnostic' }] }
}
async function settle() { await act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }) }
async function mount() { await act(async () => { renderer = create(createElement(Kitchen)) }); await settle() }
async function invoke(handler: () => unknown) { await act(async () => { await handler() }); await settle() }

beforeEach(() => {
  calls = []; reads = []; patch = {}; releaseAll = []; revision = 0
  tickets = { 'company-a': [ticket()], 'company-b': [ticket('company-b')] }
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/pos/kitchen' }, localStorage, confirm: vi.fn(() => true) })
  vi.stubGlobal('document', { getElementById: () => true, addEventListener() {}, removeEventListener() {} })
  identify(); toast.remove()
  // Vrai composant, store et intercepteurs ; seule la frontière réseau est fictive.
  api.defaults.adapter = async config => {
    const method = config.method || 'get', url = config.url || '', company = String(config.headers['x-company-id'])
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    calls.push({ method, url, company, body, signal: config.signal })
    const plan = method === 'get' ? reads.shift() || {} : patch
    const data = structuredClone(plan.data === undefined ? method === 'get' ? { revision: 1, tickets: tickets[company] } : { ok: true } : plan.data)
    await plan.wait
    if (plan.status) throw new AxiosError('Refus réseau FICTIF', 'ERR_BAD_RESPONSE', config, undefined,
      { config, status: plan.status, statusText: 'fixture', headers: {}, data: { message: plan.status === 409 ? 'Le ticket a changé.' : 'Refus FICTIF' } })
    if (method === 'patch' && url.startsWith('/pos/kitchen/')) {
      const id = decodeURIComponent(url.slice('/pos/kitchen/'.length))
      tickets[company] = tickets[company].map(entry => entry.id === id ? { ...entry, status: body.status, updatedAt: entry.updatedAt + 1 } : entry)
        .filter(entry => !['served', 'cancelled'].includes(entry.status))
    } else if (method !== 'get' || url !== '/pos/kitchen') throw Error(`Transport non prévu : ${method} ${url}`)
    return { config, status: 200, statusText: 'fixture', headers: {}, data }
  }
})
afterEach(async () => {
  await act(async () => { renderer?.unmount() }); renderer = undefined
  releaseAll.forEach(release => release()); await settle()
  api.defaults.adapter = savedAdapter; useAuthStore.getState().logout(); toast.remove(); vi.useRealTimers(); vi.unstubAllGlobals()
})

describe('cuisine web réelle, droits et périmètre courant', () => {
  it('charge seulement les vrais tickets de la société, leurs notes et le routage sans déduire des allergies', async () => {
    tickets['company-a'][0].routing = [{ tableName: 'Destination FICTIVE', coverLabel: 'Part FICTIVE', name: 'Soupe FICTIVE', qty: 1, kitchenNote: 'Note cuisine FICTIVE', barNote: 'Note bar FICTIVE' }]
    tickets['company-a'][0].items.push({ id: 'correction', name: 'Correction FICTIVE', qty: -1, note: '' })
    await mount()
    expect(getCalls()).toHaveLength(1)
    expect(getCalls()[0].company).toBe('company-a')
    expect(content()).toContain('Soupe FICTIVE company-a')
    expect(content()).toContain('Sans lait — note saisie, non diagnostic')
    expect(content()).toContain('Destination FICTIVE')
    expect(content()).toContain('Note cuisine FICTIVE')
    expect(content()).toContain('Note bar FICTIVE')
    expect(content()).toContain('-1 × Correction FICTIVE')
    expect(content()).not.toMatch(/Spritz|Laura|Karim|ALLERGIE|Temps moyen|Commandes \/ h|Rappel envoyé|Son activé/)
  })

  it('ne présente ni démonstration ni état vide confirmé avant la réponse serveur', async () => {
    reads.push(held()); await mount()
    expect(content()).toContain('Chargement des tickets')
    expect(content()).not.toContain('Aucun ticket à préparer')
    expect(content()).not.toMatch(/Spritz|Laura|Karim|7 commandes/)
  })

  it.each([{ capabilities: [] }, { capabilities: [manage] }])('ne lit rien sans service.read : %j', async ({ capabilities }) => {
    identify(capabilities); await mount()
    expect(calls).toHaveLength(0)
    expect(renderer!.root.findAllByProps({ role: 'alert' }).length).toBeGreaterThan(0)
    expect(content()).not.toContain('Soupe FICTIVE')
  })

  it('la lecture seule affiche les tickets sans proposer les changements ni annulations', async () => {
    identify([read]); await mount()
    expect(content()).toContain('Soupe FICTIVE company-a')
    expect(content()).toContain('Lecture seule')
    expect(buttons('Commencer')).toHaveLength(0)
    expect(buttons('Annuler la préparation')).toHaveLength(0)
  })

  it('envoie une seule mutation versionnée au double clic et attend sa confirmation puis la relecture', async () => {
    const hold = held(); patch = hold; await mount()
    const action = buttons('Commencer')[0].props.onClick
    await act(async () => { void action(); void action() }); await settle()
    expect(patchCalls()).toHaveLength(1)
    expect(patchCalls()[0]).toMatchObject({ url: '/pos/kitchen/ticket%3Acompany-a', company: 'company-a', body: { status: 'preparing', updatedAt: 100 } })
    expect(content()).toContain('Enregistrement…')
    expect(content()).not.toContain('Changement confirmé par le serveur')
    hold.release(); await settle()
    expect(getCalls()).toHaveLength(2)
    expect(buttons('Marquer prêt')).toHaveLength(1)
    expect(content()).toContain('Changement confirmé par le serveur')
  })

  it.each([['preparing', 'Marquer prêt', 'ready'], ['ready', 'Marquer servi', 'served']])('confirme la transition %s vers %s sur le serveur', async (status, label, next) => {
    tickets['company-a'] = [ticket('company-a', status)]; await mount()
    await invoke(buttons(label)[0].props.onClick)
    expect(patchCalls()[0].body).toEqual({ status: next, updatedAt: 100 })
    if (next === 'served') expect(content()).not.toContain('Soupe FICTIVE company-a')
  })

  it.each([{ capabilities: [read, manage] }, { capabilities: [read, cancel] }])('n’offre pas l’annulation sans la combinaison service.manage et orders.cancel : %j', async ({ capabilities }) => {
    identify(capabilities); await mount()
    expect(buttons('Annuler la préparation')).toHaveLength(0)
  })

  it('annule uniquement une préparation native après confirmation, pas une commande QR ni une créance', async () => {
    tickets['company-a'].push({ ...ticket(), id: 'guest:qr-fictif', coverLabel: 'QR FICTIF' }); await mount()
    expect(buttons('Annuler la préparation')).toHaveLength(1)
    await invoke(buttons('Annuler la préparation')[0].props.onClick)
    expect(window.confirm).toHaveBeenCalledTimes(1)
    expect(patchCalls()[0].body).toEqual({ status: 'cancelled', updatedAt: 100 })
    expect(calls.every(call => call.url.startsWith('/pos/kitchen'))).toBe(true)
    expect(content()).toContain('QR FICTIF')
  })

  it('recontrôle les droits après la confirmation d’annulation', async () => {
    await mount(); const action = buttons('Annuler la préparation')[0].props.onClick
    vi.mocked(window.confirm).mockImplementation(() => { rights([read, manage]); return true })
    await invoke(action)
    expect(patchCalls()).toHaveLength(0)
  })

  it('un ancien bouton ne mute rien après révocation de service.manage', async () => {
    await mount(); const action = buttons('Commencer')[0].props.onClick
    await act(async () => { rights([read]) }); await settle(); await invoke(action)
    expect(patchCalls()).toHaveLength(0)
    expect(buttons('Commencer')).toHaveLength(0)
  })

  it('la révocation de lecture efface les tickets et arrête le polling', async () => {
    await mount(); await act(async () => { rights([]) }); await settle()
    const count = calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(16000) })
    expect(calls).toHaveLength(count)
    expect(content()).not.toContain('Soupe FICTIVE')
    expect(renderer!.root.findAllByProps({ role: 'alert' }).length).toBeGreaterThan(0)
  })

  it.each(['société', 'session', 'révocation'])('ignore une lecture tardive après changement de %s', async kind => {
    const hold = held(); reads.push(hold); await mount()
    if (kind === 'société') await act(async () => { useAuthStore.getState().setActiveCompany('company-b'); rights([read, manage, cancel]) })
    else if (kind === 'session') await act(async () => { identify([read, manage, cancel], 'MANAGER', 'other-human') })
    else await act(async () => { rights([]) })
    await settle(); hold.release(); await settle()
    expect(getCalls()[0].signal?.aborted).toBe(true)
    if (kind === 'société') { expect(content()).toContain('Soupe FICTIVE company-b'); expect(content()).not.toContain('Soupe FICTIVE company-a') }
    if (kind === 'révocation') expect(content()).not.toContain('Soupe FICTIVE')
    if (kind === 'session') expect(getCalls()).toHaveLength(2)
  })

  it('un ancien bouton de société ou de session ne peut pas être réutilisé', async () => {
    await mount(); const action = buttons('Commencer')[0].props.onClick
    await act(async () => { useAuthStore.getState().setActiveCompany('company-b'); rights([read, manage, cancel]) }); await settle()
    await invoke(action)
    expect(patchCalls()).toHaveLength(0)
    expect(content()).toContain('Soupe FICTIVE company-b')
  })

  it('une ancienne version de ticket ne peut pas écraser celle d’une relecture plus récente', async () => {
    await mount(); const stale = buttons('Commencer')[0].props.onClick
    tickets['company-a'][0].updatedAt = 101; tickets['company-a'][0].status = 'preparing'
    await invoke(buttons('Actualiser')[0].props.onClick); await invoke(stale)
    expect(patchCalls()).toHaveLength(0)
    expect(buttons('Marquer prêt')).toHaveLength(1)
  })

  it('la lecture la plus récente gagne et une lecture lente ne multiplie pas les sondes', async () => {
    await mount(); const hold = held()
    reads.push({ ...hold, data: { revision: 1, tickets: [{ ...ticket(), items: [{ id: 'old', name: 'ANCIEN TICKET FICTIF', qty: 1, note: '' }] }] } })
    await act(async () => { await vi.advanceTimersByTimeAsync(4000) }); await settle()
    await act(async () => { await vi.advanceTimersByTimeAsync(12000) }); await settle()
    expect(getCalls()).toHaveLength(2)
    tickets['company-a'][0].items[0].name = 'NOUVEAU TICKET FICTIF'
    await invoke(buttons('Actualiser')[0].props.onClick)
    hold.release(); await settle()
    expect(getCalls()).toHaveLength(3)
    expect(content()).toContain('NOUVEAU TICKET FICTIF')
    expect(content()).not.toContain('ANCIEN TICKET FICTIF')
  })

  it('un polling lancé avant une mutation ne peut pas rétablir l’ancien état après confirmation', async () => {
    await mount(); const action = buttons('Commencer')[0].props.onClick, hold = held()
    reads.push({ ...hold, data: { revision: 1, tickets: [ticket()] } })
    await act(async () => { await vi.advanceTimersByTimeAsync(4000) }); await settle()
    await invoke(action); hold.release(); await settle()
    expect(patchCalls()).toHaveLength(1)
    expect(buttons('Marquer prêt')).toHaveLength(1)
    expect(buttons('Commencer')).toHaveLength(0)
  })

  it('ne rafraîchit pas depuis un PATCH tardif dans la nouvelle société et abandonne son transport', async () => {
    const hold = held(); patch = hold; await mount()
    await invoke(buttons('Commencer')[0].props.onClick)
    await act(async () => { useAuthStore.getState().setActiveCompany('company-b'); rights([read, manage, cancel]) }); await settle()
    hold.release(); await settle()
    expect(patchCalls()[0].signal?.aborted).toBe(true)
    expect(getCalls()).toHaveLength(2)
    expect(content()).toContain('Soupe FICTIVE company-b')
    expect(content()).not.toContain('Changement confirmé par le serveur')
  })

  it.each([409, 503])('ne confirme pas un PATCH refusé %i et ne le rejoue jamais automatiquement', async status => {
    patch = { status }; await mount()
    const action = buttons('Commencer')[0].props.onClick; await invoke(action)
    expect(patchCalls()).toHaveLength(1)
    expect(renderer!.root.findAllByProps({ role: 'alert' }).length).toBeGreaterThan(0)
    expect(content()).not.toContain('Changement confirmé par le serveur')
    await invoke(action)
    expect(patchCalls()).toHaveLength(1)
    patch = {}; await invoke(buttons('Actualiser')[0].props.onClick)
    expect(content()).toContain('Soupe FICTIVE company-a')
  })

  it('un PATCH 403 efface les droits et arrête les requêtes sans succès local', async () => {
    patch = { status: 403 }; await mount(); await invoke(buttons('Commencer')[0].props.onClick)
    const count = calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(16000) })
    expect(calls).toHaveLength(count)
    expect(useAuthStore.getState().businessAccess).toBeNull()
    expect(content()).not.toContain('Soupe FICTIVE')
    expect(content()).not.toContain('Changement confirmé par le serveur')
    expect(renderer!.root.findAllByProps({ role: 'alert' }).length).toBeGreaterThan(0)
  })

  it.each([{ status: 503 }, { data: { tickets: null } }])('une lecture invalide ou refusée n’est pas transformée en cuisine vide : %j', async plan => {
    reads.push(plan); await mount()
    expect(renderer!.root.findAllByProps({ role: 'alert' }).length).toBeGreaterThan(0)
    expect(content()).not.toContain('Aucun ticket à préparer')
    expect(content()).not.toContain('Soupe FICTIVE')
    await invoke(buttons('Actualiser')[0].props.onClick)
    expect(content()).toContain('Soupe FICTIVE company-a')
  })

  it('un tableau vide confirmé par le serveur n’est pas une panne', async () => {
    tickets['company-a'] = []; await mount()
    expect(content()).toContain('Aucun ticket à préparer')
    expect(renderer!.root.findAllByProps({ role: 'alert' })).toHaveLength(0)
  })

  it('abandonne lecture et intervalle au démontage sans action ni publication tardive', async () => {
    const hold = held(); reads.push(hold); await mount()
    await act(async () => { renderer!.unmount() }); renderer = undefined
    expect(getCalls()[0].signal?.aborted).toBe(true)
    hold.release(); await settle(); await act(async () => { await vi.advanceTimersByTimeAsync(16000) })
    expect(getCalls()).toHaveLength(1)
    expect(patchCalls()).toHaveLength(0)
  })

  it('un nettoyage puis une reprise de l’effet ne gardent pas le verrou d’un transport annulé', async () => {
    await mount()
    // Le renderer 18 ne rejoue pas les effets StrictMode comme ReactDOM.
    // On reprend le vrai composant intérieur, sans faux hooks, puis on fait
    // changer sa dépendance de scope pour exercer son nettoyage/réarmement.
    const ScopedKitchen = renderer!.root.findByProps({ scope: authDataScope(useAuthStore.getState()) }).type as ComponentType<{ scope: string }>
    await act(async () => { renderer!.unmount() }); renderer = undefined
    const hold = held(); reads.push(hold)
    await act(async () => { renderer = create(createElement(ScopedKitchen, { scope: authDataScope(useAuthStore.getState()) })) }); await settle()
    expect(getCalls()).toHaveLength(2)
    await act(async () => {
      useAuthStore.setState(state => ({ sessionVersion: state.sessionVersion + 1 }))
      renderer!.update(createElement(ScopedKitchen, { scope: authDataScope(useAuthStore.getState()) }))
    }); await settle()
    expect(getCalls()[1].signal?.aborted).toBe(true)
    expect(getCalls()).toHaveLength(3)
    expect(content()).toContain('Soupe FICTIVE company-a')
    hold.release(); await settle()
    expect(content()).toContain('Soupe FICTIVE company-a')
  })
})
