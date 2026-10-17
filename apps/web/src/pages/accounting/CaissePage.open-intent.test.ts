import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { CashDrawer } from '@/hooks/api/useAccounting'
import type { User, UserCompany } from '@/types'

vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } })
})

const { default: AccountingLayout } = await import('./AccountingLayout')
const { default: CaissePage } = await import('./CaissePage')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
let client: QueryClient, renderer: ReactTestRenderer | undefined, router: ReturnType<typeof createMemoryRouter> | undefined
let drawers: CashDrawer[], requests: Array<{ method: string; url: string; body?: any }>
let drawersStatus: number | undefined, drawersPending: Promise<void> | undefined

const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const buttons = (label: string) => renderer!.root.findAllByType('button').filter(button => text(button).trim() === label)
const dialogs = () => renderer!.root.findAllByProps({ role: 'dialog' })
const posts = () => requests.filter(request => request.method === 'post')
const openFromBanner = async () => { await act(async () => { buttons('Ouvrir la caisse')[0].props.onClick() }) }

async function mount(initialEntries: NonNullable<Parameters<typeof createMemoryRouter>[1]>['initialEntries'] = ['/accounting/caisse']) {
  router = createMemoryRouter([{
    path: '/accounting', element: createElement(AccountingLayout), children: [
      { path: 'caisse', element: createElement(CaissePage) },
      { path: 'depenses', element: createElement('h1', null, 'Dépenses fictives') },
      { path: 'cloture', element: createElement('h1', null, 'Écran de comptage fictif') },
    ],
  }], { initialEntries })
  await act(async () => {
    renderer = create(createElement(QueryClientProvider, { client }, createElement(RouterProvider, { router: router! })))
  })
}

beforeEach(() => {
  drawers = []; requests = []; drawersStatus = undefined; drawersPending = undefined
  vi.stubGlobal('window', {
    location: { pathname: '/accounting/caisse', origin: 'http://localhost:5174' },
    localStorage,
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    setInterval, clearInterval,
  })
  vi.stubGlobal('document', { fullscreenElement: null, addEventListener: () => {}, removeEventListener: () => {}, documentElement: { setAttribute: () => {} } })
  const user: User = { id: 'cash-intent-fictif', email: 'cash-intent@fixture.invalid', firstName: 'Compte', lastName: 'FICTIF', avatar: null }
  const companies: UserCompany[] = [{ id: 'cash-intent-membership', userId: user.id, companyId: 'cash-intent-company', isActive: true, role: 'OWNER', company: { id: 'cash-intent-company', name: 'Société FICTIVE', legalName: null, vatNumber: null, currency: 'EUR' } }]
  useAuthStore.getState().setAuth({ accessToken: 'fixture-token', user, companies })
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  client.setQueryData(['accounting', 'cash-drawers'], drawers)
  client.setQueryData(['orders', 'financial'], [])
  // Seul le transport est simulé : vrais composants, hooks, routeur et effets React.
  // Aucune requête ne sort du processus et aucune caisse réelle n'est modifiée.
  api.defaults.adapter = async config => {
    const method = config.method || 'get', url = config.url || ''
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    requests.push({ method, url, body })
    let data: any
    if (method === 'get' && url === '/accounting/cash-drawers') {
      await drawersPending
      if (drawersStatus) throw new AxiosError('État de caisse refusé ou indisponible', 'ERR_BAD_RESPONSE', config, undefined,
        { config, status: drawersStatus, statusText: 'fixture', headers: {}, data: { message: 'État non accessible' } })
      data = drawers
    }
    else if (method === 'get' && ['/orders', '/agent/proactive/inbox'].includes(url)) data = []
    else if (method === 'post' && url === '/accounting/cash-drawers/open') {
      data = { id: 'drawer-fictif', openedAt: '2026-10-17T10:00:00Z', closedAt: null, openAmount: body.openAmount, closeAmount: null, totalSales: 0, discrepancy: null, notes: body.notes ?? null }
      drawers = [data]
    } else throw Error('Transport inattendu dans le test du formulaire de caisse')
    return { config, status: 200, statusText: 'fixture', headers: {}, data }
  }
})

const fictiveOpenDrawer = (): CashDrawer => ({ id: 'drawer-ouvert-fictif', openedAt: '2026-10-17T10:00:00Z', closedAt: null,
  openAmount: 100, closeAmount: null, totalSales: 0, discrepancy: null, notes: null })
