import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, Cover, PayMethod, coverTotal, tableTotal } from '../store/posStore'

interface Props {
  tableId: string
  onBack: () => void
  onDone: () => void
}

type SplitMode = 'full' | 'by-cover' | 'equal'

const PAY_METHODS: { id: PayMethod; label: string; icon: string }[] = [
  { id: 'cash',        label: 'Espèces',      icon: '💵' },
  { id: 'card',        label: 'Carte',         icon: '💳' },
  { id: 'contactless', label: 'Sans contact',  icon: '📲' },
]

const QUICK_CASH = [5, 10, 20, 50, 100]
const TIP_PRESETS = [5, 10, 15]

function fmt(n: number) { return n.toFixed(2) + ' €' }

/* ── Cover checkbox ─────────────────────────────────────────────────────────── */
function CoverCheck({ cover, selected, onToggle }: { cover: Cover; selected: boolean; onToggle: () => void }) {
  const total = coverTotal(cover)
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '12px 16px', borderRadius: 12,
        border: selected ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
        background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer', transition: 'all .15s', textAlign: 'left' as const,
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        border: selected ? '2px solid #6366f1' : '2px solid #374151',
        background: selected ? '#6366f1' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all .15s',
      }}>
        {selected && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{cover.label}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          {cover.items.length} article{cover.items.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: selected ? '#a5b4fc' : '#64748b' }}>
        {fmt(total)}
      </div>
    </motion.button>
  )
}

