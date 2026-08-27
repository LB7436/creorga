import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CheckCircle2, RefreshCw, Search, ShieldCheck, UserRound, UsersRound, XCircle } from 'lucide-react'
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

  return (
    <div style={{ color: '#172033', maxWidth: 1120, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.03em' }}>Utilisateurs et accès</h1>
          <p style={{ color: '#64748b', margin: '7px 0 0' }}>Membres réels de {company?.name || "l'établissement"}.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} style={secondaryButton}>
          <RefreshCw size={15} className={loading ? 'spin' : undefined} /> Actualiser
        </button>
      </header>

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
                      {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
        Votre propre accès propriétaire et le dernier propriétaire actif sont protégés. Une confirmation de succès apparaît uniquement après l'enregistrement serveur. L'invitation par email n'est pas affichée tant que le lien d'invitation sécurisé n'est pas disponible.
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
const filterButton: CSSProperties = { border: 0, borderRadius: 7, padding: '7px 11px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }
const memberRow: CSSProperties = { display: 'grid', gridTemplateColumns: '42px minmax(180px, 1fr) minmax(150px, 190px) minmax(125px, 150px)', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 13, padding: 12 }
const avatarStyle: CSSProperties = { width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#1d4ed8', background: '#eff6ff' }
const selectStyle: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 9px', background: '#fff', color: '#172033', minWidth: 0 }
const statusButton: CSSProperties = { border: 0, borderRadius: 9, padding: '9px 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontWeight: 750 }
