import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  UserPlus, Search, MoreVertical, Mail, Shield, ShieldCheck,
  Check, X, Clock, Ban, Users as UsersIcon, Smartphone,
} from 'lucide-react'

type Status = 'active' | 'invited' | 'blocked'
type Role = 'Owner' | 'Manager' | 'Serveur' | 'Cuisinier' | 'Comptable'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: Role
  lastLogin: string
  status: Status
  avatarColor: string
}

const USERS: User[] = [
  { id: '1', firstName: 'Jean-Pierre',  lastName: 'Weber',       email: 'jp.weber@cafe-rondpoint.lu',   role: 'Owner',     lastLogin: 'il y a 2 min',    status: 'active',  avatarColor: '#3b82f6' },
  { id: '2', firstName: 'Marie',        lastName: 'Schmit',       email: 'marie.schmit@cafe-rondpoint.lu', role: 'Manager',   lastLogin: 'il y a 1 h',      status: 'active',  avatarColor: '#8b5cf6' },
  { id: '3', firstName: 'Claude',       lastName: 'Muller',       email: 'claude.muller@cafe-rondpoint.lu', role: 'Serveur',  lastLogin: 'il y a 3 h',      status: 'active',  avatarColor: '#10b981' },
  { id: '4', firstName: 'Lucas',        lastName: 'Reuter',       email: 'lucas.reuter@cafe-rondpoint.lu', role: 'Cuisinier', lastLogin: 'il y a 15 min',   status: 'active',  avatarColor: '#f59e0b' },
  { id: '5', firstName: 'Sophie',       lastName: 'Kieffer',      email: 'sophie.kieffer@expert.lu',     role: 'Comptable', lastLogin: 'Jamais',          status: 'invited', avatarColor: '#ec4899' },
  { id: '6', firstName: 'Tom',          lastName: 'Hoffmann',     email: 'tom.hoffmann@cafe-rondpoint.lu', role: 'Serveur',  lastLogin: 'il y a 14 jours', status: 'blocked', avatarColor: '#64748b' },
]

const ROLES: Role[] = ['Owner', 'Manager', 'Serveur', 'Cuisinier', 'Comptable']
const PERMISSIONS = [
  'Accès POS', 'Modifier menu', 'Voir comptabilité', 'Gérer équipe',
  'Clôture caisse', 'Exporter données', 'Configuration', 'Admin',
]

const PERMISSION_MATRIX: Record<Role, boolean[]> = {
  Owner:     [true, true, true, true, true, true, true, true],
  Manager:   [true, true, true, true, true, true, false, false],
  Serveur:   [true, false, false, false, false, false, false, false],
  Cuisinier: [true, true, false, false, false, false, false, false],
  Comptable: [false, false, true, false, true, true, false, false],
}

const statusBadge = (s: Status) => {
  const map = {
    active:  { bg: '#dcfce7', color: '#16a34a', label: 'Actif',  icon: <Check size={11} /> },
    invited: { bg: '#fef3c7', color: '#d97706', label: 'Invité', icon: <Clock size={11} /> },
    blocked: { bg: '#fee2e2', color: '#dc2626', label: 'Bloqué', icon: <Ban size={11} /> },
  }
  return map[s]
}

const roleColor = (r: Role) => {
  const map: Record<Role, string> = {
    Owner: '#8b5cf6', Manager: '#3b82f6', Serveur: '#10b981', Cuisinier: '#f59e0b', Comptable: '#ec4899',
  }
  return map[r]
}

