import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarRange, Plus, X, Copy, Check, Sparkles } from 'lucide-react'

/**
 * v3.18.6 — RH Enhancements (3 features)
 *
 * 1. BulkShiftCreator : crée X shifts identiques d'un coup (ex: Marie 9h-17h tous les lundis 4 sem)
 * 2. HolidayBanner    : prochain jour férié LU avec impact planning
 * 3. ShiftTemplates   : templates rapides (matin / après-midi / fermeture / fériés)
 */

const HOLIDAYS_LU_2026 = [
  { date: '2026-01-01', name: 'Jour de l\'an' },
  { date: '2026-04-06', name: 'Lundi de Pâques' },
  { date: '2026-05-01', name: 'Fête du Travail' },
  { date: '2026-05-09', name: 'Journée de l\'Europe' },
  { date: '2026-05-14', name: 'Ascension' },
  { date: '2026-05-25', name: 'Lundi de Pentecôte' },
  { date: '2026-06-23', name: 'Fête nationale LU' },
  { date: '2026-08-15', name: 'Assomption' },
  { date: '2026-11-01', name: 'Toussaint' },
  { date: '2026-12-25', name: 'Noël' },
  { date: '2026-12-26', name: 'Saint-Étienne' },
]

// ═══════════════════════════════════════════════════════════════════════
// 1. BULK SHIFT CREATOR
// ═══════════════════════════════════════════════════════════════════════
export interface BulkShift {
  employee: string
  start: string  // "09:00"
  end: string    // "17:00"
  startDate: string  // YYYY-MM-DD
  weeks: number      // nombre de semaines à dupliquer
  daysOfWeek: number[]  // 0=dim, 1=lun, ..., 6=sam
  role?: string
}

