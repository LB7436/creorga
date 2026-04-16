import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Plus,
  Trash2,
  Edit3,
  Save,
  Activity,
  Mail,
  ChevronRight,
  Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import SettingsLayout from './SettingsLayout'

const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#fff',
  bgSoft: '#f8fafc',
  indigo: '#6366f1',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
}

const card: React.CSSProperties = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 22,
  boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 13,
  color: C.text,
  background: '#fff',
  outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
}

type Status = 'active' | 'invited' | 'disabled'
type User = {
  id: string
  name: string
  email: string
  avatar: string
  role: string
  groupId: string
  lastLogin: string
  status: Status
}
type Role = { id: string; name: string; color: string; permissions: string[]; custom?: boolean }
type Group = { id: string; name: string; color: string }
type LogEntry = { id: string; ts: string; user: string; action: string; target: string }

const PERMISSIONS: { key: string; cat: string; label: string }[] = [
  { key: 'pos.sell', cat: 'POS', label: 'Effectuer des ventes' },
  { key: 'pos.discount', cat: 'POS', label: 'Appliquer des remises' },
  { key: 'pos.refund', cat: 'POS', label: 'Rembourser une vente' },
  { key: 'pos.void', cat: 'POS', label: 'Annuler un ticket' },
  { key: 'stock.read', cat: 'Stocks', label: 'Consulter les stocks' },
  { key: 'stock.write', cat: 'Stocks', label: 'Modifier les stocks' },
  { key: 'reports.view', cat: 'Rapports', label: 'Voir les rapports' },
  { key: 'reports.export', cat: 'Rapports', label: 'Exporter les rapports' },
  { key: 'settings.company', cat: 'Paramètres', label: 'Modifier la société' },
  { key: 'settings.tables', cat: 'Paramètres', label: 'Gérer les tables' },
  { key: 'settings.catalog', cat: 'Paramètres', label: 'Modifier le catalogue' },
  { key: 'settings.users', cat: 'Paramètres', label: 'Gérer les utilisateurs' },
  { key: 'kitchen.view', cat: 'Cuisine', label: 'Écran cuisine' },
  { key: 'kitchen.manage', cat: 'Cuisine', label: 'Valider les tickets cuisine' },
  { key: 'customer.manage', cat: 'Clients', label: 'Gérer les clients' },
]

const INITIAL_ROLES: Role[] = [
  { id: 'r1', name: 'Administrateur', color: '#ef4444', permissions: PERMISSIONS.map((p) => p.key) },
  { id: 'r2', name: 'Manager', color: '#6366f1', permissions: ['pos.sell', 'pos.discount', 'pos.refund', 'stock.read', 'stock.write', 'reports.view', 'reports.export', 'settings.catalog', 'customer.manage', 'kitchen.manage'] },
  { id: 'r3', name: 'Serveur', color: '#10b981', permissions: ['pos.sell', 'pos.discount', 'customer.manage'] },
  { id: 'r4', name: 'Employé', color: '#f59e0b', permissions: ['pos.sell', 'stock.read'] },
  { id: 'r5', name: 'Comptable', color: '#8b5cf6', permissions: ['reports.view', 'reports.export'], custom: true },
  { id: 'r6', name: 'Sommelier', color: '#06b6d4', permissions: ['pos.sell', 'stock.read', 'stock.write'], custom: true },
]

const INITIAL_GROUPS: Group[] = [
  { id: 'g1', name: 'Salle', color: '#6366f1' },
  { id: 'g2', name: 'Cuisine', color: '#f59e0b' },
  { id: 'g3', name: 'Bar', color: '#8b5cf6' },
]

const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Bryan Lemaire', email: 'bryan@creorga.lu', avatar: 'BL', role: 'r1', groupId: 'g1', lastLogin: '2026-04-16 09:12', status: 'active' },
  { id: 'u2', name: 'Sophie Müller', email: 'sophie.m@creorga.lu', avatar: 'SM', role: 'r2', groupId: 'g1', lastLogin: '2026-04-16 08:45', status: 'active' },
  { id: 'u3', name: 'Léon Becker', email: 'leon.b@creorga.lu', avatar: 'LB', role: 'r3', groupId: 'g1', lastLogin: '2026-04-15 22:30', status: 'active' },
  { id: 'u4', name: 'Marie Dupont', email: 'marie.d@creorga.lu', avatar: 'MD', role: 'r3', groupId: 'g1', lastLogin: '2026-04-15 23:02', status: 'active' },
  { id: 'u5', name: 'Thierry Weber', email: 'thierry.w@creorga.lu', avatar: 'TW', role: 'r4', groupId: 'g2', lastLogin: '2026-04-16 07:50', status: 'active' },
  { id: 'u6', name: 'Anaïs Girard', email: 'anais.g@creorga.lu', avatar: 'AG', role: 'r4', groupId: 'g2', lastLogin: '2026-04-14 19:20', status: 'active' },
  { id: 'u7', name: 'Raphaël Hoffmann', email: 'raphael.h@creorga.lu', avatar: 'RH', role: 'r3', groupId: 'g3', lastLogin: '—', status: 'invited' },
  { id: 'u8', name: 'Céline Reuter', email: 'celine.r@creorga.lu', avatar: 'CR', role: 'r4', groupId: 'g3', lastLogin: '2026-03-02 18:11', status: 'disabled' },
]

