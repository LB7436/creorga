import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { fetchAuth } from './fetchAuth'
import { useAuthStore } from '@/stores/authStore'

const adapter = api.defaults.adapter
beforeEach(() => {
  vi.stubGlobal('window', { location: { origin: 'https://restaurant.fixture.invalid', href: 'https://restaurant.fixture.invalid/m/world' } })
  useAuthStore.getState().setAuth({ accessToken: 'fixture-token', user: { id: 'fixture-user', email: 'test@fixture.invalid', firstName: 'Test', lastName: 'Fictif', avatar: null }, companies: [] })
})
afterEach(() => { api.defaults.adapter = adapter; vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('destination des requêtes authentifiées', () => {
  it.each(['https://autre.fixture.invalid/api/agent/commands', '//autre.fixture.invalid/api', 'https://restaurant.fixture.invalid.autre.invalid/api', 'https://identifiant:secret@restaurant.fixture.invalid/api', 'data:text/plain,test'])('refuse %s avant tout envoi du jeton', async url => {
    const send = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', send)
    await expect(fetchAuth(url)).rejects.toThrow(/destination|origine|autoris/i)
    expect(send).not.toHaveBeenCalled()
  })

  it('conserve les appels relatifs de même origine et le backend configuré', async () => {
    const send = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', send)
    await fetchAuth('/api/agent/commands')
    await fetchAuth(new URL('http://localhost:3002/api/agent/commands'))
    expect(send).toHaveBeenCalledTimes(2)
    expect(new Headers(send.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer fixture-token')
    expect(send.mock.calls[0][1].redirect).toBe('error')
  })

  it('refuse également un objet Request externe sans le transmettre', async () => {
    const send = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', send)
    await expect(fetchAuth(new Request('https://autre.fixture.invalid/api'))).rejects.toThrow(/destination|origine|autoris/i)
    expect(send).not.toHaveBeenCalled()
  })

  it('axios refuse une URL ou un baseURL arbitraire avant son adaptateur', async () => {
    const send = vi.fn(async config => ({ config, data: {}, status: 200, statusText: 'fixture', headers: {} }))
    api.defaults.adapter = send
    await expect(api.get('https://autre.fixture.invalid/api')).rejects.toThrow(/destination|origine|autoris/i)
    await expect(api.get('/agent/commands', { baseURL: 'https://autre.fixture.invalid/api' })).rejects.toThrow(/destination|origine|autoris/i)
    expect(send).not.toHaveBeenCalled()
  })
})
