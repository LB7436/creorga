import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  Play,
  Award,
  FileText,
  Calendar,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  BookOpen,
  Video,
  ClipboardCheck,
  Shield,
  Search,
  Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ── palette ── */
const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  violet: '#7C3AED',
  violetSoft: '#ede9fe',
  green: '#10b981',
  greenSoft: '#d1fae5',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  red: '#ef4444',
  redSoft: '#fee2e2',
  blue: '#3b82f6',
  blueSoft: '#dbeafe',
}

/* ── types ── */
type ModuleStatus = 'completed' | 'in-progress' | 'not-started'
interface TrainingModule {
  id: string
  title: string
  icon: string
  duration: string
  mandatory: boolean
  category: string
  videos: number
  quizzes: number
}

interface Employee {
  id: string
  name: string
  role: string
  avatar: string
  modules: Record<string, { status: ModuleStatus; progress: number; score?: number; certified?: string }>
}

interface Certification {
  id: string
  employeeId: string
  moduleId: string
  issuedDate: string
  expiresDate: string
  score: number
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  attendees: number
  type: 'session' | 'exam' | 'refresher'
}

/* ── mock data ── */
const MODULES: TrainingModule[] = [
  { id: 'haccp', title: 'HACCP', icon: '\u{1F9EA}', duration: '4h30', mandatory: true, category: 'Hygiène', videos: 8, quizzes: 3 },
  { id: 'service', title: 'Service client', icon: '\u{1F91D}', duration: '2h15', mandatory: true, category: 'Relation client', videos: 5, quizzes: 2 },
  { id: 'caisse', title: 'Gestion caisse', icon: '\u{1F4B3}', duration: '1h45', mandatory: true, category: 'Opérationnel', videos: 4, quizzes: 2 },
  { id: 'securite', title: 'Sécurité', icon: '\u{1F6A8}', duration: '3h00', mandatory: true, category: 'Conformité', videos: 6, quizzes: 2 },
  { id: 'secours', title: 'Premiers secours', icon: '\u2695\uFE0F', duration: '6h00', mandatory: false, category: 'Santé', videos: 10, quizzes: 4 },
  { id: 'hygiene', title: 'Hygiène', icon: '\u{1F9FC}', duration: '2h30', mandatory: true, category: 'Hygiène', videos: 6, quizzes: 2 },
]

const EMPLOYEES: Employee[] = [
  {
    id: 'e1',
    name: 'Marie Weber',
    role: 'Chef de rang',
    avatar: 'MW',
    modules: {
      haccp: { status: 'completed', progress: 100, score: 92, certified: '2025-11-12' },
      service: { status: 'completed', progress: 100, score: 88, certified: '2025-10-04' },
      caisse: { status: 'completed', progress: 100, score: 95, certified: '2025-08-20' },
      securite: { status: 'in-progress', progress: 65 },
      secours: { status: 'not-started', progress: 0 },
      hygiene: { status: 'completed', progress: 100, score: 90, certified: '2025-09-15' },
    },
  },
  {
    id: 'e2',
    name: 'Lucas Berg',
    role: 'Cuisinier',
    avatar: 'LB',
    modules: {
      haccp: { status: 'completed', progress: 100, score: 96, certified: '2026-01-08' },
      service: { status: 'not-started', progress: 0 },
      caisse: { status: 'not-started', progress: 0 },
      securite: { status: 'completed', progress: 100, score: 84, certified: '2025-12-10' },
      secours: { status: 'completed', progress: 100, score: 91, certified: '2025-07-22' },
      hygiene: { status: 'completed', progress: 100, score: 94, certified: '2026-01-15' },
    },
  },
  {
    id: 'e3',
    name: 'Sophie Reuter',
    role: 'Barmaid',
    avatar: 'SR',
    modules: {
      haccp: { status: 'in-progress', progress: 45 },
      service: { status: 'completed', progress: 100, score: 89, certified: '2025-11-30' },
      caisse: { status: 'completed', progress: 100, score: 87, certified: '2025-10-18' },
      securite: { status: 'not-started', progress: 0 },
      secours: { status: 'not-started', progress: 0 },
      hygiene: { status: 'in-progress', progress: 80 },
    },
  },
  {
    id: 'e4',
    name: 'Pierre Schmitz',
    role: 'Serveur',
    avatar: 'PS',
    modules: {
      haccp: { status: 'completed', progress: 100, score: 78, certified: '2024-03-12' },
      service: { status: 'completed', progress: 100, score: 85, certified: '2025-09-20' },
      caisse: { status: 'completed', progress: 100, score: 82, certified: '2025-09-20' },
      securite: { status: 'completed', progress: 100, score: 80, certified: '2025-06-05' },
      secours: { status: 'not-started', progress: 0 },
      hygiene: { status: 'completed', progress: 100, score: 86, certified: '2024-02-10' },
    },
  },
  {
    id: 'e5',
    name: 'Anna Müller',
    role: 'Manager',
    avatar: 'AM',
    modules: {
      haccp: { status: 'completed', progress: 100, score: 97, certified: '2026-02-20' },
      service: { status: 'completed', progress: 100, score: 93, certified: '2026-01-10' },
      caisse: { status: 'completed', progress: 100, score: 98, certified: '2025-12-01' },
      securite: { status: 'completed', progress: 100, score: 95, certified: '2026-01-25' },
      secours: { status: 'completed', progress: 100, score: 92, certified: '2025-11-18' },
      hygiene: { status: 'completed', progress: 100, score: 94, certified: '2026-02-05' },
    },
  },
]