const INITIAL_LOG: LogEntry[] = [
  { id: 'l1', ts: '09:14', user: 'Bryan Lemaire', action: 'Connexion', target: '—' },
  { id: 'l2', ts: '09:12', user: 'Sophie Müller', action: 'Modification catalogue', target: 'Produit «Margherita»' },
  { id: 'l3', ts: '08:50', user: 'Léon Becker', action: 'Vente', target: 'Ticket #4821' },
  { id: 'l4', ts: '08:46', user: 'Sophie Müller', action: 'Remise appliquée', target: 'Table 4' },
  { id: 'l5', ts: '08:40', user: 'Thierry Weber', action: 'Validation cuisine', target: 'Commande #4820' },
  { id: 'l6', ts: '08:31', user: 'Bryan Lemaire', action: 'Invitation', target: 'raphael.h@creorga.lu' },
  { id: 'l7', ts: '08:15', user: 'Marie Dupont', action: 'Connexion', target: '—' },
  { id: 'l8', ts: '08:02', user: 'Léon Becker', action: 'Ouverture caisse', target: 'Caisse #1' },
  { id: 'l9', ts: '07:55', user: 'Anaïs Girard', action: 'Mise à jour stock', target: 'Tomates +20kg' },
  { id: 'l10', ts: '07:50', user: 'Thierry Weber', action: 'Connexion', target: '—' },
  { id: 'l11', ts: 'Hier 23:02', user: 'Marie Dupont', action: 'Fermeture caisse', target: 'Caisse #2' },
  { id: 'l12', ts: 'Hier 22:30', user: 'Léon Becker', action: 'Vente', target: 'Ticket #4815' },
  { id: 'l13', ts: 'Hier 21:10', user: 'Sophie Müller', action: 'Annulation ticket', target: 'Ticket #4812' },
  { id: 'l14', ts: 'Hier 20:45', user: 'Bryan Lemaire', action: 'Export rapport', target: 'Ventes du jour' },
  { id: 'l15', ts: 'Hier 19:20', user: 'Anaïs Girard', action: 'Connexion', target: '—' },
  { id: 'l16', ts: 'Hier 18:11', user: 'Céline Reuter', action: 'Dernière activité', target: '—' },
  { id: 'l17', ts: 'Hier 17:30', user: 'Thierry Weber', action: 'Marquage servi', target: 'Commande #4798' },
  { id: 'l18', ts: 'Hier 17:02', user: 'Sophie Müller', action: 'Création produit', target: 'Cocktail «Aperol»' },
  { id: 'l19', ts: 'Hier 16:45', user: 'Léon Becker', action: 'Remboursement', target: 'Ticket #4790' },
  { id: 'l20', ts: 'Hier 16:10', user: 'Bryan Lemaire', action: 'Création rôle', target: 'Sommelier' },
]

