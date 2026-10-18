import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { CheckCircle2, Plus, RefreshCw, Search, ShieldCheck, UserRound, UsersRound, XCircle } from 'lucide-react'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { useAuthStore } from '@/stores/authStore'

type MemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SERVER' | 'CASHIER' | 'EMPLOYEE'
type Member = {
  id: string
  userId: string
  companyId: string
  role: MemberRole | string
  isActive: boolean
  createdAt: string
  capabilities?: Record<string, boolean>
  accessVersion?: number
  user: { id: string; firstName: string; lastName: string; email: string }
}

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Propriétaire', ADMIN: 'Administrateur métier', MANAGER: 'Responsable', SERVER: 'Serveur', CASHIER: 'Caissier', EMPLOYEE: 'Employé limité',
}
const CAPABILITY_LABELS: Record<string, string> = {
  'finance.revenue.read': 'Voir le chiffre d’affaires et les ventes', 'finance.costs.read': 'Voir les coûts d’achat et marges', 'finance.manage': 'Gérer la comptabilité et la trésorerie',
  'inventory.quantities.read': 'Voir les quantités de stock', 'inventory.adjust': 'Modifier les stocks', 'catalog.read': 'Lire le catalogue', 'catalog.prices.write': 'Modifier les prix et le catalogue',
  'service.read': 'Consulter la salle et la préparation', 'service.manage': 'Prendre et transférer les commandes', 'payments.receive': 'Encaisser et reprendre ses règlements',
  'discounts.grant': 'Accorder des remises et répartitions financières', 'complimentary.grant': 'Autoriser les offerts', 'orders.cancel': 'Annuler les commandes', 'refunds.declare': 'Déclarer les remboursements',
  'cash.open': 'Ouvrir un tiroir-caisse', 'cash.close': 'Compter et clôturer le tiroir (hors CA)', 'invoices.read': 'Lire les factures et avoirs', 'invoices.write': 'Créer et émettre les documents financiers', 'exports.read': 'Partager et exporter les documents',
  'hr.manage': 'Gérer les dossiers et demandes du personnel', 'hr.self': 'Consulter son dossier et ses pointages', 'hr.schedule.read': 'Lire son planning', 'hr.schedule.manage': 'Gérer et publier les plannings de l’équipe',
  'settings.manage': 'Gérer les paramètres de l’établissement', 'permissions.manage': 'Administrer les autorisations déléguées', 'assistant.use': 'Ouvrir l’assistant', 'assistant.business.read': 'Consulter les données autorisées avec Robi',
  'haccp.record': 'Consigner les relevés HACCP', 'haccp.manage': 'Gérer les procédures HACCP', 'crm.customers.read': 'Consulter les clients', 'marketing.read': 'Consulter le marketing', 'reputation.read': 'Consulter la réputation',
}

