import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus, X, Phone, Mail, Pencil, Trash2, Users, Search,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────
type RoleType = 'Serveur' | 'Cuisinier' | 'Ménage' | 'Manager'
type StatusType = 'Actif' | 'Inactif'

interface Employee {
  id: string
  firstName: string
  lastName: string
  role: RoleType
  phone: string
  email: string
  hireDate: Date
  status: StatusType
}

// ── Constants ──────────────────────────────────────────────────────────
const ROLE_COLORS: Record<RoleType, string> = {
  Serveur: '#6366f1',
  Cuisinier: '#f97316',
  Ménage: '#ec4899',
  Manager: '#10b981',
}

const ROLE_BG: Record<RoleType, string> = {
  Serveur: 'rgba(99,102,241,0.15)',
  Cuisinier: 'rgba(249,115,22,0.15)',
  Ménage: 'rgba(236,72,153,0.15)',
  Manager: 'rgba(16,185,129,0.15)',
}

const AVATAR_COLORS = ['#6366f1', '#f97316', '#ec4899', '#10b981', '#eab308', '#06b6d4']

const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', firstName: 'Marie', lastName: 'Dupont', role: 'Serveur', phone: '+352 621 123 456', email: 'marie.dupont@creorga.lu', hireDate: new Date(2023, 2, 15), status: 'Actif' },
  { id: '2', firstName: 'Jean', lastName: 'Muller', role: 'Cuisinier', phone: '+352 621 234 567', email: 'jean.muller@creorga.lu', hireDate: new Date(2022, 8, 1), status: 'Actif' },
  { id: '3', firstName: 'Sophie', lastName: 'Klein', role: 'Serveur', phone: '+352 621 345 678', email: 'sophie.klein@creorga.lu', hireDate: new Date(2024, 0, 10), status: 'Actif' },
  { id: '4', firstName: 'Luc', lastName: 'Weber', role: 'Manager', phone: '+352 621 456 789', email: 'luc.weber@creorga.lu', hireDate: new Date(2021, 5, 1), status: 'Actif' },
  { id: '5', firstName: 'Anna', lastName: 'Schmit', role: 'Ménage', phone: '+352 621 567 890', email: 'anna.schmit@creorga.lu', hireDate: new Date(2023, 10, 20), status: 'Actif' },
  { id: '6', firstName: 'Pierre', lastName: 'Martin', role: 'Cuisinier', phone: '+352 621 678 901', email: 'pierre.martin@creorga.lu', hireDate: new Date(2024, 3, 5), status: 'Inactif' },
]

// ── Styles ──────────────────────────────────────────────────────────────
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 12, border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
}

const btnPrimary: React.CSSProperties = {
  ...btnBase, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
}

const btnGhost: React.CSSProperties = {
  ...btnBase, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
  border: '1px solid rgba(255,255,255,0.1)',
}

const btnDanger: React.CSSProperties = {
  ...btnBase, background: 'rgba(239,68,68,0.15)', color: '#f87171',
  border: '1px solid rgba(239,68,68,0.2)', padding: '6px 10px',
}

const btnSmall: React.CSSProperties = {
  ...btnBase, padding: '6px 10px', fontSize: 12,
  background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
  border: '1px solid rgba(255,255,255,0.08)',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9', fontSize: 14, outline: 'none',
}

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' as const }

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6,
}