const CERTIFICATIONS: Certification[] = [
  { id: 'c1', employeeId: 'e1', moduleId: 'haccp', issuedDate: '2025-11-12', expiresDate: '2027-11-12', score: 92 },
  { id: 'c2', employeeId: 'e4', moduleId: 'haccp', issuedDate: '2024-03-12', expiresDate: '2026-03-12', score: 78 },
  { id: 'c3', employeeId: 'e4', moduleId: 'hygiene', issuedDate: '2024-02-10', expiresDate: '2026-02-10', score: 86 },
  { id: 'c4', employeeId: 'e2', moduleId: 'secours', issuedDate: '2025-07-22', expiresDate: '2027-07-22', score: 91 },
  { id: 'c5', employeeId: 'e5', moduleId: 'securite', issuedDate: '2026-01-25', expiresDate: '2028-01-25', score: 95 },
]

const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'ev1', title: 'Session HACCP - Nouveaux arrivants', date: '2026-04-22', time: '09:00', attendees: 3, type: 'session' },
  { id: 'ev2', title: 'Recyclage Premiers secours', date: '2026-04-28', time: '14:00', attendees: 5, type: 'refresher' },
  { id: 'ev3', title: 'Examen final Service client', date: '2026-05-03', time: '10:30', attendees: 2, type: 'exam' },
  { id: 'ev4', title: 'Formation Sécurité incendie', date: '2026-05-10', time: '08:30', attendees: 8, type: 'session' },
]

const VIDEOS = [
  { id: 'v1', title: 'Introduction HACCP - Les 7 principes', duration: '12:30', module: 'haccp', thumbnail: '#ede9fe' },
  { id: 'v2', title: 'Accueil client & posture', duration: '08:45', module: 'service', thumbnail: '#d1fae5' },
  { id: 'v3', title: 'Ouverture de caisse étape par étape', duration: '06:20', module: 'caisse', thumbnail: '#dbeafe' },
  { id: 'v4', title: 'Extincteurs & issues de secours', duration: '15:10', module: 'securite', thumbnail: '#fee2e2' },
  { id: 'v5', title: 'Gestes qui sauvent - RCP', duration: '18:00', module: 'secours', thumbnail: '#fef3c7' },
  { id: 'v6', title: 'Lavage des mains professionnel', duration: '04:30', module: 'hygiene', thumbnail: '#cffafe' },
]

/* ── helpers ── */
function daysUntil(dateStr: string): number {
  const today = new Date('2026-04-17')
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── styles ── */
const card: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 22,
  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  background: C.violet,
  border: 'none',
  cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: C.text,
  background: '#fff',
  border: `1px solid ${C.border}`,
  cursor: 'pointer',
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: C.muted,
  padding: '10px 12px',
  letterSpacing: 0.3,
}

const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle', fontSize: 13 }

/* ── tabs ── */
type Tab = 'dashboard' | 'modules' | 'employees' | 'certifications' | 'videos' | 'calendar' | 'compliance'

const TABS: { id: Tab; label: string; icon: typeof GraduationCap }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: GraduationCap },
  { id: 'modules', label: 'Modules', icon: BookOpen },
  { id: 'employees', label: 'Employés', icon: Users },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'videos', label: 'Vidéothèque', icon: Video },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'compliance', label: 'Conformité', icon: Shield },
]

