import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus, X, Pencil, Trash2, Users, Search, ChevronUp, ChevronDown,
  FileText, Clock, Calendar, Euro, Phone, Mail, MapPin, CreditCard,
  Download, Filter,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────
type RoleType = 'Serveur' | 'Cuisinier' | 'Femme de ménage' | 'Manager' | 'Barman'
type ContratType = 'CDI' | 'CDD' | 'Extra/Intérimaire'
type StatusType = 'Actif' | 'Inactif'
type SortField = 'nom' | 'role' | 'contrat' | 'heures' | 'salaire' | 'embauche' | 'statut'
type SortDir = 'asc' | 'desc'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateNaissance: string
  adresse: string
  role: RoleType
  contrat: ContratType
  heuresHebdo: number
  salaireBrut: number
  dateEmbauche: Date
  numSecu: string
  status: StatusType
}

// ── Constants ──────────────────────────────────────────────────────────
const ROLE_COLORS: Record<RoleType, string> = {
  Serveur: '#6366f1',
  Cuisinier: '#f97316',
  'Femme de ménage': '#ec4899',
  Manager: '#10b981',
  Barman: '#8b5cf6',
}

const ROLE_BG: Record<RoleType, string> = {
  Serveur: '#eef2ff',
  Cuisinier: '#fff7ed',
  'Femme de ménage': '#fdf2f8',
  Manager: '#ecfdf5',
  Barman: '#f5f3ff',
}

const CONTRAT_COLORS: Record<ContratType, { bg: string; color: string }> = {
  CDI: { bg: '#dcfce7', color: '#16a34a' },
  CDD: { bg: '#fef9c3', color: '#ca8a04' },
  'Extra/Intérimaire': { bg: '#fee2e2', color: '#dc2626' },
}

const AVATAR_COLORS = ['#6366f1', '#f97316', '#ec4899', '#10b981', '#eab308', '#06b6d4']

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: '1', firstName: 'Marie', lastName: 'Dupont',
    email: 'marie.dupont@creorga.lu', phone: '+352 621 123 456',
    dateNaissance: '1990-05-12', adresse: '14 Rue de Hollerich, L-1741 Luxembourg',
    role: 'Serveur', contrat: 'CDI', heuresHebdo: 40, salaireBrut: 3200,
    dateEmbauche: new Date(2023, 2, 15), numSecu: '1990051200147', status: 'Actif',
  },
  {
    id: '2', firstName: 'Jean', lastName: 'Muller',
    email: 'jean.muller@creorga.lu', phone: '+352 621 234 567',
    dateNaissance: '1985-11-03', adresse: '8 Boulevard Royal, L-2449 Luxembourg',
    role: 'Cuisinier', contrat: 'CDI', heuresHebdo: 40, salaireBrut: 3800,
    dateEmbauche: new Date(2022, 8, 1), numSecu: '1985110300289', status: 'Actif',
  },
  {
    id: '3', firstName: 'Sophie', lastName: 'Klein',
    email: 'sophie.klein@creorga.lu', phone: '+352 621 345 678',
    dateNaissance: '1995-07-22', adresse: '22 Rue de Strasbourg, L-2561 Luxembourg',
    role: 'Barman', contrat: 'CDD', heuresHebdo: 35, salaireBrut: 2900,
    dateEmbauche: new Date(2024, 0, 10), numSecu: '1995072200334', status: 'Actif',
  },
  {
    id: '4', firstName: 'Luc', lastName: 'Weber',
    email: 'luc.weber@creorga.lu', phone: '+352 621 456 789',
    dateNaissance: '1982-01-18', adresse: '5 Avenue de la Gare, L-1611 Luxembourg',
    role: 'Manager', contrat: 'CDI', heuresHebdo: 45, salaireBrut: 5200,
    dateEmbauche: new Date(2021, 5, 1), numSecu: '1982011800412', status: 'Actif',
  },
  {
    id: '5', firstName: 'Anna', lastName: 'Schmit',
    email: 'anna.schmit@creorga.lu', phone: '+352 621 567 890',
    dateNaissance: '1993-09-30', adresse: '17 Rue du Fort Neipperg, L-2230 Luxembourg',
    role: 'Femme de ménage', contrat: 'Extra/Intérimaire', heuresHebdo: 20, salaireBrut: 1600,
    dateEmbauche: new Date(2023, 10, 20), numSecu: '1993093000567', status: 'Actif',
  },
  {
    id: '6', firstName: 'Pierre', lastName: 'Martin',
    email: 'pierre.martin@creorga.lu', phone: '+352 621 678 901',
    dateNaissance: '1988-03-14', adresse: '31 Rue de Bonnevoie, L-1260 Luxembourg',
    role: 'Cuisinier', contrat: 'CDD', heuresHebdo: 40, salaireBrut: 3500,
    dateEmbauche: new Date(2024, 3, 5), numSecu: '1988031400623', status: 'Inactif',
  },
]

