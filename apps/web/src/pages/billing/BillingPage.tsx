import { useEffect, useState, type CSSProperties } from 'react'
import { Check, CheckCircle2, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '@/lib/api'
import { toastError } from '@/lib/toast'
import { useAuthStore } from '@/stores/authStore'

type Plan = 'starter' | 'pro' | 'business'
const PLANS: Array<{ id: Plan; name: string; price: number; description: string; features: string[]; highlighted?: boolean }> = [
  { id: 'starter', name: 'Starter', price: 39, description: 'Pour démarrer avec les fonctions essentielles.', features: ['1 établissement', 'Caisse et menu QR', '2 utilisateurs', 'Support email'] },
  { id: 'pro', name: 'Pro', price: 79, description: 'Pour une équipe qui utilise Creorga au quotidien.', features: ['1 établissement', 'Modules opérationnels', '10 utilisateurs', 'Support prioritaire'], highlighted: true },
  { id: 'business', name: 'Business', price: 149, description: 'Pour les structures multi-sites.', features: ['Multi-établissements', 'Utilisateurs étendus', 'API et intégrations', 'Accompagnement'] },
]
const PAIEMENT_EN_LIGNE_ACTIF = false

export default function BillingPage() {
  const user = useAuthStore((state) => state.user)
  const company = useAuthStore((state) => state.company)
  const [params] = useSearchParams()
  const [loading, setLoading] = useState<Plan | null>(null)
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const sessionId = params.get('session_id')

  useEffect(() => {
    if (!sessionId) return
    setCheckoutStatus('checking')
    api.get(`/stripe/session/${encodeURIComponent(sessionId)}`)
      .then(({ data }) => setCheckoutStatus(data?.payment_status === 'paid' || data?.status === 'complete' ? 'valid' : 'invalid'))
      .catch(() => setCheckoutStatus('invalid'))
  }, [sessionId])

  const choosePlan = async (plan: Plan) => {
    if (!user?.email) {
      toastError('Aucun email de facturation disponible')
      return
    }
    setLoading(plan)
    try {
      const { data } = await api.post('/stripe/create-checkout', { plan, email: user.email })
      if (!data?.url) throw new Error('Lien Stripe absent')
      window.location.assign(data.url)
    } catch (error: any) {
      toastError(error?.response?.data?.error || error?.message || 'Impossible d’ouvrir le paiement Stripe')
      setLoading(null)
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 1120, margin: '0 auto', color: '#172033' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.03em' }}>Abonnement</h1>
        <p style={{ color: '#64748b', margin: '7px 0 0' }}>Offres envisagées pour {company?.name || "l'établissement"}. Activation en ligne non ouverte.</p>
      </header>

      {!PAIEMENT_EN_LIGNE_ACTIF && (
        <div role="status" style={{ ...statusCard, borderColor: '#fde68a', background: '#fffbeb' }}>
          <ShieldCheck size={19} /> Aucun paiement ne peut être lancé tant que le webhook Stripe et l’activation d’abonnement ne sont pas validés de bout en bout.
        </div>
      )}

      {checkoutStatus !== 'idle' && (
        <div role="status" style={{ ...statusCard, borderColor: checkoutStatus === 'valid' ? '#a7f3d0' : checkoutStatus === 'invalid' ? '#fecaca' : '#bfdbfe', background: checkoutStatus === 'valid' ? '#ecfdf5' : checkoutStatus === 'invalid' ? '#fef2f2' : '#eff6ff' }}>
          <CheckCircle2 size={19} />
          {checkoutStatus === 'checking' ? 'Vérification de la session Stripe…' : checkoutStatus === 'valid' ? 'Paiement confirmé par Stripe. L’activation définitive dépend du webhook serveur.' : 'La session Stripe n’a pas pu être confirmée.'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(255px,1fr))', gap: 15 }}>
        {PLANS.map((plan) => (
          <article key={plan.id} style={{ ...planCard, borderColor: plan.highlighted ? '#7c3aed' : '#e2e8f0', boxShadow: plan.highlighted ? '0 18px 45px rgba(124,58,237,.14)' : planCard.boxShadow }}>
            {plan.highlighted && <span style={badge}>Recommandé</span>}
            <h2 style={{ margin: 0, fontSize: 21 }}>{plan.name}</h2>
            <p style={{ color: '#64748b', fontSize: 13, minHeight: 42, lineHeight: 1.5 }}>{plan.description}</p>
            <div style={{ fontSize: 34, fontWeight: 850, letterSpacing: '-0.04em', margin: '15px 0' }}>{plan.price} €<span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, letterSpacing: 0 }}> / mois</span></div>
            <div style={{ display: 'grid', gap: 9, marginBottom: 20 }}>{plan.features.map((feature) => <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Check size={15} color="#047857" />{feature}</div>)}</div>
            <button type="button" onClick={() => void choosePlan(plan.id)} disabled={loading !== null || !PAIEMENT_EN_LIGNE_ACTIF} style={{ ...primaryButton, background: plan.highlighted ? '#7c3aed' : '#1e293b', opacity: loading !== null || !PAIEMENT_EN_LIGNE_ACTIF ? .55 : 1, cursor: loading !== null || !PAIEMENT_EN_LIGNE_ACTIF ? 'not-allowed' : 'pointer' }}><CreditCard size={16} /> {loading === plan.id ? 'Ouverture de Stripe…' : PAIEMENT_EN_LIGNE_ACTIF ? 'Choisir ce plan' : 'Activation via contact'}</button>
          </article>
        ))}
      </div>

      <section style={{ marginTop: 18, padding: 18, border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
        <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#ecfdf5', color: '#047857' }}><ShieldCheck size={21} /></span>
        <div style={{ flex: 1, minWidth: 230 }}><strong>Aucune activation fictive</strong><div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>Le bouton redirige seulement après création confirmée d’une session Stripe. Si les clés ne sont pas installées, le serveur répond « non configuré ».</div></div>
        <a href="mailto:contact@n8nautomatisations.org?subject=Question%20abonnement%20Creorga" style={contactLink}>Contacter l’équipe <ExternalLink size={14} /></a>
      </section>
    </div>
  )
}

const planCard: CSSProperties = { position: 'relative', background: '#fff', border: '1px solid', borderRadius: 19, padding: 22, boxShadow: '0 8px 28px rgba(15,23,42,.05)' }
const badge: CSSProperties = { position: 'absolute', right: 16, top: 16, padding: '4px 8px', borderRadius: 999, background: '#f3e8ff', color: '#6d28d9', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }
const primaryButton: CSSProperties = { width: '100%', justifyContent: 'center', border: 0, borderRadius: 10, padding: '11px 14px', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }
const statusCard: CSSProperties = { border: '1px solid', borderRadius: 12, padding: 13, display: 'flex', alignItems: 'center', gap: 9, marginBottom: 17, color: '#334155' }
const contactLink: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1d4ed8', fontWeight: 750, fontSize: 13, textDecoration: 'none' }
