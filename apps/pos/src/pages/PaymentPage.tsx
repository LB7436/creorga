import { useState, useMemo } from 'react'
import { usePOS, Cover, PayMethod, coverTotal, tableTotal } from '../store/posStore'

interface Props {
  tableId: string
  onBack: () => void
  onDone: () => void
}

type SplitMode = 'full' | 'by-cover' | 'equal' | 'custom'

const PAY_METHODS: { id: PayMethod; label: string; icon: string }[] = [
  { id: 'cash',        label: 'Espèces',      icon: '💵' },
  { id: 'card',        label: 'Carte',         icon: '💳' },
  { id: 'contactless', label: 'Sans contact',  icon: '📲' },
]

function fmt(n: number) { return n.toFixed(2) + ' €' }

// ─── Cover selector checkbox ──────────────────────────────────────────────────
function CoverCheck({ cover, selected, onToggle }: { cover: Cover; selected: boolean; onToggle: () => void }) {
  const total = coverTotal(cover)
  return (
    <button
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
        width: 20, height: 20, borderRadius: 6,
        border: selected ? '2px solid #6366f1' : '2px solid #374151',
        background: selected ? '#6366f1' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all .15s',
      }}>
        {selected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
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
    </button>
  )
}

// ─── Receipt view ─────────────────────────────────────────────────────────────
function Receipt({ covers, tip }: { covers: Cover[]; tip: number }) {
  const subtotal = covers.reduce((s, c) => s + coverTotal(c), 0)
  const total = subtotal + tip

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
    }}>
      {covers.map(cover => (
        <div key={cover.id}>
          {covers.length > 1 && (
            <div style={{ padding: '8px 14px', background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8' }}>{cover.label}</span>
            </div>
          )}
          {cover.items.map(item => (
            <div key={item.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {item.qty}× {item.name}
                {item.note && <span style={{ color: '#6366f1', marginLeft: 4 }}>({item.note})</span>}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{(item.price * item.qty).toFixed(2)} €</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PaymentPage({ tableId, onBack, onDone }: Props) {
  const table = usePOS(s => s.tables.find(t => t.id === tableId))
  const settings = usePOS(s => s.settings)
  const processPayment = usePOS(s => s.processPayment)

  const [splitMode, setSplitMode] = useState<SplitMode>('full')
  const [selectedCoverIds, setSelectedCoverIds] = useState<Set<string>>(new Set())
  const [method, setMethod] = useState<PayMethod>('card')
  const [tipMode, setTipMode] = useState<'preset' | 'custom'>('preset')
  const [tipPercent, setTipPercent] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [equalParts, setEqualParts] = useState(2)
  const [done, setDone] = useState(false)
  const [cashInput, setCashInput] = useState('')

  if (!table) return null

  const covers = table.covers
  const grandTotal = tableTotal(table)

  // Determine which covers are "active" for this payment
  const payingCovers = useMemo(() => {
    if (splitMode === 'full') return covers
    if (splitMode === 'by-cover') return covers.filter(c => selectedCoverIds.has(c.id))
    return covers
  }, [splitMode, covers, selectedCoverIds])

  const subtotal = payingCovers.reduce((s, c) => s + coverTotal(c), 0)

  const tipAmount = useMemo(() => {
    if (tipMode === 'custom') {
      const v = parseFloat(customTip)
      return isNaN(v) ? 0 : v
    }
    return subtotal * (tipPercent / 100)
  }, [tipMode, customTip, tipPercent, subtotal])

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
    setTimeout(onDone, 1600)
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 16, background: '#07070d',
      }}>
        <div className="fade-in" style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36,
        }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>Paiement reçu</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{fmt(totalToPay)}</div>
        {method === 'cash' && cashChange !== null && cashChange > 0 && (
          <div style={{ fontSize: 16, color: '#64748b' }}>Rendu: <strong style={{ color: '#e2e8f0' }}>{fmt(cashChange)}</strong></div>
        )}
      </div>
    )
  }

  // ── Main layout ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#07070d' }}>

      {/* ── Left: receipt + split ── */}
      <div style={{
        width: 420, flexShrink: 0,
        display: 'flex', flexDirection: 'column' as const,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: '#0a0a14', overflow: 'hidden',
      }}>
        {/* Split mode selector */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 8, letterSpacing: '0.06em' }}>MODE DE PAIEMENT</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {([
              { id: 'full',     label: 'Table entière' },
              { id: 'by-cover', label: 'Par couvert' },
              { id: 'equal',    label: 'Parts égales' },
            ] as const).map(m => (
              <button
                key={m.id}
                onClick={() => setSplitMode(m.id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  border: splitMode === m.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  background: splitMode === m.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: splitMode === m.id ? '#a5b4fc' : '#64748b',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equal parts selector */}
        {splitMode === 'equal' && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Nombre de personnes</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setEqualParts(p => Math.max(2, p - 1))} style={counterBtn()}>−</button>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', minWidth: 24, textAlign: 'center' }}>{equalParts}</span>
              <button onClick={() => setEqualParts(p => Math.min(20, p + 1))} style={counterBtn()}>+</button>
              <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 700 }}>
                = {fmt(perPersonAmount)} / pers.
              </span>
            </div>
          </div>
        )}

        {/* Cover selector */}
        {splitMode === 'by-cover' && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Sélectionner les couverts qui paient</div>
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

        {/* Receipt */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 10, letterSpacing: '0.06em' }}>REÇU</div>
          <Receipt covers={payingCovers} tip={tipAmount} />
          {splitMode === 'by-cover' && grandTotal > subtotal && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}>
              <span style={{ fontSize: 11, color: '#fb7185' }}>
                Reste à payer: {fmt(grandTotal - subtotal)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: payment options ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Total */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.06))',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 20, padding: '20px 24px', marginBottom: 24, textAlign: 'center' as const,
          }}>
            <div style={{ fontSize: 13, color: '#818cf8', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>TOTAL À ENCAISSER</div>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              {fmt(totalToPay)}
            </div>
            {splitMode === 'equal' && (
              <div style={{ fontSize: 13, color: '#818cf8', marginTop: 4 }}>
                {equalParts} × {fmt(perPersonAmount)}
              </div>
            )}
          </div>

          {/* Payment method */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 12, letterSpacing: '0.06em' }}>MODE DE RÈGLEMENT</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {PAY_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  style={{
                    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
                    padding: '16px 12px', borderRadius: 14, cursor: 'pointer', transition: 'all .15s',
                    border: method === m.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
                    background: method === m.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                    color: method === m.id ? '#a5b4fc' : '#64748b',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{m.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash change calculator */}
          {method === 'cash' && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 10, letterSpacing: '0.06em' }}>MONTANT REÇU</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={cashInput}
                  onChange={e => setCashInput(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                    color: '#e2e8f0', fontSize: 16, fontWeight: 600, outline: 'none',
                  }}
                />
                <span style={{ fontSize: 15, color: '#64748b' }}>€</span>
              </div>
              {cashChange !== null && (
                <div style={{
                  marginTop: 10, padding: '10px 14px', borderRadius: 10,
                  background: cashChange >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                  border: `1px solid ${cashChange >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    {cashChange >= 0 ? 'Rendu monnaie' : 'Montant insuffisant'}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: cashChange >= 0 ? '#10b981' : '#f43f5e' }}>
                    {cashChange >= 0 ? fmt(cashChange) : `−${fmt(-cashChange)}`}
                  </span>
                </div>
              )}
              {/* Quick cash amounts */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' as const }}>
                {[5, 10, 20, 50, 100].map(v => (
                  <button key={v} onClick={() => setCashInput(String(v))} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                    color: '#94a3b8', fontWeight: 600, transition: 'all .15s',
                  }}>{v} €</button>
                ))}
                <button onClick={() => setCashInput(Math.ceil(totalToPay).toFixed(0))} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)',
                  color: '#10b981', fontWeight: 600,
                }}>Arrondi</button>
              </div>
            </div>
          )}

          {/* Tip */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 12, letterSpacing: '0.06em' }}>POURBOIRE</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
              <button
                onClick={() => { setTipMode('preset'); setTipPercent(0) }}
                style={tipBtn(tipMode === 'preset' && tipPercent === 0)}
              >Aucun</button>
              {settings.tipPresets.map(p => (
                <button
                  key={p}
                  onClick={() => { setTipMode('preset'); setTipPercent(p) }}
                  style={tipBtn(tipMode === 'preset' && tipPercent === p)}
                >
                  {p}%
                  {tipMode === 'preset' && tipPercent === p && subtotal > 0 && (
                    <span style={{ opacity: 0.7, marginLeft: 4 }}>· {fmt(subtotal * p / 100)}</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => setTipMode('custom')}
                style={tipBtn(tipMode === 'custom')}
              >Personnalisé</button>
            </div>
            {tipMode === 'custom' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  autoFocus
                  type="number"
                  placeholder="0.00"
                  value={customTip}
                  onChange={e => setCustomTip(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)',
                    color: '#e2e8f0', fontSize: 14, outline: 'none',
                  }}
                />
                <span style={{ fontSize: 13, color: '#64748b' }}>€</span>
              </div>
            )}
          </div>
        </div>

        {/* Confirm button */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {splitMode === 'by-cover' && selectedCoverIds.size === 0 ? (
            <div style={{ textAlign: 'center', color: '#374151', fontSize: 13 }}>
              Sélectionnez au moins un couvert
            </div>
          ) : (
            <button
              onClick={handleConfirm}
              style={{
                display: 'block', width: '100%', padding: '15px 0',
                borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(16,185,129,0.35)',
                letterSpacing: '-0.01em',
                transition: 'all .2s',
              }}
            >
              ✓ Encaisser {fmt(totalToPay)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function counterBtn() {
  return {
    width: 34, height: 34, borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0', fontSize: 18, cursor: 'pointer',
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
  }
}

function tipBtn(active: boolean) {
  return {
    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
    border: active ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#34d399' : '#64748b',
  }
}