export function BulkShiftCreator({
  employees, onClose, onCreate,
}: {
  employees: Array<{ id: string; name: string; role?: string }>
  onClose: () => void
  onCreate: (shifts: Array<{ date: string; employee: string; start: string; end: string; role?: string }>) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [employee, setEmployee] = useState(employees[0]?.name || '')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [startDate, setStartDate] = useState(today)
  const [weeks, setWeeks] = useState(4)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5])  // Lun-Ven

  const previewShifts = useMemo(() => {
    const out: Array<{ date: string; dayLabel: string }> = []
    const start0 = new Date(startDate)
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const cur = new Date(start0)
        cur.setDate(start0.getDate() + w * 7 + d)
        if (daysOfWeek.includes(cur.getDay())) {
          out.push({
            date: cur.toISOString().slice(0, 10),
            dayLabel: cur.toLocaleDateString('fr-LU', { weekday: 'short', day: 'numeric', month: 'short' }),
          })
        }
      }
    }
    return out
  }, [startDate, weeks, daysOfWeek])

  const submit = () => {
    onCreate(previewShifts.map((s) => ({
      date: s.date, employee, start, end, role: employees.find((e) => e.name === employee)?.role,
    })))
  }

  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

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
          background: '#fff', borderRadius: 18, maxWidth: 620, width: '100%', maxHeight: '88vh',
          overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>RH</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Création shifts en bloc</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Plusieurs shifts identiques d'un coup</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {/* Employee */}
          <div>
            <label style={lbl}>Employé</label>
            <select value={employee} onChange={(e) => setEmployee(e.target.value)} style={inp}>
              {employees.map((e) => <option key={e.id} value={e.name}>{e.name} {e.role ? `(${e.role})` : ''}</option>)}
            </select>
          </div>

          {/* Date + weeks */}
          <div>
            <label style={lbl}>Date début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Heure début</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Heure fin</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Nombre de semaines</label>
            <input type="number" min="1" max="52" value={weeks} onChange={(e) => setWeeks(parseInt(e.target.value) || 1)} style={inp} />
          </div>
        </div>

        <div style={{ padding: '0 22px 14px' }}>
          <label style={lbl}>Jours de la semaine</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {dayLabels.map((d, i) => (
              <button key={i} onClick={() => setDaysOfWeek(daysOfWeek.includes(i) ? daysOfWeek.filter((x) => x !== i) : [...daysOfWeek, i])}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: 8, cursor: 'pointer', border: 'none', fontSize: 12, fontWeight: 700,
                  background: daysOfWeek.includes(i) ? 'linear-gradient(135deg, #991b1b, #dc2626)' : '#f1f5f9',
                  color: daysOfWeek.includes(i) ? '#fff' : '#64748b',
                }}>{d}</button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{ padding: '0 22px 14px' }}>
          <div style={{
            padding: 10, background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd',
            fontSize: 12, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Sparkles size={14} />
            <span><strong>{previewShifts.length}</strong> shift(s) seront créés pour <strong>{employee}</strong> de {start} à {end}.</span>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={btnSec}>Annuler</button>
          <button onClick={submit} disabled={previewShifts.length === 0} style={{ ...btnPrim, flex: 1, opacity: previewShifts.length === 0 ? 0.4 : 1 }}>
            <Plus size={14} /> Créer les {previewShifts.length} shifts
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 2. HOLIDAY BANNER (jours fériés Luxembourg)
// ═══════════════════════════════════════════════════════════════════════
export function HolidayBanner({ days = 30 }: { days?: number }) {
  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const limit = new Date(today); limit.setDate(today.getDate() + days)
    return HOLIDAYS_LU_2026
      .map((h) => ({ ...h, dateObj: new Date(h.date) }))
      .filter((h) => h.dateObj >= today && h.dateObj <= limit)
      .slice(0, 3)
  }, [days])

  if (upcoming.length === 0) return null

  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #f59e0b',
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
    }}>
      <CalendarRange size={18} color="#92400e" />
      <div style={{ flex: 1, fontSize: 12, color: '#78350f' }}>
        <strong>🎉 Prochain{upcoming.length > 1 ? 's' : ''} férié{upcoming.length > 1 ? 's' : ''} :</strong>{' '}
        {upcoming.map((h) => `${h.name} (${new Date(h.date).toLocaleDateString('fr-LU', { day: 'numeric', month: 'long' })})`).join(' · ')}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 3. SHIFT TEMPLATES (rapides : matin / après-midi / fermeture)
// ═══════════════════════════════════════════════════════════════════════
export const SHIFT_TEMPLATES = [
  { id: 'morning', emoji: '🌅', label: 'Matin', start: '06:00', end: '14:00', role: 'Service' },
  { id: 'noon',    emoji: '🍽',  label: 'Service midi', start: '11:00', end: '15:00', role: 'Service' },
  { id: 'evening', emoji: '🌙', label: 'Soir', start: '17:00', end: '23:00', role: 'Service' },
  { id: 'night',   emoji: '🦉', label: 'Fermeture', start: '20:00', end: '02:00', role: 'Bar' },
  { id: 'kitchen-day',  emoji: '👨‍🍳', label: 'Cuisine jour', start: '08:00', end: '16:00', role: 'Cuisinier' },
  { id: 'kitchen-eve',  emoji: '🔥', label: 'Cuisine soir', start: '15:00', end: '23:30', role: 'Cuisinier' },
]

export function ShiftTemplatesPicker({ onPick }: { onPick: (tpl: typeof SHIFT_TEMPLATES[number]) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
      {SHIFT_TEMPLATES.map((tpl) => (
        <button key={tpl.id} onClick={() => onPick(tpl)} style={{
          padding: 10, borderRadius: 10, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff',
          fontSize: 11, color: '#475569', textAlign: 'left',
        }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>{tpl.emoji}</div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{tpl.label}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>{tpl.start} – {tpl.end}</div>
        </button>
      ))}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#475569', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }
const btnPrim: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800,
  background: 'linear-gradient(135deg, #991b1b, #dc2626)', color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
const btnSec: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 700,
  background: '#fff', color: '#475569',
}
