import { useCallback, useLayoutEffect, useRef } from 'react'
import { getGuestAccess, readStoredGuestAccess } from '@/lib/guestAccess'

export interface GuestRequest {
  signal: AbortSignal
  headers: Record<string, string>
  visitId: string | null
  isCurrent: () => boolean
  abort: () => void
  finish: () => void
}
interface Scope {
  companyId: string | null
  tableId: string | null
  visitId: string | null
  token: string | null
  context: string
  version: number
  active: boolean
  controllers: Set<AbortController>
}

/** Capacités uniquement en mémoire ; seule la génération anonyme sert de clé UI. */
export function useGuestRequestScope(companyId: string | null, tableId: string | null, context = '') {
  const access = getGuestAccess(companyId, tableId)
  const ref = useRef<Scope | null>(null)
  if (!ref.current || ref.current.companyId !== companyId || ref.current.tableId !== tableId ||
    ref.current.visitId !== (access?.visitId ?? null) || ref.current.token !== (access?.token ?? null) || ref.current.context !== context) {
    ref.current = { companyId, tableId, visitId: access?.visitId ?? null, token: access?.token ?? null,
      context, version: (ref.current?.version ?? 0) + 1, active: true, controllers: new Set() }
  }
  const scope = ref.current
  // Actif avant les effets des enfants, y compris leur réexécution en StrictMode.
  useLayoutEffect(() => {
    scope.active = true
    return () => {
      scope.active = false
      scope.controllers.forEach(controller => controller.abort())
      scope.controllers.clear()
    }
  }, [scope])
  const begin = useCallback((): GuestRequest | null => {
    const controller = new AbortController()
    let finished = false
    const isCurrent = () => {
      const stored = readStoredGuestAccess(scope.companyId, scope.tableId)
      return !finished && !controller.signal.aborted && scope.active && ref.current === scope &&
        (stored?.visitId ?? null) === scope.visitId && (stored?.token ?? null) === scope.token
    }
    if (!isCurrent()) return null
    scope.controllers.add(controller)
    const finish = () => { finished = true; scope.controllers.delete(controller) }
    return { signal: controller.signal, headers: scope.token ? { 'x-guest-access': scope.token } : {}, visitId: scope.visitId,
      isCurrent, finish, abort: () => { controller.abort(); finish() } }
  }, [scope])
  return { version: scope.version, hasAccess: !!scope.token, begin }
}
export type GuestRequestScope = ReturnType<typeof useGuestRequestScope>
