import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, Cover, PayMethod, coverTotal, tableTotal } from '../store/posStore'

interface Props {
  tableId: string
  onBack: () => void
  onDone: () => void
}

type SplitMode = 'full' | 'by-cover' | 'equal'
type TipMode = 'percent' | 'euro'
type ReceiptMode = 'paper' | 'email' | 'sms' | 'none' | 'qr'
type Partial = { id: string; method: PayMethod; amount: number }
type QrStatus = 'waiting' | 'scanned' | 'paid'

const PAY_METHODS: { id: PayMethod; label: string; icon: string }[] = [
  { id: 'cash',        label: 'Espèces',      icon: '💵' },
  { id: 'card',        label: 'Carte',         icon: '💳' },
  { id: 'contactless', label: 'Sans contact',  icon: '📲' },
]

const QUICK_CASH = [5, 10, 20, 50, 100]
const TIP_PRESETS = [5, 10, 15, 20]
const STAFF_LIST = ['Marie', 'Thomas', 'Sophie', 'Paul']
const DEMO_PROMOS: Record<string, number> = { 'BIENVENUE10': 10, 'ETE5': 5, 'FIDELE20': 20 }
const DEMO_GIFTS: Record<string, number> = { 'GC-2024-ABCD': 25, 'GC-XMAS-1234': 50 }

const LS_RECEIPT_PREFS = 'creorga_pos_receipt_prefs'

function fmt(n: number) { return n.toFixed(2) + ' €' }
function uid() { return Math.random().toString(36).slice(2, 9) }
function roundUp50(n: number) { return Math.ceil(n / 50) * 50 }