export default function AdminUsers() {
  const currentUser = useAuthStore((state) => state.user)
  const access = useAuthStore((state) => state.businessAccess)
  const company = useAuthStore((state) => state.company)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const editing = useRef(false)
  const [permissionDraft, setPermissionDraft] = useState<Member | null>(null)
  const [permissionReason, setPermissionReason] = useState('')
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

  const updateMember = async (member: Member, patch: Partial<Pick<Member, 'role' | 'isActive' | 'capabilities'>>, reason: string) => {
    if (editing.current) return false
    editing.current = true
    setUpdating(member.userId)
    try {
      const { data } = await api.patch<Member>(`/companies/members/${member.userId}`, { ...patch, expectedAccessVersion: member.accessVersion ?? 0, reason })
      setMembers((items) => items.map((item) => item.userId === member.userId ? data : item))
      toastSuccess('Accès enregistré sur le serveur')
      return true
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Impossible de modifier l'accès")
      return false
    } finally {
      editing.current = false
      setUpdating(null)
    }
  }

  const isOwner = access?.capabilities.includes('permissions.manage') === true
  const editPermissions = (member: Member) => { setPermissionDraft({ ...member, capabilities: { ...member.capabilities } }); setPermissionReason('') }

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
            <label style={fieldStyle}>Rôle<select value={newMember.role} onChange={(event) => setNewMember((value) => ({ ...value, role: event.target.value as Exclude<MemberRole, 'OWNER'> }))} style={selectStyle}>{Object.entries(ROLE_LABELS).filter(([role]) => role !== 'OWNER').map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
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
                    <select value={normalizeRole(member.role)} disabled={disabled} onChange={(event) => editPermissions({ ...member, role: event.target.value as MemberRole })} style={selectStyle}>
                      {(member.role === 'OWNER' ? [['OWNER', ROLE_LABELS.OWNER]] : Object.entries(ROLE_LABELS).filter(([role]) => role !== 'OWNER')).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <button type="button" disabled={disabled} onClick={() => void updateMember(member, { isActive: !member.isActive }, member.isActive ? 'Désactivation explicite du compte depuis Administration' : 'Réactivation explicite du compte depuis Administration')}
                    style={{ ...statusButton, background: member.isActive ? '#ecfdf5' : '#fef2f2', color: member.isActive ? '#047857' : '#b91c1c', opacity: disabled && !self ? 0.6 : 1 }}>
                    {member.isActive ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    {updating === member.userId ? 'Enregistrement…' : member.isActive ? 'Actif' : 'Désactivé'}
                  </button>
                  {member.role !== 'OWNER' && <button type="button" disabled={disabled} onClick={() => editPermissions(member)} style={{ ...secondaryButton, gridColumn: '2 / -1', justifySelf: 'start' }}>Droits et autorisations</button>}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {permissionDraft && <section style={cardStyle} aria-label="Éditeur des droits">
        <h2>Autorisations de {permissionDraft.user.firstName} {permissionDraft.user.lastName}</h2>
        <p>Les capacités héritées suivent le rôle choisi. Un refus explicite prime sur ce rôle ; aucune autorisation ne donne accès à une autre société ou à la plateforme.</p>
        <label style={fieldStyle}>Rôle métier<select value={permissionDraft.role} onChange={event => setPermissionDraft({ ...permissionDraft, role: event.target.value })} style={selectStyle}>{Object.entries(ROLE_LABELS).filter(([role]) => role !== 'OWNER').map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
        <div style={{ ...createGridStyle, marginTop: 16 }}>{Object.entries(CAPABILITY_LABELS).map(([key, label]) => <label key={key} style={fieldStyle}>{label}<select aria-label={label} value={permissionDraft.capabilities?.[key] === undefined ? 'inherit' : String(permissionDraft.capabilities[key])} style={selectStyle} onChange={event => {
          const overrides = { ...permissionDraft.capabilities }
          if (event.target.value === 'inherit') delete overrides[key]; else overrides[key] = event.target.value === 'true'
          setPermissionDraft({ ...permissionDraft, capabilities: overrides })
        }}><option value="inherit">Hérité du rôle</option><option value="false">Refuser explicitement</option><option value="true">Autoriser explicitement</option></select></label>)}</div>
        <label style={{ ...fieldStyle, marginTop: 16 }}>Motif de la décision<textarea value={permissionReason} onChange={event => setPermissionReason(event.target.value)} minLength={5} maxLength={500} style={inputStyle} /></label>
        <p>Le changement est versionné et journalisé. Un conflit impose une relecture ; une ancienne réponse ne remplace pas des droits plus récents.</p>
        <div style={{ display: 'flex', gap: 10 }}><button type="button" disabled={!!updating || permissionReason.trim().length < 5} style={primaryButton} onClick={async () => {
          if (await updateMember(permissionDraft, { role: permissionDraft.role, capabilities: permissionDraft.capabilities ?? {} }, permissionReason)) setPermissionDraft(null)
        }}>Enregistrer les droits</button><button type="button" style={secondaryButton} onClick={() => setPermissionDraft(null)}>Annuler</button></div>
      </section>}

      <aside style={{ ...cardStyle, background: '#f8fafc', color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
        <strong style={{ color: '#172033' }}>Sécurité des accès</strong><br />
        Votre propre accès propriétaire et le dernier propriétaire actif sont protégés. Les comptes créés ici sont de vrais accès enregistrés en base. Transmettez le mot de passe temporaire par un canal sûr et demandez au collaborateur de le conserver confidentiel.
      </aside>
    </div>
  )
}

function normalizeRole(role: string): MemberRole {
  if (Object.prototype.hasOwnProperty.call(ROLE_LABELS, role)) return role as MemberRole
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