// ── Component ──────────────────────────────────────────────────────────
export default function EquipePage() {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES)
  const [roleFilter, setRoleFilter] = useState<string>('Tous')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)

  const filters = ['Tous', 'Serveur', 'Cuisinier', 'Ménage', 'Manager']

  const filtered = employees.filter(e => {
    const matchRole = roleFilter === 'Tous' || e.role === roleFilter
    const matchSearch = search === '' ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const handleDelete = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  const handleEdit = (emp: Employee) => {
    setEditEmployee(emp)
    setShowModal(true)
  }

  const handleAdd = () => {
    setEditEmployee(null)
    setShowModal(true)
  }

  const handleSave = (emp: Omit<Employee, 'id'>) => {
    if (editEmployee) {
      setEmployees(prev => prev.map(e => e.id === editEmployee.id ? { ...emp, id: editEmployee.id } : e))
    } else {
      setEmployees(prev => [...prev, { ...emp, id: `emp-${Date.now()}` }])
    }
    setShowModal(false)
    setEditEmployee(null)
  }

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()

  const getAvatarColor = (id: string) =>
    AVATAR_COLORS[parseInt(id.replace(/\D/g, '') || '0') % AVATAR_COLORS.length]

  const activeCount = employees.filter(e => e.status === 'Actif').length

  return (
    <div style={{ padding: 24, background: '#0f172a', minHeight: '100%', color: '#f1f5f9' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Équipe</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{activeCount} membres actifs / {employees.length} total</p>
        </div>
        <button onClick={handleAdd} style={btnPrimary}><Plus size={16} /> Ajouter un employé</button>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {filters.slice(1).map(role => {
          const count = employees.filter(e => e.role === role).length
          return (
            <div key={role} style={{
              ...glassCard, padding: '16px 20px',
              background: `linear-gradient(135deg, ${ROLE_BG[role as RoleType]}, rgba(255,255,255,0.02))`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: ROLE_COLORS[role as RoleType] }}>{count}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{role}{count > 1 ? 's' : ''}</div>
            </div>
          )
        })}
      </motion.div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            style={{ ...inputStyle, paddingLeft: 36 }}
            placeholder="Rechercher un employé..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {filters.map(f => (
            <button key={f} onClick={() => setRoleFilter(f)} style={{
              ...btnBase, fontSize: 12, padding: '6px 14px', borderRadius: 10,
              background: roleFilter === f ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
              color: roleFilter === f ? '#a5b4fc' : '#64748b',
              border: roleFilter === f ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Employee grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filtered.map((emp, i) => (
          <motion.div
            key={emp.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              ...glassCard, padding: 24,
              opacity: emp.status === 'Inactif' ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `linear-gradient(135deg, ${getAvatarColor(emp.id)}, ${getAvatarColor(emp.id)}99)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: '#fff',
                }}>
                  {getInitials(emp.firstName, emp.lastName)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{emp.firstName} {emp.lastName}</div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: ROLE_BG[emp.role], color: ROLE_COLORS[emp.role], marginTop: 4,
                  }}>
                    {emp.role}
                  </div>
                </div>
              </div>
              <div style={{
                padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                background: emp.status === 'Actif' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: emp.status === 'Actif' ? '#10b981' : '#f87171',
              }}>
                {emp.status}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
                <Phone size={14} /> {emp.phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
                <Mail size={14} /> {emp.email}
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Embauché le {format(emp.hireDate, 'd MMMM yyyy', { locale: fr })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleEdit(emp)} style={btnSmall}><Pencil size={13} /> Modifier</button>
              <button onClick={() => handleDelete(emp.id)} style={btnDanger}><Trash2 size={13} /></button>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
          <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14 }}>Aucun employé trouvé</div>
        </div>
      )}

      {/* Modal */}
      <EmployeeModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditEmployee(null) }}
        onSave={handleSave}
        employee={editEmployee}
      />
    </div>
  )
}

// ── Employee Modal ─────────────────────────────────────────────────────
function EmployeeModal({ isOpen, onClose, onSave, employee }: {
  isOpen: boolean
  onClose: () => void
  onSave: (emp: Omit<Employee, 'id'>) => void
  employee: Employee | null
}) {
  const [firstName, setFirstName] = useState(employee?.firstName || '')
  const [lastName, setLastName] = useState(employee?.lastName || '')
  const [role, setRole] = useState<RoleType>(employee?.role || 'Serveur')
  const [phone, setPhone] = useState(employee?.phone || '')
  const [email, setEmail] = useState(employee?.email || '')
  const [status, setStatus] = useState<StatusType>(employee?.status || 'Actif')

  // Reset form when employee changes
  useState(() => {
    if (employee) {
      setFirstName(employee.firstName)
      setLastName(employee.lastName)
      setRole(employee.role)
      setPhone(employee.phone)
      setEmail(employee.email)
      setStatus(employee.status)
    } else {
      setFirstName(''); setLastName(''); setRole('Serveur')
      setPhone(''); setEmail(''); setStatus('Actif')
    }
  })

  const handleSubmit = () => {
    onSave({
      firstName, lastName, role, phone, email, status,
      hireDate: employee?.hireDate || new Date(),
    })
  }

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 440, background: '#1e293b', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              {employee ? 'Modifier l\'employé' : 'Ajouter un employé'}
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Prénom</label>
                <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" />
              </div>
              <div>
                <label style={labelStyle}>Nom</label>
                <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Rôle</label>
                <select style={selectStyle} value={role} onChange={e => setRole(e.target.value as RoleType)}>
                  {(['Serveur', 'Cuisinier', 'Ménage', 'Manager'] as RoleType[]).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Statut</label>
                <select style={selectStyle} value={status} onChange={e => setStatus(e.target.value as StatusType)}>
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+352 621 ..." />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@creorga.lu" type="email" />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={onClose} style={btnGhost}>Annuler</button>
              <button onClick={handleSubmit} style={btnPrimary}>
                {employee ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
