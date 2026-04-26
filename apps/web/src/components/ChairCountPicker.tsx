import { useState } from 'react'
import type { FloorTable } from '@/hooks/useFloorState'

/**
 * Popover that appears when clicking a table in Config Mode.
 * Asks "How many chairs?" with presets 0 · 2 · 4 · 6 · 8 · Custom.
 * Clicking a preset auto-creates that many chairs around the table.
 * The patron can then add/remove individual chairs manually.
 */
interface Props {
  table: FloorTable
  currentChairCount: number
  onSelect: (count: number) => Promise<void> | void
  onClose: () => void
  onAddOne: () => void
  onRemoveOne: () => void
}

const PRESETS = [
  { n: 0, label: 'Aucune',      emoji: '🚫' },
  { n: 2, label: '2 chaises',   emoji: '🪑🪑' },
  { n: 4, label: '4 chaises',   emoji: '🪑×4' },
  { n: 6, label: '6 chaises',   emoji: '🪑×6' },
  { n: 8, label: '8 chaises',   emoji: '🪑×8' },
]

export default function ChairCountPicker({ table, currentChairCount, onSelect, onClose, onAddOne, onRemoveOne }: Props) {
  const [custom, setCustom] = useState(currentChairCount || table.seats || 4)
  const [busy, setBusy] = useState<number | null>(null)

  const handlePreset = async (n: number) => {
    setBusy(n)
    try {
      await onSelect(n)
      onClose()
    } finally { setBusy(null) }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={card}>
        <header style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
            Configuration des chaises
          </div>
          <h2 style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 800 }}>
            🍽 {table.name}
          </h2>
          <div style={{ fontSize: 13, color: '#475569' }}>
            {table.seats} places · forme {table.shape} · {currentChairCount} chaise(s) actuelles
          </div>
        </header>

        {/* Presets */}
        <div style={{ marginBottom: 14 }}>
          <div style={label}>Configuration rapide</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {PRESETS.map((p) => (
              <button key={p.n} onClick={() => handlePreset(p.n)} disabled={busy !== null}
                style={{
                  padding: '12px 6px', borderRadius: 10, border: '1px solid #e2e8f0',
                  background: currentChairCount === p.n ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff',
                  color: currentChairCount === p.n ? '#fff' : '#1e293b',
                  cursor: busy ? 'wait' : 'pointer', transition: 'all .15s',
                  opacity: busy !== null && busy !== p.n ? 0.4 : 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                <span style={{ fontSize: 16 }}>{p.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom */}
        <div style={{ marginBottom: 14 }}>
          <div style={label}>Nombre personnalisé</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setCustom(Math.max(0, custom - 1))}
              style={miniBtn}>−</button>
            <input type="number" min={0} max={20} value={custom}
              onChange={(e) => setCustom(Math.max(0, Math.min(20, +e.target.value || 0)))}
              style={{ width: 80, textAlign: 'center', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, fontWeight: 700 }} />
            <button onClick={() => setCustom(custom + 1)}
              style={miniBtn}>+</button>
            <button
              onClick={() => handlePreset(custom)}
              disabled={busy !== null}
              style={{
                flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13,
              }}>
              Placer {custom} chaise(s)
            </button>
          </div>
        </div>

        {/* Manual add/remove */}
        <div style={{
          padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
        }}>
          <div style={label}>Ajout / suppression manuelle</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onAddOne} style={{ ...miniBtn, flex: 1, padding: 12, fontSize: 13 }}>
              ➕ Ajouter une chaise
            </button>
            <button onClick={onRemoveOne} disabled={currentChairCount === 0}
              style={{ ...miniBtn, flex: 1, padding: 12, fontSize: 13, opacity: currentChairCount === 0 ? 0.4 : 1 }}>
              ➖ Retirer la dernière
            </button>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
            💡 Vous pouvez aussi cliquer directement sur les dots de chaises dans le plan pour ajouter/libérer.
          </p>
        </div>

        <button onClick={onClose} style={{
          width: '100%', marginTop: 14, padding: 10, borderRadius: 8,
          border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>Fermer</button>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(4px)', padding: 20,
}
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 520,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
}
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: '#475569',
  letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
}
const miniBtn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
  background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 15,
}
