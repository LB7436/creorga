import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, Fragment, type ReactNode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AxiosError } from 'axios'
import toast, { useToasterStore } from 'react-hot-toast'
import type { BusinessAccess, UserCompany } from '@/types'
import type { CashDrawer } from '@/hooks/api/useAccounting'

vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } })
})

const { default: CloturePage } = await import('./CloturePage')
const { default: ScopedQueryProvider } = await import('@/components/auth/ScopedQueryProvider')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
const read = 'finance.revenue.read', exportRight = 'exports.read'
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const exportButtons = () => renderer!.root.findAllByType('button').filter(button => text(button).trim() === 'Exporter le journal CSV')
const accessReads = () => requests.filter(request => request.url === '/companies/access')
const reportText = () => text(renderer!.root)
let renderer: ReactTestRenderer | undefined, router: ReturnType<typeof createMemoryRouter> | undefined
let serverAccess: Record<string, BusinessAccess>, requests: Array<{ method: string; url: string; company: string }>
let downloads: Array<{ href: string; filename: string }>, blobs: Blob[], releases: Array<() => void>
let accessStatus: number | undefined, accessBody: unknown, accessGate: Promise<void> | undefined
let drawersGate: Promise<void> | undefined, version: number

function Notifications() {
  const { toasts } = useToasterStore()
  return createElement('section', { 'aria-label': 'Notifications observées' }, toasts.map(item =>
    createElement('div', { key: item.id }, typeof item.message === 'function' ? (item.message as (value: typeof item) => ReactNode)(item) : item.message)))
}

function access(capabilities: string[], company = 'company-a', role = 'MANAGER', accessVersion = 1): BusinessAccess {
  return { role, capabilities, revision: `cloture-${company}-${role}-${accessVersion}`, version: accessVersion }
}
function fresh(capabilities: string[], role = 'MANAGER') {
  const state = useAuthStore.getState(), current = access(capabilities, state.companyId!, role, ++version)
  serverAccess[state.companyId!] = current
  state.setBusinessAccess(current, state.companyId!, state.user!.id)
}
function identify(capabilities = [read, exportRight], role: UserCompany['role'] = 'MANAGER') {
  useAuthStore.setState({ logoutRevocationPending: false })
  useAuthStore.getState().setAuth({ accessToken: 'cloture-fixture-token',
    user: { id: 'cloture-human', email: 'cloture@fixture.invalid', firstName: 'Compte', lastName: 'FICTIF', avatar: null },
    companies: ['company-a', 'company-b'].map(companyId => ({ id: `member-${companyId}`, userId: 'cloture-human', companyId, role, isActive: true,
      company: { id: companyId, name: `Société FICTIVE ${companyId}`, legalName: null, vatNumber: null, currency: 'EUR' } })),
  })
  fresh(capabilities, role)
}
function drawer(company: string): CashDrawer {
  const opening = company === 'company-a' ? 100 : 200
  return { id: `drawer-${company}`, openedAt: '2026-10-17T08:00:00Z', closedAt: '2026-10-17T20:00:00Z',
    openAmount: opening, closeAmount: opening + 12.4, totalSales: 12.5, discrepancy: -0.1, notes: 'Écart fictif justifié', ledgerVersion: 2,
    user: { id: 'cloture-human', firstName: 'Compte', lastName: 'FICTIF' },
    closeSnapshot: { version: 2, drawerId: `drawer-${company}`, frozen: true, openingCents: opening * 100, cashReceiptsCents: 1250,
      movementInCents: 0, movementOutCents: 0, expectedCents: opening * 100 + 1250, countedCents: opening * 100 + 1240,
      discrepancyCents: -10, discrepancyConvention: 'compte_moins_theorique', closedAt: '2026-10-17T20:00:00Z', closedBy: 'cloture-human',
      reason: 'Écart fictif justifié', byMethod: { CASH: 1250 }, salesCents: 1250, tipCents: 0, charityCents: 0,
      payments: [{ id: `payment-${company}`, orderId: `order-${company}`, method: 'CASH', amountCents: 1250, tipCents: 0, charityCents: 0,
        confirmation: 'manual_declaration', attemptId: null, saleId: `sale-${company}` }], movements: [],
      basis: 'encaissements_affectes_et_mouvements_pas_chiffre_affaires' },
  }
}
function holdAccess() {
  let release!: () => void
  accessGate = new Promise(resolve => { release = resolve }); releases.push(release)
  return release
}
async function mount() {
  router = createMemoryRouter([{ path: '/accounting/cloture', element: createElement(CloturePage) }],
    { initialEntries: ['/accounting/cloture?session=drawer-company-a'] })
  await act(async () => { renderer = create(createElement(Fragment, null,
    createElement(ScopedQueryProvider, null, createElement(RouterProvider, { router: router! })), createElement(Notifications))) })
  await vi.waitFor(async () => {
    await act(async () => {})
    expect(reportText()).not.toContain('Chargement de la caisse…')
  })
}
async function invoke(handler: () => unknown) { await act(async () => { await handler() }) }

