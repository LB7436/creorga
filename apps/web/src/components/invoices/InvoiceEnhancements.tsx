import { useState, useMemo } from 'react'
import { Send, Repeat, Bell, X, Check, Calendar, Mail } from 'lucide-react'

/**
 * v3.18.6 — Invoice Enhancements (3 features)
 *
 * 1. BatchSendModal      : envoi PDF par email à N clients d'un coup
 * 2. RecurringInvoices   : templates abonnements (mensuel, trimestriel)
 * 3. AutoReminderConfig  : règles auto-relance (J+7 → mail, J+15 → SMS, J+30 → recouvrement)
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. BATCH SEND PDF MODAL
// ═══════════════════════════════════════════════════════════════════════
export function BatchSendModal({
  invoices, onClose, onSend,
}: {
  invoices: Array<{ id: string; number: string; customer: string; email?: string; total: number; status: string }>
  onClose: () => void
  onSend: (ids: string[]) => Promise<{ sent: number; errors: number }>
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; errors: number } | null>(null)

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }
  const selectAll = () => setSelected(new Set(invoices.filter((i) => !!i.email).map((i) => i.id)))
  const totalAmount = useMemo(() => invoices.filter((i) => selected.has(i.id)).reduce((s, i) => s + i.total, 0), [invoices, selected])

  const send = async () => {
    if (selected.size === 0) return
    setSending(true)
    const r = await onSend(Array.from(selected))
    setResult(r)
    setSending(false)
  }

  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={(e) => e.stopPropagation()} style={modalBox}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: 11, color: '#10b981', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>FACTURES</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Envoi groupé par email</h2>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button onClick={selectAll} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #d1fae5', background: '#ecfdf5',
              color: '#065f46', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>✓ Tout sélectionner ({invoices.filter((i) => !!i.email).length})</button>
            <span style={{ fontSize: 11, color: '#64748b' }}>{selected.size} facture(s) · {totalAmount.toFixed(2)} €</span>
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            {invoices.map((inv) => {
              const has = selected.has(inv.id)
              const noEmail = !inv.email
              return (
                <div key={inv.id} onClick={() => !noEmail && toggle(inv.id)} style={{
                  padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: noEmail ? 'not-allowed' : 'pointer',
                  background: has ? '#ecfdf5' : '#fff', opacity: noEmail ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, border: '1.5px solid', borderColor: has ? '#10b981' : '#cbd5e1',
                    background: has ? '#10b981' : '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {has && <Check size={11} color="#fff" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{inv.number} · {inv.customer}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{inv.email || '⚠ Pas d\'email'}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{inv.total.toFixed(2)} €</span>
                  <span style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 999,
                    background: inv.status === 'paid' ? '#d1fae5' : '#fef3c7',
                    color: inv.status === 'paid' ? '#065f46' : '#92400e', fontWeight: 700,
                  }}>{inv.status}</span>
                </div>
              )
            })}
          </div>

          {result && (
            <div style={{
              marginTop: 12, padding: 10, borderRadius: 10,
              background: result.errors === 0 ? '#d1fae5' : '#fef3c7',
              color: result.errors === 0 ? '#065f46' : '#92400e', fontSize: 12, fontWeight: 700,
            }}>
              ✅ {result.sent} envoyé(s) {result.errors > 0 && `· ⚠ ${result.errors} erreur(s)`}
            </div>
          )}
        </div>

        <div style={modalFooter}>
          <button onClick={onClose} style={btnSec}>Fermer</button>
          <button onClick={send} disabled={selected.size === 0 || sending}
            style={{ ...btnPrim, flex: 1, opacity: selected.size === 0 ? 0.4 : 1 }}>
            <Send size={14} /> {sending ? 'Envoi en cours…' : `Envoyer ${selected.size} facture(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 2. RECURRING INVOICE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════
export interface RecurringRule {
  id: string
  customerId: string
  customerName: string
  amount: number
  description: string
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  startDate: string
  active: boolean
  lastSent?: string
}

export function RecurringInvoiceForm({
  customers, onCreate,
}: {
  customers: Array<{ id: string; name: string }>
  onCreate: (rule: Omit<RecurringRule, 'id' | 'active'>) => void
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<RecurringRule['frequency']>('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))

  const submit = () => {
    const cust = customers.find((c) => c.id === customerId)
    if (!cust) return
    onCreate({
      customerId, customerName: cust.name, amount, description, frequency, startDate,
    })
    setAmount(0); setDescription('')
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Repeat size={14} color="#10b981" />
        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>Facture récurrente (abonnement)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={inp}>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} placeholder="Montant €" style={inp} />
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} style={inp}>
          <option value="weekly">📅 Hebdomadaire</option>
          <option value="monthly">📆 Mensuel</option>
          <option value="quarterly">📊 Trimestriel</option>
          <option value="yearly">🎯 Annuel</option>
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inp} />
      </div>

      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (ex: Abonnement traiteur entreprise)" style={{ ...inp, marginTop: 8 }} />

      <button onClick={submit} disabled={amount <= 0 || !description.trim()} style={{ ...btnPrim, width: '100%', marginTop: 10, opacity: amount <= 0 || !description.trim() ? 0.4 : 1 }}>
        <Repeat size={14} /> Créer l'abonnement
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 3. AUTO REMINDER CONFIG
// ═══════════════════════════════════════════════════════════════════════
export interface ReminderRule {
  id: string
  daysAfterDue: number
  channel: 'email' | 'sms' | 'phone' | 'recovery'
  templateId?: string
  active: boolean
}

const DEFAULT_RULES: ReminderRule[] = [
  { id: 'r1', daysAfterDue: 7,  channel: 'email', active: true,  templateId: 'invoice-reminder' },
  { id: 'r2', daysAfterDue: 15, channel: 'sms',   active: true },
  { id: 'r3', daysAfterDue: 30, channel: 'phone', active: false },
  { id: 'r4', daysAfterDue: 45, channel: 'recovery', active: false },
]

export function AutoReminderConfig() {
  const [rules, setRules] = useState<ReminderRule[]>(DEFAULT_RULES)

  const updateRule = (id: string, patch: Partial<ReminderRule>) => {
    setRules(rules.map((r) => r.id === id ? { ...r, ...patch } : r))
  }

  const channelEmoji = { email: '📧', sms: '💬', phone: '📞', recovery: '⚖️' }
  const channelLabel = { email: 'Email', sms: 'SMS', phone: 'Appel', recovery: 'Recouvrement' }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Bell size={14} color="#f59e0b" />
        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>Relances automatiques</span>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 11, color: '#64748b' }}>
        Quand une facture passe son échéance, le système relance automatiquement selon ces règles :
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rules.map((r) => (
          <div key={r.id} style={{
            padding: '10px 12px', borderRadius: 10,
            background: r.active ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${r.active ? '#86efac' : '#e2e8f0'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <input type="checkbox" checked={r.active} onChange={(e) => updateRule(r.id, { active: e.target.checked })} />
            <span style={{ fontSize: 18 }}>{channelEmoji[r.channel]}</span>
            <div style={{ flex: 1, fontSize: 12 }}>
              <strong>J+{r.daysAfterDue}</strong> après échéance → {channelLabel[r.channel]}
              {r.templateId && <span style={{ marginLeft: 8, fontSize: 10, color: '#64748b' }}>(template : {r.templateId})</span>}
            </div>
            <input type="number" min="1" max="120" value={r.daysAfterDue}
              onChange={(e) => updateRule(r.id, { daysAfterDue: parseInt(e.target.value) || 1 })}
              style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'center' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────
const modalBg: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const modalBox: React.CSSProperties = {
  background: '#fff', borderRadius: 18, maxWidth: 620, width: '100%', maxHeight: '88vh',
  overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
}
const modalHeader: React.CSSProperties = {
  padding: '18px 22px', borderBottom: '1px solid #e2e8f0',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const modalFooter: React.CSSProperties = { padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }
const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#f1f5f9', color: '#475569', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }
const btnPrim: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800,
  background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
const btnSec: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 700,
  background: '#fff', color: '#475569',
}
