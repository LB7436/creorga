import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { CheckCircle2, Clock3, LogIn, LogOut, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

type Member = { userId: string; user: { firstName: string; lastName: string; email: string } }
type Punch = { id: string; userId: string; clockIn: string; clockOut: string | null; user: { firstName: string; lastName: string } }
type Leave = { id: string; userId: string; type: string; startDate: string; endDate: string; status: string; notes?: string | null; user: { firstName: string; lastName: string } }

export default function HrTimePage({ view }: { view: 'punches' | 'leaves' }) {
  const [members, setMembers] = useState<Member[]>([])
  const [punches, setPunches] = useState<Punch[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [leaveForm, setLeaveForm] = useState({ userId: '', type: 'VACATION', startDate: '', endDate: '', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [teamResponse, punchResponse, leaveResponse] = await Promise.all([
        api.get<Member[]>('/hr/team'), api.get<Punch[]>('/hr/punches'), api.get<Leave[]>('/hr/leave-requests'),
      ])
      setMembers(teamResponse.data); setPunches(punchResponse.data); setLeaves(leaveResponse.data)
      if (!selectedUserId && teamResponse.data[0]) setSelectedUserId(teamResponse.data[0].userId)
      if (!leaveForm.userId && teamResponse.data[0]) setLeaveForm((value) => ({ ...value, userId: teamResponse.data[0].userId }))
    } catch (error: any) { toastError(error?.response?.data?.message || 'Impossible de charger les données RH') }
    finally { setLoading(false) }
  }, [leaveForm.userId, selectedUserId])

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function punch(direction: 'in' | 'out') {
    if (!selectedUserId) return toastError('Choisissez un collaborateur')
    try { await api.post(`/hr/punch/${direction}`, { userId: selectedUserId }); await load(); toastSuccess(direction === 'in' ? 'Entrée pointée' : 'Sortie pointée') }
    catch (error: any) { toastError(error?.response?.data?.message || 'Pointage impossible') }
  }

  async function createLeave(event: React.FormEvent) {
    event.preventDefault()
    try { await api.post('/hr/leave-requests', leaveForm); setLeaveForm((value) => ({ ...value, startDate: '', endDate: '', notes: '' })); await load(); toastSuccess('Demande de congé enregistrée') }
    catch (error: any) { toastError(error?.response?.data?.message || 'Enregistrement impossible') }
  }

  async function setLeaveStatus(leave: Leave, status: 'APPROVED' | 'REJECTED') {
    try { await api.put(`/hr/leave-requests/${leave.id}/status`, { status }); await load(); toastSuccess(status === 'APPROVED' ? 'Congé approuvé' : 'Congé refusé') }
    catch (error: any) { toastError(error?.response?.data?.message || 'Modification impossible') }
  }

  const memberName = (id: string) => { const member = members.find((entry) => entry.userId === id); return member ? `${member.user.firstName} ${member.user.lastName}` : id }
  return <main style={page}><header style={header}><div><p style={eyebrow}>Gestion d’équipe</p><h1 style={title}>{view === 'punches' ? 'Pointages' : 'Congés'}</h1><p style={subtitle}>Données réelles, enregistrées pour votre société.</p></div><button onClick={() => void load()} disabled={loading} style={secondary}><RefreshCw size={16} /> Actualiser</button></header>
    {view === 'punches' ? <><section style={card}><h2 style={h2}><Clock3 size={19} /> Pointer un collaborateur</h2><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} style={{ ...input, flex: '1 1 240px' }}>{members.map((member) => <option key={member.userId} value={member.userId}>{member.user.firstName} {member.user.lastName}</option>)}</select><button onClick={() => void punch('in')} style={primary}><LogIn size={16} /> Entrée</button><button onClick={() => void punch('out')} style={secondary}><LogOut size={16} /> Sortie</button></div></section><section style={card}><h2 style={h2}>Historique</h2>{punches.length === 0 ? <Empty text="Aucun pointage." /> : punches.map((punch) => <article key={punch.id} style={row}><div><strong>{punch.user.firstName} {punch.user.lastName}</strong><div style={small}>Entrée : {new Date(punch.clockIn).toLocaleString('fr-LU')}</div></div>{punch.clockOut ? <span style={good}><CheckCircle2 size={14} /> Sortie {new Date(punch.clockOut).toLocaleString('fr-LU')}</span> : <span style={open}>En service</span>}</article>)}</section></> : <><form onSubmit={createLeave} style={card}><h2 style={h2}>Nouvelle demande</h2><div style={grid}><label style={label}>Collaborateur<select required value={leaveForm.userId} onChange={(event) => setLeaveForm({ ...leaveForm, userId: event.target.value })} style={input}>{members.map((member) => <option key={member.userId} value={member.userId}>{member.user.firstName} {member.user.lastName}</option>)}</select></label><label style={label}>Type<select value={leaveForm.type} onChange={(event) => setLeaveForm({ ...leaveForm, type: event.target.value })} style={input}><option value="VACATION">Vacances</option><option value="SICK">Maladie</option><option value="OTHER">Autre</option></select></label><label style={label}>Début<input required type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm({ ...leaveForm, startDate: event.target.value })} style={input} /></label><label style={label}>Fin<input required type="date" value={leaveForm.endDate} onChange={(event) => setLeaveForm({ ...leaveForm, endDate: event.target.value })} style={input} /></label><label style={label}>Note<input value={leaveForm.notes} onChange={(event) => setLeaveForm({ ...leaveForm, notes: event.target.value })} style={input} /></label></div><button style={primary}>Enregistrer la demande</button></form><section style={card}>{leaves.length === 0 ? <Empty text="Aucune demande de congé." /> : leaves.map((leave) => <article key={leave.id} style={row}><div><strong>{memberName(leave.userId)} · {leave.type}</strong><div style={small}>{new Date(leave.startDate).toLocaleDateString('fr-LU')} – {new Date(leave.endDate).toLocaleDateString('fr-LU')}{leave.notes ? ` · ${leave.notes}` : ''}</div></div>{leave.status === 'PENDING' ? <div style={{ display: 'flex', gap: 7 }}><button onClick={() => void setLeaveStatus(leave, 'APPROVED')} style={primary}>Approuver</button><button onClick={() => void setLeaveStatus(leave, 'REJECTED')} style={secondary}>Refuser</button></div> : <span style={leave.status === 'APPROVED' ? good : rejected}>{leave.status === 'APPROVED' ? 'Approuvé' : 'Refusé'}</span>}</article>)}</section></>}
  </main>
}

function Empty({ text }: { text: string }) { return <div style={{ padding: 28, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12 }}>{text}</div> }
const page: CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '26px 20px 50px', color: '#0f172a' }
const header: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }
const eyebrow: CSSProperties = { margin: 0, color: '#991b1b', fontSize: 12, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '.1em' }
const title: CSSProperties = { margin: '4px 0 0', fontSize: 32, letterSpacing: '-.03em' }
const subtitle: CSSProperties = { color: '#64748b', margin: '7px 0 0' }
const card: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)', marginBottom: 16 }
const h2: CSSProperties = { margin: '0 0 14px', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 11, marginBottom: 13 }
const label: CSSProperties = { display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }
const input: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 9, padding: '9px 10px', color: '#0f172a', background: '#fff', font: 'inherit', boxSizing: 'border-box' }
const primary: CSSProperties = { border: 0, borderRadius: 9, padding: '9px 13px', background: '#991b1b', color: '#fff', fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
const secondary: CSSProperties = { ...primary, background: '#fff', color: '#334155', border: '1px solid #cbd5e1' }
const row: CSSProperties = { padding: 13, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }
const small: CSSProperties = { color: '#64748b', fontSize: 12 }
const good: CSSProperties = { borderRadius: 999, padding: '6px 9px', background: '#ecfdf5', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 750 }
const open: CSSProperties = { ...good, background: '#eff6ff', color: '#1d4ed8' }
const rejected: CSSProperties = { ...good, background: '#fef2f2', color: '#b91c1c' }
