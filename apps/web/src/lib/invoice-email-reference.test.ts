import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { prepareInvoiceEmailReference } from './invoice-email-reference'

function session(companyId = 'company-A') {
  useAuthStore.setState({ isAuthenticated: true, user: { id: 'owner-fictif' } as any, companyId, accessToken: 'jeton-fixture', role: 'owner', sessionVersion: 1, viewMode: 'owner', viewAsEmployeeId: null })
}
describe('Référence email : portée capturée avant le calcul asynchrone', () => {
  const values = new Map<string, string>()
  beforeEach(() => {
    values.clear()
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
    session()
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  it('réutilise la référence dans la même session/société et normalise le destinataire', async () => {
    const first = await prepareInvoiceEmailReference('invoice-A', ' RECETTE@fixture.invalid ')
    const second = await prepareInvoiceEmailReference('invoice-A', 'recette@fixture.invalid')
    expect(first.requestId).toMatch(/^[a-f\d-]{36}$/)
    expect(second.requestId).toBe(first.requestId)
    expect(first.to).toBe('recette@fixture.invalid')
    expect(first.companyId).toBe('company-A')
  })
  it.each(['société', 'déconnexion', 'reconnexion', 'rôle', 'société aller-retour', 'rôle aller-retour'] as const)('refuse sans écrire une référence si %s change pendant le digest', async (change) => {
    let finish!: (value: ArrayBuffer) => void
    vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const pending = prepareInvoiceEmailReference('invoice-A', 'test@fixture.invalid')
    if (change === 'société') useAuthStore.setState({ companyId: 'company-B' })
    if (change === 'déconnexion') useAuthStore.setState({ isAuthenticated: false, user: null, companyId: null, accessToken: null, sessionVersion: 2 })
    if (change === 'reconnexion') useAuthStore.setState({ sessionVersion: 2 })
    if (change === 'rôle') useAuthStore.setState({ role: 'employee' })
    if (change === 'société aller-retour') { useAuthStore.setState({ companyId: 'company-B' }); useAuthStore.setState({ companyId: 'company-A' }) }
    if (change === 'rôle aller-retour') { useAuthStore.setState({ role: 'employee' }); useAuthStore.setState({ role: 'owner' }) }
    finish(new Uint8Array(32).buffer)
    await expect(pending).rejects.toThrow(/session|société/i)
    expect(values.size).toBe(0)
  })
})