beforeEach(() => {
  version = 0; requests = []; downloads = []; blobs = []; releases = []
  accessStatus = undefined; accessBody = undefined; accessGate = undefined; drawersGate = undefined
  toast.remove()
  serverAccess = { 'company-a': access([read, exportRight]), 'company-b': access([read, exportRight], 'company-b') }
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/accounting/cloture' }, localStorage,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), print() {} })
  vi.stubGlobal('document', { createElement(tag: string) {
    if (tag !== 'a') throw Error(`Élément de téléchargement inattendu : ${tag}`)
    return { href: '', download: '', click() { downloads.push({ href: this.href, filename: this.download }) } }
  } })
  vi.spyOn(URL, 'createObjectURL').mockImplementation(value => { blobs.push(value as Blob); return `blob:cloture-fixture-${blobs.length}` })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  identify()
  // Vrais composant, store, frontière de cache, hooks, intercepteurs et CSV.
  // Seul le réseau et le déclenchement navigateur sont simulés ; aucun fichier
  // téléchargé ni octet reçu par Chrome n'est qualifié par ces assertions.
  api.defaults.adapter = async config => {
    const method = config.method || 'get', url = config.url || '', company = String(config.headers['x-company-id'])
    requests.push({ method, url, company })
    let data: unknown
    if (method === 'get' && url === '/accounting/cash-drawers') {
      data = serverAccess[company].capabilities.includes(read) ? [drawer(company)] : []
      await drawersGate
    } else if (method === 'get' && url === '/companies/access') {
      data = structuredClone(accessBody === undefined ? serverAccess[company] : accessBody)
      const status = accessStatus
      await accessGate
      if (status) throw new AxiosError('Droits non vérifiables', 'ERR_BAD_RESPONSE', config, undefined,
        { config, status, statusText: 'fixture', headers: {}, data: { message: 'Vérification refusée fictive' } })
    } else throw Error(`Transport inattendu : ${method} ${url}`)
    return { config, status: 200, statusText: 'fixture', headers: {}, data }
  }
})
afterEach(async () => {
  releases.forEach(release => release())
  await act(async () => { renderer?.unmount() })
  router?.dispose(); renderer = undefined; router = undefined
  api.defaults.adapter = originalAdapter
  useAuthStore.getState().logout(); toast.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals()
})

describe('Clôture historique : lecture financière distincte de l’export local', () => {
  it('laisse MANAGER lire sa clôture mais retire le bouton CSV sans exports.read', async () => {
    identify([read], 'MANAGER'); await mount()
    expect(reportText()).toContain('Caisse clôturée'); expect(reportText()).toMatch(/112,40/)
    expect(exportButtons()).toHaveLength(0); expect(downloads).toEqual([])
    expect(requests).toEqual([{ method: 'get', url: '/accounting/cash-drawers', company: 'company-a' }])
  })
  it('ne charge pas de clôture financière avec le seul droit d’exporter', async () => {
    identify([exportRight]); await mount()
    expect(renderer!.root.findAllByProps({ role: 'alert' }).length).toBeGreaterThan(0)
    expect(requests).toEqual([]); expect(downloads).toEqual([])
  })
  it('OWNER autorisé vérifie ses droits puis déclenche une seule génération locale', async () => {
    identify([read, exportRight], 'OWNER'); await mount()
    await invoke(exportButtons()[0].props.onClick)
    expect(accessReads()).toEqual([{ method: 'get', url: '/companies/access', company: 'company-a' }])
    expect(downloads).toEqual([{ href: 'blob:cloture-fixture-1', filename: 'journal-caisse-drawer-company-a.csv' }])
    expect(blobs).toHaveLength(1)
    expect(await blobs[0].text()).toContain('"REGLEMENT";"payment-company-a";"order-company-a";"CASH";12,5')
  })
  it('refuse l’ancien handler dès le retrait courant du droit d’exporter', async () => {
    await mount(); const stale = exportButtons()[0].props.onClick
    await act(async () => { fresh([read]) })
    await invoke(stale)
    expect(exportButtons()).toHaveLength(0); expect(accessReads()).toEqual([]); expect(downloads).toEqual([])
  })
  it.each(['session', 'company', 'company-roundtrip'] as const)('un handler conservé ne réexporte pas son ancien snapshot après changement %s', async change => {
    await mount(); const stale = exportButtons()[0].props.onClick
    await act(async () => {
      if (change === 'session') identify()
      else {
        useAuthStore.getState().setActiveCompany('company-b'); fresh([read, exportRight])
        if (change === 'company-roundtrip') { useAuthStore.getState().setActiveCompany('company-a'); fresh([read, exportRight]) }
      }
    })
    await invoke(stale)
    expect(accessReads()).toEqual([]); expect(downloads).toEqual([])
  })
  it('un handler démonté ne génère rien même si les droits et la société restent identiques', async () => {
    await mount(); const stale = exportButtons()[0].props.onClick
    await act(async () => { renderer!.unmount() }); renderer = undefined
    await invoke(stale)
    expect(accessReads()).toEqual([]); expect(downloads).toEqual([])
  })
})

