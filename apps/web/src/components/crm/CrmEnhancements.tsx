import { useState, useMemo } from 'react'
import { Tag, Mail, Activity, X, Plus, Send, Edit2 } from 'lucide-react'

/**
 * v3.18.6 — CRM Enhancements (3 features)
 *
 * 1. CustomerTags    : tags multiples (VIP, allergique, fêteur, etc.) avec couleurs
 * 2. EmailTemplates  : templates pré-faits (anniv, bienvenue, relance, fidélité)
 * 3. CustomerTimeline: timeline interactions (visites, factures, avis, messages)
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. CUSTOMER TAGS
// ═══════════════════════════════════════════════════════════════════════
export const PRESET_TAGS = [
  { id: 'vip',        label: '⭐ VIP',           color: '#fbbf24', bg: '#fef3c7' },
  { id: 'fidele',     label: '💚 Fidèle',         color: '#16a34a', bg: '#dcfce7' },
  { id: 'allergique', label: '⚠️ Allergique',    color: '#dc2626', bg: '#fee2e2' },
  { id: 'birthday',   label: '🎂 Anniversaire ce mois', color: '#ec4899', bg: '#fce7f3' },
  { id: 'b2b',        label: '🏢 B2B',           color: '#3b82f6', bg: '#dbeafe' },
  { id: 'new',        label: '🆕 Nouveau',        color: '#8b5cf6', bg: '#ede9fe' },
  { id: 'vegan',      label: '🌱 Végan',         color: '#10b981', bg: '#d1fae5' },
  { id: 'gluten',     label: '🌾 Sans gluten',   color: '#f59e0b', bg: '#fef3c7' },
  { id: 'risk',       label: '🚨 Risque churn',  color: '#ef4444', bg: '#fee2e2' },
]

export function CustomerTags({
  current, onChange, allowCustom = true,
}: {
  current: string[]
  onChange: (tags: string[]) => void
  allowCustom?: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [customTag, setCustomTag] = useState('')

  const toggle = (id: string) => {
    if (current.includes(id)) onChange(current.filter((t) => t !== id))
    else onChange([...current, id])
  }

  const addCustom = () => {
    if (customTag.trim() && !current.includes(customTag.trim())) {
      onChange([...current, customTag.trim()])
      setCustomTag(''); setAdding(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Tag size={14} color="#8b5cf6" />
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 12 }}>Tags client</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{current.length} tag(s)</span>
      </div>

      {/* Active tags */}
      {current.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {current.map((t) => {
            const preset = PRESET_TAGS.find((p) => p.id === t || p.label === t)
            const label = preset?.label || t
            const color = preset?.color || '#64748b'
            const bg = preset?.bg || '#f1f5f9'
            return (
              <div key={t} style={{
                padding: '4px 10px', borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {label}
                <button onClick={() => toggle(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color, padding: 0, display: 'inline-flex' }}>
                  <X size={11} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Preset tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {PRESET_TAGS.filter((p) => !current.includes(p.id) && !current.includes(p.label)).map((p) => (
          <button key={p.id} onClick={() => toggle(p.id)} style={{
            padding: '4px 10px', borderRadius: 999, border: '1px solid #e2e8f0', cursor: 'pointer',
            background: '#fff', fontSize: 11, fontWeight: 600, color: p.color,
          }}>+ {p.label}</button>
        ))}
        {allowCustom && !adding && (
          <button onClick={() => setAdding(true)} style={{
            padding: '4px 10px', borderRadius: 999, border: '1px dashed #cbd5e1', cursor: 'pointer',
            background: 'transparent', fontSize: 11, fontWeight: 600, color: '#64748b',
          }}>+ Custom…</button>
        )}
      </div>
      {adding && (
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          <input value={customTag} onChange={(e) => setCustomTag(e.target.value)}
            placeholder="Ex: ami du chef…" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setAdding(false) }}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <button onClick={addCustom} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>+</button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 2. EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════
export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string  // Avec {{firstName}}, {{tableNumber}}, {{discountCode}} etc.
  category: 'welcome' | 'birthday' | 'reminder' | 'loyalty' | 'comeback' | 'promo'
  emoji: string
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome', emoji: '👋', category: 'welcome',
    name: 'Bienvenue nouveau client',
    subject: 'Bienvenue chez Café um Rond-Point, {{firstName}} !',
    body: 'Bonjour {{firstName}},\n\nMerci d\'avoir choisi notre établissement ! En remerciement, voici un code -10% pour votre prochaine visite : {{discountCode}}\n\nÀ très bientôt,\nL\'équipe Café um Rond-Point',
  },
  {
    id: 'birthday', emoji: '🎂', category: 'birthday',
    name: 'Anniversaire — offre dessert',
    subject: 'Joyeux anniversaire {{firstName}} ! 🎂',
    body: 'Cher(e) {{firstName}},\n\nToute notre équipe vous souhaite un joyeux anniversaire ! Pour fêter ça, votre dessert est offert lors de votre prochaine visite ce mois-ci.\n\nRéservez votre table : {{reservationLink}}\n\nFélicitations,\nL\'équipe',
  },
  {
    id: 'invoice-reminder', emoji: '⏰', category: 'reminder',
    name: 'Relance facture impayée',
    subject: 'Rappel — facture {{invoiceNumber}} en attente de paiement',
    body: 'Bonjour {{customerName}},\n\nNous vous rappelons que votre facture n°{{invoiceNumber}} d\'un montant de {{amount}} € (échue le {{dueDate}}) reste impayée.\n\nMerci de procéder au règlement sous 7 jours.\n\nCordialement,\nL\'équipe comptabilité',
  },
  {
    id: 'loyalty', emoji: '⭐', category: 'loyalty',
    name: 'Récompense fidélité',
    subject: '{{firstName}}, vous avez gagné une récompense ! ⭐',
    body: 'Bonjour {{firstName}},\n\nVous avez accumulé {{loyaltyPoints}} points sur votre carte fidélité. Vous pouvez les échanger contre :\n\n• Un menu offert (300 pts)\n• Un dessert offert (150 pts)\n• Un café offert (50 pts)\n\nÀ bientôt !',
  },
  {
    id: 'comeback', emoji: '👋', category: 'comeback',
    name: 'Client perdu — relance',
    subject: 'On ne vous a pas vu depuis longtemps {{firstName}}…',
    body: 'Cher(e) {{firstName}},\n\nÇa fait {{daysSinceLastVisit}} jours qu\'on ne vous a pas vu(e) ! Pour vous faire revenir, voici un -15% sur votre prochaine table : {{discountCode}}\n\nValable 30 jours.\n\nÀ très vite,\nL\'équipe',
  },
  {
    id: 'promo', emoji: '🎁', category: 'promo',
    name: 'Promo flash événement',
    subject: 'Offre flash — {{eventName}} ce week-end ! 🎉',
    body: 'Bonjour {{firstName}},\n\nThis weekend nous organisons {{eventName}}. Réservez maintenant et profitez de -20% : code {{discountCode}}.\n\nNombre de places limité — réservation : {{reservationLink}}\n\n+352 27 12 34 56',
  },
]

export function EmailTemplatesPicker({
  onPick, currentSubject,
}: {
  onPick: (tpl: EmailTemplate) => void
  currentSubject?: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Mail size={14} color="#8b5cf6" />
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 12 }}>Templates email</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {EMAIL_TEMPLATES.map((tpl) => (
          <button key={tpl.id} onClick={() => onPick(tpl)} style={{
            padding: 10, borderRadius: 10, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff',
            fontSize: 11, color: '#475569', textAlign: 'left',
          }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{tpl.emoji}</div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{tpl.name}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{tpl.subject}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 3. CUSTOMER TIMELINE
// ═══════════════════════════════════════════════════════════════════════
export interface TimelineEvent {
  id: string
  type: 'visit' | 'invoice' | 'reservation' | 'review' | 'email' | 'call' | 'note' | 'loyalty'
  date: number  // ts
  summary: string
  amount?: number
  rating?: number
}

const TYPE_CONFIG: Record<TimelineEvent['type'], { emoji: string; color: string; label: string }> = {
  visit:       { emoji: '🪑', color: '#3b82f6', label: 'Visite' },
  invoice:     { emoji: '🧾', color: '#10b981', label: 'Facture' },
  reservation: { emoji: '📅', color: '#8b5cf6', label: 'Réservation' },
  review:      { emoji: '⭐', color: '#fbbf24', label: 'Avis' },
  email:       { emoji: '📧', color: '#06b6d4', label: 'Email' },
  call:        { emoji: '📞', color: '#84cc16', label: 'Appel' },
  note:        { emoji: '📝', color: '#64748b', label: 'Note' },
  loyalty:     { emoji: '⭐', color: '#ec4899', label: 'Fidélité' },
}

export function CustomerTimeline({ events }: { events: TimelineEvent[] }) {
  const sorted = useMemo(() => [...events].sort((a, b) => b.date - a.date), [events])

  if (sorted.length === 0) {
    return (
      <div style={{
        padding: 16, borderRadius: 12, background: '#f8fafc', border: '1px dashed #cbd5e1',
        textAlign: 'center', color: '#94a3b8', fontSize: 12,
      }}>
        Aucune interaction enregistrée.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Activity size={14} color="#8b5cf6" />
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 12 }}>Historique ({sorted.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
        {sorted.slice(0, 20).map((ev, i) => {
          const cfg = TYPE_CONFIG[ev.type]
          return (
            <div key={ev.id} style={{ display: 'flex', gap: 10, position: 'relative' }}>
              {/* Vertical line */}
              {i < sorted.length - 1 && (
                <div style={{ position: 'absolute', left: 14, top: 28, bottom: -8, width: 1, background: '#e2e8f0' }} />
              )}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: cfg.color + '20', color: cfg.color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                border: `1.5px solid ${cfg.color}`,
              }}>{cfg.emoji}</div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ color: '#94a3b8', fontSize: 10 }}>
                    {new Date(ev.date).toLocaleDateString('fr-LU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {ev.amount != null && (
                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#0f172a' }}>
                      {ev.amount.toFixed(2)} €
                    </span>
                  )}
                  {ev.rating != null && (
                    <span style={{ marginLeft: 'auto', color: '#fbbf24' }}>
                      {'⭐'.repeat(ev.rating)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{ev.summary}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
