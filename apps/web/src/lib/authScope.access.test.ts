import { describe, it, expect } from 'vitest'
import { authDataScope } from './authScope'
describe('cache lié aux autorisations, pas seulement au rôle', () => {
  it('isole deux révisions successives du même utilisateur et de la même société', () => {
    const state = { sessionVersion: 1, user: { id: 'employe' }, companyId: 'cafe', isAuthenticated: true, role: 'employee', viewMode: 'employee', viewAsEmployeeId: 'employe' }
    const oldScope = authDataScope({ ...state, businessAccess: { revision: 'autorise', version: 1 } } as any)
    const newScope = authDataScope({ ...state, businessAccess: { revision: 'retire', version: 2 } } as any)
    expect(newScope).not.toBe(oldScope)
  })
  it('ne réutilise pas un scope inconnu avant puis après une transition de droits', () => {
    const state = { sessionVersion: 1, user: { id: 'employe' }, companyId: 'cafe', isAuthenticated: true, role: 'employee', viewMode: 'employee', viewAsEmployeeId: 'employe', businessAccess: null }
    expect(authDataScope({ ...state, businessAccessGeneration: 3 } as any)).not.toBe(authDataScope({ ...state, businessAccessGeneration: 1 } as any))
  })
})
