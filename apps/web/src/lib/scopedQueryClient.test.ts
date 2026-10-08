import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createScopedQueryClient } from './scopedQueryClient'
import { useAuthStore } from '@/stores/authStore'
import type { User, UserCompany } from '@/types'

const user: User = { id: 'fixture-user-a', email: 'a@fixture.invalid', firstName: 'A', lastName: 'Test', avatar: null }
const memberships = (userId = user.id): UserCompany[] => ['company-a', 'company-b'].map((id) => ({
  id: `membership-${id}`, userId, companyId: id, role: 'OWNER', isActive: true,
  company: { id, name: id, legalName: null, vatNumber: null, currency: 'EUR' },
}))
let boundary: ReturnType<typeof createScopedQueryClient>
beforeEach(() => {
  useAuthStore.getState().setAuth({ accessToken: 'fixture-token-a', user, companies: memberships() })
  boundary = createScopedQueryClient(useAuthStore)
})
afterEach(() => boundary.dispose())

describe('cache React Query isolé par session et société', () => {
  it('ne rend pas les factures de A disponibles sous la même clé dans B', () => {
    const old = boundary.getSnapshot()
    old.client.setQueryData(['invoices'], ['facture-a'])
    useAuthStore.getState().setActiveCompany('company-b')
    const current = boundary.getSnapshot()
    expect(current.client).not.toBe(old.client)
    expect(current.generation).toBe(old.generation + 1)
    expect(current.client.getQueryData(['invoices'])).toBeUndefined()
    expect(old.client.getQueryCache().getAll()).toHaveLength(0)
  })

  it('une réponse tardive ignorant AbortSignal ne remplit ni le nouveau cache ni le cache retiré', async () => {
    const old = boundary.getSnapshot().client
    let resolve!: (data: string[]) => void
    const pending = old.fetchQuery({ queryKey: ['customers'], queryFn: () => new Promise<string[]>((done) => { resolve = done }) }).catch(() => undefined)
    useAuthStore.getState().setActiveCompany('company-b')
    const current = boundary.getSnapshot().client
    current.setQueryData(['customers'], ['client-b'])
    resolve(['client-a'])
    await pending
    expect(current.getQueryData(['customers'])).toEqual(['client-b'])
    expect(old.getQueryData(['customers'])).toBeUndefined()
  })

  it('annule le transport quand la requête utilise AbortSignal', async () => {
    let signal!: AbortSignal
    const pending = boundary.getSnapshot().client.fetchQuery({
      queryKey: ['documents'], queryFn: (context) => { signal = context.signal; return new Promise(() => {}) },
    }).catch(() => undefined)
    useAuthStore.getState().logout()
    expect(signal.aborted).toBe(true)
    await pending
  })

  it('un ancien callback de mutation ne peut écrire que dans son client retiré', () => {
    const oldClient = boundary.getSnapshot().client
    const oldSuccess = () => oldClient.setQueryData(['invoice', 'same-id'], { owner: 'old-user' })
    useAuthStore.getState().setAuth({ accessToken: 'fixture-token-b', user: { ...user, id: 'fixture-user-b' }, companies: memberships('fixture-user-b') })
    oldSuccess()
    expect(boundary.getSnapshot().client.getQueryData(['invoice', 'same-id'])).toBeUndefined()
  })

  it('un retour A → B → A ne récupère jamais le client initial', () => {
    const original = boundary.getSnapshot().client
    useAuthStore.getState().setActiveCompany('company-b')
    useAuthStore.getState().setActiveCompany('company-a')
    expect(boundary.getSnapshot().client).not.toBe(original)
  })

  it('la reconnexion du même utilisateur renouvelle le cache, même sans rendu intermédiaire', () => {
    const original = boundary.getSnapshot().client
    useAuthStore.getState().logout()
    useAuthStore.getState().setAuth({ accessToken: 'fixture-token-new', user, companies: memberships() })
    expect(boundary.getSnapshot().client).not.toBe(original)
  })

  it('un renouvellement de token seul conserve le cache utile de la même session', () => {
    const original = boundary.getSnapshot()
    original.client.setQueryData(['products'], ['produit-a'])
    useAuthStore.getState().setAccessToken('fixture-token-renewed')
    expect(boundary.getSnapshot()).toBe(original)
    expect(original.client.getQueryData(['products'])).toEqual(['produit-a'])
  })

  it('un changement de rôle ou de vue RH renouvelle également le cache', () => {
    const owner = boundary.getSnapshot().client
    useAuthStore.getState().setViewMode('employee', 'fixture-employee')
    const employeeView = boundary.getSnapshot().client
    expect(employeeView).not.toBe(owner)
    useAuthStore.getState().setRole('employee')
    expect(boundary.getSnapshot().client).not.toBe(employeeView)
  })
})
