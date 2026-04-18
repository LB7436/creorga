import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard,
  CheckCircle2,
  Download,
  Star,
  Zap,
  Building2,
  Rocket,
  TrendingUp,
  Users,
  HardDrive,
  Activity,
  Tag,
  AlertTriangle,
  X,
  ChevronRight,
  Sparkles,
  Receipt,
  Landmark,
  FileText,
  Gift,
  ShieldCheck,
  Percent,
  Euro,
  Calendar,
  Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'

const C = {
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  blue: '#0ea5e9',
  blueSoft: '#e0f2fe',
  blueDark: '#0369a1',
  green: '#10b981',
  greenSoft: '#d1fae5',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  red: '#ef4444',
  redSoft: '#fee2e2',
  purple: '#8b5cf6',
  purpleSoft: '#ede9fe',
  slate: '#475569',
  slateSoft: '#f1f5f9',
}

interface Plan {
  id: string
  name: string
  price: string
  subtitle: string
  features: string[]
  icon: any
  color: string
  soft: string
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '39€',
    subtitle: 'Pour démarrer sereinement',
    icon: Rocket,
    color: C.slate,
    soft: C.slateSoft,
    features: [
      'Caisse POS basique',
      '1 établissement',
      'Jusqu\'à 3 utilisateurs',
      'Factures & Devis',
      'Support email',
      '5 GB stockage',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '79€',
    subtitle: 'Le plus populaire',
    icon: Star,
    color: C.blue,
    soft: C.blueSoft,
    popular: true,
    features: [
      'Tout Starter inclus',
      'CRM & Marketing complet',
      'Jusqu\'à 10 utilisateurs',
      'Inventaire & HACCP',
      'Assistant IA (500 questions/mois)',
      'Support prioritaire',
      '50 GB stockage',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '149€',
    subtitle: 'Pour les pros exigeants',
    icon: Zap,
    color: C.purple,
    soft: C.purpleSoft,
    features: [
      'Tout Pro inclus',
      'Multi-établissements (3 sites)',
      'Utilisateurs illimités',
      'Assistant IA illimité',
      'API & Intégrations',
      'Rapport Patron complet',
      'Support téléphonique 7j/7',
      '500 GB stockage',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Sur devis',
    subtitle: 'Pour les chaînes & franchises',
    icon: Building2,
    color: C.amber,
    soft: C.amberSoft,
    features: [
      'Tout Business inclus',
      'Établissements illimités',
      'SLA 99,9% garanti',
      'Account manager dédié',
      'Formation sur site',
      'Personnalisations',
      'Virement bancaire',
      'Stockage illimité',
    ],
  },
]

interface Invoice {
  id: string
  date: string
  desc: string
  amount: string
  status: 'paid' | 'pending' | 'failed'
}

const INVOICES: Invoice[] = [
  { id: 'F-2026-04', date: '15 avr. 2026', desc: 'Abonnement Pro - Avril 2026', amount: '94,86€', status: 'paid' },
  { id: 'F-2026-03', date: '15 mars 2026', desc: 'Abonnement Pro - Mars 2026', amount: '94,86€', status: 'paid' },
  { id: 'F-2026-02', date: '15 févr. 2026', desc: 'Abonnement Pro - Février 2026', amount: '94,86€', status: 'paid' },
  { id: 'F-2026-01', date: '15 janv. 2026', desc: 'Abonnement Pro - Janvier 2026', amount: '94,86€', status: 'paid' },
  { id: 'F-2025-12', date: '15 déc. 2025', desc: 'Abonnement Pro - Décembre 2025', amount: '94,86€', status: 'paid' },
  { id: 'F-2025-11', date: '15 nov. 2025', desc: 'Abonnement Pro - Novembre 2025', amount: '94,86€', status: 'paid' },
  { id: 'F-2025-10', date: '15 oct. 2025', desc: 'Abonnement Pro - Octobre 2025', amount: '94,86€', status: 'paid' },
  { id: 'F-2025-09', date: '15 sept. 2025', desc: 'Abonnement Pro - Septembre 2025', amount: '94,86€', status: 'paid' },
  { id: 'F-2025-08', date: '15 août 2025', desc: 'Abonnement Pro - Août 2025', amount: '94,86€', status: 'paid' },
  { id: 'F-2025-07', date: '15 juil. 2025', desc: 'Add-on: Formation équipe', amount: '149,00€', status: 'paid' },
  { id: 'F-2025-07B', date: '15 juil. 2025', desc: 'Abonnement Pro - Juillet 2025', amount: '94,86€', status: 'paid' },
  { id: 'F-2025-06', date: '15 juin 2025', desc: 'Abonnement Pro - Juin 2025', amount: '94,86€', status: 'paid' },
]

function BillingPage() {
  const [showCardModal, setShowCardModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelStep, setCancelStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sepa' | 'wire'>('card')
  const [coupon, setCoupon] = useState('')
  const [vatNumber, setVatNumber] = useState('LU12345678')
  const [vatEdit, setVatEdit] = useState(false)
  const [cardForm, setCardForm] = useState({ number: '', name: '', exp: '', cvc: '' })

  const applyCoupon = () => {
    if (!coupon.trim()) return
    if (coupon.toUpperCase() === 'WELCOME20') {
      toast.success('Code appliqué : -20% pendant 3 mois !')
    } else {
      toast.error('Code invalide')
    }
    setCoupon('')
  }

  const saveCard = () => {
    toast.success('Carte bancaire mise à jour')
    setShowCardModal(false)
    setCardForm({ number: '', name: '', exp: '', cvc: '' })
  }

  const handleCancel = () => {
    if (cancelStep < 3) {
      setCancelStep(cancelStep + 1)
    } else {
      toast.success('Votre demande a bien été enregistrée')
      setShowCancelModal(false)
      setCancelStep(1)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        padding: 28,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: C.text,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 22px rgba(14,165,233,0.25)',
            }}
          >
            <CreditCard size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Facturation & Abonnement</h1>
            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
              Gérez votre abonnement Creorga, vos paiements et factures
            </p>
          </div>
        </div>
      </div>

      {/* Current plan card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: `linear-gradient(135deg, ${C.blueDark} 0%, ${C.blue} 100%)`,
          color: '#fff',
          borderRadius: 20,
          padding: 28,
          marginBottom: 24,
          boxShadow: '0 10px 30px rgba(14,165,233,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -60,
            top: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 40,
            bottom: -80,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, position: 'relative' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Star size={12} fill="#fff" /> Plan actuel
              </span>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Facturation mensuelle</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 42, fontWeight: 800, margin: 0 }}>Pro</h2>
              <div style={{ fontSize: 22, fontWeight: 600 }}>79€<span style={{ fontSize: 14, opacity: 0.85, fontWeight: 500 }}>/mois HT</span></div>
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 18 }}>
              <Calendar size={13} style={{ verticalAlign: -1, marginRight: 6 }} />
              Prochaine facturation le <strong>15 mai 2026</strong> - 94,86€ TTC
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Caisse POS', 'CRM Marketing', 'Inventaire', 'HACCP', 'Assistant IA', 'Formation'].map((m) => (
                <span
                  key={m}
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    padding: '5px 11px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => toast('Sélectionnez un plan ci-dessous')}
              style={{
                background: '#fff',
                color: C.blueDark,
                border: 'none',
                padding: '12px 22px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Changer de plan <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '10px 20px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Résilier l'abonnement
            </button>
          </div>
        </div>
      </motion.div>

      {/* Upgrade promo */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: `linear-gradient(90deg, ${C.purpleSoft}, ${C.blueSoft})`,
          border: `1px solid ${C.purple}33`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={22} color={C.purple} />
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
            Passez en Business et économisez 20% sur l'année
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            Débloquez l'IA illimitée, le multi-sites et l'API. À partir de 119€/mois avec le paiement annuel.
          </div>
        </div>
        <button
          onClick={() => toast.success('Offre Business activée')}
          style={{
            background: C.purple,
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Profiter de l'offre
        </button>
      </motion.div>

      {/* Plans grid */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Comparaison des plans</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {PLANS.map((p) => {
          const Icon = p.icon
          const current = p.id === 'pro'
          return (
            <motion.div
              key={p.id}
              whileHover={{ y: -4 }}
              style={{
                background: current ? `linear-gradient(180deg, ${p.soft} 0%, #fff 50%)` : C.card,
                border: current ? `2px solid ${p.color}` : `1px solid ${C.border}`,
                borderRadius: 18,
                padding: 22,
                position: 'relative',
                boxShadow: current ? `0 10px 28px ${p.color}22` : '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              {p.popular && (
                <span
                  style={{
                    position: 'absolute',
                    top: -11,
                    right: 16,
                    background: p.color,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    letterSpacing: 0.5,
                  }}
                >
                  POPULAIRE
                </span>
              )}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: p.soft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Icon size={22} color={p.color} />
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{p.subtitle}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: p.color }}>{p.price}</span>
                {p.id !== 'enterprise' && <span style={{ fontSize: 13, color: C.muted }}>/mois HT</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {p.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                    <CheckCircle2 size={15} color={p.color} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: C.text }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                disabled={current}
                onClick={() =>
                  p.id === 'enterprise'
                    ? toast('Notre équipe vous recontacte sous 24h')
                    : toast.success(`Changement vers ${p.name} demandé`)
                }
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: current ? `1px solid ${C.border}` : 'none',
                  background: current ? C.slateSoft : p.color,
                  color: current ? C.muted : '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: current ? 'not-allowed' : 'pointer',
                }}
              >
                {current ? 'Plan actuel' : p.id === 'enterprise' ? 'Nous contacter' : `Passer en ${p.name}`}
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Two column section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr',
          gap: 20,
          marginBottom: 28,
        }}
      >
        {/* Payment method */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <CreditCard size={20} color={C.blue} />
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Moyen de paiement</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Card option */}
            <div
              onClick={() => setPaymentMethod('card')}
              style={{
                border: `2px solid ${paymentMethod === 'card' ? C.blue : C.border}`,
                background: paymentMethod === 'card' ? C.blueSoft : C.bg,
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 30,
                  background: 'linear-gradient(135deg, #1a1f71, #4057b2)',
                  borderRadius: 5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                VISA
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Carte Visa •••• 4242</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>Expire 08/2027 - Bryan L.</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowCardModal(true)
                }}
                style={{
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: C.text,
                }}
              >
                Modifier carte
              </button>
            </div>

            {/* SEPA option */}
            <div
              onClick={() => setPaymentMethod('sepa')}
              style={{
                border: `2px solid ${paymentMethod === 'sepa' ? C.blue : C.border}`,
                background: paymentMethod === 'sepa' ? C.blueSoft : C.bg,
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 30,
                  background: C.slateSoft,
                  border: `1px solid ${C.border}`,
                  borderRadius: 5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Landmark size={16} color={C.slate} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Prélèvement SEPA</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                  Prélèvement automatique depuis votre compte bancaire
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toast('Configuration du mandat SEPA')
                }}
                style={{
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Configurer
              </button>
            </div>

            {/* Wire option */}
            <div
              onClick={() => setPaymentMethod('wire')}
              style={{
                border: `2px solid ${paymentMethod === 'wire' ? C.blue : C.border}`,
                background: paymentMethod === 'wire' ? C.blueSoft : C.bg,
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity: 0.95,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 30,
                  background: C.amberSoft,
                  borderRadius: 5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={16} color={C.amber} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Virement bancaire <span style={{ fontSize: 11, color: C.amber, fontWeight: 500, marginLeft: 4 }}>Enterprise uniquement</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                  Facturation annuelle, paiement à 30 jours
                </div>
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div
            style={{
              marginTop: 18,
              padding: 14,
              background: C.bg,
              border: `1px dashed ${C.border}`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Tag size={18} color={C.amber} />
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Code promo (ex: WELCOME20)"
              style={{
                flex: 1,
                border: `1px solid ${C.border}`,
                background: '#fff',
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={applyCoupon}
              style={{
                background: C.amber,
                color: '#fff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Appliquer
            </button>
          </div>
        </div>

        {/* Tax info + Usage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Tax info */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Percent size={18} color={C.green} />
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Informations fiscales</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>Pays</span>
                <span style={{ fontWeight: 600 }}>Luxembourg</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>Taux TVA</span>
                <span style={{ fontWeight: 600 }}>17%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.muted }}>N° TVA intracom.</span>
                {vatEdit ? (
                  <input
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    onBlur={() => {
                      setVatEdit(false)
                      toast.success('Numéro TVA mis à jour')
                    }}
                    autoFocus
                    style={{
                      border: `1px solid ${C.blue}`,
                      borderRadius: 6,
                      padding: '3px 7px',
                      fontSize: 13,
                      fontWeight: 600,
                      width: 130,
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    onClick={() => setVatEdit(true)}
                    style={{
                      fontWeight: 600,
                      color: C.blue,
                      cursor: 'pointer',
                      textDecoration: 'underline dotted',
                    }}
                  >
                    {vatNumber}
                  </span>
                )}
              </div>
              <div
                style={{
                  marginTop: 6,
                  padding: 10,
                  background: C.greenSoft,
                  borderRadius: 8,
                  fontSize: 12,
                  color: C.text,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ShieldCheck size={14} color={C.green} />
                TVA validée via VIES - Facturation B2B
              </div>
            </div>
          </div>

          {/* Usage metrics */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Activity size={18} color={C.purple} />
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Utilisation du mois</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <UsageBar icon={Zap} label="Modules utilisés" value={8} max={12} unit="" color={C.blue} />
              <UsageBar icon={Users} label="Utilisateurs actifs" value={7} max={10} unit="" color={C.purple} />
              <UsageBar icon={HardDrive} label="Stockage" value={22} max={50} unit="GB" color={C.amber} />
              <UsageBar icon={TrendingUp} label="API calls" value={12400} max={50000} unit="" color={C.green} />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 22,
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={20} color={C.slate} />
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Historique des factures</h3>
            <span
              style={{
                background: C.slateSoft,
                color: C.muted,
                fontSize: 12,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 10,
              }}
            >
              {INVOICES.length}
            </span>
          </div>
          <button
            onClick={() => toast.success('Export ZIP en cours...')}
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: C.text,
            }}
          >
            <Download size={14} /> Tout exporter
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: C.muted, fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>Réf.</th>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>Date</th>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>Description</th>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>Montant</th>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>Statut</th>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: C.text }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <FileText size={14} color={C.muted} /> {inv.id}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: C.muted }}>{inv.date}</td>
                  <td style={{ padding: '12px' }}>{inv.desc}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{inv.amount}</td>
                  <td style={{ padding: '12px' }}>
                    <StatusPill status={inv.status} />
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => toast.success(`PDF ${inv.id} téléchargé`)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${C.border}`,
                        padding: '6px 10px',
                        borderRadius: 7,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.text,
                      }}
                    >
                      <Download size={12} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add-ons / extras */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.amberSoft} 0%, #fff 100%)`,
          border: `1px solid ${C.amber}44`,
          borderRadius: 16,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            background: '#fff',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Gift size={22} color={C.amber} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Besoin d'options supplémentaires ?</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            Stockage, utilisateurs additionnels, modules à la carte - payez uniquement ce dont vous avez besoin.
          </div>
        </div>
        <button
          onClick={() => toast('Marketplace add-ons')}
          style={{
            background: '#fff',
            color: C.amber,
            border: `1px solid ${C.amber}`,
            padding: '10px 16px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} /> Parcourir les add-ons
        </button>
      </div>

      {/* Card edit modal */}
      <AnimatePresence>
        {showCardModal && (
          <Modal onClose={() => setShowCardModal(false)} title="Modifier la carte bancaire">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Fake card preview */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1a1f71, #4057b2)',
                  borderRadius: 14,
                  padding: 18,
                  color: '#fff',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, fontSize: 12, letterSpacing: 1 }}>
                  <span>CREORGA BILLING</span>
                  <span style={{ fontWeight: 700 }}>VISA</span>
                </div>
                <div style={{ fontSize: 18, letterSpacing: 3, marginBottom: 14 }}>
                  {cardForm.number || '•••• •••• •••• ••••'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>{(cardForm.name || 'Titulaire').toUpperCase()}</span>
                  <span>{cardForm.exp || 'MM/AA'}</span>
                </div>
              </div>

              <FormField label="Numéro de carte">
                <input
                  value={cardForm.number}
                  onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })}
                  placeholder="1234 5678 9012 3456"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Nom du titulaire">
                <input
                  value={cardForm.name}
                  onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                  placeholder="Jean Dupont"
                  style={inputStyle}
                />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Expiration">
                  <input
                    value={cardForm.exp}
                    onChange={(e) => setCardForm({ ...cardForm, exp: e.target.value })}
                    placeholder="MM/AA"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="CVC">
                  <input
                    value={cardForm.cvc}
                    onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value })}
                    placeholder="123"
                    style={inputStyle}
                  />
                </FormField>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 10,
                  background: C.greenSoft,
                  borderRadius: 8,
                  fontSize: 12,
                  color: C.text,
                }}
              >
                <ShieldCheck size={14} color={C.green} />
                Paiement sécurisé via Stripe - 3D Secure activé
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  onClick={() => setShowCardModal(false)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={saveCard}
                  style={{
                    flex: 1,
                    padding: '11px',
                    background: C.blue,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Cancellation modal */}
      <AnimatePresence>
        {showCancelModal && (
          <Modal
            onClose={() => {
              setShowCancelModal(false)
              setCancelStep(1)
            }}
            title={`Résiliation - Étape ${cancelStep}/3`}
          >
            {cancelStep === 1 && (
              <div>
                <div style={{ display: 'flex', gap: 10, padding: 14, background: C.redSoft, borderRadius: 10, marginBottom: 14 }}>
                  <AlertTriangle size={20} color={C.red} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: C.text }}>
                    Vous êtes sur le point de résilier votre plan <strong>Pro</strong>. Vos données resteront accessibles
                    jusqu'au <strong>15 mai 2026</strong>.
                  </div>
                </div>
                <div style={{ fontSize: 14, marginBottom: 10 }}>Pourquoi souhaitez-vous partir ?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['Trop cher', 'Manque de fonctionnalités', 'Trop compliqué', 'Je passe à un concurrent', 'Je ferme mon établissement', 'Autre raison'].map(
                    (reason) => (
                      <label
                        key={reason}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: 10,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        <input type="radio" name="reason" /> {reason}
                      </label>
                    )
                  )}
                </div>
              </div>
            )}

            {cancelStep === 2 && (
              <div>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${C.greenSoft}, ${C.blueSoft})`,
                    borderRadius: 14,
                    padding: 20,
                    textAlign: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Gift size={38} color={C.green} style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Une offre spéciale pour vous !</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
                    Restez encore 3 mois et profitez de <strong>-50%</strong> sur votre abonnement.
                  </div>
                  <button
                    onClick={() => {
                      toast.success('Offre acceptée ! -50% appliqué')
                      setShowCancelModal(false)
                      setCancelStep(1)
                    }}
                    style={{
                      background: C.green,
                      color: '#fff',
                      border: 'none',
                      padding: '11px 22px',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Accepter l'offre
                  </button>
                </div>
                <div style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>
                  Non merci, je souhaite continuer la résiliation
                </div>
              </div>
            )}

            {cancelStep === 3 && (
              <div>
                <div style={{ fontSize: 14, marginBottom: 14 }}>
                  Un dernier mot à partager avec notre équipe ? Vos retours sont précieux.
                </div>
                <textarea
                  placeholder="Dites-nous ce qu'on pourrait améliorer..."
                  style={{
                    width: '100%',
                    padding: 12,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    minHeight: 110,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, padding: 12, background: C.amberSoft, borderRadius: 10, marginTop: 14 }}>
                  <Euro size={16} color={C.amber} />
                  <div style={{ fontSize: 12, color: C.text }}>
                    Aucun remboursement n'est prévu pour la période en cours. Votre accès reste actif jusqu'au 15 mai 2026.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              {cancelStep > 1 && (
                <button
                  onClick={() => setCancelStep(cancelStep - 1)}
                  style={{
                    padding: '11px 18px',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Retour
                </button>
              )}
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: cancelStep === 3 ? C.red : C.text,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {cancelStep === 3 ? 'Confirmer la résiliation' : 'Continuer'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function UsageBar({
  icon: Icon,
  label,
  value,
  max,
  unit,
  color,
}: {
  icon: any
  label: string
  value: number
  max: number
  unit: string
  color: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.muted }}>
          <Icon size={14} color={color} /> {label}
        </span>
        <span style={{ fontWeight: 600 }}>
          {value.toLocaleString('fr-FR')}
          {unit && ` ${unit}`} <span style={{ color: C.muted, fontWeight: 400 }}>/ {max.toLocaleString('fr-FR')}{unit && ` ${unit}`}</span>
        </span>
      </div>
      <div
        style={{
          height: 7,
          background: C.slateSoft,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: color,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: 'paid' | 'pending' | 'failed' }) {
  const map = {
    paid: { label: 'Payée', bg: C.greenSoft, color: C.green },
    pending: { label: 'En attente', bg: C.amberSoft, color: C.amber },
    failed: { label: 'Échouée', bg: C.redSoft, color: C.red },
  }
  const s = map[status]
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: '4px 10px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  )
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <motion.div
        initial={{ y: 20, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          maxWidth: 460,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 22px',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: C.muted,
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </motion.div>
    </motion.div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: `1px solid ${C.border}`,
  borderRadius: 9,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

export default BillingPage
