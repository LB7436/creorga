import { describe, expect, it, vi } from 'vitest'
import { PortalConfigClient } from './portalConfigClient'
const config = (companyId = 'a', updatedAt = 1, accentColor = 'indigo') => ({ companyId, updatedAt, accentColor, toggles: {}, games: {}, welcomeMessage: '', tableNumber: '1' })
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
const deferred = () => { let resolve!: (value: Response) => void; return { promise: new Promise<Response>(r => { resolve = r }), resolve: (value: Response) => resolve(value) } }

describe('réponses de configuration portail', () => {
  it('une lecture lancée avant un PATCH ne réinstalle jamais les anciens réglages', async () => {
    const pending = deferred(), publish = vi.fn(), transport = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response(config('a', 2, 'rose')))
    const client = new PortalConfigClient({ scope: () => ({ key: 'a', companyId: 'a', headers: {} }), publish, fail: vi.fn(), transport })
    const read = client.refresh(); await client.update({ accentColor: 'rose' }); pending.resolve(response(config()))
    await read; expect(publish).toHaveBeenCalledTimes(1); expect(publish).toHaveBeenLastCalledWith(config('a', 2, 'rose'))
  })
  it('les lectures hors ordre restent monotones', async () => {
    const a = deferred(), b = deferred(), publish = vi.fn(), transport = vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    const client = new PortalConfigClient({ scope: () => ({ key: 'a', companyId: 'a', headers: {} }), publish, fail: vi.fn(), transport })
    const first = client.refresh(), second = client.refresh(); b.resolve(response(config('a', 3))); await second; a.resolve(response(config('a', 2))); await first
    expect(publish).toHaveBeenCalledTimes(1)
  })
  it('ne publie ni donnée ni erreur après changement de société ou démontage', async () => {
    const pending = deferred(), publish = vi.fn(), fail = vi.fn(); let key = 'a'
    const client = new PortalConfigClient({ scope: () => ({ key, companyId: key, headers: {} }), publish, fail, transport: vi.fn().mockReturnValue(pending.promise) })
    const read = client.refresh(); key = 'b'; pending.resolve(response(config('a'))); await read
    expect(publish).not.toHaveBeenCalled(); expect(fail).not.toHaveBeenCalled()
    client.dispose(); await client.refresh(); expect(publish).not.toHaveBeenCalled()
  })
  it('rejette un retour de mauvaise société ou une forme invalide', async () => {
    const publish = vi.fn(), fail = vi.fn(), transport = vi.fn().mockResolvedValueOnce(response(config('b'))).mockResolvedValueOnce(response({ companyId: 'a' }))
    const client = new PortalConfigClient({ scope: () => ({ key: 'a', companyId: 'a', headers: {} }), publish, fail, transport })
    await client.refresh(); await client.refresh(); expect(publish).not.toHaveBeenCalled(); expect(fail).toHaveBeenCalledTimes(2)
  })
  it('refuse un deuxième enregistrement avant confirmation, sans l’envoyer', async () => {
    const pending = deferred(), transport = vi.fn().mockReturnValue(pending.promise)
    const client = new PortalConfigClient({ scope: () => ({ key: 'a', companyId: 'a', headers: {} }), publish: vi.fn(), fail: vi.fn(), transport })
    const first = client.update({ accentColor: 'rose' }); await expect(client.update({ accentColor: 'vert' })).rejects.toThrow(/en cours/)
    expect(transport).toHaveBeenCalledTimes(1); pending.resolve(response(config('a', 2))); await first
  })
  it('un refus ou une panne reste visible et ne devient jamais un succès', async () => {
    const publish = vi.fn(), fail = vi.fn(), transport = vi.fn().mockResolvedValueOnce(response({ error: 'Refus fictif' }, 403)).mockRejectedValueOnce(new Error('offline'))
    const client = new PortalConfigClient({ scope: () => ({ key: 'a', companyId: 'a', headers: {} }), publish, fail, transport })
    await expect(client.update({})).rejects.toMatchObject({ status: 403 }); await expect(client.update({})).rejects.toMatchObject({ status: 0 })
    expect(publish).not.toHaveBeenCalled(); expect(fail).toHaveBeenCalledTimes(2)
  })
})
