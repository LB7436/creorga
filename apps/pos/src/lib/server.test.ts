import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
let server: typeof import('./server')
const fetcher = vi.fn<typeof fetch>()
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const token = (userId: string, suffix = 'signature') => `header.${btoa(JSON.stringify({ userId }))}.${suffix}`
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
beforeEach(async () => { vi.resetModules(); fetcher.mockReset(); vi.stubGlobal('fetch', fetcher); server = await import('./server'); server.setSession(token('user-a'), 'company-a') })
afterEach(() => { vi.unstubAllGlobals() })
describe('POS session boundaries', () => {
  it('rejects the old account response after another login', async () => {
    const pending = deferred<Response>(); fetcher.mockReturnValueOnce(pending.promise)
    const request = server.api('/pos/bootstrap')
    server.setSession(token('user-b'), 'company-b'); pending.resolve(json({ secret: 'company-a' }))
    await expect(request).rejects.toThrow('session de caisse a changé')
    expect(server.sessionCompany()).toBe('company-b')
  })
  it('rejects a body decoded after logout too', async () => {
    const body = deferred<unknown>()
    fetcher.mockResolvedValueOnce({ status: 200, ok: true, headers: new Headers({ 'Content-Type': 'application/json' }), json: () => body.promise } as Response)
    const request = server.api('/pos/bootstrap'); await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce())
    server.clearSession(); body.resolve({ companyId: 'company-a' })
    await expect(request).rejects.toThrow('session de caisse a changé')
  })
  it('never reinstalls a token when a refresh completes after logout', async () => {
    const refresh = deferred<Response>()
    fetcher.mockResolvedValueOnce(json({}, 401)).mockReturnValueOnce(refresh.promise)
    const request = server.api('/pos/bootstrap')
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    server.clearSession(); refresh.resolve(json({ accessToken: token('user-a', 'rotated') }))
    await expect(request).rejects.toThrow('session de caisse a changé')
    expect(server.sessionHeaders().Authorization).toBeUndefined()
  })
  it('rejects a refresh cookie belonging to another account', async () => {
    fetcher.mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({ accessToken: token('user-b') }))
      .mockResolvedValueOnce(json({ user: { id: 'user-b' }, companies: [{ companyId: 'company-a' }] }))
    await expect(server.api('/pos/bootstrap')).rejects.toThrow('compte du navigateur a changé')
    expect(server.sessionHeaders().Authorization).toBe('Bearer ' + token('user-a'))
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
  it('requires an active membership before adopting the refresh token', async () => {
    fetcher.mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({ accessToken: token('user-a', 'new') }))
      .mockResolvedValueOnce(json({ user: { id: 'user-a' }, companies: [{ companyId: 'company-b' }] }))
    await expect(server.api('/pos/bootstrap')).rejects.toThrow('compte du navigateur a changé')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
  it('refreshes once for concurrent requests and validates identity before retrying', async () => {
    const refresh = deferred<Response>(), rotated = token('user-a', 'new')
    fetcher.mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({}, 401)).mockReturnValueOnce(refresh.promise)
      .mockResolvedValueOnce(json({ user: { id: 'user-a' }, companies: [{ companyId: 'company-a' }] }))
      .mockResolvedValueOnce(json({ data: 'ok-1' })).mockResolvedValueOnce(json({ data: 'ok-2' }))
    const requests = [server.api('/pos/bootstrap'), server.api('/pos/sales')]
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3))
    refresh.resolve(json({ accessToken: rotated }))
    expect(await Promise.all(requests)).toHaveLength(2)
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1)
    expect(server.sessionHeaders().Authorization).toBe('Bearer ' + rotated)
  })
  it('finishes logout before sending a new login to avoid clearing the new cookie', async () => {
    const logout = deferred<Response>()
    fetcher.mockReturnValueOnce(logout.promise).mockResolvedValueOnce(json({ accessToken: token('user-b') }))
    server.endSession()
    const login = server.api('/auth/login', { method: 'POST' })
    expect(fetcher).toHaveBeenCalledOnce()
    logout.resolve(json({ ok: true }))
    await login
    expect(fetcher.mock.calls.map(([url]) => String(url).split('/').pop())).toEqual(['logout', 'login'])
  })
})
