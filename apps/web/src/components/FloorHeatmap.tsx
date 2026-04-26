import type { FloorState, FloorTable } from '@/hooks/useFloorState'

/**
 * Compute heat values per table for a given metric.
 * Returns a map tableId → { value, normalized 0..1, color, label }
 */
export type HeatMode = 'off' | 'rotation' | 'duration' | 'avg_basket' | 'reservation' | 'alerts'

export interface HeatValue {
  value: number
  raw: number
  color: string
  label: string
  badge?: string
}

const HOT_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#eab308', '#f97316', '#ef4444']

function gradientColor(t: number): string {
  const idx = Math.min(HOT_COLORS.length - 1, Math.max(0, Math.floor(t * (HOT_COLORS.length - 1))))
  return HOT_COLORS[idx]
}

function tableSignature(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

export function computeHeat(
  state: FloorState | null,
  mode: HeatMode,
): Map<string, HeatValue> {
  const out = new Map<string, HeatValue>()
  if (!state || mode === 'off') return out

  const tables = state.tables

  for (const t of tables) {
    const sig = tableSignature(t.id)
    const tableChairs = state.chairs.filter((c) => c.tableId === t.id)
    const tableTotal = t.items.reduce((s, i) => s + i.price * i.qty, 0) +
      tableChairs.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.price * i.qty, 0), 0)
    const itemsCount = t.items.reduce((s, i) => s + i.qty, 0) +
      tableChairs.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.qty, 0), 0)
    const occupiedMins = t.openedAt ? (Date.now() - t.openedAt) / 60000 : 0

    let raw = 0
    let label = ''
    let badge: string | undefined

    switch (mode) {
      case 'rotation': {
        // Synthetic: combine real items + signature for demo distribution
        raw = itemsCount * 3 + (sig % 12)
        label = `${raw} couverts`
        if (raw > 25) badge = '🔥'
        break
      }
      case 'duration': {
        raw = Math.round(occupiedMins) || (sig % 90)
        label = `${raw} min`
        if (raw > 90) badge = '⚠'
        break
      }
      case 'avg_basket': {
        const seats = Math.max(1, t.seats)
        raw = Math.round((tableTotal || (sig % 60) + 15) / seats)
        label = `${raw} €/cv`
        if (raw > 40) badge = '⭐'
        break
      }
      case 'reservation': {
        // Synthetic: every Nth table is reserved tonight
        const reserved = (sig % 4) === 0
        raw = reserved ? 1 : 0
        label = reserved ? `Réservée ${19 + (sig % 3)}h` : 'Libre'
        if (reserved) badge = '📅'
        break
      }
      case 'alerts': {
        const longTable = occupiedMins > 90
        const noServiceFor = (sig % 7) * 3 // synthetic
        raw = (longTable ? 1 : 0) + (noServiceFor > 12 ? 1 : 0)
        label = raw > 0 ? `${raw} alerte(s)` : 'OK'
        if (longTable) badge = '⏱'
        break
      }
    }

    // Normalize per mode for color
    const normalized = mode === 'reservation' || mode === 'alerts'
      ? (raw > 0 ? 0.85 : 0)
      : Math.min(1, raw / (mode === 'duration' ? 120 : mode === 'avg_basket' ? 60 : 35))

    out.set(t.id, {
      value: normalized,
      raw,
      color: gradientColor(normalized),
      label,
      badge,
    })
  }

  return out
}

export const HEAT_MODES: { id: HeatMode; emoji: string; label: string; desc: string }[] = [
  { id: 'off',         emoji: '⚪', label: 'Off',           desc: 'Désactiver heatmap' },
  { id: 'rotation',    emoji: '🔥', label: 'Rotation',      desc: 'Couverts servis aujourd\'hui' },
  { id: 'duration',    emoji: '⏱',  label: 'Durée moyenne', desc: 'Temps moyen d\'occupation' },
  { id: 'avg_basket',  emoji: '💰', label: 'Panier moyen',  desc: 'CA moyen par couvert' },
  { id: 'reservation', emoji: '📅', label: 'Réservations',  desc: 'Tables réservées ce soir' },
  { id: 'alerts',      emoji: '⚠',  label: 'Alertes',       desc: 'Tables longues, retards' },
]

interface HeatmapPickerProps {
  mode: HeatMode
  onChange: (m: HeatMode) => void
  theme: any
}

export function HeatmapPicker({ mode, onChange, theme }: HeatmapPickerProps) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4,
      background: 'rgba(255,255,255,0.05)', borderRadius: 999,
      border: '1px solid rgba(148,163,184,0.15)',
    }}>
      {HEAT_MODES.map((m) => {
        const active = mode === m.id
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            title={m.desc}
            style={{
              padding: '6px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: active ? theme.gradient : 'transparent',
              color: active ? '#fff' : theme.textMuted,
              fontSize: 11, fontWeight: 700, transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span>{m.emoji}</span>
            {active && <span>{m.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
