/** Contexte mémoire uniquement : aucun brouillon ni historique navigateur n'est supprimé. */
export interface AuthScopeState {
  sessionVersion: number
  user: { id: string } | null
  companyId: string | null
  isAuthenticated: boolean
  role: string
  viewMode: string
  viewAsEmployeeId: string | null
  businessAccess?: { revision: string; version: number } | null
  businessAccessGeneration?: number
}

export function authSessionKey(state: AuthScopeState): string {
  return JSON.stringify([state.sessionVersion, state.user?.id ?? null, state.isAuthenticated])
}

export function authDataScope(state: AuthScopeState): string {
  return JSON.stringify([
    authSessionKey(state), state.companyId, state.role, state.viewMode, state.viewAsEmployeeId,
    state.businessAccess?.revision ?? null,
    state.businessAccessGeneration ?? 0,
  ])
}
