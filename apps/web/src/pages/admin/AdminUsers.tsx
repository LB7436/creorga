import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CheckCircle2, Plus, RefreshCw, Search, ShieldCheck, UserRound, UsersRound, XCircle } from 'lucide-react'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { useAuthStore } from '@/stores/authStore'

type MemberRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE'
type Member = {
  id: string
  userId: string
  companyId: string
  role: MemberRole | string
  isActive: boolean
  createdAt: string
  user: { id: string; firstName: string; lastName: string; email: string }
}

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Propriétaire', MANAGER: 'Responsable', EMPLOYEE: 'Employé',
}

export default function AdminUsers() {
  const currentUser = useAuthStore((state) => state.user)
  const currentRole = useAuthStore((state) => state.role)
  const company = useAuthStore((state) => state.company)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newMember, setNewMember] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE' as Exclude<MemberRole, 'OWNER'> })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Member[]>('/companies/members')
      setMembers(data)
    } catch (error: any) {
      toastError(error?.response?.data?.message || 'Impossible de charger les utilisateurs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load, company?.id])

  const filtered = useMemo(() => members.filter((member) => {
    if (status === 'active' && !member.isActive) return false
    if (status === 'inactive' && member.isActive) return false
    const haystack = `${member.user.firstName} ${member.user.lastName} ${member.user.email}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  }), [members, search, status])

  const updateMember = async (member: Member, patch: Partial<Pick<Member, 'role' | 'isActive'>>) => {
    setUpdating(member.userId)
    try {
      const { data } = await api.patch<Member>(`/companies/members/${member.userId}`, patch)
      setMembers((items) => items.map((item) => item.userId === member.userId ? data : item))
      toastSuccess('Accès enregistré sur le serveur')
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Impossible de modifier l'accès")
    } finally {
      setUpdating(null)
    }
  }

  const isOwner = currentRole === 'owner'

  const createMember = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    try {
      const { data } = await api.post<Member>('/companies/members', newMember)
      setMembers((items) => [...items, data])
      setNewMember({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE' })
      setShowCreate(false)
      toastSuccess('Compte collaborateur créé et enregistré')
    } catch (error: any) {
      toastError(error?.response?.data?.message || 'Impossible de créer ce compte')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ color: '#172033', maxWidth: 1120, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.03em' }}>Utilisateurs et accès</h1>
          <p style={{ color: '#64748b', margin: '7px 0 0' }}>Membres réels de {company?.name || "l'établissement"}.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isOwner && <button type="button" onClick={() => setShowCreate((value) => !value)} style={primaryButton}>
            <Plus size={16} /> Ajouter un membre
          </button>}
          <button type="button" onClick={() => void load()} disabled={loading} style={secondaryButton}>
            <RefreshCw size={15} className={loading ? 'spin' : undefined} /> Actualiser
          </button>
        </div>
      </header>

      {showCreate && (
        <form onSubmit={createMember} style={{ ...cardStyle, borderColor: '#bfdbfe', background: '#f8fbff' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Créer un compte pour une serveuse ou un responsable</h2>
          <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>Le collaborateur pourra se connecter immédiatement avec cet email et ce mot de passe temporaire.</p>
          <div style={createGridStyle}>
            <label style={fieldStyle}>Prénom<input required maxLength={80} autoComplete="given-name" value={newMember.firstName} onChange={(event) => setNewMember((value) => ({ ...value, firstName: event.target.value }))} style={inputStyle} /></label>
            <label style={fieldStyle}>Nom<input required maxLength={80} autoComplete="family-name" value={newMember.lastName} onChange={(event) => setNewMember((value) => ({ ...value, lastName: event.target.value }))} style={inputStyle} /></label>
            <label style={fieldStyle}>Email<input required type="email" autoComplete="email" value={newMember.email} onChange={(event) => setNewMember((value) => ({ ...value, email: event.target.value }))} style={inputStyle} /></label>
            <label style={fieldStyle}>Mot de passe temporaire<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={newMember.password} onChange={(event) => setNewMember((value) => ({ ...value, password: event.target.value }))} style={inputStyle} /></label>
            <label style={fieldStyle}>Rôle<select value={newMember.role} onChange={(event) => setNewMember((value) => ({ ...value, role: event.target.value as Exclude<MemberRole, 'OWNER'> }))} style={selectStyle}><option value="EMPLOYEE">Serveuse / employé</option><option value="MANAGER">Responsable</option></select></label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={() => setShowCreate(false)} disabled={creating} style={secondaryButton}>Annuler</button>
            <button type="submit" disabled={creating} style={{ ...primaryButton, opacity: creating ? 0.65 : 1 }}>{creating ? 'Création…' : 'Créer le compte'}</button>
          </div>
        </form>
      )}

      <section style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 12 }}>
        <Metric icon={<UsersRound size={18} />} label="Membres" value={members.length} />
        <Metric icon={<CheckCircle2 size={18} />} label="Actifs" value={members.filter((m) => m.isActive).length} color="#047857" />
        <Metric icon={<ShieldCheck size={18} />} label="Propriétaires" value={members.filter((m) => m.role === 'OWNER' && m.isActive).length} color="#6d28d9" />
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 17 }}>
          <label style={{ position: 'relative', flex: '1 1 270px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher par nom ou email" aria-label="Rechercher un utilisateur" style={{ ...inputStyle, paddingLeft: 38 }} />
          </label>
          <div style={{ display: 'flex', gap: 5, padding: 4, background: '#f1f5f9', borderRadius: 10 }}>
            {([['all', 'Tous'], ['active', 'Actifs'], ['inactive', 'Désactivés']] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setStatus(key)} style={{ ...filterButton, background: status === key ? '#fff' : 'transparent', color: status === key ? '#172033' : '#64748b' }}>{label}</button>
            ))}
          </div>
        </div>

        {loading ? <Empty text="Chargement des utilisateurs…" /> : filtered.length === 0 ? <Empty text="Aucun utilisateur ne correspond à ce filtre." /> : (
          <div style={{ display: 'grid', gap: 9 }}>
            {filtered.map((member) => {
              const self = member.userId === currentUser?.id
              const disabled = !isOwner || self || updating === member.userId
              return (
                <article key={member.id} style={memberRow}>
                  <div style={avatarStyle}><UserRound size={19} /></div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.user.firstName} {member.user.lastName}{self ? ' (vous)' : ''}</strong>
                    <span style={{ color: '#64748b', fontSize: 13, overflowWrap: 'anywhere' }}>{member.user.email}</span>
                  </div>
                  <label style={{ display: 'grid', gap: 4, color: '#64748b', fontSize: 11 }}>
                    Rôle
                    <select value={normalizeRole(member.role)} disabled={disabled} onChange={(event) => void updateMember(member, { role: event.target.value as MemberRole })} style={selectStyle}>
                      {(member.role === 'OWNER' ? [['OWNER', ROLE_LABELS.OWNER]] : [['MANAGER', ROLE_LABELS.MANAGER], ['EMPLOYEE', ROLE_LABELS.EMPLOYEE]]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <button type="button" disabled={disabled} onClick={() => void updateMember(member, { isActive: !member.isActive })}
                    style={{ ...statusButton, background: member.isActive ? '#ecfdf5' : '#fef2f2', color: member.isActive ? '#047857' : '#b91c1c', opacity: disabled && !self ? 0.6 : 1 }}>
                    {member.isActive ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    {updating === member.userId ? 'Enregistrement…' : member.isActive ? 'Actif' : 'Désactivé'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <aside style={{ ...cardStyle, background: '#f8fafc', color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
        <strong style={{ color: '#172033' }}>Sécurité des accès</strong><br />
        Votre propre accès propriétaire et le dernier propriétaire actif sont protégés. Les comptes créés ici sont de vrais accès enregistrés en base. Transmettez le mot de passe temporaire par un canal sûr et demandez au collaborateur de le conserver confidentiel.
      </aside>
    </div>
  )
}

function normalizeRole(role: string): MemberRole {
  if (role === 'OWNER' || role === 'MANAGER') return role
  return 'EMPLOYEE'
}

function Metric({ icon, label, value, color = '#1d4ed8' }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return <div style={{ padding: 14, borderRadius: 13, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 11 }}><span style={{ color }}>{icon}</span><div><strong style={{ fontSize: 22 }}>{value}</strong><div style={{ color: '#64748b', fontSize: 12 }}>{label}</div></div></div>
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 34, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12 }}>{text}</div>
}

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 20, marginBottom: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)' }
const inputStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', font: 'inherit', outlineColor: '#2563eb' }
const secondaryButton: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 13px', background: '#fff', color: '#334155', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7 }
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: '10px 14px', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 750, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }
const createGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }
const fieldStyle: CSSProperties = { display: 'grid', gap: 6, color: '#475569', fontSize: 12, fontWeight: 700 }
const filterButton: CSSProperties = { border: 0, borderRadius: 7, padding: '7px 11px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }
const memberRow: CSSProperties = { display: 'grid', gridTemplateColumns: '42px minmax(180px, 1fr) minmax(150px, 190px) minmax(125px, 150px)', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 13, padding: 12 }
const avatarStyle: CSSProperties = { width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#1d4ed8', background: '#eff6ff' }
const selectStyle: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 9px', background: '#fff', color: '#172033', minWidth: 0 }
const statusButton: CSSProperties = { border: 0, borderRadius: 9, padding: '9px 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontWeight: 750 }