const expectNoDrawerActions = () => {
  for (const label of ['Ouvrir la caisse', 'Clôturer', 'Compter et clôturer', 'Confirmer l’ouverture']) expect(buttons(label)).toHaveLength(0)
  expect(dialogs()).toHaveLength(0)
  expect(posts()).toEqual([])
}
async function finishDrawerRequest() {
  await vi.waitFor(async () => {
    await act(async () => {})
    const state = client.getQueryState(['accounting', 'cash-drawers'])
    expect(state?.fetchStatus).toBe('idle')
    // La fin réseau précède parfois la notification React Query : attendre le
    // rendu réel de l'erreur (ou sa disparition), pas seulement le cache.
    const alerts = renderer!.root.findAllByProps({ role: 'alert' })
    if (state?.status === 'error') expect(alerts.length).toBeGreaterThan(0)
    else expect(alerts).toHaveLength(0)
  })
}

describe('État de caisse : une erreur de lecture ne signifie jamais une caisse fermée', () => {
  it('affiche la caisse ouverte et son fond uniquement après une lecture réussie', async () => {
    drawers = [fictiveOpenDrawer()]
    client.setQueryData(['accounting', 'cash-drawers'], drawers)
    await mount()
    expect(text(renderer!.root)).toContain('Caisse ouverte')
    expect(text(renderer!.root)).toMatch(/fond initial 100,00\s*€/)
    expect(text(renderer!.root)).not.toContain('Caisse fermée')
    expect(buttons('Ouvrir la caisse')).toHaveLength(0)
    expect(buttons('Clôturer')).toHaveLength(1)
    expect(buttons('Compter et clôturer')).toHaveLength(1)
    expect(posts()).toEqual([])
  })

  it('une liste vide confirmée permet bien de proposer l’ouverture', async () => {
    await mount()
    expect(text(renderer!.root)).toContain('Aucune caisse ouverte')
    expect(text(renderer!.root)).toContain('Caisse fermée')
    expect(buttons('Ouvrir la caisse')).toHaveLength(2)
    expect(dialogs()).toHaveLength(0)
    expect(posts()).toEqual([])
  })

  it('ne présente aucun état fermé ni action avant la fin du chargement', async () => {
    let release!: () => void
    drawersPending = new Promise(resolve => { release = resolve })
    client.removeQueries({ queryKey: ['accounting', 'cash-drawers'] })
    try {
      await mount()
      expect(text(renderer!.root)).toContain('Vérification de la caisse…')
      expect(text(renderer!.root)).toContain('Chargement de la caisse…')
      expect(text(renderer!.root)).not.toContain('Caisse fermée')
      expect(text(renderer!.root)).not.toContain('Aucune caisse ouverte')
      expect(text(renderer!.root)).not.toContain('Ouvrez une session avant le service.')
      expectNoDrawerActions()
    } finally {
      await act(async () => { release() })
    }
  })

  it.each([{ status: 403, expected: 'Accès à la caisse refusé' }, { status: 500, expected: 'État de la caisse inconnu' }])(
    'HTTP $status ne crée ni état fermé, ni bouton trompeur, même avec une intention en attente', async ({ status, expected }) => {
      drawersStatus = status
      client.removeQueries({ queryKey: ['accounting', 'cash-drawers'] })
      await mount([{ pathname: '/accounting/caisse', state: { openCashDrawer: true } }])
      await finishDrawerRequest()
      expect((client.getQueryState(['accounting', 'cash-drawers'])!.error as AxiosError).response?.status).toBe(status)
      expect(text(renderer!.root)).toContain(expected)
      expect(text(renderer!.root)).not.toContain('Caisse fermée')
      expect(text(renderer!.root)).not.toContain('Aucune caisse ouverte')
      expect(text(renderer!.root)).not.toContain('Aucune session de caisse active.')
      expect(text(renderer!.root)).not.toContain('Aucune clôture enregistrée.')
      expect(router!.state.location.state?.openCashDrawer).toBeUndefined()
      expectNoDrawerActions()
    },
  )

  it('un refus ultérieur masque aussi un ancien fond de caisse en cache', async () => {
    drawers = [fictiveOpenDrawer()]
    client.setQueryData(['accounting', 'cash-drawers'], drawers)
    await mount()
    expect(text(renderer!.root)).toContain('Caisse ouverte')
    drawersStatus = 403
    await act(async () => { await client.invalidateQueries({ queryKey: ['accounting', 'cash-drawers'] }) })
    await finishDrawerRequest()
    expect(text(renderer!.root)).toContain('Accès à la caisse refusé')
    expect(text(renderer!.root)).not.toContain('Caisse ouverte')
    expect(text(renderer!.root)).not.toContain('100,00')
    expectNoDrawerActions()
  })

  it('un formulaire ouvert est retiré après refus et ne revient pas à la reprise du serveur', async () => {
    await mount()
    await openFromBanner()
    expect(dialogs()).toHaveLength(1)
    drawersStatus = 403
    await act(async () => { await client.invalidateQueries({ queryKey: ['accounting', 'cash-drawers'] }) })
    await finishDrawerRequest()
    expectNoDrawerActions()
    drawersStatus = undefined
    await act(async () => { await client.invalidateQueries({ queryKey: ['accounting', 'cash-drawers'] }) })
    await finishDrawerRequest()
    expect(dialogs()).toHaveLength(0)
    expect(posts()).toEqual([])
    await openFromBanner()
    expect(dialogs()).toHaveLength(1)
  })
})

