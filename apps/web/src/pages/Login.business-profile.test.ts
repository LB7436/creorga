import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const profile = vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } })
  return { businessOnly: true }
})
// Le rendu consomme la vraie capacité de chaque adaptateur. Seul le choix
// d'alias normalement effectué par Vite est remplacé dans cet environnement node.
vi.mock('@/optional/entertainment', async () => {
  const business = await import('@/optional/entertainment.business')
  const full = await vi.importActual<typeof import('@/optional/entertainment')>('@/optional/entertainment')
  return { get GAMES_ENABLED() { return profile.businessOnly ? business.GAMES_ENABLED : full.GAMES_ENABLED } }
})

const { default: Login } = await import('./Login')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
let renderer: ReactTestRenderer | undefined, client: QueryClient, requests: number
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const stats = () => text(renderer!.root.findByProps({ className: 'creorga-login-stats' }))

beforeEach(() => {
  profile.businessOnly = true; requests = 0
  vi.stubEnv('VITE_REGISTRATION_OPEN', 'false')
  vi.stubGlobal('window', { location: { pathname: '/login', origin: 'http://localhost:5174' }, localStorage,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) })
  useAuthStore.getState().logout()
  useAuthStore.setState({ logoutRevocationPending: false })
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  api.defaults.adapter = async () => { requests++; throw Error('Aucun appel autorisé dans le test de présentation de connexion') }
})

afterEach(async () => {
  await act(async () => { renderer?.unmount() })
  renderer = undefined; client.clear(); api.defaults.adapter = originalAdapter
  useAuthStore.getState().logout(); vi.unstubAllGlobals(); vi.unstubAllEnvs()
})

async function mount() {
  await act(async () => { renderer = create(createElement(QueryClientProvider, { client },
    createElement(MemoryRouter, { initialEntries: ['/login'] }, createElement(Login)))) })
}

async function expectProfessionalAccessUnchanged() {
  const features = text(renderer!.root.findByProps({ className: 'creorga-login-features' }))
  for (const title of ['Caisse tactile', 'Plan de salle', 'Pilotage', 'Fichier clients', 'Assistant local', 'Accès isolés']) expect(features).toContain(title)
  expect(renderer!.root.findByProps({ id: 'auth-email' }).props.type).toBe('email')
  expect(renderer!.root.findByProps({ id: 'auth-password' }).props.type).toBe('password')
  expect(renderer!.root.findAllByType('button').find(node => text(node).trim() === 'Se connecter')).toBeDefined()
  await act(async () => { renderer!.root.findByProps({ 'aria-label': 'Afficher le mot de passe' }).props.onClick() })
  expect(renderer!.root.findByProps({ id: 'auth-password' }).props.type).toBe('text')
  expect(useAuthStore.getState().isAuthenticated).toBe(false)
  expect(requests).toBe(0)
}

describe('Connexion : présentation fidèle au profil professionnel ou complet', () => {
  it('en profil métier ne promet aucun jeu et conserve les fonctions et le formulaire professionnels', async () => {
    await mount()
    expect(stats()).toBe('EmailconnexionQRportail client')
    expect(stats()).not.toMatch(/jeux|par catégorie|5 max/)
    await expectProfessionalAccessUnchanged()
  })

  it('en profil complet conserve les deux statistiques de jeux et le même accès professionnel', async () => {
    profile.businessOnly = false
    await mount()
    expect(stats()).toBe('EmailconnexionQRportail client16jeux retenus5 maxpar catégorie')
    await expectProfessionalAccessUnchanged()
  })
})
