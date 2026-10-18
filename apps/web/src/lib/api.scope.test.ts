import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api, { refreshSession } from './api'
import { fetchAuth } from './fetchAuth'
import { useAuthStore } from '@/stores/authStore'
import type { User, UserCompany } from '@/types'
import { toastError } from './toast'

vi.mock('./toast', () => ({ toastError: vi.fn() }))

const adapter = api.defaults.adapter
const user: User = { id: 'fixture-user-a', email: 'a@fixture.invalid', firstName: 'A', lastName: 'Test', avatar: null }
const companies: UserCompany[] = ['company-a', 'company-b'].map((id) => ({
  id, companyId: id, userId: user.id, role: 'OWNER', isActive: true,
  company: { id, name: id, legalName: null, vatNumber: null, currency: 'EUR' },
}))
const token = (userId: string) => `fixture.${btoa(JSON.stringify({ userId }))}.fixture-signature`
const login = (id = user.id) => useAuthStore.getState().setAuth({ accessToken: token(id), user: { ...user, id }, companies })
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ config, data, status, statusText: 'fixture', headers: {} })

beforeEach(() => {
  vi.mocked(toastError).mockClear()
  vi.stubGlobal('window', { location: { pathname: '/dashboard' }, localStorage: { getItem: () => null } })
  login()
})
afterEach(() => {
  api.defaults.adapter = adapter
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('réponses HTTP et renouvellement isolés par session', () => {
  it('annonce le refus hors du panneau avant son invalidation, sans révéler la réponse privée', async () => {
    useAuthStore.getState().setBusinessAccess({ role: 'EMPLOYEE', capabilities: ['assistant.use'], revision: 'limited-refusal', version: 1 }, 'company-a', user.id)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('PRIVATE_OTHER_COMPANY_SENTINEL', { status: 403 })))
    expect((await fetchAuth('/api/agent/super-ask')).status).toBe(403)
    expect(toastError).toHaveBeenCalledOnce()
    expect(vi.mocked(toastError).mock.calls[0][0]).toContain('Accès refusé')
    expect(JSON.stringify(vi.mocked(toastError).mock.calls)).not.toContain('PRIVATE_OTHER_COMPANY_SENTINEL')
    expect(useAuthStore.getState().businessAccess).toBeNull()
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('annonce aussi un refus axios courant, sans rejouer la demande', async () => {
    api.defaults.adapter = vi.fn(async config => { throw new AxiosError('fixture forbidden', 'ERR_BAD_REQUEST', config, {}, response(config, {}, 403)) })
    await expect(api.get('/accounting')).rejects.toMatchObject({ response: { status: 403 } })
    expect(toastError).toHaveBeenCalledOnce()
    expect(api.defaults.adapter).toHaveBeenCalledOnce()
  })

  it('un ancien refus ne produit pas de notification dans la nouvelle société', async () => {
    let complete!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { complete = resolve })))
    const pending = fetchAuth('/api/agent/super-ask').catch(error => error)
    useAuthStore.getState().setActiveCompany('company-b')
    complete(new Response('Refus ancien', { status: 403 }))
    expect(await pending).toMatchObject({ code: 'ERR_CANCELED' })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('un refus courant retire immédiatement les vues sensibles sans rejouer la mutation', async () => {
    useAuthStore.getState().setBusinessAccess({ role: 'OWNER', capabilities: ['finance.revenue.read'], revision: 'autorise-fixture', version: 1 }, 'company-a', user.id)
    api.defaults.adapter = vi.fn(async config => { throw new AxiosError('fixture forbidden', 'ERR_BAD_REQUEST', config, {}, response(config, {}, 403)) })
    await expect(api.post('/invoices', {})).rejects.toMatchObject({ response: { status: 403 } })
    expect(useAuthStore.getState().businessAccess).toBeNull()
    expect(api.defaults.adapter).toHaveBeenCalledOnce()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('un changement de société n’adopte pas les droits d’une adhésion persistée', () => {
    useAuthStore.setState({ companies: companies.map(member => ({ ...member, businessAccess: { role: 'OWNER', capabilities: ['finance.revenue.read'], revision: 'ancienne-fixture', version: 1 } })) })
    useAuthStore.getState().setActiveCompany('company-b')
    expect(useAuthStore.getState().businessAccess).toBeNull()
  })
  it('le refus d’un téléchargement fetch retire aussi les anciennes vues sensibles', async () => {
    useAuthStore.getState().setBusinessAccess({ role: 'OWNER', capabilities: ['invoices.read', 'exports.read'], revision: 'document-fixture', version: 1 }, 'company-a', user.id)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Refus fictif', { status: 403 })))
    expect((await fetchAuth('/api/invoices/fixture/pdf')).status).toBe(403)
    expect(useAuthStore.getState().businessAccess).toBeNull()
  })

  it('une session déconnectée ne récupère pas un compte depuis un cookie partagé', async () => {
    useAuthStore.getState().logout()
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: token('fixture-user-b') } })
    await expect(refreshSession()).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(refresh).not.toHaveBeenCalled()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('une requête privée 401 depuis la page publique ne se rejoue pas avec le cookie partagé', async () => {
    useAuthStore.getState().logout()
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: token('fixture-user-b') } })
    api.defaults.adapter = vi.fn(async (config) => { throw new AxiosError('fixture unauthorized', 'ERR_BAD_REQUEST', config, {}, response(config, {}, 401)) })
    await expect(api.get('/crm/customers')).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(refresh).not.toHaveBeenCalled()
    expect(api.defaults.adapter).toHaveBeenCalledOnce()
  })

  it('rejette une réponse de données arrivée après le changement de société', async () => {
    let complete!: () => void
    api.defaults.adapter = vi.fn((config: InternalAxiosRequestConfig) => new Promise<AxiosResponse<unknown>>((resolve) => { complete = () => resolve(response(config, { privateCustomer: 'company-a' })) }))
    const pending = api.get('/crm/customers').catch((error) => error)
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'))
    useAuthStore.getState().setActiveCompany('company-b')
    complete()
    expect(await pending).toMatchObject({ code: 'ERR_CANCELED' })
  })

  it('un ancien 401 ne renouvelle ni ne déconnecte la nouvelle session', async () => {
    let reject!: () => void
    api.defaults.adapter = vi.fn((config: InternalAxiosRequestConfig) => new Promise<AxiosResponse<unknown>>((_resolve, fail) => {
      reject = () => fail(new AxiosError('fixture unauthorized', 'ERR_BAD_REQUEST', config, {}, response(config, {}, 401)))
    }))
    const refresh = vi.spyOn(axios, 'post')
    const pending = api.get('/crm/customers').catch((error) => error)
    await vi.waitFor(() => expect(reject).toBeTypeOf('function'))
    login('fixture-user-b')
    reject()
    expect(await pending).toMatchObject({ code: 'ERR_CANCELED' })
    expect(refresh).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user?.id).toBe('fixture-user-b')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('un refresh commencé avant la déconnexion ne réinstalle pas un token ensuite', async () => {
    let complete!: (value: unknown) => void
    vi.spyOn(axios, 'post').mockImplementation(() => new Promise((resolve) => { complete = resolve }) as any)
    const pending = refreshSession().catch((error) => error)
    useAuthStore.getState().logout()
    complete({ data: { accessToken: token(user.id) } })
    expect(await pending).toMatchObject({ code: 'ERR_CANCELED' })
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('un refresh ancien ne remplace pas le token après reconnexion du même utilisateur', async () => {
    let complete!: (value: unknown) => void
    vi.spyOn(axios, 'post').mockImplementation(() => new Promise((resolve) => { complete = resolve }) as any)
    const pending = refreshSession().catch((error) => error)
    login()
    useAuthStore.getState().setAccessToken('fixture-new-login-token')
    complete({ data: { accessToken: token(user.id) } })
    expect(await pending).toMatchObject({ code: 'ERR_CANCELED' })
    expect(useAuthStore.getState().accessToken).toBe('fixture-new-login-token')
  })

  it('refuse le token d’un autre utilisateur quand le cookie partagé a changé dans un autre onglet', async () => {
    vi.spyOn(axios, 'post').mockResolvedValueOnce({ data: { accessToken: token('fixture-user-b') } })
    await expect(refreshSession()).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(useAuthStore.getState().accessToken).toBe(token(user.id))
  })

  it('deux 401 de la même session partagent une rotation puis rejouent dans la même société', async () => {
    let complete!: (value: unknown) => void
    const renewed = `${token(user.id)}-renewed`
    const refresh = vi.spyOn(axios, 'post').mockImplementation(() => new Promise((resolve) => { complete = resolve }) as any)
    api.defaults.adapter = vi.fn(async (config) => {
      if (config.headers.Authorization !== `Bearer ${renewed}`) throw new AxiosError('fixture unauthorized', 'ERR_BAD_REQUEST', config, {}, response(config, {}, 401))
      return response(config, { companyId: config.headers['x-company-id'] })
    })
    const first = api.get('/invoices'), second = api.get('/crm/customers')
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    complete({ data: { accessToken: renewed } })
    const results = await Promise.all([first, second])
    expect(results.map((result) => result.data)).toEqual([{ companyId: 'company-a' }, { companyId: 'company-a' }])
    expect(api.defaults.adapter).toHaveBeenCalledTimes(4)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('ne rejoue pas une ancienne requête dans une autre société après refresh', async () => {
    let complete!: (value: unknown) => void
    const refresh = vi.spyOn(axios, 'post').mockImplementation(() => new Promise((resolve) => { complete = resolve }) as any)
    api.defaults.adapter = vi.fn(async (config) => { throw new AxiosError('fixture unauthorized', 'ERR_BAD_REQUEST', config, {}, response(config, {}, 401)) })
    const pending = api.get('/invoices').catch((error) => error)
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    useAuthStore.getState().setActiveCompany('company-b')
    complete({ data: { accessToken: token(user.id) } })
    expect(await pending).toMatchObject({ code: 'ERR_CANCELED' })
    expect(api.defaults.adapter).toHaveBeenCalledOnce()
    expect(useAuthStore.getState().companyId).toBe('company-b')
  })

  it('un téléchargement fetch tardif est refusé après changement de compte', async () => {
    let complete!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { complete = resolve })))
    const pending = fetchAuth('/api/invoices/fixture/pdf').catch((error) => error)
    login('fixture-user-b')
    complete(new Response('fixture document', { status: 200 }))
    expect(await pending).toMatchObject({ code: 'ERR_CANCELED' })
  })
})
