import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'

const profile = vi.hoisted(() => {
  const values = new Map<string, string>()
  const local = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local })
  return { businessOnly: true, values, local }
})
// Vite selects these real capability adapters at build time. Only that alias
// selection is substituted; the panel, stores, router and request path are real.
vi.mock('@/optional/entertainment', async () => {
  const business = await import('@/optional/entertainment.business')
  const full = await vi.importActual<typeof import('@/optional/entertainment')>('@/optional/entertainment')
  return { get GAMES_ENABLED() { return profile.businessOnly ? business.GAMES_ENABLED : full.GAMES_ENABLED } }
})

const { default: AssistantPanel } = await import('./AssistantPanel')
const { useAssistant } = await import('@/stores/assistantStore')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = axios.defaults.adapter
let renderer: ReactTestRenderer | undefined
let requests: Array<{ url: string; init: RequestInit }>
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const button = (label: string) => renderer!.root.findAllByType('button').filter(node => text(node).trim() === label)
const gameExamples = ['Quel jeu recommandes-tu pour une table de 4 ?', 'Explique Scoopa en 20 secondes', 'Lance un défi rapide pour les clients']
const businessExamples = ['Mets 3 cafés sur la table 1', "Qui travaille aujourd'hui ?", 'Crée une facture pour Brasserie du Centre de 850€',
  'Active le mode sombre', 'Va au planning', "Cherche sur internet le prix moyen d'un café à Luxembourg", 'Sauvegarde le stock maintenant', 'Ferme la table 3']

beforeEach(() => {
  profile.businessOnly = true; profile.values.clear(); requests = []
  vi.stubGlobal('window', { innerWidth: 1440, innerHeight: 900, location: { origin: 'http://localhost:5174', pathname: '/owner' },
    localStorage: profile.local, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) })
  useAuthStore.getState().confirmLogoutRevocation()
  useAuthStore.getState().setAuth({ accessToken: `fixture.${btoa(JSON.stringify({ userId: 'owner-profile-fixture' }))}.not-a-real-signature`,
    user: { id: 'owner-profile-fixture', email: 'owner-profile@fixture.invalid', firstName: 'Fictif', lastName: 'Recette', avatar: null },
    companies: [{ id: 'membership-profile-fixture', userId: 'owner-profile-fixture', companyId: 'company-profile-fixture', role: 'OWNER', isActive: true,
      company: { id: 'company-profile-fixture', name: 'Société fictive', legalName: null, vatNumber: null, currency: 'EUR' } }] })
  useAssistant.setState({ histories: {}, conversations: [], currentConversationId: null, messages: [], attachments: [], open: true,
    mode: 'idle', voiceEnabled: false, autoListen: false })
  useAssistant.getState().newConversation()
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    if (String(input) !== 'http://localhost:3002/api/agent/super-ask' || init.method !== 'POST') throw Error('Unapproved profile fixture request')
    requests.push({ url: String(input), init })
    return Response.json({ kind: 'text', text: 'Réponse fictive de recette, aucune action exécutée.' })
  })
  axios.defaults.adapter = async () => { throw Error('Unexpected profile fixture auth request') }
})

afterEach(async () => {
  await act(async () => { renderer?.unmount() }); renderer = undefined
  axios.defaults.adapter = originalAdapter; useAuthStore.getState().logout(); vi.unstubAllGlobals()
})

const mount = () => act(async () => { renderer = create(createElement(MemoryRouter, { initialEntries: ['/owner'] }, createElement(AssistantPanel))) })
async function clickExample(label: string) {
  await act(async () => { await button(label)[0].props.onClick() })
  expect(requests).toHaveLength(1)
  expect(JSON.parse(String(requests[0].init.body)).text).toBe(label)
  expect(useAssistant.getState().messages.map(message => ({ role: message.role, text: message.text }))).toEqual([
    { role: 'user', text: label }, { role: 'bot', text: 'Réponse fictive de recette, aucune action exécutée.' },
  ])
}

describe('Robi : exemples fidèles au profil métier ou complet', () => {
  it('en profil métier masque les jeux et conserve des exemples professionnels réellement cliquables', async () => {
    await mount()
    for (const label of gameExamples) expect(button(label)).toHaveLength(0)
    for (const label of businessExamples) expect(button(label)).toHaveLength(1)
    expect(requests).toHaveLength(0)
    await clickExample('Va au planning')
  })

  it('en profil complet conserve les exemples ludiques cliquables et les exemples professionnels', async () => {
    profile.businessOnly = false
    await mount()
    for (const label of [...gameExamples, ...businessExamples]) expect(button(label)).toHaveLength(1)
    expect(requests).toHaveLength(0)
    await clickExample('Explique Scoopa en 20 secondes')
  })
})
