import type { FloorTable } from '@/hooks/useFloorState'

/**
 * Pre-built floor layouts for fast onboarding.
 * Inspired by Floorplanner / iLoyal templates.
 */

export interface FloorPreset {
  id: string
  name: string
  emoji: string
  description: string
  capacity: number
  tables: Omit<FloorTable, 'items' | 'status'>[]
}

const T = (id: string, name: string, seats: number, section: string, shape: any, x: number, y: number) =>
  ({ id, name, seats, section, shape, x, y })

export const FLOOR_PRESETS: FloorPreset[] = [
  {
    id: 'cafe-cosy',
    name: 'Café cosy',
    emoji: '☕',
    description: '4 tables rondes + 8 tabourets de bar',
    capacity: 16,
    tables: [
      T('t1', 'T1', 2, 'Salle', 'round', 160, 150),
      T('t2', 'T2', 2, 'Salle', 'round', 320, 150),
      T('t3', 'T3', 2, 'Salle', 'round', 160, 310),
      T('t4', 'T4', 2, 'Salle', 'round', 320, 310),
      T('bar', 'Bar', 8, 'Bar',  'bar',   600, 200),
    ],
  },
  {
    id: 'brasserie',
    name: 'Brasserie 30 places',
    emoji: '🍺',
    description: '6 tables rondes salle + bar 6 + terrasse 4',
    capacity: 38,
    tables: [
      T('t1', 'T1', 4, 'Salle', 'round',  140, 140),
      T('t2', 'T2', 4, 'Salle', 'round',  300, 140),
      T('t3', 'T3', 4, 'Salle', 'round',  460, 140),
      T('t4', 'T4', 4, 'Salle', 'round',  140, 320),
      T('t5', 'T5', 4, 'Salle', 'round',  300, 320),
      T('t6', 'T6', 4, 'Salle', 'round',  460, 320),
      T('bar','Bar',6, 'Bar',   'bar',    700, 200),
      T('te1','Te1',4, 'Terrasse','round',850, 200),
      T('te2','Te2',4, 'Terrasse','round',850, 360),
    ],
  },
  {
    id: 'gastro',
    name: 'Restaurant gastro 24',
    emoji: '🍽',
    description: 'Tables carrées espacées + bar à vin',
    capacity: 26,
    tables: [
      T('t1', 'T1', 2, 'Salle', 'square', 180, 150),
      T('t2', 'T2', 2, 'Salle', 'square', 360, 150),
      T('t3', 'T3', 2, 'Salle', 'square', 540, 150),
      T('t4', 'T4', 4, 'Salle', 'square', 180, 350),
      T('t5', 'T5', 4, 'Salle', 'square', 360, 350),
      T('t6', 'T6', 6, 'Salle', 'rect',   540, 350),
      T('bar','Bar',2, 'Bar',   'bar',    750, 200),
    ],
  },
  {
    id: 'pizzeria',
    name: 'Pizzeria familiale',
    emoji: '🍕',
    description: '8 tables rectangulaires alignées',
    capacity: 48,
    tables: [
      T('t1', 'T1', 6, 'Salle', 'rect', 180, 130),
      T('t2', 'T2', 6, 'Salle', 'rect', 380, 130),
      T('t3', 'T3', 6, 'Salle', 'rect', 580, 130),
      T('t4', 'T4', 6, 'Salle', 'rect', 780, 130),
      T('t5', 'T5', 6, 'Salle', 'rect', 180, 320),
      T('t6', 'T6', 6, 'Salle', 'rect', 380, 320),
      T('t7', 'T7', 6, 'Salle', 'rect', 580, 320),
      T('t8', 'T8', 6, 'Salle', 'rect', 780, 320),
    ],
  },
  {
    id: 'bar-vin',
    name: 'Bar à vin',
    emoji: '🍷',
    description: 'Mange-debout + tables hautes + grande table de partage',
    capacity: 22,
    tables: [
      T('m1', 'M1', 2, 'Salle', 'square', 150, 130),
      T('m2', 'M2', 2, 'Salle', 'square', 280, 130),
      T('m3', 'M3', 2, 'Salle', 'square', 410, 130),
      T('partage', 'Partage', 10, 'Salle', 'rect', 280, 310),
      T('bar', 'Bar', 6, 'Bar', 'bar', 600, 200),
    ],
  },
  {
    id: 'mixte',
    name: 'Mixte (Café um Rond-Point)',
    emoji: '🏛',
    description: 'Layout actuel — 8 tables salle + bar + 3 terrasse',
    capacity: 40,
    tables: [
      T('t1','T1',2,'Salle','round',  160, 150),
      T('t2','T2',4,'Salle','square', 320, 150),
      T('t3','T3',4,'Salle','square', 480, 150),
      T('t4','T4',6,'Salle','rect',   160, 330),
      T('t5','T5',4,'Salle','square', 320, 330),
      T('t6','T6',2,'Salle','round',  480, 330),
      T('t7','T7',6,'Salle','rect',   220, 500),
      T('t8','T8',8,'Salle','rect',   470, 500),
      T('bar','Bar',6,'Bar','bar',    840, 155),
      T('te1','Te1',4,'Terrasse','round', 790, 400),
      T('te2','Te2',4,'Terrasse','round', 930, 400),
      T('te3','Te3',2,'Terrasse','round', 860, 550),
    ],
  },
]

interface PresetPickerProps {
  open: boolean
  onClose: () => void
  onPick: (preset: FloorPreset) => void
  theme: any
}

export function PresetPicker({ open, onClose, onPick, theme }: PresetPickerProps) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 760,
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <header style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg,#eef2ff,#fdf4ff)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📐 Charger un modèle de salle</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              Choisissez un layout pré-fait — vous pourrez le personnaliser ensuite.
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#fff', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </header>

        <div style={{ padding: 20, overflowY: 'auto', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {FLOOR_PRESETS.map((p) => (
            <button key={p.id}
              onClick={() => { onPick(p); onClose() }}
              style={{
                padding: 16, borderRadius: 14, border: '2px solid #e2e8f0',
                background: '#fff', cursor: 'pointer', textAlign: 'left',
                transition: 'all .15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366f1'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{p.emoji}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>
                {p.description}
              </div>
              <div style={{
                display: 'flex', gap: 6, marginTop: 10,
                padding: '4px 10px', background: '#eef2ff', borderRadius: 6,
                fontSize: 11, fontWeight: 700, color: '#4338ca', width: 'fit-content',
              }}>
                {p.tables.length} tables · {p.capacity} places
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
