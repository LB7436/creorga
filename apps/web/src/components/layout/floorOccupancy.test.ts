import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const fixtures = vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) } })
  return { saved, floor: null as any, error: null as string | null, stats: null as any }
})
// Seules les lectures externes sont remplacées ; rendu React, stores, pages et badge restent réels.
vi.mock('@/hooks/useFloorState', () => ({ useFloorState: () => ({ state: fixtures.floor, error: fixtures.error }) }))
vi.mock('@/hooks/api/useStats', () => ({ useTodayStats: () => ({ data: fixtures.stats, isLoading: false, isError: false }),
  useWeekStats: () => ({ data: [] }), useTopProductsToday: () => ({ data: [] }) }))
const { default: AppShell } = await import('./AppShell')
const { default: PosDashboard } = await import('@/pages/pos/DashboardPage')
const { default: Dashboard } = await import('@/pages/Dashboard')
const { useAuthStore } = await import('@/stores/authStore')
let client: QueryClient
const render = (component: typeof AppShell | typeof PosDashboard | typeof Dashboard) => renderToStaticMarkup(
  createElement(QueryClientProvider, { client }, createElement(StaticRouter, { location: '/' }, createElement(component))))
const floor = (occupied: number, seats = 6) => ({ tables: Array.from({ length: 4 }, (_, index) => ({ id: String(index), name: 'Table fictive',
  seats, section: 'Salle', shape: 'round', status: index < occupied ? 'OCCUPEE' : 'LIBRE', x: 0, y: 0, items: [] })), chairs: [], photos: [], zones: [], updatedAt: 1000 })

beforeEach(() => {
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/' }, localStorage,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) })
  vi.stubGlobal('navigator', { onLine: true })
  client = new QueryClient()
  fixtures.floor = floor(1); fixtures.error = null
  fixtures.stats = { revenue: 0, orderCount: 0, avgTicket: 0, tablesTotal: 4, tablesOccupied: 1, tablesFree: 3, tablesSource: 'postgres-workspace' }
  useAuthStore.getState().setAuth({ accessToken: 'fixture-token', user: { id: 'occupation-fictive', email: 'occupation@fixture.invalid', firstName: 'Compte', lastName: 'Fictif', avatar: null },
    companies: ['a', 'b'].map(id => ({ id: 'membership-' + id, userId: 'occupation-fictive', companyId: 'company-' + id, role: 'OWNER', isActive: true,
      company: { id: 'company-' + id, name: 'Société fictive ' + id, legalName: null, vatNumber: null, currency: 'EUR' } })) })
})
afterEach(() => { client.clear(); useAuthStore.getState().logout(); vi.unstubAllGlobals() })

describe('Occupation affichée : tables et non capacité supposée en personnes', () => {
  it('le badge affiche une seule table occupée même avec six places et aucune commande', () => {
    const html = render(AppShell)
    expect(html).toContain('1 table occupée')
    expect(html).not.toContain('Clients en salle')
    expect(html).not.toContain('6 clients')
  })
  it('la capacité de trente places ne change pas le nombre de tables occupées', () => {
    fixtures.floor = floor(2, 30)
    expect(render(AppShell)).toContain('2 tables occupées')
  })
  it('changement de société : aucune ancienne occupation pendant le chargement puis le nouveau compte exact', () => {
    expect(render(AppShell)).toContain('1 table occupée')
    useAuthStore.getState().setActiveCompany('company-b')
    fixtures.floor = null
    const loading = render(AppShell)
    expect(loading).toContain('Occupation non renseignée')
    expect(loading).not.toContain('1 table occupée')
    fixtures.floor = floor(0)
    expect(render(AppShell)).toContain('0 table occupée')
  })
  it('une erreur de lecture n’annonce pas zéro table ou une ancienne valeur à jour', () => {
    fixtures.error = 'Service indisponible'
    expect(render(AppShell)).toContain('Occupation indisponible')
  })
  it.each([['POS', PosDashboard], ['gestion', Dashboard]] as const)('%s : le fallback historique ne rend ni null ni une occupation inventée', (_name, component) => {
    fixtures.stats = { revenue: 0, orderCount: 0, avgTicket: 0, tablesTotal: 4, tablesOccupied: null, tablesFree: null, tablesUnavailable: null, tablesSource: 'legacy-sql-configuration' }
    const html = render(component)
    expect(html).toContain('Occupation non renseignée')
    expect(html).not.toContain('null / 4')
    expect(html).not.toContain('NaN')
  })
})
