import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Percent, AlertTriangle, X, Plus, Minus, Receipt, Banknote, CreditCard,
  Equal, Check, Heart, AlertOctagon, Bell, ChevronDown,
} from 'lucide-react'

/**
 * v3.18.6 — POS Enhancements (3 features fusionnées)
 *
 * 1. SplitBillModal     : divise l'addition entre N clients (équitable, custom, par item)
 * 2. TipSelector         : suggestions pourboire 5/10/15/20 % + custom + arrondi
 * 3. AllergiesPanel      : saisie allergies clients + alerte cuisine en gros badge rouge
 */

// ─── Types partagés ────────────────────────────────────────────────────
export interface OrderItem {
  id: string
  name: string
  price: number
  qty: number
  category?: string
  allergens?: string[]
}

// ═══════════════════════════════════════════════════════════════════════
// 1. SPLIT BILL MODAL
// ═══════════════════════════════════════════════════════════════════════
export interface SplitResult {
  mode: 'equal' | 'custom' | 'by-item'
  parts: Array<{
    label: string
    amount: number
    items?: OrderItem[]
  }>
}

export function SplitBillModal({
  items, total, onClose, onConfirm,
}: {
  items: OrderItem[]
  total: number
  onClose: () => void
  onConfirm: (result: SplitResult) => void
}) {
  const [mode, setMode] = useState<'equal' | 'custom' | 'by-item'>('equal')
  const [n, setN] = useState(2)
  const [customAmounts, setCustomAmounts] = useState<number[]>([total / 2, total / 2])
  const [itemAssignments, setItemAssignments] = useState<Record<string, number>>({})

  const equalShare = total / n

  const customSum = customAmounts.reduce((s, a) => s + a, 0)
  const customDelta = total - customSum

  const byItemTotals = useMemo(() => {
    const totals: number[] = Array(n).fill(0)
    for (const it of items) {
      const target = itemAssignments[it.id] ?? 0
      totals[target] += it.price * it.qty
    }
    return totals
  }, [items, itemAssignments, n])

  const byItemAssigned = items.filter((it) => it.id in itemAssignments).length
  const byItemMissing = items.length - byItemAssigned

  const confirm = () => {
    let parts: SplitResult['parts'] = []
    if (mode === 'equal') {
      parts = Array.from({ length: n }, (_, i) => ({ label: `Client ${i + 1}`, amount: equalShare }))
    } else if (mode === 'custom') {
      parts = customAmounts.map((amount, i) => ({ label: `Client ${i + 1}`, amount }))
    } else {
      parts = byItemTotals.map((amount, i) => ({
        label: `Client ${i + 1}`,
        amount,
        items: items.filter((it) => itemAssignments[it.id] === i),
      }))
    }
    onConfirm({ mode, parts })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, maxWidth: 560, width: '100%', maxHeight: '88vh',
          overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>POS</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Diviser l'addition</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Total : <strong>{total.toFixed(2)} €</strong> · {items.length} articles</p>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>

        {/* Mode tabs */}
        <div style={{ padding: '12px 22px', display: 'flex', gap: 6, borderBottom: '1px solid #f1f5f9' }}>
          {(['equal', 'custom', 'by-item'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: mode === m ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f1f5f9',
              color: mode === m ? '#fff' : '#475569',
            }}>
              {m === 'equal' ? '🟰 Équitable' : m === 'custom' ? '✏️ Montants' : '📋 Par article'}
            </button>
          ))}
        </div>

        {/* Number of people */}
        <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={16} color="#6366f1" />
          <span style={{ fontSize: 13, color: '#475569' }}>Nombre de clients :</span>
          <button onClick={() => { setN(Math.max(2, n - 1)); setCustomAmounts(Array(Math.max(2, n - 1)).fill(total / Math.max(2, n - 1))) }} style={pillBtn}><Minus size={14} /></button>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', minWidth: 28, textAlign: 'center' }}>{n}</span>
          <button onClick={() => { setN(Math.min(10, n + 1)); setCustomAmounts(Array(Math.min(10, n + 1)).fill(total / Math.min(10, n + 1))) }} style={pillBtn}><Plus size={14} /></button>
        </div>

        {/* Mode-specific UI */}
        <div style={{ padding: 22 }}>
          {mode === 'equal' && (
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 18, textAlign: 'center', border: '1px solid #86efac' }}>
              <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Chacun paie</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#166534', marginTop: 4 }}>{equalShare.toFixed(2)} €</div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>{n} × {equalShare.toFixed(2)} € = {(equalShare * n).toFixed(2)} €</div>
            </div>
          )}

          {mode === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {customAmounts.map((amount, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13, color: '#475569', fontWeight: 600 }}>Client {i + 1}</span>
                  <input type="number" step="0.5" min="0" value={amount.toFixed(2)}
                    onChange={(e) => {
                      const next = [...customAmounts]; next[i] = parseFloat(e.target.value) || 0
                      setCustomAmounts(next)
                    }}
                    style={{ width: 100, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700, textAlign: 'right' }} />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>€</span>
                </div>
              ))}
              <div style={{
                marginTop: 8, padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: Math.abs(customDelta) < 0.01 ? '#f0fdf4' : '#fef3c7',
                color: Math.abs(customDelta) < 0.01 ? '#15803d' : '#92400e',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>Somme : {customSum.toFixed(2)} €</span>
                <span>{Math.abs(customDelta) < 0.01 ? '✓ Aligné' : `Δ ${customDelta > 0 ? '+' : ''}${customDelta.toFixed(2)} €`}</span>
              </div>
            </div>
          )}

          {mode === 'by-item' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                Assigne chaque article à un client. {byItemMissing > 0 && <strong style={{ color: '#d97706' }}>{byItemMissing} non assigné(s)</strong>}
              </div>
              {items.map((it) => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#f8fafc' }}>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.qty}× {it.name}</div>
                    <div style={{ color: '#64748b' }}>{(it.price * it.qty).toFixed(2)} €</div>
                  </div>
                  <select
                    value={itemAssignments[it.id] ?? ''}
                    onChange={(e) => setItemAssignments({ ...itemAssignments, [it.id]: parseInt(e.target.value) })}
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
                    <option value="">—</option>
                    {Array.from({ length: n }, (_, i) => (
                      <option key={i} value={i}>Client {i + 1}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div style={{ marginTop: 6, padding: 10, background: '#f1f5f9', borderRadius: 8, fontSize: 12 }}>
                {byItemTotals.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Client {i + 1}</span><span>{t.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, position: 'sticky', bottom: 0, background: '#fff' }}>
          <button onClick={onClose} style={{ ...secondaryBtn, flex: 1 }}>Annuler</button>
          <button onClick={confirm}
            disabled={mode === 'custom' && Math.abs(customDelta) > 0.01}
            style={{
              ...primaryBtn, flex: 2,
              opacity: mode === 'custom' && Math.abs(customDelta) > 0.01 ? 0.4 : 1,
              cursor: mode === 'custom' && Math.abs(customDelta) > 0.01 ? 'not-allowed' : 'pointer',
            }}>
            <Check size={14} /> Confirmer la division
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 2. TIP SELECTOR
// ═══════════════════════════════════════════════════════════════════════
export function TipSelector({
  baseAmount, onChange,
}: {
  baseAmount: number
  onChange: (tip: number, total: number, percent: number) => void
}) {
  const [percent, setPercent] = useState<5 | 10 | 15 | 20 | 'custom' | 'round'>(10)
  const [customAmount, setCustomAmount] = useState(0)

  const tip = useMemo(() => {
    if (percent === 'round') {
      const target = Math.ceil(baseAmount / 5) * 5  // arrondi au 5€ supérieur
      return target - baseAmount
    }
    if (percent === 'custom') return customAmount
    return baseAmount * (percent / 100)
  }, [percent, baseAmount, customAmount])

  const total = baseAmount + tip
  const actualPercent = baseAmount > 0 ? (tip / baseAmount) * 100 : 0

  // Notify parent
  useMemo(() => {
    onChange(tip, total, actualPercent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip, total])

  const presets: Array<{ key: typeof percent; label: string; sub?: string }> = [
    { key: 5,        label: '5%',   sub: `${(baseAmount * 0.05).toFixed(2)} €` },
    { key: 10,       label: '10%',  sub: `${(baseAmount * 0.10).toFixed(2)} €` },
    { key: 15,       label: '15%',  sub: `${(baseAmount * 0.15).toFixed(2)} €` },
    { key: 20,       label: '20%',  sub: `${(baseAmount * 0.20).toFixed(2)} €` },
    { key: 'round',  label: '🔢 Arrondi', sub: `${total.toFixed(0)} €` },
    { key: 'custom', label: '✏️ Custom',  sub: percent === 'custom' ? `${customAmount.toFixed(2)} €` : '—' },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Heart size={16} color="#ec4899" fill="#fce7f3" />
        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>Pourboire suggéré</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>Optionnel</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {presets.map((p) => (
          <button key={String(p.key)}
            onClick={() => setPercent(p.key)}
            style={{
              padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
              border: percent === p.key ? '2px solid #ec4899' : '1px solid #e2e8f0',
              background: percent === p.key ? 'linear-gradient(135deg, #fce7f3, #fbcfe8)' : '#fff',
              color: percent === p.key ? '#9d174d' : '#475569',
            }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{p.label}</div>
            <div style={{ fontSize: 10, marginTop: 2 }}>{p.sub}</div>
          </button>
        ))}
      </div>
      {percent === 'custom' && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="number" step="0.5" min="0" value={customAmount.toFixed(2)}
            onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
            placeholder="Montant pourboire"
            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 700 }}>€</span>
        </div>
      )}
      <div style={{
        marginTop: 12, padding: '10px 14px', borderRadius: 10,
        background: 'linear-gradient(135deg, #fef3c7, #fbbf24)', color: '#78350f',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 700,
      }}>
        <span>+ Pourboire</span>
        <span>{tip.toFixed(2)} € ({actualPercent.toFixed(1)}%)</span>
      </div>
      <div style={{
        marginTop: 6, padding: '12px 14px', borderRadius: 10,
        background: '#0f172a', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16, fontWeight: 900,
      }}>
        <span>TOTAL À PAYER</span>
        <span>{total.toFixed(2)} €</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 3. ALLERGIES PANEL
// ═══════════════════════════════════════════════════════════════════════
const COMMON_ALLERGENS = [
  '🥜 Arachides', '🌰 Fruits à coque', '🍞 Gluten', '🥚 Œufs', '🥛 Lactose',
  '🐟 Poisson', '🦐 Crustacés', '🐚 Mollusques', '🌽 Soja', '🌿 Sésame',
  '🌶 Moutarde', '🍇 Sulfites', '🌾 Céleri', '💊 Lupin',
]

export function AllergiesPanel({
  current, onChange, onAlertKitchen,
}: {
  current: string[]
  onChange: (allergies: string[]) => void
  onAlertKitchen?: (allergies: string[]) => void
}) {
  const [showCustom, setShowCustom] = useState(false)
  const [customAllergen, setCustomAllergen] = useState('')

  const toggle = (a: string) => {
    if (current.includes(a)) onChange(current.filter((x) => x !== a))
    else onChange([...current, a])
  }

  const addCustom = () => {
    if (customAllergen.trim() && !current.includes(customAllergen.trim())) {
      onChange([...current, '⚠️ ' + customAllergen.trim()])
      setCustomAllergen(''); setShowCustom(false)
    }
  }

  return (
    <div style={{
      background: current.length > 0 ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : '#fff',
      border: current.length > 0 ? '2px solid #ef4444' : '1px solid #e2e8f0',
      borderRadius: 14, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <AlertOctagon size={16} color={current.length > 0 ? '#dc2626' : '#94a3b8'} />
        <span style={{ fontWeight: 800, color: current.length > 0 ? '#7f1d1d' : '#475569', fontSize: 14 }}>
          Allergies client
        </span>
        {current.length > 0 && (
          <span style={{
            marginLeft: 'auto', padding: '3px 10px', borderRadius: 999,
            background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
          }}>
            ⚠️ {current.length} signalée(s)
          </span>
        )}
      </div>

      {/* Selected chips */}
      {current.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {current.map((a) => (
            <div key={a} style={{
              padding: '6px 10px', borderRadius: 999,
              background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              {a}
              <button onClick={() => toggle(a)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
                width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', padding: 0,
              }}><X size={10} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Common allergens grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {COMMON_ALLERGENS.map((a) => {
          const active = current.includes(a)
          return (
            <button key={a} onClick={() => toggle(a)} style={{
              padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: active ? '#dc2626' : '#f1f5f9',
              color: active ? '#fff' : '#475569',
              textAlign: 'left',
            }}>
              {active ? '✓ ' : ''}{a}
            </button>
          )
        })}
      </div>

      {/* Custom allergen */}
      {!showCustom ? (
        <button onClick={() => setShowCustom(true)} style={{
          marginTop: 8, padding: '6px 10px', borderRadius: 8, border: '1px dashed #cbd5e1',
          background: 'transparent', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          width: '100%',
        }}>+ Allergène personnalisé</button>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <input value={customAllergen} onChange={(e) => setCustomAllergen(e.target.value)}
            placeholder="Ex: latex, nickel..."
            onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }}
            autoFocus
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <button onClick={addCustom} style={{ ...primaryBtn, padding: '6px 12px', fontSize: 11 }}>+</button>
        </div>
      )}

      {/* Alert kitchen button */}
      {current.length > 0 && onAlertKitchen && (
        <button onClick={() => onAlertKitchen(current)} style={{
          marginTop: 12, width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', fontWeight: 800, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
        }}>
          <Bell size={14} /> Alerter la cuisine ({current.length} allergène{current.length > 1 ? 's' : ''})
        </button>
      )}
    </div>
  )
}

// ─── Styles partagés ───────────────────────────────────────────────────
const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#f1f5f9', color: '#475569', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const pillBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer',
  color: '#475569', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const primaryBtn: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800,
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
const secondaryBtn: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 700,
  background: '#fff', color: '#475569',
}