const MOCK_DOCUMENTS = [
  { name: 'Contrat de travail', date: '15/03/2023', type: 'PDF' },
  { name: 'Fiche de paie - Mars 2026', date: '25/03/2026', type: 'PDF' },
  { name: 'Fiche de paie - Février 2026', date: '25/02/2026', type: 'PDF' },
  { name: 'Attestation employeur', date: '01/01/2026', type: 'PDF' },
]

const MOCK_CONGES = [
  { type: 'Congé annuel', debut: '15/07/2025', fin: '30/07/2025', jours: 12, statut: 'Approuvé' },
  { type: 'Congé maladie', debut: '10/02/2026', fin: '12/02/2026', jours: 3, statut: 'Justifié' },
  { type: 'Congé annuel', debut: '20/12/2025', fin: '27/12/2025', jours: 5, statut: 'Approuvé' },
]

// ── Component ──────────────────────────────────────────────────────────
export default function EquipePage() {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES)
  const [roleFilter, setRoleFilter] = useState<string>('Tous')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [sortField, setSortField] = useState<SortField>('nom')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filters = ['Tous', 'Serveur', 'Cuisinier', 'Femme de ménage', 'Manager', 'Barman']

  const filtered = employees
    .filter(e => {
      const matchRole = roleFilter === 'Tous' || e.role === roleFilter
      const matchSearch = search === '' ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        e.role.toLowerCase().includes(search.toLowerCase())
      return matchRole && matchSearch
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortField) {
        case 'nom': return dir * `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
        case 'role': return dir * a.role.localeCompare(b.role)
        case 'contrat': return dir * a.contrat.localeCompare(b.contrat)
        case 'heures': return dir * (a.heuresHebdo - b.heuresHebdo)
        case 'salaire': return dir * (a.salaireBrut - b.salaireBrut)
        case 'embauche': return dir * (a.dateEmbauche.getTime() - b.dateEmbauche.getTime())
        case 'statut': return dir * a.status.localeCompare(b.status)
        default: return 0
      }
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const handleDelete = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
    if (selectedEmployee?.id === id) setSelectedEmployee(null)
  }

  const handleEdit = (emp: Employee, e: React.MouseEvent) => {
    e.stopPropagation()
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
  const totalSalaire = employees.filter(e => e.status === 'Actif').reduce((s, e) => s + e.salaireBrut, 0)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} style={{ opacity: 0.25 }} />
    return sortDir === 'asc'
      ? <ChevronUp size={14} style={{ color: '#6366f1' }} />
      : <ChevronDown size={14} style={{ color: '#6366f1' }} />
  }

  return (
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#0f172a' }}>Gestion du Personnel</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
            {activeCount} membres actifs sur {employees.length} &mdash; Masse salariale : {totalSalaire.toLocaleString('fr-LU')} &euro;/mois
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          <Plus size={18} /> Ajouter un employ&eacute;
        </motion.button>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}
      >
        {filters.slice(1).map(role => {
          const count = employees.filter(e => e.role === role).length
          return (
            <div key={role} style={{
              background: '#fff', borderRadius: 14, padding: '16px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: ROLE_COLORS[role as RoleType] }}>{count}</div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{role}{count !== 1 ? 's' : ''}</div>
            </div>
          )
        })}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 20 }}
      >
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            style={{
              width: '100%', padding: '10px 14px 10px 40px', borderRadius: 12,
              background: '#fff', border: '1px solid #e2e8f0', color: '#1e293b',
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
            placeholder="Rechercher par nom, email, rôle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setRoleFilter(f)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all .15s',
              background: roleFilter === f ? '#6366f1' : '#fff',
              color: roleFilter === f ? '#fff' : '#64748b',
              boxShadow: roleFilter === f ? '0 2px 8px rgba(99,102,241,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main content: Table + Detail Panel */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            flex: 1, background: '#fff', borderRadius: 16,
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
            overflow: 'hidden', minWidth: 0,
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {[
                    { label: 'Employé', field: 'nom' as SortField, width: undefined },
                    { label: 'Rôle', field: 'role' as SortField, width: undefined },
                    { label: 'Contrat', field: 'contrat' as SortField, width: undefined },
                    { label: 'H/sem', field: 'heures' as SortField, width: 70 },
                    { label: 'Salaire brut', field: 'salaire' as SortField, width: undefined },
                    { label: 'Embauché(e)', field: 'embauche' as SortField, width: undefined },
                    { label: 'Statut', field: 'statut' as SortField, width: 90 },
                    { label: 'Actions', field: null, width: 90 },
                  ].map((col, ci) => (
                    <th
                      key={ci}
                      onClick={() => col.field && handleSort(col.field)}
                      style={{
                        padding: '12px 14px', textAlign: 'left', fontWeight: 700,
                        color: '#475569', fontSize: 12, textTransform: 'uppercase',
                        letterSpacing: '0.05em', cursor: col.field ? 'pointer' : 'default',
                        userSelect: 'none', whiteSpace: 'nowrap',
                        width: col.width || undefined,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {col.field && <SortIcon field={col.field} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedEmployee(emp)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background .15s',
                      background: selectedEmployee?.id === emp.id ? '#f0f0ff' : (i % 2 === 0 ? '#fff' : '#fafbfc'),
                      opacity: emp.status === 'Inactif' ? 0.55 : 1,
                    }}
                    onMouseEnter={e => { if (selectedEmployee?.id !== emp.id) (e.currentTarget as HTMLElement).style.background = '#f8f9ff' }}
                    onMouseLeave={e => { if (selectedEmployee?.id !== emp.id) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#fafbfc' }}
                  >
                    {/* Employee name + avatar */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: `linear-gradient(135deg, ${getAvatarColor(emp.id)}, ${getAvatarColor(emp.id)}cc)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, color: '#fff',
                        }}>
                          {getInitials(emp.firstName, emp.lastName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    {/* Role badge */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                        fontSize: 12, fontWeight: 700,
                        background: ROLE_BG[emp.role], color: ROLE_COLORS[emp.role],
                      }}>
                        {emp.role}
                      </span>
                    </td>
                    {/* Contrat badge */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                        fontSize: 12, fontWeight: 700,
                        background: CONTRAT_COLORS[emp.contrat].bg, color: CONTRAT_COLORS[emp.contrat].color,
                      }}>
                        {emp.contrat}
                      </span>
                    </td>
                    {/* Heures */}
                    <td style={{ padding: '12px 14px', color: '#334155', fontWeight: 500 }}>
                      {emp.heuresHebdo}h
                    </td>
                    {/* Salaire */}
                    <td style={{ padding: '12px 14px', color: '#334155', fontWeight: 600 }}>
                      {emp.salaireBrut.toLocaleString('fr-LU')} &euro;
                    </td>
                    {/* Date embauche */}
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 13 }}>
                      {format(emp.dateEmbauche, 'd MMM yyyy', { locale: fr })}
                    </td>
                    {/* Statut */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                        fontSize: 11, fontWeight: 700,
                        background: emp.status === 'Actif' ? '#dcfce7' : '#fee2e2',
                        color: emp.status === 'Actif' ? '#16a34a' : '#dc2626',
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={(e) => handleEdit(emp, e)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                            background: '#fff', cursor: 'pointer', color: '#64748b', transition: 'all .15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLElement).style.color = '#6366f1' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#64748b' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(emp.id) }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 8, border: '1px solid #fecaca',
                            background: '#fff', cursor: 'pointer', color: '#f87171', transition: 'all .15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Users size={40} style={{ marginBottom: 12, color: '#cbd5e1' }} />
              <div style={{ fontSize: 14, color: '#94a3b8' }}>Aucun employ&eacute; trouv&eacute;</div>
            </div>
          )}
        </motion.div>

        {/* Detail slide-out panel */}
        <AnimatePresence>
          {selectedEmployee && (
            <motion.div
              key={selectedEmployee.id}
              initial={{ opacity: 0, x: 40, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 380 }}
              exit={{ opacity: 0, x: 40, width: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                width: 380, flexShrink: 0, background: '#fff', borderRadius: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <div style={{
                background: `linear-gradient(135deg, ${getAvatarColor(selectedEmployee.id)}, ${getAvatarColor(selectedEmployee.id)}cc)`,
                padding: '24px 20px', position: 'relative',
              }}>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  style={{
                    position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.2)',
                    border: 'none', borderRadius: 8, width: 28, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff',
                  }}
                >
                  <X size={16} />
                </button>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 12,
                }}>
                  {getInitials(selectedEmployee.firstName, selectedEmployee.lastName)}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </div>
                <div style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.2)', color: '#fff',
                  fontSize: 12, fontWeight: 700, marginTop: 6,
                }}>
                  {selectedEmployee.role} &mdash; {selectedEmployee.contrat}
                </div>
              </div>

              {/* Panel body */}
              <div style={{ padding: 20, maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
                {/* Contact info */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Informations
                  </div>
                  {[
                    { icon: <Mail size={14} />, text: selectedEmployee.email },
                    { icon: <Phone size={14} />, text: selectedEmployee.phone },
                    { icon: <MapPin size={14} />, text: selectedEmployee.adresse },
                    { icon: <Calendar size={14} />, text: `Né(e) le ${selectedEmployee.dateNaissance.split('-').reverse().join('/')}` },
                    { icon: <CreditCard size={14} />, text: `Sécu: ${selectedEmployee.numSecu}` },
                    { icon: <Euro size={14} />, text: `${selectedEmployee.salaireBrut.toLocaleString('fr-LU')} € brut/mois` },
                    { icon: <Clock size={14} />, text: `${selectedEmployee.heuresHebdo}h / semaine` },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13, color: '#475569' }}>
                      <span style={{ color: '#94a3b8', flexShrink: 0 }}>{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>

                {/* Documents */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Documents
                  </div>
                  {MOCK_DOCUMENTS.map((doc, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 10, marginBottom: 4,
                      background: idx % 2 === 0 ? '#f8fafc' : '#fff',
                      border: '1px solid #f1f5f9',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={14} style={{ color: '#6366f1' }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{doc.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{doc.date}</div>
                        </div>
                      </div>
                      <button style={{
                        background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: 4,
                      }}>
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Historique congés */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Historique cong&eacute;s
                  </div>
                  {MOCK_CONGES.map((c, idx) => (
                    <div key={idx} style={{
                      padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                      background: '#f8fafc', border: '1px solid #f1f5f9',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{c.type}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: c.statut === 'Approuvé' ? '#dcfce7' : '#fef9c3',
                          color: c.statut === 'Approuvé' ? '#16a34a' : '#ca8a04',
                        }}>
                          {c.statut}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {c.debut} &rarr; {c.fin} ({c.jours} jours)
                      </div>
                    </div>
                  ))}
                </div>

                {/* Heures ce mois */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Heures travaill&eacute;es &mdash; Avril 2026
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#f0f0ff', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>
                        {Math.round(selectedEmployee.heuresHebdo * 2.3)}h
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Travaill&eacute;es</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>
                        {selectedEmployee.heuresHebdo * 4}h
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Pr&eacute;vues/mois</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '+352 ',
    dateNaissance: '', adresse: '',
    role: 'Serveur' as RoleType, contrat: 'CDI' as ContratType,
    heuresHebdo: 40, salaireBrut: 2571,
    dateEmbauche: format(new Date(), 'yyyy-MM-dd'),
    numSecu: '', status: 'Actif' as StatusType,
  })

  useEffect(() => {
    if (employee) {
      setForm({
        firstName: employee.firstName, lastName: employee.lastName,
        email: employee.email, phone: employee.phone,
        dateNaissance: employee.dateNaissance, adresse: employee.adresse,
        role: employee.role, contrat: employee.contrat,
        heuresHebdo: employee.heuresHebdo, salaireBrut: employee.salaireBrut,
        dateEmbauche: format(employee.dateEmbauche, 'yyyy-MM-dd'),
        numSecu: employee.numSecu, status: employee.status,
      })
    } else {
      setForm({
        firstName: '', lastName: '', email: '', phone: '+352 ',
        dateNaissance: '', adresse: '',
        role: 'Serveur', contrat: 'CDI',
        heuresHebdo: 40, salaireBrut: 2571,
        dateEmbauche: format(new Date(), 'yyyy-MM-dd'),
        numSecu: '', status: 'Actif',
      })
    }
  }, [employee, isOpen])

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = () => {
    onSave({
      ...form,
      dateEmbauche: new Date(form.dateEmbauche),
    })
  }

  if (!isOpen) return null

  const inputCss: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color .15s',
  }

  const selectCss: React.CSSProperties = { ...inputCss, appearance: 'auto' as any }

  const labelCss: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 5,
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 560, maxHeight: '90vh', background: '#fff', borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Modal header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {employee ? 'Modifier l’employé' : 'Ajouter un employé'}
            </h2>
            <button onClick={onClose} style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748b',
            }}>
              <X size={18} />
            </button>
          </div>

          {/* Modal body */}
          <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Row: Prénom / Nom */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelCss}>Pr&eacute;nom *</label>
                <input style={inputCss} value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="Marie" />
              </div>
              <div>
                <label style={labelCss}>Nom *</label>
                <input style={inputCss} value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Dupont" />
              </div>
            </div>

            {/* Row: Email / Téléphone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelCss}>Email</label>
                <input style={inputCss} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@creorga.lu" />
              </div>
              <div>
                <label style={labelCss}>T&eacute;l&eacute;phone</label>
                <input style={inputCss} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+352 621 ..." />
              </div>
            </div>

            {/* Row: Date naissance / Adresse */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelCss}>Date de naissance</label>
                <input style={inputCss} type="date" value={form.dateNaissance} onChange={e => update('dateNaissance', e.target.value)} />
              </div>
              <div>
                <label style={labelCss}>Adresse</label>
                <input style={inputCss} value={form.adresse} onChange={e => update('adresse', e.target.value)} placeholder="14 Rue de Hollerich, Luxembourg" />
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

            {/* Row: Rôle / Contrat */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelCss}>R&ocirc;le *</label>
                <select style={selectCss} value={form.role} onChange={e => update('role', e.target.value)}>
                  {(['Serveur', 'Cuisinier', 'Femme de ménage', 'Manager', 'Barman'] as RoleType[]).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelCss}>Type de contrat *</label>
                <select style={selectCss} value={form.contrat} onChange={e => update('contrat', e.target.value)}>
                  {(['CDI', 'CDD', 'Extra/Intérimaire'] as ContratType[]).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: Heures / Salaire */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelCss}>Heures hebdomadaires</label>
                <input style={inputCss} type="number" value={form.heuresHebdo} onChange={e => update('heuresHebdo', Number(e.target.value))} min={0} max={60} />
              </div>
              <div>
                <label style={labelCss}>Salaire brut mensuel (&euro;)</label>
                <input style={inputCss} type="number" value={form.salaireBrut} onChange={e => update('salaireBrut', Number(e.target.value))} min={0} step={50} />
              </div>
            </div>

            {/* Row: Date embauche / Num sécu / Statut */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelCss}>Date d&rsquo;embauche</label>
                <input style={inputCss} type="date" value={form.dateEmbauche} onChange={e => update('dateEmbauche', e.target.value)} />
              </div>
              <div>
                <label style={labelCss}>N&deg; s&eacute;curit&eacute; sociale</label>
                <input style={inputCss} value={form.numSecu} onChange={e => update('numSecu', e.target.value)} placeholder="19900512..." />
              </div>
              <div>
                <label style={labelCss}>Statut</label>
                <select style={selectCss} value={form.status} onChange={e => update('status', e.target.value)}>
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal footer */}
          <div style={{
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            padding: '16px 24px', borderTop: '1px solid #f1f5f9',
          }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#fff', color: '#64748b', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}>
              Annuler
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
              }}
            >
              {employee ? 'Enregistrer' : 'Ajouter'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
