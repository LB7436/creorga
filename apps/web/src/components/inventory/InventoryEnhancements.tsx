import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ScanBarcode, AlertTriangle, Trash2, Calendar, X, Plus, Camera, Save,
} from 'lucide-react'

/**
 * v3.18.6 — Inventory Enhancements (3 features)
 *
 * 1. BarcodeScanner   : utilise getUserMedia + BarcodeDetector API (natif Chrome)
 * 2. DluoAlertsBanner : produits qui périment sous N jours, banner warning
 * 3. WasteTrackingPanel : enregistre les pertes (raison, qté, valeur €) → impact COGS
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. BARCODE SCANNER BUTTON
// ═══════════════════════════════════════════════════════════════════════
export function BarcodeScannerButton({ onScan }: { onScan: (code: string) => void }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startScan = async () => {
    setError(null)
    if (!('BarcodeDetector' in window)) {
      // Fallback : input file pour photo + manual code entry
      const code = prompt('Tape le code-barres (BarcodeDetector pas dispo dans ce navigateur) :')
      if (code) onScan(code.trim())
      return
    }
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const Detector = (window as any).BarcodeDetector
      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'upc_a'] })
      const tick = async () => {
        try {
          const codes = await detector.detect(video)
          if (codes.length > 0) {
            stream.getTracks().forEach((t) => t.stop())
            setScanning(false)
            onScan(codes[0].rawValue)
            return
          }
        } catch { /* keep going */ }
        if (scanning) requestAnimationFrame(tick)
      }
      tick()
    } catch (e: any) {
      setError(e?.message || 'Caméra refusée')
      setScanning(false)
    }
  }

  return (
    <>
      <button onClick={startScan} disabled={scanning} style={{
        padding: '10px 14px', borderRadius: 10, border: '1px solid #c7d2fe', cursor: 'pointer',
        background: scanning ? '#eef2ff' : '#fff', color: '#4338ca', fontSize: 12, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <ScanBarcode size={14} /> {scanning ? 'Scan en cours…' : 'Scanner code-barres'}
      </button>
      {error && <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626' }}>⚠️ {error}</div>}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 2. DLUO ALERTS BANNER
// ═══════════════════════════════════════════════════════════════════════
export interface StockItem {
  id: string
  name: string
  qty: number
  unit?: string
  dluo?: string  // YYYY-MM-DD
  unitPrice?: number
}

export function DluoAlertsBanner({ stock, daysWindow = 7 }: { stock: StockItem[]; daysWindow?: number }) {
  const expiring = useMemo(() => {
    const now = Date.now()
    const limit = now + daysWindow * 86_400_000
    return stock
      .filter((s) => s.dluo && new Date(s.dluo).getTime() < limit && new Date(s.dluo).getTime() > now)
      .sort((a, b) => new Date(a.dluo!).getTime() - new Date(b.dluo!).getTime())
  }, [stock, daysWindow])

  const expired = useMemo(() => {
    const now = Date.now()
    return stock.filter((s) => s.dluo && new Date(s.dluo).getTime() <= now)
  }, [stock])

  if (expiring.length === 0 && expired.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
      {expired.length > 0 && (
        <div style={{
          padding: 12, borderRadius: 10,
          background: 'linear-gradient(135deg, #fee2e2, #fecaca)', border: '2px solid #ef4444',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#7f1d1d', marginBottom: 6 }}>
            <AlertTriangle size={16} color="#dc2626" /> {expired.length} produit{expired.length > 1 ? 's' : ''} PÉRIMÉ{expired.length > 1 ? 'S' : ''} — à jeter immédiatement
          </div>
          <div style={{ fontSize: 11, color: '#991b1b' }}>
            {expired.slice(0, 5).map((s) => `${s.name} (DLUO ${s.dluo})`).join(' · ')}
            {expired.length > 5 && ` · +${expired.length - 5} autres`}
          </div>
        </div>
      )}
      {expiring.length > 0 && (
        <div style={{
          padding: 12, borderRadius: 10,
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #f59e0b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#78350f', marginBottom: 6 }}>
            <Calendar size={16} color="#d97706" /> {expiring.length} produit{expiring.length > 1 ? 's' : ''} périme{expiring.length > 1 ? 'nt' : ''} sous {daysWindow}j
          </div>
          <div style={{ fontSize: 11, color: '#92400e' }}>
            {expiring.slice(0, 5).map((s) => `${s.name} (${s.dluo})`).join(' · ')}
            {expiring.length > 5 && ` · +${expiring.length - 5} autres`}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 3. WASTE TRACKING PANEL
// ═══════════════════════════════════════════════════════════════════════
export interface WasteEntry {
  id: string
  itemName: string
  qty: number
  unit?: string
  unitPrice?: number
  reason: 'expired' | 'damaged' | 'overcooked' | 'returned' | 'other'
  note?: string
  date: string  // ISO
}

const REASONS: Array<{ key: WasteEntry['reason']; label: string; emoji: string }> = [
  { key: 'expired',    label: 'Périmé',    emoji: '⏰' },
  { key: 'damaged',    label: 'Abîmé',     emoji: '💥' },
  { key: 'overcooked', label: 'Raté cuisine', emoji: '🔥' },
  { key: 'returned',   label: 'Retour client', emoji: '↩' },
  { key: 'other',      label: 'Autre',     emoji: '❓' },
]

export function WasteTrackingPanel({ stock, onRecord }: {
  stock: StockItem[]
  onRecord: (entry: WasteEntry) => void
}) {
  const [itemId, setItemId] = useState(stock[0]?.id || '')
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState<WasteEntry['reason']>('expired')
  const [note, setNote] = useState('')

  const item = stock.find((s) => s.id === itemId)
  const lossValue = item ? (item.unitPrice || 0) * qty : 0

  const submit = () => {
    if (!item) return
    const entry: WasteEntry = {
      id: 'w-' + Math.random().toString(36).slice(2, 10),
      itemName: item.name, qty, unit: item.unit, unitPrice: item.unitPrice,
      reason, note: note.trim() || undefined,
      date: new Date().toISOString(),
    }
    onRecord(entry)
    setQty(1); setNote(''); setReason('expired')
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Trash2 size={16} color="#dc2626" />
        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>Enregistrer une perte</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>Impact COGS</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} style={inp}>
          {stock.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="number" min="0.1" step="0.1" value={qty} onChange={(e) => setQty(parseFloat(e.target.value) || 0)} style={inp} placeholder="Qté" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {REASONS.map((r) => (
          <button key={r.key} onClick={() => setReason(r.key)} style={{
            padding: '8px 12px', borderRadius: 999, cursor: 'pointer', border: 'none', fontSize: 11, fontWeight: 700,
            background: reason === r.key ? '#dc2626' : '#f1f5f9',
            color: reason === r.key ? '#fff' : '#475569',
          }}>{r.emoji} {r.label}</button>
        ))}
      </div>

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optionnel)"
        style={{ ...inp, marginBottom: 8 }} />

      <div style={{
        padding: '10px 12px', borderRadius: 10, marginBottom: 8,
        background: '#fef2f2', border: '1px solid #fecaca',
        display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#991b1b',
      }}>
        <span>Valeur perdue</span>
        <span>{lossValue.toFixed(2)} €</span>
      </div>

      <button onClick={submit} disabled={!item || qty <= 0} style={{
        width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: '#fff', fontWeight: 800, fontSize: 13,
        opacity: !item || qty <= 0 ? 0.4 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Save size={14} /> Enregistrer la perte
      </button>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }
