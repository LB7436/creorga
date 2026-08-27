import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Mail, Search, Settings, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchAuth } from '@/lib/fetchAuth'
import { toastError } from '@/lib/toast'
import DossierEmployeModal from './DossierEmployeModal'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface Employee {
  id: string
  role: string
  isActive: boolean
  prenom: string
  nom: string
  email: string
  avatar?: string | null
  profil?: {
    poste?: string | null
    contrat?: string | null
    heuresHebdo?: number | null
    statut?: string | null
  } | null
}

export default function EquipePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dossierId, setDossierId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const response = await fetchAuth(`${BACKEND}/api/hr-dossier/employes`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setEmployees(Array.isArray(data?.employes) ? data.employes : [])
    } catch (loadError: any) {
      setEmployees([])
      setError(true)
      toastError(`Équipe non chargée : ${loadError?.message || 'erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr')
    if (!query) return employees
    return employees.filter((employee) =>
      [employee.prenom, employee.nom, employee.email, employee.role, employee.profil?.poste, employee.profil?.contrat]
        .some((value) => String(value || '').toLocaleLowerCase('fr').includes(query)),
    )
  }, [employees, search])

  const active = employees.filter((employee) => employee.isActive).length
  const profiles = employees.filter((employee) => employee.profil).length

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 22px 50px', color: '#0f172a' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={eyebrow}>Ressources humaines</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(27px, 4vw, 38px)', letterSpacing: '-.03em' }}>Équipe</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>Les membres et dossiers affichés viennent uniquement de votre établissement.</p>
        </div>
        <Link to="/admin/users" style={primaryLink}><Settings size={17} /> Gérer les accès</Link>
      </header>

      <section className="team-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 13, marginTop: 24 }}>
        <Stat icon={<Users size={19} />} label="Membres" value={String(employees.length)} />
        <Stat icon={<UserRound size={19} />} label="Accès actifs" value={String(active)} />
        <Stat icon={<BriefcaseBusiness size={19} />} label="Dossiers renseignés" value={String(profiles)} />
      </section>

      <section style={{ marginTop: 18, border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 14px 40px rgba(15,23,42,.05)' }}>
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #e2e8f0' }}>
          <Search size={18} color="#64748b" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Rechercher dans l'équipe" placeholder="Nom, email, rôle ou poste" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, fontSize: 14 }} />
        </div>

        {loading ? <Empty title="Chargement de l'équipe…" /> : error ? (
          <Empty title="Impossible de charger l'équipe" action={<button type="button" onClick={load} style={button}>Réessayer</button>} />
        ) : filtered.length === 0 ? (
          <Empty title={search ? 'Aucun membre ne correspond' : 'Aucun membre dans cet établissement'} action={!search ? <Link to="/admin/users" style={primaryLink}>Configurer les utilisateurs</Link> : undefined} />
        ) : (
          <div className="team-grid" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 13 }}>
            {filtered.map((employee) => {
              const job = employee.profil?.poste || employee.role
              const contract = employee.profil?.contrat
              const activeEmployee = employee.isActive && employee.profil?.statut !== 'SORTI'
              return (
                <button key={employee.id} type="button" onClick={() => setDossierId(employee.id)} style={card}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {employee.avatar ? <img src={employee.avatar} alt="" style={avatar} /> : <span style={avatar}>{initials(employee)}</span>}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.prenom} {employee.nom}</strong>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', flex: '0 0 auto', marginTop: 4, background: activeEmployee ? '#10b981' : '#94a3b8' }} title={activeEmployee ? 'Actif' : 'Inactif'} />
                      </div>
                      <p style={{ margin: '5px 0 0', color: '#7c3aed', fontSize: 12, fontWeight: 700 }}>{job || 'Poste non renseigné'}</p>
                      {contract && <small style={{ display: 'block', marginTop: 4, color: '#64748b' }}>{contract}{employee.profil?.heuresHebdo ? ` · ${employee.profil.heuresHebdo} h/semaine` : ''}</small>}
                    </div>
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 7, alignItems: 'center', color: '#64748b', fontSize: 12 }}><Mail size={14} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.email}</span></div>
                  <span style={{ display: 'block', marginTop: 12, color: '#4f46e5', fontSize: 12, fontWeight: 750 }}>Ouvrir le dossier RH →</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {dossierId && <DossierEmployeModal userCompanyId={dossierId} onClose={() => setDossierId(null)} onEnregistre={load} />}

      <style>{`
        @media (max-width: 850px) { .team-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
        @media (max-width: 580px) { .team-grid, .team-stats { grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
  )
}

function initials(employee: Employee) {
  return `${employee.prenom?.[0] || ''}${employee.nom?.[0] || ''}`.toLocaleUpperCase('fr') || 'RH'
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div style={{ padding: '16px 18px', border: '1px solid #e2e8f0', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}><span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', color: '#7c3aed', background: '#f5f3ff' }}>{icon}</span><div><small style={{ color: '#64748b' }}>{label}</small><strong style={{ display: 'block', marginTop: 3, fontSize: 20 }}>{value}</strong></div></div>
}

function Empty({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div style={{ padding: '70px 20px', textAlign: 'center' }}><UserRound size={38} color="#cbd5e1" /><h3 style={{ margin: '14px 0 18px' }}>{title}</h3>{action}</div>
}

const eyebrow: React.CSSProperties = { margin: '0 0 6px', color: '#7c3aed', fontSize: 11, fontWeight: 850, letterSpacing: '.12em', textTransform: 'uppercase' }
const primaryLink: React.CSSProperties = { minHeight: 42, padding: '0 15px', borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#fff', background: '#7c3aed', textDecoration: 'none', fontSize: 13, fontWeight: 750 }
const button: React.CSSProperties = { minHeight: 42, padding: '0 15px', border: 0, borderRadius: 11, color: '#fff', background: '#7c3aed', fontSize: 13, fontWeight: 750, cursor: 'pointer' }
const card: React.CSSProperties = { padding: 16, border: '1px solid #e2e8f0', borderRadius: 15, color: '#0f172a', background: '#fff', textAlign: 'left', cursor: 'pointer', boxShadow: '0 8px 20px rgba(15,23,42,.04)' }
const avatar: React.CSSProperties = { width: 44, height: 44, borderRadius: 13, flex: '0 0 auto', display: 'grid', placeItems: 'center', objectFit: 'cover', color: '#6d28d9', background: '#ede9fe', fontSize: 13, fontWeight: 850 }