/* ── component ── */
export default function FormationPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  const stats = useMemo(() => {
    let completed = 0
    let total = 0
    let inProgress = 0
    EMPLOYEES.forEach((e) => {
      MODULES.forEach((m) => {
        total++
        const s = e.modules[m.id]
        if (s?.status === 'completed') completed++
        else if (s?.status === 'in-progress') inProgress++
      })
    })
    const expiring = CERTIFICATIONS.filter((c) => {
      const d = daysUntil(c.expiresDate)
      return d > 0 && d <= 90
    }).length
    const expired = CERTIFICATIONS.filter((c) => daysUntil(c.expiresDate) <= 0).length
    return {
      completionRate: Math.round((completed / total) * 100),
      completed,
      inProgress,
      total,
      expiring,
      expired,
    }
  }, [])

  const filteredEmployees = useMemo(
    () => EMPLOYEES.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())),
    [search],
  )

  const generateCertificate = (emp: Employee, moduleId: string) => {
    const mod = MODULES.find((m) => m.id === moduleId)
    toast.success(`Certificat PDF généré : ${emp.name} - ${mod?.title}`, { icon: '\u{1F4DC}' })
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px 28px', color: C.text }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <GraduationCap size={28} color={C.violet} /> Formation & Certification
            </h1>
            <p style={{ color: C.muted, margin: '6px 0 0', fontSize: 14 }}>
              {EMPLOYEES.length} employés {'\u00B7'} {MODULES.length} modules {'\u00B7'} {stats.completionRate}% de complétion
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnGhost} onClick={() => toast('Export PDF en cours', { icon: '\u{1F4C4}' })}>
              <Download size={14} /> Exporter le rapport
            </button>
            <button style={btnPrimary} onClick={() => toast.success('Nouvelle session planifiée')}>
              <Plus size={14} /> Planifier une session
            </button>
          </div>
        </motion.div>

        {/* tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            background: '#fff',
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            marginBottom: 18,
            overflowX: 'auto',
          }}
        >
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: active ? C.violet : 'transparent',
                  color: active ? '#fff' : C.muted,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* ── DASHBOARD ── */}
        <AnimatePresence mode="wait">
          {tab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
                <StatCard label="Taux de complétion" value={`${stats.completionRate}%`} color={C.violet} icon={<ClipboardCheck size={18} />} />
                <StatCard label="Modules terminés" value={`${stats.completed}/${stats.total}`} color={C.green} icon={<CheckCircle2 size={18} />} />
                <StatCard label="En cours" value={String(stats.inProgress)} color={C.blue} icon={<Clock size={18} />} />
                <StatCard label="Certifs à renouveler" value={String(stats.expiring)} color={C.amber} icon={<AlertTriangle size={18} />} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <motion.div style={card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Progression par module</h3>
                  {MODULES.map((m) => {
                    const completed = EMPLOYEES.filter((e) => e.modules[m.id]?.status === 'completed').length
                    const pct = Math.round((completed / EMPLOYEES.length) * 100)
                    return (
                      <div key={m.id} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>
                            {m.icon} {m.title}
                          </span>
                          <span style={{ color: C.muted }}>
                            {completed}/{EMPLOYEES.length} {'\u00B7'} {pct}%
                          </span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6 }}
                            style={{ height: '100%', background: C.violet }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </motion.div>

                <motion.div style={card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Prochaines sessions</h3>
                  {CALENDAR_EVENTS.slice(0, 4).map((e) => (
                    <div
                      key={e.id}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        border: `1px solid ${C.border}`,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                        {formatDate(e.date)} {'\u00B7'} {e.time} {'\u00B7'} {e.attendees} pers.
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── MODULES ── */}
          {tab === 'modules' && (
            <motion.div key="mods" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {MODULES.map((m) => {
                  const completed = EMPLOYEES.filter((e) => e.modules[m.id]?.status === 'completed').length
                  return (
                    <motion.div
                      key={m.id}
                      whileHover={{ y: -3 }}
                      style={{ ...card, borderLeft: `4px solid ${C.violet}` }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 30 }}>{m.icon}</div>
                        {m.mandatory && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 20,
                              background: C.redSoft,
                              color: '#991b1b',
                            }}
                          >
                            OBLIGATOIRE
                          </span>
                        )}
                      </div>
                      <h3 style={{ margin: '10px 0 4px', fontSize: 16, fontWeight: 700 }}>{m.title}</h3>
                      <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{m.category}</p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12, color: C.muted }}>
                        <span>
                          <Clock size={11} /> {m.duration}
                        </span>
                        <span>
                          <Video size={11} /> {m.videos} vidéos
                        </span>
                        <span>
                          <ClipboardCheck size={11} /> {m.quizzes} quiz
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: 14,
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: C.violetSoft,
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.violet,
                        }}
                      >
                        {completed}/{EMPLOYEES.length} employés certifiés
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── EMPLOYEES ── */}
          {tab === 'employees' && (
            <motion.div key="emps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: 14, position: 'relative', maxWidth: 360 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: C.muted }} />
                <input
                  placeholder="Rechercher un employé..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: C.bg }}>
                    <tr>
                      <th style={th}>Employé</th>
                      {MODULES.map((m) => (
                        <th key={m.id} style={{ ...th, textAlign: 'center' }}>
                          {m.icon}
                        </th>
                      ))}
                      <th style={{ ...th, textAlign: 'right' }}>Progression</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => {
                      const done = MODULES.filter((m) => emp.modules[m.id]?.status === 'completed').length
                      const pct = Math.round((done / MODULES.length) * 100)
                      return (
                        <tr
                          key={emp.id}
                          onClick={() => setSelectedEmployee(emp)}
                          style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}
                        >
                          <td style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: '50%',
                                  background: C.violetSoft,
                                  color: C.violet,
                                  fontWeight: 700,
                                  fontSize: 12,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {emp.avatar}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{emp.name}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>{emp.role}</div>
                              </div>
                            </div>
                          </td>
                          {MODULES.map((m) => {
                            const s = emp.modules[m.id]
                            const bg = s?.status === 'completed' ? C.greenSoft : s?.status === 'in-progress' ? C.amberSoft : C.redSoft
                            const color = s?.status === 'completed' ? '#065f46' : s?.status === 'in-progress' ? '#92400e' : '#991b1b'
                            const label = s?.status === 'completed' ? '\u2713' : s?.status === 'in-progress' ? `${s.progress}%` : '\u2717'
                            return (
                              <td key={m.id} style={{ ...td, textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 34,
                                    height: 24,
                                    borderRadius: 6,
                                    background: bg,
                                    color,
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  {label}
                                </span>
                              </td>
                            )
                          })}
                          <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: C.violet }}>{pct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── CERTIFICATIONS ── */}
          {tab === 'certifications' && (
            <motion.div key="certs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: C.bg }}>
                    <tr>
                      <th style={th}>Employé</th>
                      <th style={th}>Module</th>
                      <th style={th}>Score</th>
                      <th style={th}>Émis le</th>
                      <th style={th}>Expire le</th>
                      <th style={th}>Statut</th>
                      <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CERTIFICATIONS.map((c) => {
                      const emp = EMPLOYEES.find((e) => e.id === c.employeeId)!
                      const mod = MODULES.find((m) => m.id === c.moduleId)!
                      const days = daysUntil(c.expiresDate)
                      const expired = days <= 0
                      const expiring = days > 0 && days <= 90
                      const bg = expired ? C.redSoft : expiring ? C.amberSoft : C.greenSoft
                      const color = expired ? '#991b1b' : expiring ? '#92400e' : '#065f46'
                      const label = expired ? 'Expirée' : expiring ? `${days}j` : 'Valide'
                      return (
                        <tr key={c.id} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={td}>{emp.name}</td>
                          <td style={td}>
                            {mod.icon} {mod.title}
                          </td>
                          <td style={td}>
                            <strong>{c.score}/100</strong>
                          </td>
                          <td style={td}>{formatDate(c.issuedDate)}</td>
                          <td style={td}>{formatDate(c.expiresDate)}</td>
                          <td style={td}>
                            <span
                              style={{
                                padding: '3px 9px',
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 600,
                                background: bg,
                                color,
                              }}
                            >
                              {label}
                            </span>
                          </td>
                          <td style={{ ...td, textAlign: 'right' }}>
                            <button style={{ ...btnGhost, padding: '5px 10px', fontSize: 12 }} onClick={() => generateCertificate(emp, c.moduleId)}>
                              <Download size={12} /> PDF
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── VIDEOS ── */}
          {tab === 'videos' && (
            <motion.div key="vids" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {VIDEOS.map((v) => {
                  const mod = MODULES.find((m) => m.id === v.module)
                  return (
                    <motion.div
                      key={v.id}
                      whileHover={{ y: -3 }}
                      style={{ ...card, padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                      onClick={() => toast('Lecteur vidéo (maquette)', { icon: '\u{1F3AC}' })}
                    >
                      <div
                        style={{
                          height: 140,
                          background: v.thumbnail,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                        >
                          <Play size={20} color={C.violet} />
                        </div>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {v.duration}
                        </span>
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ fontSize: 11, color: C.violet, fontWeight: 600, marginBottom: 4 }}>
                          {mod?.icon} {mod?.title}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{v.title}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── CALENDAR ── */}
          {tab === 'calendar' && (
            <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={card}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Sessions à venir</h3>
                {CALENDAR_EVENTS.map((e) => {
                  const typeColor = e.type === 'session' ? C.blue : e.type === 'exam' ? C.red : C.amber
                  const typeBg = e.type === 'session' ? C.blueSoft : e.type === 'exam' ? C.redSoft : C.amberSoft
                  const typeLabel = e.type === 'session' ? 'Session' : e.type === 'exam' ? 'Examen' : 'Recyclage'
                  return (
                    <div
                      key={e.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: 14,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          textAlign: 'center',
                          padding: '6px 0',
                          borderRadius: 8,
                          background: typeBg,
                          color: typeColor,
                        }}
                      >
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{e.date.slice(8, 10)}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                          {new Date(e.date).toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{e.title}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                          {e.time} {'\u00B7'} {e.attendees} participants
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: typeBg,
                          color: typeColor,
                        }}
                      >
                        {typeLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── COMPLIANCE ── */}
          {tab === 'compliance' && (
            <motion.div key="comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
                <StatCard label="Certifs expirées" value={String(stats.expired)} color={C.red} icon={<AlertTriangle size={18} />} />
                <StatCard label="À renouveler (<90j)" value={String(stats.expiring)} color={C.amber} icon={<Clock size={18} />} />
                <StatCard label="Employés conformes" value={`${EMPLOYEES.filter((e) => MODULES.filter((m) => m.mandatory).every((m) => e.modules[m.id]?.status === 'completed')).length}/${EMPLOYEES.length}`} color={C.green} icon={<Shield size={18} />} />
              </div>

              <div style={card}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Employés nécessitant un recyclage</h3>
                {EMPLOYEES.map((emp) => {
                  const missing = MODULES.filter((m) => m.mandatory && emp.modules[m.id]?.status !== 'completed')
                  const expiring = CERTIFICATIONS.filter((c) => c.employeeId === emp.id && daysUntil(c.expiresDate) <= 90)
                  if (missing.length === 0 && expiring.length === 0) return null
                  return (
                    <div
                      key={emp.id}
                      style={{
                        padding: 14,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        marginBottom: 10,
                        borderLeft: `4px solid ${missing.length > 0 ? C.red : C.amber}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{emp.name}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>{emp.role}</div>
                        </div>
                        <button style={btnPrimary} onClick={() => toast.success(`Plan de formation envoyé à ${emp.name}`)}>
                          <FileText size={13} /> Planifier
                        </button>
                      </div>
                      {missing.length > 0 && (
                        <div style={{ marginTop: 10, fontSize: 12 }}>
                          <strong style={{ color: C.red }}>Modules manquants : </strong>
                          {missing.map((m) => `${m.icon} ${m.title}`).join(', ')}
                        </div>
                      )}
                      {expiring.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12 }}>
                          <strong style={{ color: C.amber }}>Certifications à renouveler : </strong>
                          {expiring.map((c) => {
                            const m = MODULES.find((x) => x.id === c.moduleId)
                            return `${m?.title} (${daysUntil(c.expiresDate)}j)`
                          }).join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── EMPLOYEE MODAL ── */}
        <AnimatePresence>
          {selectedEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmployee(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                style={{ ...card, width: 520, maxHeight: '80vh', overflow: 'auto' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: C.violetSoft,
                      color: C.violet,
                      fontWeight: 700,
                      fontSize: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedEmployee.avatar}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedEmployee.name}</h3>
                    <div style={{ fontSize: 13, color: C.muted }}>{selectedEmployee.role}</div>
                  </div>
                </div>
                {MODULES.map((m) => {
                  const s = selectedEmployee.modules[m.id]
                  return (
                    <div key={m.id} style={{ padding: 10, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {m.icon} {m.title}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>
                          {s?.status === 'completed' ? `\u2713 ${s.score}/100` : s?.status === 'in-progress' ? `${s.progress}%` : 'Non démarré'}
                        </div>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: C.border, marginTop: 6, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${s?.progress || 0}%`,
                            background: s?.status === 'completed' ? C.green : C.amber,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
                <button style={{ ...btnGhost, width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={() => setSelectedEmployee(null)}>
                  Fermer
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── stat card ── */
function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <motion.div whileHover={{ y: -2 }} style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${color}15`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 10, color }}>{value}</div>
    </motion.div>
  )
}