afterEach(async () => {
  await act(async () => { renderer?.unmount() })
  router?.dispose(); renderer = undefined; router = undefined
  client.clear(); api.defaults.adapter = originalAdapter
  useAuthStore.getState().logout(); vi.unstubAllGlobals()
})

describe('CTA global de caisse : intention de formulaire, jamais confirmation automatique', () => {
  it('ouvre le formulaire depuis le bandeau de la page caisse sans envoyer de POST', async () => {
    await mount()
    expect(dialogs()).toHaveLength(0)
    await openFromBanner()
    expect(dialogs()).toHaveLength(1)
    expect(dialogs()[0].findByType('input').props.value).toBe('200')
    expect(posts()).toEqual([])
  })

  it('rejoint le même formulaire depuis une autre page comptable', async () => {
    await mount(['/accounting/depenses'])
    await openFromBanner()
    expect(router!.state.location.pathname).toBe('/accounting/caisse')
    expect(dialogs()).toHaveLength(1)
    expect(posts()).toEqual([])
  })

  it('consomme l’intention puis permet annulation et nouvelle ouverture sans boucle au retour', async () => {
    await mount(['/accounting/depenses'])
    await openFromBanner()
    expect(dialogs()).toHaveLength(1)
    expect(router!.state.location.state?.openCashDrawer).toBeUndefined()
    await act(async () => { buttons('Annuler')[0].props.onClick() })
    expect(dialogs()).toHaveLength(0)
    await act(async () => { await router!.navigate(-1); await router!.navigate(1) })
    expect(dialogs()).toHaveLength(0)
    await openFromBanner()
    expect(dialogs()).toHaveLength(1)
    expect(posts()).toEqual([])
  })

  it('une intention présente au chargement ouvre seulement le formulaire et disparaît de l’historique', async () => {
    await mount([{ pathname: '/accounting/caisse', search: '?origine=service', hash: '#session', state: { openCashDrawer: true, provenance: 'fictive' } }])
    expect(dialogs()).toHaveLength(1)
    expect(router!.state.location).toMatchObject({ search: '?origine=service', hash: '#session', state: { provenance: 'fictive' } })
    expect(posts()).toEqual([])
    const consumedLocation = router!.state.location
    await act(async () => { renderer!.unmount() })
    router!.dispose(); renderer = undefined; router = undefined
    await mount([consumedLocation])
    expect(dialogs()).toHaveLength(0)
    expect(posts()).toEqual([])
  })

  it('ne lance aucune ouverture depuis une simple query et conserve le bouton local', async () => {
    await mount(['/accounting/caisse?action=open&openCashDrawer=true'])
    expect(dialogs()).toHaveLength(0)
    await act(async () => { buttons('Ouvrir la caisse')[1].props.onClick() })
    expect(dialogs()).toHaveLength(1)
    expect(posts()).toEqual([])
  })

  it('transmet le fond saisi uniquement après confirmation explicite', async () => {
    await mount()
    await openFromBanner()
    expect(dialogs()).toHaveLength(1)
    await act(async () => { dialogs()[0].findByType('input').props.onChange({ target: { value: '37.50' } }) })
    await act(async () => { dialogs()[0].findByType('textarea').props.onChange({ target: { value: '  Fond fictif  ' } }) })
    expect(posts()).toEqual([])
    await act(async () => { buttons('Confirmer l’ouverture')[0].props.onClick() })
    await vi.waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]).toMatchObject({ url: '/accounting/cash-drawers/open', body: { openAmount: 37.5, notes: 'Fond fictif', requestId: expect.any(String) } })
    await vi.waitFor(() => expect(dialogs()).toHaveLength(0))
  })

  it('Clôturer navigue au comptage sans clôturer ou ouvrir automatiquement', async () => {
    drawers = [{ id: 'drawer-ouvert-fictif', openedAt: '2026-10-17T10:00:00Z', closedAt: null, openAmount: 50, closeAmount: null, totalSales: 0, discrepancy: null, notes: null }]
    client.setQueryData(['accounting', 'cash-drawers'], drawers)
    await mount(['/accounting/depenses'])
    await act(async () => { buttons('Clôturer')[0].props.onClick() })
    expect(router!.state.location.pathname).toBe('/accounting/cloture')
    expect(dialogs()).toHaveLength(0)
    expect(requests.filter(request => request.method !== 'get')).toEqual([])
  })
})
