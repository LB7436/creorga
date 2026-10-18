import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X, Check } from 'lucide-react'
import api from '@/lib/api'
import { useBusinessQuery, mayQueryBusinessData } from '@/hooks/api/useBusinessQuery'
import { useAuthStore } from '@/stores/authStore'
import { authDataScope } from '@/lib/authScope'
import { mayOpenBusinessPage } from '@/lib/businessPageAccess'

type Suggestion = {
  id?: string
  title?: string
  message?: string
  severity?: 'info' | 'warning' | 'critical'
  cta?: { label?: string; route?: string; intent?: string }
}

const DISMISS_KEY = 'creorga.dismissedSuggestions'
// Contrat de /agent/proactive/inbox : une suggestion peut croiser ces domaines.
const INBOX_CAPABILITIES = ['assistant.use', 'assistant.business.read', 'finance.revenue.read', 'invoices.read',
  'inventory.quantities.read', 'hr.schedule.manage', 'crm.customers.read', 'marketing.read', 'reputation.read']

function loadDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}')
  } catch {
    return {}
  }
}

/** Un lien de module reste un chemin interne, même après normalisation URL. */
function internalSuggestionRoute(value: unknown): URL | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return null
  if (/%(?:2f|5c|00|09|0a|0d)/i.test(value.split(/[?#]/)[0])) return null
  try {
    const target = new URL(value, window.location.origin)
    return target.origin === window.location.origin && !target.pathname.startsWith('//') ? target : null
  } catch { return null }
}

export default function RobiSuggestionBanner() {
  const navigate = useNavigate()
  const scope = useAuthStore(authDataScope)
  const { data: suggestions = [] } = useBusinessQuery<Suggestion[]>(INBOX_CAPABILITIES, {
    queryKey: ['robi-proactive-inbox'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get('/agent/proactive/inbox', { signal })
      return Array.isArray(data) ? data : data?.notifs ?? data?.items ?? data?.notifications ?? []
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  })
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => loadDismissed())
  const [actionError, setActionError] = useState<{ id: string; scope: string; message: string } | null>(null)

  const suggestion = useMemo(() => {
    const now = Date.now()
    return suggestions.find((item, index) => {
      if (item.severity !== 'critical') return false
      const id = item.id ?? `critical-${index}`
      return !dismissed[id] || dismissed[id] < now
    })
  }, [dismissed, suggestions])

  if (!suggestion) return null
  const id = suggestion.id ?? `critical-${suggestions.indexOf(suggestion)}`
  const target = internalSuggestionRoute(suggestion.cta?.route)
  // Le serveur fournit des routes de module. /intent peut aussi retourner une
  // lecture ou un aperçu success:true : ce bandeau ne qualifie aucune exécution.
  const unavailable = !suggestion.cta?.route
    ? 'Cette action ne peut pas être confirmée ici. Ouvrez le module concerné ou l’assistant ; l’alerte reste disponible.'
    : !target ? 'Le lien proposé est invalide. L’alerte reste disponible.' : null
  const error = actionError?.id === id && actionError.scope === scope ? actionError.message : unavailable

  const dismiss = () => {
    const current = useAuthStore.getState()
    if (scope !== authDataScope(current) || !mayQueryBusinessData(current, INBOX_CAPABILITIES)) return
    const next = { ...dismissed, [id]: Date.now() + 24 * 60 * 60 * 1000 }
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
    setDismissed(next)
  }

  const confirm = async () => {
    const current = useAuthStore.getState()
    if (scope !== authDataScope(current) || !mayQueryBusinessData(current, INBOX_CAPABILITIES)) return
    if (unavailable || !target) {
      setActionError({ id, scope, message: unavailable || 'Ouverture indisponible. L’alerte reste disponible.' })
      return
    }
    if (!mayOpenBusinessPage(target.pathname, current.businessAccess)) {
      setActionError({ id, scope, message: 'Votre accès actuel ne permet pas d’ouvrir cette page. L’alerte reste disponible.' })
      return
    }
    setActionError(null)
    try { await navigate(target.pathname + target.search + target.hash) }
    catch { setActionError({ id, scope, message: 'Ouverture impossible. Réessayez depuis le module ; l’alerte reste disponible.' }) }
  }

  return (
    <div
      style={{
        margin: 16,
        marginBottom: 0,
        border: '1px solid rgba(168,85,247,0.22)',
        background: 'linear-gradient(135deg, rgba(168,85,247,0.16), rgba(216,180,254,0.1))',
        color: '#f8fafc',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
      }}
    >
      <Sparkles size={18} color="#c4b5fd" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{suggestion.title || 'Robi a detecte une action urgente'}</div>
        <div style={{ fontSize: 12, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {suggestion.message || 'Une recommandation critique attend votre validation.'}
        </div>
        {error && <div role="alert" style={{ fontSize: 12, color: '#fecaca', marginTop: 4 }}>{error}</div>}
      </div>
      <button onClick={confirm} disabled={Boolean(unavailable)} style={{ border: 'none', borderRadius: 10, padding: '8px 10px', background: '#8b5cf6', color: '#fff', cursor: unavailable ? 'not-allowed' : 'pointer', fontWeight: 800, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Check size={14} /> {suggestion.cta?.label || 'Voir la suggestion'}
      </button>
      <button onClick={dismiss} title="Ignorer 24h" style={{ border: 'none', borderRadius: 10, width: 34, height: 34, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', cursor: 'pointer' }}>
        <X size={15} />
      </button>
    </div>
  )
}
