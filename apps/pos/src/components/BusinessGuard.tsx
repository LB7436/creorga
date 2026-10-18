import type { ReactNode } from 'react'
import { usePOS } from '../store/posStore'
import { hasCapability } from '../lib/business-access'

export function AccessDenied({ onBack }: { onBack?: () => void }) {
  return <section role="alert" style={{ padding: 24, color: '#f8fafc', background: '#111827', fontFamily: 'system-ui' }}>
    <h1>Accès non autorisé</h1>
    <p>Vos permissions actuelles ne permettent pas cet écran. Aucun montant nul ne remplace une donnée non autorisée. Vos brouillons et références en attente restent conservés.</p>
    {onBack && <button onClick={onBack}>← Retour</button>}
  </section>
}
/** Le changement de révision remonte la vue et retire aussi ses caches locaux. */
export function BusinessGuard({ capability, anyOf, children, onBack }: { capability?: string; anyOf?: string[]; children: ReactNode; onBack?: () => void }) {
  const access = usePOS(state => state.businessAccess)
  const staffId = usePOS(state => state.currentStaff?.id)
  const allowed = capability ? hasCapability(capability, access) : Boolean(anyOf?.some(key => hasCapability(key, access)))
  if (!allowed) return <AccessDenied onBack={onBack} />
  return <div key={JSON.stringify([staffId, access?.revision, access?.capabilities])} style={{ display: 'contents' }}>{children}</div>
}