describe('Clôture : revalidation fraîche, refus fermé et attente bornée au contexte', () => {
  it('un retrait serveur avant la prochaine sonde UI bloque l’export et reste visible', async () => {
    await mount()
    serverAccess['company-a'] = access([read], 'company-a', 'MANAGER', 2)
    await invoke(exportButtons()[0].props.onClick)
    expect(accessReads()).toHaveLength(1); expect(downloads).toEqual([])
    expect(reportText()).toMatch(/autorisation|permission|export.*(?:refus|autoris)/i)
  })
  it('une nouvelle révision réattribuée impose une relecture avant de réutiliser la clôture', async () => {
    await mount()
    serverAccess['company-a'] = access([read, exportRight], 'company-a', 'MANAGER', 3)
    await invoke(exportButtons()[0].props.onClick)
    expect(downloads).toEqual([])
    await vi.waitFor(async () => { await act(async () => {}); expect(exportButtons()).toHaveLength(1) })
    await invoke(exportButtons()[0].props.onClick)
    expect(accessReads()).toHaveLength(2); expect(downloads).toHaveLength(1)
  })
  it.each(['export', 'financial-read', 'session', 'company'] as const)('ignore la réponse de droits tardive après changement %s', async change => {
    await mount(); const release = holdAccess(); let pending: unknown
    await act(async () => { pending = exportButtons()[0].props.onClick() })
    expect(accessReads()).toHaveLength(1); expect(downloads).toEqual([])
    await act(async () => {
      if (change === 'export') fresh([read])
      else if (change === 'financial-read') fresh([exportRight])
      else if (change === 'session') identify()
      else { useAuthStore.getState().setActiveCompany('company-b'); fresh([read, exportRight]) }
    })
    await act(async () => { release(); await pending })
    expect(downloads).toEqual([])
  })
  it('ferme la fenêtre du double clic avant le rerendu et ne produit rien avant la vérification', async () => {
    await mount(); const handler = exportButtons()[0].props.onClick, release = holdAccess(); let pending: unknown
    await act(async () => { pending = handler(); void handler() })
    expect(accessReads()).toHaveLength(1); expect(downloads).toEqual([])
    expect(exportButtons()[0].props.disabled).toBe(true)
    await act(async () => { release(); await pending })
    expect(downloads).toHaveLength(1)
  })
  it.each([403, 503])('un refus HTTP %s de la sonde n’engendre ni CSV ni confirmation de téléchargement', async status => {
    await mount(); accessStatus = status
    await invoke(exportButtons()[0].props.onClick)
    expect(accessReads()).toHaveLength(1); expect(downloads).toEqual([])
    expect(reportText()).toMatch(/refus|vérifi|impossible|autorisation/i)
    expect(reportText()).not.toMatch(/export (?:réussi|généré)|téléchargement réussi/i)
  })
  it('refuse une réponse de droits malformée sans générer de CSV', async () => {
    await mount(); accessBody = { capabilities: [read, exportRight] }
    await invoke(exportButtons()[0].props.onClick)
    expect(downloads).toEqual([])
    expect(renderer!.root.findAllByProps({ role: 'alert' }).length).toBeGreaterThan(0)
  })
})