export default function SettingsUsers() {
  const [users, setUsers] = useState(INITIAL_USERS)
  const [roles, setRoles] = useState(INITIAL_ROLES)
  const [groups] = useState(INITIAL_GROUPS)
  const [log] = useState(INITIAL_LOG)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('r3')
  const [showRole, setShowRole] = useState(false)
  const [roleDraft, setRoleDraft] = useState<Partial<Role>>({ name: '', color: '#8b5cf6', permissions: [] })

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (filterRole !== 'all' && u.role !== filterRole) return false
        if (filterStatus !== 'all' && u.status !== filterStatus) return false
        if (search && !(`${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()))) return false
        return true
      }),
    [users, filterRole, filterStatus, search],
  )

  const roleById = (id: string) => roles.find((r) => r.id === id)
  const groupById = (id: string) => groups.find((g) => g.id === id)

  const counts = {
    users: users.length,
    invited: users.filter((u) => u.status === 'invited').length,
    customRoles: roles.filter((r) => r.custom).length,
  }

  const sendInvite = () => {
    if (!inviteEmail.includes('@')) {
      toast.error('Email invalide')
      return
    }
    const id = `u${Date.now()}`
    setUsers((us) => [
      ...us,
      {
        id,
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        avatar: inviteEmail.slice(0, 2).toUpperCase(),
        role: inviteRole,
        groupId: 'g1',
        lastLogin: '—',
        status: 'invited',
      },
    ])
    toast.success(`Invitation envoyée à ${inviteEmail}`)
    setShowInvite(false)
    setInviteEmail('')
  }

  const createRole = () => {
    if (!roleDraft.name) {
      toast.error('Nom du rôle requis')
      return
    }
    const id = `r${Date.now()}`
    setRoles((rs) => [...rs, { id, name: roleDraft.name!, color: roleDraft.color!, permissions: roleDraft.permissions || [], custom: true }])
    toast.success(`Rôle «${roleDraft.name}» créé`)
    setShowRole(false)
    setRoleDraft({ name: '', color: '#8b5cf6', permissions: [] })
  }

  const toggleRolePerm = (key: string) => {
    const perms = roleDraft.permissions || []
    setRoleDraft({ ...roleDraft, permissions: perms.includes(key) ? perms.filter((p) => p !== key) : [...perms, key] })
  }

  const changeUserGroup = (uid: string, gid: string) => {
    setUsers((us) => us.map((u) => (u.id === uid ? { ...u, groupId: gid } : u)))
  }

  return (
    <SettingsLayout>
      <div style={{ maxWidth: 1400, margin: '0 auto', color: C.text }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={26} color={C.indigo} /> Utilisateurs & accès
            </h1>
            <p style={{ color: C.muted, margin: '6px 0 0', fontSize: 14 }}>
              {counts.users} utilisateurs · {counts.invited} invités · {counts.customRoles} rôles personnalisés
            </p>
          </div>
          <button onClick={() => setShowInvite(true)} style={btnPrimary}>
            <UserPlus size={15} /> Inviter un utilisateur
          </button>
        </motion.div>

        {/* USERS TABLE */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={14} color={C.muted} style={{ position: 'absolute', left: 10, top: 10 }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                style={{ ...inputStyle, paddingLeft: 30 }}
              />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ ...inputStyle, width: 180 }}>
              <option value="all">Tous les rôles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} style={{ ...inputStyle, width: 160 }}>
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="invited">Invités</option>
              <option value="disabled">Désactivés</option>
            </select>
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: C.bgSoft }}>
                <tr>
                  <th style={th}>Utilisateur</th>
                  <th style={th}>Email</th>
                  <th style={th}>Rôle</th>
                  <th style={th}>Groupe</th>
                  <th style={th}>Dernière connexion</th>
                  <th style={th}>Statut</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const r = roleById(u.role)
                  const g = groupById(u.groupId)
                  return (
                    <tr key={u.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: r?.color || C.muted,
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {u.avatar}
                          </div>
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td style={td}>{u.email}</td>
                      <td style={td}>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: `${r?.color}20`,
                            color: r?.color,
                          }}
                        >
                          {r?.name}
                        </span>
                      </td>
                      <td style={td}>
                        <select
                          value={u.groupId}
                          onChange={(e) => changeUserGroup(u.id, e.target.value)}
                          style={{ ...inputStyle, padding: '4px 8px', width: 110, borderColor: g?.color, color: g?.color }}
                        >
                          {groups.map((gr) => (
                            <option key={gr.id} value={gr.id}>{gr.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...td, color: C.muted }}>{u.lastLogin}</td>
                      <td style={td}>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background:
                              u.status === 'active' ? '#d1fae5' : u.status === 'invited' ? '#dbeafe' : '#fee2e2',
                            color: u.status === 'active' ? '#065f46' : u.status === 'invited' ? '#1e40af' : '#991b1b',
                          }}
                        >
                          {u.status === 'active' ? 'Actif' : u.status === 'invited' ? 'Invité' : 'Désactivé'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <button style={{ ...btnTiny, marginRight: 4 }}>
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setUsers((us) => us.filter((x) => x.id !== u.id))
                            toast.success('Utilisateur supprimé')
                          }}
                          style={{ ...btnTiny, color: C.red }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ ...td, textAlign: 'center', color: C.muted, padding: 28 }}>
                      Aucun utilisateur
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ROLES + GROUPS */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={15} /> Rôles & permissions
              </h3>
              <button onClick={() => setShowRole(true)} style={btnPrimary}>
                <Plus size={14} /> Créer un rôle personnalisé
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {roles.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    borderLeft: `4px solid ${r.color}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <strong style={{ fontSize: 14 }}>{r.name}</strong>
                    {r.custom && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: '#eef2ff', color: C.indigo, fontWeight: 700 }}>
                        CUSTOM
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                    {r.permissions.length} permission{r.permissions.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {users.filter((u) => u.role === r.id).length} utilisateur(s)
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* GROUPS */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Groupes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {groups.map((g) => {
                const members = users.filter((u) => u.groupId === g.id)
                return (
                  <div
                    key={g.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const uid = e.dataTransfer.getData('uid')
                      if (uid) changeUserGroup(uid, g.id)
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      borderLeft: `4px solid ${g.color}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: 13 }}>{g.name}</strong>
                      <span style={{ fontSize: 11, color: C.muted }}>{members.length} membre(s)</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {members.map((m) => (
                        <div
                          key={m.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('uid', m.id)}
                          title={m.name}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: roleById(m.role)?.color,
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'grab',
                            border: '2px solid #fff',
                          }}
                        >
                          {m.avatar}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 10, marginBottom: 0 }}>
              Glissez-déposez un avatar pour changer de groupe.
            </p>
          </motion.div>
        </div>

        {/* ACTIVITY */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} /> Journal d'activité (20 dernières actions)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
            {log.map((l) => (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: C.bgSoft,
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 11, color: C.muted, width: 90, flexShrink: 0 }}>{l.ts}</span>
                <strong style={{ width: 160, flexShrink: 0 }}>{l.user}</strong>
                <span style={{ flex: 1 }}>{l.action}</span>
                <ChevronRight size={12} color={C.muted} />
                <span style={{ color: C.muted, fontSize: 12 }}>{l.target}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* INVITE MODAL */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInvite(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            >
              <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                style={{ ...card, width: 420 }}
              >
                <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={16} /> Inviter un utilisateur
                </h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Email</label>
                  <input
                    autoFocus
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="collaborateur@creorga.lu"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Rôle</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={inputStyle}>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: C.bgSoft, fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={13} />
                  Permissions personnalisées modifiables après l'invitation.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowInvite(false)} style={{ ...btnGhost, flex: 1, justifyContent: 'center' }}>
                    Annuler
                  </button>
                  <button onClick={sendInvite} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
                    <Mail size={14} /> Envoyer l'invitation
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ROLE MODAL */}
        <AnimatePresence>
          {showRole && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRole(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            >
              <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                style={{ ...card, width: 560, maxHeight: '85vh', overflowY: 'auto' }}
              >
                <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={16} /> Nouveau rôle personnalisé
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Nom du rôle</label>
                    <input
                      autoFocus
                      value={roleDraft.name || ''}
                      onChange={(e) => setRoleDraft({ ...roleDraft, name: e.target.value })}
                      placeholder="Ex: Sommelier"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Couleur</label>
                    <input
                      type="color"
                      value={roleDraft.color}
                      onChange={(e) => setRoleDraft({ ...roleDraft, color: e.target.value })}
                      style={{ ...inputStyle, padding: 4, height: 40 }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Permissions ({(roleDraft.permissions || []).length}/15)</label>
                  {Array.from(new Set(PERMISSIONS.map((p) => p.cat))).map((cat) => (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>
                        {cat}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {PERMISSIONS.filter((p) => p.cat === cat).map((p) => {
                          const on = (roleDraft.permissions || []).includes(p.key)
                          return (
                            <label
                              key={p.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: 8,
                                background: C.bgSoft,
                                cursor: 'pointer',
                                fontSize: 13,
                              }}
                            >
                              <span>{p.label}</span>
                              <button
                                type="button"
                                onClick={() => toggleRolePerm(p.key)}
                                style={{
                                  width: 36, height: 20, borderRadius: 999, border: 'none',
                                  background: on ? C.green : C.border, position: 'relative', cursor: 'pointer',
                                }}
                              >
                                <span
                                  style={{
                                    position: 'absolute', top: 2, left: on ? 18 : 2,
                                    width: 16, height: 16, background: '#fff', borderRadius: '50%',
                                    transition: 'left 0.15s',
                                  }}
                                />
                              </button>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowRole(false)} style={{ ...btnGhost, flex: 1, justifyContent: 'center' }}>
                    Annuler
                  </button>
                  <button onClick={createRole} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
                    <Save size={14} /> Créer le rôle
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SettingsLayout>
  )
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
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  background: C.indigo,
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
const btnTiny: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 6,
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: '#fff',
  cursor: 'pointer',
}