/* ── Seeded QR pattern (stable across renders) ───────────────────────────────── */
function useQrPattern(seed: string) {
  return useMemo(() => {
    let s = 0
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0
    const cells: boolean[] = []
    for (let i = 0; i < 169; i++) {
      s = (s * 1103515245 + 12345) >>> 0
      cells.push((s & 1) === 1)
    }
    // force finder patterns at 3 corners
    const n = 13
    const forceCorner = (r: number, c: number) => {
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
        cells[(r + dr) * n + (c + dc)] = true
      }
      cells[(r + 1) * n + (c + 1)] = false
    }
    forceCorner(0, 0); forceCorner(0, n - 3); forceCorner(n - 3, 0)
    return cells
  }, [seed])
}

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
function Receipt({
  covers, tip, discount, customMsg, includeLogo, includePromo, promoNext,
}: {
  covers: Cover[]; tip: number; discount: number
  customMsg?: string; includeLogo?: boolean; includePromo?: boolean; promoNext?: string
}) {
  const subtotal = covers.reduce((s, c) => s + coverTotal(c), 0)
  const total = Math.max(0, subtotal - discount) + tip

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
    }}>
      {includeLogo && (
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center' as const,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.2em' }}>CREORGA</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Restaurant démo · Luxembourg</div>
        </div>
      )}
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

      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Sous-total</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{fmt(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#f59e0b' }}>Réduction</span>
            <span style={{ fontSize: 12, color: '#f59e0b' }}>− {fmt(discount)}</span>
          </div>
        )}
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

      {(customMsg || (includePromo && promoNext)) && (
        <div style={{
          padding: '10px 16px', borderTop: '1px dashed rgba(255,255,255,0.06)',
          background: 'rgba(99,102,241,0.04)',
        }}>
          {customMsg && (
            <div style={{ fontSize: 11, color: '#a5b4fc', fontStyle: 'italic' as const, textAlign: 'center' as const, marginBottom: includePromo ? 6 : 0 }}>
              « {customMsg} »
            </div>
          )}
          {includePromo && promoNext && (
            <div style={{
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(16,185,129,0.08)', border: '1px dashed rgba(16,185,129,0.3)',
              textAlign: 'center' as const,
            }}>
              <div style={{ fontSize: 9, color: '#6ee7b7', fontWeight: 700, letterSpacing: '0.05em' }}>
                PROCHAINE VISITE
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{promoNext}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── QR code SVG (13x13 grid) ───────────────────────────────────────────────── */
function QrSvg({ cells, size = 160, color = '#fff', bg = '#07070d' }: {
  cells: boolean[]; size?: number; color?: string; bg?: string
}) {
  const n = 13
  const cs = size / n
  return (
    <svg width={size} height={size} style={{ display: 'block', borderRadius: 10 }}>
      <rect width={size} height={size} fill={bg} />
      {cells.map((on, i) => {
        if (!on) return null
        const x = (i % n) * cs
        const y = Math.floor(i / n) * cs
        return <rect key={i} x={x} y={y} width={cs + 0.5} height={cs + 0.5} fill={color} />
      })}
    </svg>
  )
}

/* ── Success overlay ────────────────────────────────────────────────────────── */
function SuccessOverlay({
  amount, change, method, onFinish, defaultMode,
}: {
  amount: number; change: number | null; method: PayMethod
  onFinish: (mode: ReceiptMode) => void; defaultMode: ReceiptMode | null
}) {
  const [receiptMode, setReceiptMode] = useState<ReceiptMode | null>(defaultMode)
  const [contact, setContact] = useState('')

  const options: { id: ReceiptMode; label: string; icon: string }[] = [
    { id: 'paper', label: 'Ticket papier',  icon: '🧾' },
    { id: 'email', label: 'Email client',    icon: '✉️' },
    { id: 'sms',   label: 'SMS',             icon: '💬' },
    { id: 'qr',    label: 'QR code',         icon: '🔳' },
    { id: 'none',  label: 'Pas de ticket',   icon: '✕' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(7,7,13,0.95)', backdropFilter: 'blur(20px)', padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        style={{
          width: 86, height: 86, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))',
          border: '3px solid #10b981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 60px rgba(16,185,129,0.3)', marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 40, color: '#10b981' }}>✓</span>
      </motion.div>

      <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
        Paiement reçu
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: '#10b981', marginBottom: 10 }}>
        {fmt(amount)}
      </div>

      {method === 'cash' && change !== null && change > 0 && (
        <div style={{
          fontSize: 14, color: '#94a3b8',
          padding: '6px 16px', borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)', marginBottom: 20,
        }}>
          Rendu : <strong style={{ color: '#e2e8f0' }}>{fmt(change)}</strong>
        </div>
      )}

      <div style={{
        marginTop: 14, padding: '18px 22px', borderRadius: 16,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        width: '100%', maxWidth: 500,
      }}>
        <div style={{
          fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 12,
          letterSpacing: '0.08em', textTransform: 'uppercase' as const, textAlign: 'center' as const,
        }}>
          Options de ticket
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
          {options.map(o => (
            <motion.button
              key={o.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => setReceiptMode(o.id)}
              style={{
                padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4,
                border: receiptMode === o.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
                background: receiptMode === o.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                color: receiptMode === o.id ? '#a5b4fc' : '#94a3b8',
              }}
            >
              <span style={{ fontSize: 18 }}>{o.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{o.label}</span>
            </motion.button>
          ))}
        </div>

        {(receiptMode === 'email' || receiptMode === 'sms') && (
          <input
            autoFocus
            type={receiptMode === 'email' ? 'email' : 'tel'}
            placeholder={receiptMode === 'email' ? 'client@email.com' : '+352 621 000 000'}
            value={contact}
            onChange={e => setContact(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
          />
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => receiptMode && onFinish(receiptMode)}
          disabled={!receiptMode}
          style={{
            marginTop: 14, width: '100%', padding: '12px 0',
            borderRadius: 12, border: 'none',
            background: receiptMode
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'rgba(255,255,255,0.04)',
            color: receiptMode ? '#fff' : '#475569',
            fontSize: 14, fontWeight: 700,
            cursor: receiptMode ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          }}
        >
          {receiptMode ? 'Terminer' : 'Sélectionnez une option'}
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────────── */
export default function PaymentPage({ tableId, onBack, onDone }: Props) {
  const table = usePOS(s => s.tables.find(t => t.id === tableId))
  const processPayment = usePOS(s => s.processPayment)

  const [splitMode, setSplitMode] = useState<SplitMode>('full')
  const [selectedCoverIds, setSelectedCoverIds] = useState<Set<string>>(new Set())
  const [method, setMethod] = useState<PayMethod>('card')
  const [mixedMode, setMixedMode] = useState(false)
  const [partials, setPartials] = useState<Partial[]>([])
  const [partialAmount, setPartialAmount] = useState('')
  const [partialMethod, setPartialMethod] = useState<PayMethod>('cash')

  const [tipPercent, setTipPercent] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [tipIsCustom, setTipIsCustom] = useState(false)
  const [tipMode, setTipMode] = useState<TipMode>('percent')
  const [splitTip, setSplitTip] = useState(false)
  const [connectedStaff] = useState(STAFF_LIST.slice(0, 3))

  const [equalParts, setEqualParts] = useState(2)
  const [done, setDone] = useState(false)
  const [cashInput, setCashInput] = useState('')

  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(null)
  const [promoError, setPromoError] = useState('')

  const [giftCode, setGiftCode] = useState('')
  const [appliedGift, setAppliedGift] = useState<{ code: string; balance: number } | null>(null)
  const [giftError, setGiftError] = useState('')

  const [usePoints, setUsePoints] = useState(false)

  // QR payment state
  const [showQr, setShowQr] = useState(false)
  const [qrStatus, setQrStatus] = useState<QrStatus>('waiting')

  // Round-up for charity
  const [roundUp, setRoundUp] = useState(false)

  // Member signup
  const [isMember, setIsMember] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberDiscount, setMemberDiscount] = useState(0)

  // Open tab
  const [keepOpen, setKeepOpen] = useState(false)

  // Receipt customization
  const [receiptLogo, setReceiptLogo] = useState(true)
  const [receiptMsg, setReceiptMsg] = useState('Merci de votre visite !')
  const [receiptPromo, setReceiptPromo] = useState(true)

  // Print/save preferences (last 3 modes)
  const [recentReceiptModes, setRecentReceiptModes] = useState<ReceiptMode[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_RECEIPT_PREFS)
      if (raw) {
        const arr = JSON.parse(raw) as ReceiptMode[]
        if (Array.isArray(arr)) setRecentReceiptModes(arr.slice(0, 3))
      }
    } catch { /* noop */ }
  }, [])

  // Demo loyalty state
  const hasClient = true
  const clientPoints = 142
  const pointsValue = Math.floor(clientPoints / 10)

  const qrCells = useQrPattern(tableId + Date.now().toString().slice(-4))

  // Simulate QR status progression when modal opens
  useEffect(() => {
    if (!showQr) return
    setQrStatus('waiting')
    const t1 = setTimeout(() => setQrStatus('scanned'), 2600)
    const t2 = setTimeout(() => setQrStatus('paid'), 5200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [showQr])

  if (!table) return null

  const covers = table.covers
  const grandTotal = tableTotal(table)

  const payingCovers = useMemo(() => {
    if (splitMode === 'full') return covers
    if (splitMode === 'by-cover') return covers.filter(c => selectedCoverIds.has(c.id))
    return covers
  }, [splitMode, covers, selectedCoverIds])

  const subtotal = payingCovers.reduce((s, c) => s + coverTotal(c), 0)

  const promoDiscount = appliedPromo ? subtotal * (appliedPromo.pct / 100) : 0
  const giftDiscount = appliedGift ? Math.min(appliedGift.balance, subtotal - promoDiscount) : 0
  const pointsDiscount = usePoints ? pointsValue : 0
  const memberReduction = memberDiscount > 0 ? subtotal * (memberDiscount / 100) : 0
  const totalDiscount = promoDiscount + giftDiscount + pointsDiscount + memberReduction
  const afterDiscount = Math.max(0, subtotal - totalDiscount)

  const tipAmount = useMemo(() => {
    if (tipIsCustom) {
      const v = parseFloat(customTip)
      if (isNaN(v)) return 0
      return tipMode === 'percent' ? afterDiscount * (v / 100) : v
    }
    return afterDiscount * (tipPercent / 100)
  }, [tipIsCustom, customTip, tipPercent, afterDiscount, tipMode])

  const perPersonAmount = splitMode === 'equal' ? (afterDiscount + tipAmount) / equalParts : 0

  // Round up to next 50€
  const baseTotal = afterDiscount + tipAmount
  const roundUpTarget = roundUp ? roundUp50(baseTotal) : baseTotal
  const charityAmount = roundUp ? roundUpTarget - baseTotal : 0
  const totalToPay = roundUpTarget

  const tipPerStaff = splitTip && connectedStaff.length > 0 ? tipAmount / connectedStaff.length : 0

  const paidSoFar = partials.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, totalToPay - paidSoFar)
  const paidPct = totalToPay > 0 ? Math.min(100, (paidSoFar / totalToPay) * 100) : 0

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

  function addPartial() {
    const v = parseFloat(partialAmount)
    if (isNaN(v) || v <= 0) return
    const capped = Math.min(v, remaining)
    setPartials(p => [...p, { id: uid(), method: partialMethod, amount: capped }])
    setPartialAmount('')
  }

  function removePartial(id: string) {
    setPartials(p => p.filter(x => x.id !== id))
  }

  function applyPromo() {
    const code = promoCode.trim().toUpperCase()
    if (!code) return
    const pct = DEMO_PROMOS[code]
    if (!pct) {
      setPromoError('Code invalide')
      setTimeout(() => setPromoError(''), 2000)
      return
    }
    setAppliedPromo({ code, pct })
    setPromoCode('')
  }

  function applyGift() {
    const code = giftCode.trim().toUpperCase()
    if (!code) return
    const bal = DEMO_GIFTS[code]
    if (!bal) {
      setGiftError('Carte introuvable')
      setTimeout(() => setGiftError(''), 2000)
      return
    }
    setAppliedGift({ code, balance: bal })
    setGiftCode('')
  }

  function completeMemberSignup() {
    if (!memberName.trim() || !memberEmail.trim()) return
    setIsMember(true)
    setMemberDiscount(10)
    setShowMemberForm(false)
  }

  function handleConfirm() {
    const ids = splitMode === 'by-cover' ? [...selectedCoverIds] : undefined
    processPayment(tableId, method, tipAmount, ids)
    setDone(true)
  }

  function handleFinish(mode: ReceiptMode) {
    // Persist last 3 choices
    const next = [mode, ...recentReceiptModes.filter(m => m !== mode)].slice(0, 3)
    setRecentReceiptModes(next)
    try { localStorage.setItem(LS_RECEIPT_PREFS, JSON.stringify(next)) } catch { /* noop */ }
    onDone()
  }

  const canPay = splitMode !== 'by-cover' || selectedCoverIds.size > 0
  const mixedFullyPaid = mixedMode && paidSoFar >= totalToPay - 0.01

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#07070d' }}>

      <AnimatePresence>
        {done && (
          <SuccessOverlay
            amount={totalToPay}
            change={cashChange}
            method={method}
            onFinish={handleFinish}
            defaultMode={recentReceiptModes[0] ?? null}
          />
        )}

        {showQr && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowQr(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 900,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 360, padding: 28, borderRadius: 22,
                background: 'linear-gradient(180deg, #0a0a14, #131322)',
                border: '1px solid rgba(99,102,241,0.3)',
                boxShadow: '0 30px 80px rgba(99,102,241,0.3)',
                textAlign: 'center' as const,
              }}
            >
              <div style={{
                fontSize: 11, color: '#818cf8', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase' as const, marginBottom: 6,
              }}>Paiement QR Code</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 18 }}>
                {fmt(totalToPay)}
              </div>

              <div style={{
                padding: 14, borderRadius: 16, background: '#07070d',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'inline-block', marginBottom: 16, position: 'relative' as const,
              }}>
                <QrSvg cells={qrCells} size={180} />
                {qrStatus === 'paid' && (
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    style={{
                      position: 'absolute' as const, inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(16,185,129,0.88)', borderRadius: 16,
                    }}
                  >
                    <span style={{ fontSize: 60, color: '#fff' }}>✓</span>
                  </motion.div>
                )}
              </div>

              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
                Scannez pour payer avec votre téléphone
              </div>

              <div style={{
                padding: '10px 14px', borderRadius: 12, marginBottom: 16,
                background: qrStatus === 'paid'
                  ? 'rgba(16,185,129,0.12)'
                  : qrStatus === 'scanned' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
                border: `1px solid ${qrStatus === 'paid' ? 'rgba(16,185,129,0.3)' : qrStatus === 'scanned' ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                {qrStatus !== 'paid' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.15)',
                      borderTopColor: qrStatus === 'scanned' ? '#f59e0b' : '#818cf8',
                    }}
                  />
                )}
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: qrStatus === 'paid' ? '#10b981' : qrStatus === 'scanned' ? '#f59e0b' : '#a5b4fc',
                }}>
                  {qrStatus === 'paid' ? 'Paiement reçu ✓' : qrStatus === 'scanned' ? 'QR scanné — en attente…' : 'En attente…'}
                </span>
              </div>

              {qrStatus === 'paid' ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setShowQr(false); handleConfirm() }}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Terminer</motion.button>
              ) : (
                <button
                  onClick={() => setShowQr(false)}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 12,
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Annuler</button>
              )}
            </motion.div>
          </motion.div>
        )}

        {showMemberForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowMemberForm(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 800,
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 360, padding: 24, borderRadius: 20,
                background: '#0a0a14',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                Inscription membre
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>
                10% de remise immédiate + points fidélité
              </div>

              <input
                autoFocus placeholder="Prénom Nom" value={memberName}
                onChange={e => setMemberName(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
                  fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 10,
                  boxSizing: 'border-box' as const,
                }}
              />
              <input
                placeholder="email@exemple.com" value={memberEmail} type="email"
                onChange={e => setMemberEmail(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
                  fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 14,
                  boxSizing: 'border-box' as const,
                }}
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowMemberForm(false)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Annuler</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={completeMemberSignup}
                  disabled={!memberName.trim() || !memberEmail.trim()}
                  style={{
                    flex: 1.4, padding: '10px 0', borderRadius: 10, border: 'none',
                    background: memberName.trim() && memberEmail.trim()
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'rgba(255,255,255,0.06)',
                    color: memberName.trim() && memberEmail.trim() ? '#fff' : '#475569',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Inscrire + 10%</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: '40%', flexShrink: 0,
        display: 'flex', flexDirection: 'column' as const,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: '#0a0a14', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={labelStyle}>Mode de partage</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {([
              { id: 'full',     label: 'Table entière' },
              { id: 'by-cover', label: 'Par couvert' },
              { id: 'equal',    label: 'Parts égales' },
            ] as const).map(m => (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSplitMode(m.id)}
                style={pillStyle(splitMode === m.id)}
              >
                {m.label}
              </motion.button>
            ))}
          </div>
        </div>

        {splitMode === 'by-cover' && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
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

        {splitMode === 'equal' && (
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Nombre de personnes</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEqualParts(p => Math.max(2, p - 1))} style={counterBtnStyle}>−</motion.button>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', minWidth: 28, textAlign: 'center' as const }}>{equalParts}</span>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEqualParts(p => Math.min(20, p + 1))} style={counterBtnStyle}>+</motion.button>
              <div style={{
                marginLeft: 'auto', padding: '4px 14px', borderRadius: 20,
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <span style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 700 }}>{fmt(perPersonAmount)} / pers.</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' as const, padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={labelStyle}>Aperçu reçu temps réel</div>
          </div>
          <Receipt
            covers={payingCovers}
            tip={tipAmount}
            discount={totalDiscount}
            customMsg={receiptMsg}
            includeLogo={receiptLogo}
            includePromo={receiptPromo}
            promoNext="REVENEZ10 · −10% prochaine visite"
          />

          {/* Receipt customization */}
          <div style={{ marginTop: 14, ...sectionCard }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 10 }}>
              Personnalisation du reçu
            </div>
            <label style={checkRow}>
              <input
                type="checkbox" checked={receiptLogo}
                onChange={e => setReceiptLogo(e.target.checked)}
                style={{ accentColor: '#6366f1', width: 15, height: 15 }}
              />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Inclure logo Creorga</span>
            </label>
            <label style={checkRow}>
              <input
                type="checkbox" checked={receiptPromo}
                onChange={e => setReceiptPromo(e.target.checked)}
                style={{ accentColor: '#6366f1', width: 15, height: 15 }}
              />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Code promo prochaine visite</span>
            </label>
            <input
              placeholder="Message personnalisé"
              value={receiptMsg}
              onChange={e => setReceiptMsg(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
                fontSize: 12, outline: 'none', fontFamily: 'inherit', marginTop: 8,
                boxSizing: 'border-box' as const,
              }}
            />
          </div>

          {recentReceiptModes.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>
                🔖 RÉCENTS
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {recentReceiptModes.map((m, i) => (
                  <span key={i} style={{
                    fontSize: 10, padding: '3px 9px', borderRadius: 12,
                    background: 'rgba(99,102,241,0.08)',
                    color: '#818cf8', fontWeight: 600,
                  }}>
                    {m === 'paper' ? 'Papier' : m === 'email' ? 'Email' : m === 'sms' ? 'SMS' : m === 'qr' ? 'QR' : 'Aucun'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {splitMode === 'by-cover' && grandTotal > subtotal && subtotal > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.12)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#fb7185' }}>Reste à payer</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fb7185' }}>{fmt(grandTotal - subtotal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: '22px 28px' }}>

          {/* Total card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 22, padding: '22px 26px', marginBottom: 16,
            textAlign: 'center' as const, boxShadow: '0 4px 40px rgba(99,102,241,0.12)',
          }}>
            <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6 }}>
              Total à encaisser
            </div>
            <div style={{ fontSize: 46, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {fmt(totalToPay)}
            </div>
            {roundUp && charityAmount > 0 && (
              <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>
                dont <strong>+{fmt(charityAmount)}</strong> pour la Croix-Rouge 🤝
              </div>
            )}
            {splitMode === 'equal' && (
              <div style={{ fontSize: 14, color: '#818cf8', marginTop: 8 }}>
                {equalParts} × {fmt(perPersonAmount)}
              </div>
            )}
            {mixedMode && (
              <div style={{ marginTop: 14 }}>
                <div style={{
                  height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden', marginBottom: 6,
                }}>
                  <motion.div
                    animate={{ width: `${paidPct}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    style={{
                      height: '100%',
                      background: paidPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #a5b4fc)',
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Payé {fmt(paidSoFar)} · Reste <strong style={{ color: remaining > 0 ? '#fb7185' : '#10b981' }}>{fmt(remaining)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Member signup suggestion */}
          {!hasClient || (!isMember && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                ...sectionCard,
                background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(139,92,246,0.06))',
                border: '1px solid rgba(236,72,153,0.2)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>⭐</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#e2e8f0' }}>
                    Ce client n'est pas membre
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    Inscription en 10s → <strong style={{ color: '#f472b6' }}>10% de remise immédiate</strong>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMemberForm(true)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    whiteSpace: 'nowrap' as const,
                  }}
                >Inscrire</motion.button>
              </div>
            </motion.div>
          ))}

          {isMember && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                ...sectionCard,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>✓</span>
                <span style={{ fontSize: 12.5, color: '#6ee7b7', fontWeight: 700 }}>
                  {memberName} inscrit·e · −10% appliqué
                </span>
              </div>
            </motion.div>
          )}

          {/* Loyalty card */}
          {hasClient && (
            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>⭐</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Fidélité client</span>
                <span style={{ fontSize: 10, color: '#a5b4fc', marginLeft: 'auto' }}>{clientPoints} pts</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={usePoints}
                  onChange={e => setUsePoints(e.target.checked)}
                  style={{ accentColor: '#6366f1', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Utiliser {clientPoints} points pour réduction de <strong style={{ color: '#a5b4fc' }}>{fmt(pointsValue)}</strong>
                </span>
              </label>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={sectionCard}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>🏷 Code promo</div>
              {appliedPromo ? (
                <div style={appliedChip('#6366f1')}>
                  <span>{appliedPromo.code} · −{appliedPromo.pct}%</span>
                  <button onClick={() => setAppliedPromo(null)} style={chipRemove}>×</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                    placeholder="CODE"
                    style={inputStyle}
                  />
                  <motion.button whileTap={{ scale: 0.95 }} onClick={applyPromo} style={smallBtn}>OK</motion.button>
                </div>
              )}
              {promoError && <div style={{ fontSize: 10, color: '#f43f5e', marginTop: 4 }}>{promoError}</div>}
            </div>

            <div style={sectionCard}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>🎁 Carte cadeau</div>
              {appliedGift ? (
                <div style={appliedChip('#10b981')}>
                  <span>{appliedGift.code} · {fmt(appliedGift.balance)}</span>
                  <button onClick={() => setAppliedGift(null)} style={chipRemove}>×</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={giftCode}
                    onChange={e => setGiftCode(e.target.value)}
                    placeholder="GC-XXXX"
                    style={inputStyle}
                  />
                  <motion.button whileTap={{ scale: 0.95 }} onClick={applyGift} style={smallBtn}>OK</motion.button>
                </div>
              )}
              {giftError && <div style={{ fontSize: 10, color: '#f43f5e', marginTop: 4 }}>{giftError}</div>}
            </div>
          </div>

          {/* Round up for charity */}
          {baseTotal > 0 && roundUp50(baseTotal) > baseTotal && (
            <label style={{
              ...sectionCard,
              cursor: 'pointer' as const,
              background: roundUp ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
              border: roundUp ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <input
                type="checkbox" checked={roundUp}
                onChange={e => setRoundUp(e.target.checked)}
                style={{ accentColor: '#ef4444', width: 16, height: 16 }}
              />
              <span style={{ fontSize: 20 }}>➕</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#e2e8f0' }}>
                  Arrondir à {roundUp50(baseTotal)}€ pour Croix-Rouge Luxembourg
                </div>
                <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 2 }}>
                  +{fmt(roundUp50(baseTotal) - baseTotal)} pour solidarité 🤝
                </div>
              </div>
            </label>
          )}

          {/* Tipping insights banner */}
          {!tipIsCustom && tipPercent === 0 && afterDiscount > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                padding: '10px 14px', borderRadius: 12, marginBottom: 16,
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,197,94,0.05))',
                border: '1px dashed rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
              <span style={{ fontSize: 18 }}>💚</span>
              <span style={{ fontSize: 12, color: '#6ee7b7' }}>
                D'autres clients laissent en moyenne <strong>15%</strong> de pourboire
              </span>
            </motion.div>
          )}

          {/* Payment method / mixed toggle */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={labelStyle}>Mode de règlement</div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setMixedMode(!mixedMode); setPartials([]) }}
                style={{ ...pillStyle(mixedMode), fontSize: 11 }}
              >
                {mixedMode ? '✓ Paiement mixte' : '+ Paiement mixte'}
              </motion.button>
            </div>

            {!mixedMode && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                  {PAY_METHODS.map(m => {
                    const isActive = method === m.id
                    return (
                      <motion.button
                        key={m.id} whileTap={{ scale: 0.95 }} onClick={() => setMethod(m.id)}
                        style={{
                          display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
                          padding: '18px 12px', borderRadius: 16, cursor: 'pointer',
                          border: isActive ? '1.5px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.06)',
                          background: isActive ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                          color: isActive ? '#a5b4fc' : '#64748b',
                          boxShadow: isActive ? '0 0 24px rgba(99,102,241,0.2)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 28 }}>{m.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Digital wallets row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowQr(true)}
                    style={walletBtn('linear-gradient(135deg, #6366f1, #4f46e5)')}
                  >
                    <span style={{ fontSize: 14 }}>🔳</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>QR Code</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    style={walletBtn('#000')}
                  >
                    <span style={{ fontSize: 14 }}>&#63743;</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>Apple Pay</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    style={walletBtn('#1a73e8')}
                  >
                    <span style={{ fontSize: 14 }}>G</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>Google Pay</span>
                  </motion.button>
                </div>
              </>
            )}

            {mixedMode && (
              <div style={{
                padding: '14px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {partials.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 12 }}>
                    {partials.map(p => {
                      const pm = PAY_METHODS.find(x => x.id === p.method)!
                      return (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 10,
                          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                        }}>
                          <span style={{ fontSize: 16 }}>{pm.icon}</span>
                          <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{pm.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>{fmt(p.amount)}</span>
                          <button onClick={() => removePartial(p.id)} style={chipRemove}>×</button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {!mixedFullyPaid && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      value={partialMethod}
                      onChange={e => setPartialMethod(e.target.value as PayMethod)}
                      style={{
                        padding: '10px 8px', borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit',
                      }}
                    >
                      {PAY_METHODS.map(m => <option key={m.id} value={m.id} style={{ background: '#0a0a14' }}>{m.icon} {m.label}</option>)}
                    </select>
                    <input
                      type="number" placeholder={remaining.toFixed(2)}
                      value={partialAmount} onChange={e => setPartialAmount(e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <motion.button whileTap={{ scale: 0.95 }} onClick={addPartial} style={smallBtn}>+ Ajouter</motion.button>
                  </div>
                )}
                {mixedFullyPaid && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    color: '#10b981', fontSize: 12, fontWeight: 700, textAlign: 'center' as const,
                  }}>
                    ✓ Montant total couvert
                  </div>
                )}
              </div>
            )}
          </div>

          {!mixedMode && method === 'cash' && (
            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>Montant reçu</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <input
                  type="number" placeholder="0.00" value={cashInput}
                  onChange={e => setCashInput(e.target.value)}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#e2e8f0', fontSize: 18, fontWeight: 700, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: 18, color: '#64748b', fontWeight: 600 }}>€</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                {QUICK_CASH.map(v => (
                  <motion.button key={v} whileTap={{ scale: 0.93 }} onClick={() => setCashInput(String(v))} style={quickCashBtn}>
                    {v} €
                  </motion.button>
                ))}
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => setCashInput(Math.ceil(totalToPay).toFixed(0))} style={{
                  ...quickCashBtn, border: '1px solid rgba(16,185,129,0.3)',
                  background: 'rgba(16,185,129,0.08)', color: '#10b981',
                }}>
                  Arrondi
                </motion.button>
              </div>
              {cashChange !== null && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '12px 16px', borderRadius: 12,
                    background: cashChange >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                    border: `1px solid ${cashChange >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
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

          {/* Tip section */}
          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle}>Pourboire</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
              <motion.button whileTap={{ scale: 0.93 }} onClick={() => { setTipIsCustom(false); setTipPercent(0) }} style={tipBtnStyle(!tipIsCustom && tipPercent === 0)}>
                Aucun
              </motion.button>
              {TIP_PRESETS.map(p => {
                const isActive = !tipIsCustom && tipPercent === p
                return (
                  <motion.button key={p} whileTap={{ scale: 0.93 }} onClick={() => { setTipIsCustom(false); setTipPercent(p) }} style={tipBtnStyle(isActive)}>
                    {p}%
                    {isActive && afterDiscount > 0 && <span style={{ opacity: 0.7, marginLeft: 4 }}>· {fmt(afterDiscount * p / 100)}</span>}
                  </motion.button>
                )
              })}
              <motion.button whileTap={{ scale: 0.93 }} onClick={() => setTipIsCustom(true)} style={tipBtnStyle(tipIsCustom)}>
                Personnalisé
              </motion.button>
            </div>

            {tipIsCustom && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input
                  autoFocus type="number" placeholder="0.00" value={customTip}
                  onChange={e => setCustomTip(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    border: '1px solid rgba(16,185,129,0.3)',
                    background: 'rgba(16,185,129,0.06)',
                    color: '#e2e8f0', fontSize: 15, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                  {(['percent', 'euro'] as const).map(t => (
                    <button key={t} onClick={() => setTipMode(t)} style={{
                      padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: tipMode === t ? 'rgba(16,185,129,0.2)' : 'transparent',
                      color: tipMode === t ? '#34d399' : '#64748b', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                    }}>
                      {t === 'percent' ? '%' : '€'}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {tipAmount > 0 && connectedStaff.length > 1 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 0' }}>
                <input
                  type="checkbox" checked={splitTip}
                  onChange={e => setSplitTip(e.target.checked)}
                  style={{ accentColor: '#10b981', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Partager le pourboire entre {connectedStaff.length} membres
                  {splitTip && <strong style={{ color: '#34d399', marginLeft: 6 }}>({fmt(tipPerStaff)} chacun)</strong>}
                </span>
              </label>
            )}

            {splitTip && tipAmount > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 6 }}>
                {connectedStaff.map(s => (
                  <div key={s} style={{
                    padding: '4px 10px', borderRadius: 20,
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    fontSize: 11, color: '#34d399',
                  }}>
                    {s} · {fmt(tipPerStaff)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Keep tab open */}
          <label style={{
            ...sectionCard,
            cursor: 'pointer' as const,
            background: keepOpen ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
            border: keepOpen ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <input
              type="checkbox" checked={keepOpen}
              onChange={e => setKeepOpen(e.target.checked)}
              style={{ accentColor: '#f59e0b', width: 16, height: 16 }}
            />
            <span style={{ fontSize: 18 }}>🍷</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#e2e8f0' }}>
                Garder ouvert pour +1 consommation
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                La table reste ouverte, règlement final après le dernier verre
              </div>
            </div>
          </label>
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {!canPay ? (
            <div style={{ textAlign: 'center' as const, color: '#374151', fontSize: 13, padding: '14px 0' }}>
              Sélectionnez au moins un couvert
            </div>
          ) : mixedMode && !mixedFullyPaid ? (
            <div style={{
              textAlign: 'center' as const, color: '#fb7185', fontSize: 13, padding: '14px 0',
              background: 'rgba(244,63,94,0.05)', borderRadius: 12, border: '1px solid rgba(244,63,94,0.1)',
            }}>
              Il reste {fmt(remaining)} à régler
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ boxShadow: '0 6px 36px rgba(16,185,129,0.45)' }}
              onClick={handleConfirm}
              style={{
                display: 'block', width: '100%', padding: '16px 0',
                borderRadius: 16, border: 'none',
                background: keepOpen
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                boxShadow: keepOpen
                  ? '0 4px 28px rgba(245,158,11,0.35)'
                  : '0 4px 28px rgba(16,185,129,0.35)',
                letterSpacing: '-0.01em', fontFamily: 'inherit',
              }}
            >
              {keepOpen ? `🍷 Garder ouvert · ${fmt(totalToPay)}` : `✓ Encaisser ${fmt(totalToPay)}`}
            </motion.button>
          )}
          <button
            onClick={onBack}
            style={{
              marginTop: 8, width: '100%', padding: '10px 0',
              background: 'transparent', border: 'none',
              color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← Retour à la commande
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Shared inline styles ────────────────────────────────────────────────────── */
const labelStyle: React.CSSProperties = {
  fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 10,
  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
}

const sectionCard: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 14, marginBottom: 12,
  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
}

const checkRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '4px 0', cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '8px 12px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit',
}

const smallBtn: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)',
  background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}

const quickCashBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
  color: '#94a3b8', fontWeight: 600, transition: 'all .15s', fontFamily: 'inherit',
}

const counterBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e2e8f0', fontSize: 20, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
}

const chipRemove: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 6,
  border: 'none', background: 'rgba(255,255,255,0.06)',
  color: '#94a3b8', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all .15s',
    border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#a5b4fc' : '#64748b', fontFamily: 'inherit',
  }
}

function tipBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all .15s',
    border: active ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#34d399' : '#64748b', fontFamily: 'inherit',
  }
}

function appliedChip(color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', borderRadius: 10,
    background: `${color}15`, border: `1px solid ${color}30`,
    color, fontSize: 12, fontWeight: 700,
  }
}

function walletBtn(bg: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 8px', borderRadius: 12, border: 'none',
    background: bg, color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
  }
}