export default function AdminUsers() {
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [search, setSearch] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [matrix, setMatrix] = useState(PERMISSION_MATRIX)
  const [twoFA, setTwoFA] = useState(false)

  const [inviteForm, setInviteForm] = useState({
    email: '', firstName: '', lastName: '', role: 'Serveur' as Role, message: '',
  })

  const filtered = USERS.filter((u) => {
    if (filter !== 'all' && u.status !== filter) return false
    if (search && !`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const togglePerm = (role: Role, idx: number) => {
    if (role === 'Owner') return
    setMatrix((prev) => ({ ...prev, [role]: prev[role].map((v, i) => i === idx ? !v : v) }))
  }

  const sendInvite = () => {
    if (!inviteForm.email) { toast.error('Email requis'); return }
    toast.success(`Invitation envoyée à ${inviteForm.email}`)
    setShowInvite(false)
    setInviteForm({ email: '', firstName: '', lastName: '', role: 'Serveur', message: '' })
  }

  const counts = {
    all: USERS.length,
    active: USERS.filter((u) => u.status === 'active').length,
    invited: USERS.filter((u) => u.status === 'invited').length,
    blocked: USERS.filter((u) => u.status === 'blocked').length,
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Utilisateurs & accès</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Gérez les accès et permissions de votre équipe</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowInvite(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <UserPlus size={16} /> Inviter un utilisateur
        </motion.button>
      </div>

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          {([
            ['all',     `Tous (${counts.all})`],
            ['active',  `Actifs (${counts.active})`],
            ['invited', `Invités (${counts.invited})`],
            ['blocked', `Bloqués (${counts.blocked})`],
          ] as [typeof filter, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{
                padding: '7px 14px', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
                background: filter === k ? '#fff' : 'transparent', color: filter === k ? '#1e293b' : '#64748b',
                cursor: 'pointer', boxShadow: filter === k ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
          <input
            placeholder="Rechercher un utilisateur..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1fr 1.2fr 1fr 60px', gap: 12, padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <div>Utilisateur</div><div>Email</div><div>Rôle</div><div>Dernière connexion</div><div>Statut</div><div></div>
        </div>
        <AnimatePresence>
          {filtered.map((u, i) => {
            const sb = statusBadge(u.status)
            return (
              <motion.div key={u.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1fr 1.2fr 1fr 60px', gap: 12, padding: '14px 20px', borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #f1f5f9', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{u.firstName} {u.lastName}</div>
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>{u.email}</div>
                <div>
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${roleColor(u.role)}18`, color: roleColor(u.role) }}>
                    {u.role}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{u.lastLogin}</div>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: sb.bg, color: sb.color }}>
                    {sb.icon} {sb.label}
                  </span>
                </div>
                <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 6 }}>
                  <MoreVertical size={16} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Aucun utilisateur trouvé</div>
        )}
      </div>

      {/* Permission matrix */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Shield size={18} color="#3b82f6" />
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Matrice des permissions</h2>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
          Les permissions du rôle Owner sont verrouillées et ne peuvent pas être modifiées.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #e2e8f0' }}>Rôle</th>
                {PERMISSIONS.map((p) => (
                  <th key={p} style={{ padding: '10px 8px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'center' }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, borderRight: '1px solid #e2e8f0' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, background: `${roleColor(role)}18`, color: roleColor(role) }}>{role}</span>
                  </td>
                  {matrix[role].map((v, idx) => (
                    <td key={idx} style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => togglePerm(role, idx)}
                        disabled={role === 'Owner'}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: '1px solid ' + (v ? '#3b82f6' : '#e2e8f0'),
                          background: v ? '#3b82f6' : '#fff', cursor: role === 'Owner' ? 'not-allowed' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          opacity: role === 'Owner' ? 0.7 : 1, transition: 'all 0.15s',
                        }}
                      >
                        {v && <Check size={14} color="#fff" />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2FA */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)',
        border: '1px solid #bfdbfe', borderRadius: 16, padding: 24,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ShieldCheck size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#1e293b' }}>Activer l'authentification à deux facteurs</h3>
          <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }}>
            Renforcez la sécurité de votre compte en exigeant un code supplémentaire lors de la connexion.
            Compatible avec Google Authenticator, Authy et les clés de sécurité.
          </p>
        </div>
        <button
          onClick={() => { setTwoFA(!twoFA); toast.success(twoFA ? '2FA désactivée' : '2FA activée') }}
          style={{
            width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: twoFA ? '#10b981' : '#cbd5e1', position: 'relative', transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute', top: 3, left: twoFA ? 27 : 3, width: 22, height: 22,
            borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }} />
        </button>
      </div>

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setShowInvite(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Inviter un utilisateur</h2>
                <button onClick={() => setShowInvite(false)} style={{ border: 'none', background: '#f1f5f9', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</label>
                  <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="collaborateur@exemple.lu"
                    style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prénom</label>
                    <input value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nom</label>
                    <input value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rôle</label>
                  <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as Role })}
                    style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message personnalisé (optionnel)</label>
                  <textarea value={inviteForm.message} onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                    placeholder="Bienvenue dans l'équipe !" rows={3}
                    style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <button onClick={sendInvite}
                  style={{ marginTop: 8, padding: '12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Mail size={16} /> Envoyer l'invitation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
