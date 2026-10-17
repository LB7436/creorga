import { useAuthStore } from '@/stores/authStore'
import { authDataScope } from './authScope'

/** Identité de l'action capturée avant le premier await, pas au départ HTTP. */
export async function prepareInvoiceEmailReference(invoiceId: string, recipient: string) {
  const state = useAuthStore.getState(), scope = authDataScope(state)
  const companyId = state.companyId, actorId = state.user?.id, to = recipient.trim().toLowerCase()
  if (!companyId || !actorId || !state.isAuthenticated) throw Error('Session de facturation requise.')
  if (!to) throw Error('Saisissez le destinataire.')
  let changed = false
  const unsubscribe = useAuthStore.subscribe(next => { if (scope !== authDataScope(next)) changed = true })
  let digest: ArrayBuffer
  try { digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${companyId}:${actorId}:${invoiceId}:${to}`)) }
  finally { unsubscribe() }
  if (changed || scope !== authDataScope(useAuthStore.getState())) throw Error('La session ou la société a changé. Recommencez dans votre espace actuel.')
  const key = `creorga-invoice-mail:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`
  const requestId = localStorage.getItem(key) || crypto.randomUUID()
  localStorage.setItem(key, requestId)
  return { scope, companyId, requestId, to }
}
