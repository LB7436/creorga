import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './authStore'
import type { User, UserCompany } from '@/types'

const user: User = { id: 'selection-fictif', email: 'selection@fixture.invalid', firstName: 'Compte', lastName: 'FICTIF', avatar: null }
const memberships: UserCompany[] = [
  { id: 'membership-a', userId: user.id, companyId: 'company-a', role: 'OWNER', isActive: true, company: { id: 'company-a', name: 'Société A FICTIVE', legalName: null, vatNumber: null, currency: 'EUR' } },
  { id: 'membership-b', userId: user.id, companyId: 'company-b', role: 'EMPLOYEE', isActive: true, company: { id: 'company-b', name: 'Société B FICTIVE', legalName: null, vatNumber: null, currency: 'EUR' } },
  { id: 'membership-c', userId: user.id, companyId: 'company-c', role: 'OWNER', isActive: false, company: { id: 'company-c', name: 'Société C FICTIVE inactive', legalName: null, vatNumber: null, currency: 'EUR' } },
]
afterEach(() => useAuthStore.getState().logout())
describe('sélection d’une adhésion réellement attribuée', () => {
  it('ignore une adhésion inactive au lieu de lui attribuer le rôle propriétaire', () => {
    useAuthStore.getState().setAuth({ accessToken: 'fixture-token', user, companies: memberships })
    useAuthStore.getState().setActiveCompany('company-c')
    expect(useAuthStore.getState().companyId).toBe('company-a')
  })
  it('conserve le rôle salarié reçu pour B et rétablit le propriétaire seulement dans A', () => {
    useAuthStore.getState().setAuth({ accessToken: 'fixture-token', user, companies: memberships })
    useAuthStore.getState().setActiveCompany('company-b')
    expect(useAuthStore.getState()).toMatchObject({ companyId: 'company-b', role: 'employee', viewMode: 'employee', viewAsEmployeeId: user.id })
    useAuthStore.getState().setActiveCompany('unknown-company')
    expect(useAuthStore.getState().companyId).toBe('company-b')
    useAuthStore.getState().setActiveCompany('company-a')
    expect(useAuthStore.getState()).toMatchObject({ companyId: 'company-a', role: 'owner', viewMode: 'owner', viewAsEmployeeId: null })
  })
})