/* ── Receipt / ticket ───────────────────────────────────────────────────────── */
function Receipt({ covers, tip }: { covers: Cover[]; tip: number }) {
  const subtotal = covers.reduce((s, c) => s + coverTotal(c), 0)
  const total = subtotal + tip

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
    }}>
      {covers.map(cover => (
        <div key={cover.id}>
          {covers.length > 1 && (
            <div style={{
              padding: '8px 16px',
              background: 'rgba(99,102,241,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                {cover.label}
              </span>
            </div>
          )}
          {cover.items.map(item => (
            <div key={item.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                <span style={{ color: '#64748b', marginRight: 4 }}>{item.qty}×</span>
                {item.name}
                {item.note && <span style={{ color: '#6366f1', marginLeft: 6, fontSize: 11 }}>({item.note})</span>}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                {(item.price * item.qty).toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      ))}

      {/* Totals */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Sous-total</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{fmt(subtotal)}</span>
        </div>
        {tip > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#10b981' }}>Pourboire</span>
            <span style={{ fontSize: 12, color: '#10b981' }}>+ {fmt(tip)}</span>
          </div>
        )}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 10,
          paddingTop: 10, borderTop: '1px dashed rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Success overlay ────────────────────────────────────────────────────────── */
function SuccessOverlay({ amount, change, method }: { amount: number; change: number | null; method: PayMethod }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(7,7,13,0.95)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Checkmark circle */}
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))',
          border: '3px solid #10b981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 60px rgba(16,185,129,0.3)',
          marginBottom: 24,
        }}
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          style={{ fontSize: 44, color: '#10b981' }}
        >
          ✓
        </motion.span>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}
      >
        Paiement reçu
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        style={{ fontSize: 36, fontWeight: 900, color: '#10b981', marginBottom: 12 }}
      >
        {fmt(amount)}
      </motion.div>

      {method === 'cash' && change !== null && change > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          style={{
            fontSize: 16, color: '#94a3b8',
            padding: '8px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          Rendu : <strong style={{ color: '#e2e8f0' }}>{fmt(change)}</strong>
        </motion.div>
      )}
    </motion.div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────────── */
export default function PaymentPage({ tableId, onBack, onDone }: Props) {
  const table = usePOS(s => s.tables.find(t => t.id === tableId))
  const settings = usePOS(s => s.settings)
  const processPayment = usePOS(s => s.processPayment)

  const [splitMode, setSplitMode] = useState<SplitMode>('full')
  const [selectedCoverIds, setSelectedCoverIds] = useState<Set<string>>(new Set())
  const [method, setMethod] = useState<PayMethod>('card')
  const [tipPercent, setTipPercent] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [tipIsCustom, setTipIsCustom] = useState(false)
  const [equalParts, setEqualParts] = useState(2)
  const [done, setDone] = useState(false)
  const [cashInput, setCashInput] = useState('')

  if (!table) return null

  const covers = table.covers
  const grandTotal = tableTotal(table)

  const payingCovers = useMemo(() => {
    if (splitMode === 'full') return covers
    if (splitMode === 'by-cover') return covers.filter(c => selectedCoverIds.has(c.id))
    return covers
  }, [splitMode, covers, selectedCoverIds])

  const subtotal = payingCovers.reduce((s, c) => s + coverTotal(c), 0)

  const tipAmount = useMemo(() => {
    if (tipIsCustom) {
      const v = parseFloat(customTip)
      return isNaN(v) ? 0 : v
    }
    return subtotal * (tipPercent / 100)
  }, [tipIsCustom, customTip, tipPercent, subtotal])

  const perPersonAmount = splitMode === 'equal' ? (subtotal + tipAmount) / equalParts : 0
  const totalToPay = subtotal + tipAmount

  const cashChange = useMemo(() => {
    const v = parseFloat(cashInput)
    return isNaN(v) ? null : v - totalToPay
  }, [cashInput, totalToPay])

  function toggleCover(coverId: string) {
    setSelectedCoverIds(prev => {
      const next = new Set(prev)
      if (next.has(coverId)) next.delete(coverId)
      else next.add(coverId)
      return next
    })
  }

  function handleConfirm() {
    const ids = splitMode === 'by-cover' ? [...selectedCoverIds] : undefined
    processPayment(tableId, method, tipAmount, ids)
    setDone(true)
    setTimeout(onDone, 1500)
  }

  const canPay = splitMode !== 'by-cover' || selectedCoverIds.size > 0

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#07070d' }}>

      {/* Success animation overlay */}
      <AnimatePresence>
        {done && (
          <SuccessOverlay
            amount={totalToPay}
            change={cashChange}
            method={method}
          />
        )}
      </AnimatePresence>

      {/* ── LEFT PANEL (40%) ── Receipt + split controls ── */}
      <div style={{
        width: '40%', flexShrink: 0,
        display: 'flex', flexDirection: 'column' as const,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: '#0a0a14', overflow: 'hidden',
      }}>
        {/* Split mode selector */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 10,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
          }}>
            Mode de partage
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              { id: 'full',     label: 'Table entière' },
              { id: 'by-cover', label: 'Par couvert' },
              { id: 'equal',    label: 'Parts égales' },
            ] as const).map(m => (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSplitMode(m.id)}
                style={{
                  padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all .15s',
                  border: splitMode === m.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  background: splitMode === m.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: splitMode === m.id ? '#a5b4fc' : '#64748b',
                }}
              >
                {m.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Cover checkboxes (by-cover mode) */}
        {splitMode === 'by-cover' && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
              Sélectionner les couverts qui paient
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {covers.map(c => (
                <CoverCheck
                  key={c.id}
                  cover={c}
                  selected={selectedCoverIds.has(c.id)}
                  onToggle={() => toggleCover(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Equal parts counter */}
        {splitMode === 'equal' && (
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Nombre de personnes</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setEqualParts(p => Math.max(2, p - 1))}
                style={counterBtnStyle}
              >−</motion.button>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', minWidth: 28, textAlign: 'center' as const }}>
                {equalParts}
              </span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setEqualParts(p => Math.min(20, p + 1))}
                style={counterBtnStyle}
              >+</motion.button>
              <div style={{
                marginLeft: 'auto',
                padding: '4px 14px', borderRadius: 20,
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <span style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 700 }}>
                  {fmt(perPersonAmount)} / pers.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable receipt */}
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: '14px 18px' }}>
          <div style={{
            fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 12,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
          }}>
            Reçu
          </div>
          <Receipt covers={payingCovers} tip={tipAmount} />

          {/* Remaining balance indicator */}
          {splitMode === 'by-cover' && grandTotal > subtotal && subtotal > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(244,63,94,0.06)',
              border: '1px solid rgba(244,63,94,0.12)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#fb7185' }}>Reste à payer</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fb7185' }}>{fmt(grandTotal - subtotal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL (60%) ── Payment controls ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
      }}>
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: '24px 30px' }}>

          {/* ── Big total card ── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 22, padding: '24px 28px', marginBottom: 28,
            textAlign: 'center' as const,
            boxShadow: '0 4px 40px rgba(99,102,241,0.12)',
          }}>
            <div style={{
              fontSize: 11, color: '#818cf8', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6,
            }}>
              Total à encaisser
            </div>
            <div style={{
              fontSize: 52, fontWeight: 900, color: '#fff',
              letterSpacing: '-0.03em', lineHeight: 1.1,
            }}>
              {fmt(totalToPay)}
            </div>
            {splitMode === 'equal' && (
              <div style={{ fontSize: 14, color: '#818cf8', marginTop: 8 }}>
                {equalParts} × {fmt(perPersonAmount)}
              </div>
            )}
          </div>

          {/* ── Payment method cards ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            }}>
              Mode de règlement
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {PAY_METHODS.map(m => {
                const isActive = method === m.id
                return (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMethod(m.id)}
                    style={{
                      display: 'flex', flexDirection: 'column' as const,
                      alignItems: 'center', gap: 10,
                      padding: '20px 14px', borderRadius: 16, cursor: 'pointer',
                      transition: 'all .2s',
                      border: isActive ? '1.5px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.06)',
                      background: isActive ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                      color: isActive ? '#a5b4fc' : '#64748b',
                      boxShadow: isActive ? '0 0 24px rgba(99,102,241,0.2)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{m.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* ── Cash calculator ── */}
          {method === 'cash' && (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 12,
                letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              }}>
                Montant reçu
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={cashInput}
                  onChange={e => setCashInput(e.target.value)}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#e2e8f0', fontSize: 18, fontWeight: 700, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: 18, color: '#64748b', fontWeight: 600 }}>€</span>
              </div>

              {/* Quick amount buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                {QUICK_CASH.map(v => (
                  <motion.button
                    key={v}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setCashInput(String(v))}
                    style={{
                      padding: '7px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#94a3b8', fontWeight: 600, transition: 'all .15s',
                    }}
                  >
                    {v} €
                  </motion.button>
                ))}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setCashInput(Math.ceil(totalToPay).toFixed(0))}
                  style={{
                    padding: '7px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                    border: '1px solid rgba(16,185,129,0.3)',
                    background: 'rgba(16,185,129,0.08)',
                    color: '#10b981', fontWeight: 600,
                  }}
                >
                  Arrondi
                </motion.button>
              </div>

              {/* Change badge */}
              {cashChange !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '12px 16px', borderRadius: 12,
                    background: cashChange >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                    border: `1px solid ${cashChange >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, color: cashChange >= 0 ? '#6ee7b7' : '#fca5a5' }}>
                    {cashChange >= 0 ? 'Rendu monnaie' : 'Montant insuffisant'}
                  </span>
                  <span style={{
                    fontSize: 17, fontWeight: 800,
                    color: cashChange >= 0 ? '#10b981' : '#f43f5e',
                    padding: '2px 12px', borderRadius: 8,
                    background: cashChange >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                  }}>
                    {cashChange >= 0 ? fmt(cashChange) : `−${fmt(-cashChange)}`}
                  </span>
                </motion.div>
              )}
            </div>
          )}

          {/* ── Tip section ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            }}>
              Pourboire
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
              {/* None */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => { setTipIsCustom(false); setTipPercent(0) }}
                style={tipBtnStyle(!tipIsCustom && tipPercent === 0)}
              >
                Aucun
              </motion.button>

              {/* Preset percentages */}
              {TIP_PRESETS.map(p => {
                const isActive = !tipIsCustom && tipPercent === p
                return (
                  <motion.button
                    key={p}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => { setTipIsCustom(false); setTipPercent(p) }}
                    style={tipBtnStyle(isActive)}
                  >
                    {p}%
                    {isActive && subtotal > 0 && (
                      <span style={{ opacity: 0.7, marginLeft: 4 }}>· {fmt(subtotal * p / 100)}</span>
                    )}
                  </motion.button>
                )
              })}

              {/* Custom */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => setTipIsCustom(true)}
                style={tipBtnStyle(tipIsCustom)}
              >
                Personnalisé
              </motion.button>
            </div>

            {/* Custom tip input */}
            {tipIsCustom && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <input
                  autoFocus
                  type="number"
                  placeholder="0.00"
                  value={customTip}
                  onChange={e => setCustomTip(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    border: '1px solid rgba(16,185,129,0.3)',
                    background: 'rgba(16,185,129,0.06)',
                    color: '#e2e8f0', fontSize: 15, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: 14, color: '#64748b' }}>€</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Encaisser button ── */}
        <div style={{
          padding: '18px 30px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          {!canPay ? (
            <div style={{ textAlign: 'center' as const, color: '#374151', fontSize: 13, padding: '14px 0' }}>
              Sélectionnez au moins un couvert
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ boxShadow: '0 6px 36px rgba(16,185,129,0.45)' }}
              onClick={handleConfirm}
              style={{
                display: 'block', width: '100%', padding: '17px 0',
                borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 28px rgba(16,185,129,0.35)',
                letterSpacing: '-0.01em',
                fontFamily: 'inherit',
              }}
            >
              ✓ Encaisser {fmt(totalToPay)}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Shared inline style helpers ─────────────────────────────────────────────── */
const counterBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e2e8f0', fontSize: 20, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'inherit',
}

function tipBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all .15s',
    border: active ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#34d399' : '#64748b',
    fontFamily: 'inherit',
  }
}
