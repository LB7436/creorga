import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api, { refreshSession } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { User, UserCompany } from '@/types'

// Sans DOM : seuls les points d'entrée React du hook sont capturés. Son
// transport axios, ses gardes de session et les effets sur le vrai store restent réels.
const { holder, messages, saved } = vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) } })
  return { holder: { client: null as QueryClient | null }, messages: [] as string[], saved }
})
vi.mock('@tanstack/react-query', async original => ({ ...await original<typeof import('@tanstack/react-query')>(), useMutation: (options: unknown) => options, useQueryClient: () => holder.client }))
vi.mock('@/lib/toast', () => ({ toastError: (message: string) => messages.push(message), toastSuccess: (message: string) => messages.push(message) }))
const { useLogout, useLogin } = await import('./useAuth')
const initialAdapter = api.defaults.adapter
const user: User = { id: 'logout-fictif', email: 'logout@fixture.invalid', firstName: 'Compte', lastName: 'FICTIF', avatar: null }
const memberships: UserCompany[] = [{ id: 'logout-membership', userId: user.id, companyId: 'logout-company', role: 'OWNER', isActive: true, company: { id: 'logout-company', name: 'Société FICTIVE', legalName: null, vatNumber: null, currency: 'EUR' } }]
function login(token = 'fixture-token') { useAuthStore.getState().setAuth({ accessToken: token, user, companies: memberships }) }
beforeEach(() => { holder.client = new QueryClient(); messages.length = 0; saved.clear(); useAuthStore.setState({ logoutRevocationPending: false } as any); login() })
afterEach(() => { api.defaults.adapter = initialAdapter; holder.client?.clear(); useAuthStore.getState().logout(); useAuthStore.setState({ logoutRevocationPending: false } as any); vi.restoreAllMocks() })
async function runMutation() {
  const options = useLogout() as any, context = options.onMutate()
  try { const data = await options.mutationFn(); options.onSuccess(data, undefined, context) }
  catch (error) { options.onError(error, undefined, context) }
}
describe('déconnexion confirmée et liée à la session initiatrice', () => {
  it('verrouille localement même si le serveur refuse et conserve un marqueur sans secret pour réessayer', async () => {
    holder.client!.setQueryData(['private-fixture'], 'Brouillon fictif')
    api.defaults.adapter = async config => { throw new AxiosError('Hors ligne fictif', 'ERR_NETWORK', config) }
    await runMutation()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect((useAuthStore.getState() as any).logoutRevocationPending).toBe(true)
    expect(holder.client!.getQueryData(['private-fixture'])).toBeUndefined()
    const persisted = JSON.parse(saved.get('creorga-auth')!).state
    expect(persisted.logoutRevocationPending).toBe(true)
    expect(persisted.user).toBeNull(); expect(persisted.accessToken).toBeNull()
    expect(messages.join(' ')).toMatch(/serveur|confirm/i)
  })
  it('retire immédiatement les données visibles mais attend le serveur avant de confirmer la révocation', async () => {
    let complete!: () => void
    api.defaults.adapter = config => new Promise(resolve => { complete = () => resolve({ config, status: 200, statusText: 'fixture', headers: {}, data: { message: 'Déconnexion réussie' } }) })
    holder.client!.setQueryData(['private-fixture'], 'Privé fictif')
    const pending = runMutation()
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'))
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect((useAuthStore.getState() as any).logoutRevocationPending).toBe(true)
    complete(); await pending
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect((useAuthStore.getState() as any).logoutRevocationPending).toBe(false)
    expect(holder.client!.getQueryCache().getAll()).toHaveLength(0)
  })
  it('un refus tardif de l’ancienne session ne déconnecte pas une nouvelle connexion', async () => {
    let fail!: () => void
    api.defaults.adapter = config => new Promise((_resolve, reject) => { fail = () => reject(new AxiosError('Refus fictif', 'ERR_NETWORK', config)) })
    const pending = runMutation()
    await vi.waitFor(() => expect(fail).toBeTypeOf('function'))
    ;(useAuthStore.getState() as any).confirmLogoutRevocation?.()
    login('new-fixture-token'); fail(); await pending
    expect(useAuthStore.getState().accessToken).toBe('new-fixture-token')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(messages).toEqual([])
  })
  it('une réhydratation marquée en attente ne réouvre pas l’identité sauvegardée ni le refresh', async () => {
    saved.set('creorga-auth', JSON.stringify({ version: 0, state: { accessToken: 'old-private-token', user, companies: memberships, company: memberships[0].company, companyId: memberships[0].companyId, role: 'owner', viewMode: 'owner', isAuthenticated: true, logoutRevocationPending: true } }))
    await useAuthStore.persist.rehydrate()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    await expect(refreshSession()).rejects.toMatchObject({ code: 'ERR_CANCELED' })
  })
  it('interdit une nouvelle connexion et son transport tant que le cookie précédent n’est pas traité', async () => {
    useAuthStore.setState({ logoutRevocationPending: true } as any)
    expect(() => login('forbidden-token')).toThrow(/révocation/i)
    let attempted = 0
    api.defaults.adapter = async config => { attempted++; return { config, status: 200, statusText: 'fixture', headers: {}, data: {} } }
    const options = useLogin() as any
    await expect(options.mutationFn({ email: user.email, password: 'fixture-password' })).rejects.toThrow(/révocation/i)
    expect(attempted).toBe(0)
  })
  it('un nouvel essai confirmé retire le marqueur et autorise seulement une connexion explicite', async () => {
    useAuthStore.getState().logout(); useAuthStore.setState({ logoutRevocationPending: true } as any)
    api.defaults.adapter = async config => ({ config, status: 200, statusText: 'fixture', headers: {}, data: { message: 'Cookie fictif révoqué' } })
    await runMutation()
    expect((useAuthStore.getState() as any).logoutRevocationPending).toBe(false)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    login('explicit-fixture-token')
    expect(useAuthStore.getState().accessToken).toBe('explicit-fixture-token')
  })
})
