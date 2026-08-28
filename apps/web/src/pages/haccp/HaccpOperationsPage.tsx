import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Plus, RefreshCw, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { useAuthStore } from '@/stores/authStore'

type Log = { id: string; type: string; value: number | null; notes: string | null; loggedAt: string; loggedBy: string; isCompliant: boolean }
type Task = { id: string; name: string; frequency: string; timeOfDay: string; isActive: boolean }
type Report = { totalLogs: number; compliantCount: number; nonCompliantCount: number; complianceRate: number; activeTasks: number }
type View = 'journee' | 'temperatures' | 'taches' | 'historique'

export default function HaccpOperationsPage({ view = 'journee' }: { view?: View }) {
  const user = useAuthStore((state) => state.user)
  const [logs, setLogs] = useState<Log[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [logForm, setLogForm] = useState({ type: view === 'temperatures' ? 'FRIDGE_TEMP' : 'CLEANING', value: '', notes: '', isCompliant: true })
  const [taskForm, setTaskForm] = useState({ name: '', frequency: 'DAILY', timeOfDay: 'MORNING' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [logsResponse, tasksResponse, reportResponse] = await Promise.all([
        api.get<Log[]>('/haccp/logs'), api.get<Task[]>('/haccp/tasks'), api.get<Report>('/haccp/daily-report'),
      ])
      setLogs(logsResponse.data); setTasks(tasksResponse.data); setReport(reportResponse.data)
    } catch (error: any) { toastError(error?.response?.data?.message || 'Impossible de charger HACCP') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const displayedLogs = useMemo(() => view === 'temperatures' ? logs.filter((log) => log.type === 'FRIDGE_TEMP') : logs, [logs, view])

  async function createLog(event: React.FormEvent) {
    event.preventDefault(); setBusy(true)
    try {
      await api.post('/haccp/logs', {
        ...logForm,
        type: view === 'temperatures' ? 'FRIDGE_TEMP' : logForm.type,
        value: logForm.value === '' ? null : Number(logForm.value),
        loggedBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Utilisateur',
      })
      setLogForm((value) => ({ ...value, value: '', notes: '', isCompliant: true })); await load(); toastSuccess('Contrôle HACCP enregistré')
    } catch (error: any) { toastError(error?.response?.data?.message || 'Enregistrement impossible') } finally { setBusy(false) }
  }

  async function createTask(event: React.FormEvent) {
    event.preventDefault(); setBusy(true)
    try { await api.post('/haccp/tasks', taskForm); setTaskForm({ name: '', frequency: 'DAILY', timeOfDay: 'MORNING' }); await load(); toastSuccess('Tâche HACCP enregistrée') }
    catch (error: any) { toastError(error?.response?.data?.message || 'Enregistrement impossible') } finally { setBusy(false) }
  }

  async function toggleTask(task: Task) {
    try { await api.put(`/haccp/tasks/${task.id}`, { isActive: !task.isActive }); await load(); toastSuccess('Tâche mise à jour') }
    catch (error: any) { toastError(error?.response?.data?.message || 'Modification impossible') }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Supprimer la tâche « ${task.name} » ?`)) return
    try { await api.delete(`/haccp/tasks/${task.id}`); await load(); toastSuccess('Tâche supprimée') }
    catch (error: any) { toastError(error?.response?.data?.message || 'Suppression impossible') }
  }

  const title = view === 'temperatures' ? 'Températures' : view === 'taches' ? 'Tâches de contrôle' : view === 'historique' ? 'Historique HACCP' : 'Contrôles du jour'
  return <main style={page}>
    <header style={header}><div><p style={eyebrow}>Traçabilité réelle</p><h1 style={titleStyle}>{title}</h1><p style={subtitle}>Les validations sont datées et enregistrées dans la base de votre société.</p></div><button onClick={() => void load()} disabled={loading} style={secondary}><RefreshCw size={16} /> Actualiser</button></header>
    <section style={stats}><Stat label="Contrôles aujourd’hui" value={report?.totalLogs ?? 0} /><Stat label="Conformes" value={report?.compliantCount ?? 0} good /><Stat label="Non conformes" value={report?.nonCompliantCount ?? 0} warn /><Stat label="Taux" value={`${Math.round(report?.complianceRate ?? 100)} %`} /></section>
    {view !== 'taches' && view !== 'historique' && <form onSubmit={createLog} style={card}><h2 style={h2}><ClipboardCheck size={19} /> Nouveau contrôle</h2><div style={grid}>{view !== 'temperatures' && <label style={label}>Type<select value={logForm.type} onChange={(e) => setLogForm({ ...logForm, type: e.target.value })} style={input}><option value="CLEANING">Nettoyage</option><option value="RECEIVING">Réception marchandise</option><option value="PEST_CONTROL">Nuisibles</option><option value="FRIDGE_TEMP">Température</option></select></label>}<label style={label}>{view === 'temperatures' ? 'Température (°C)' : 'Valeur (facultative)'}<input type="number" step="0.1" value={logForm.value} onChange={(e) => setLogForm({ ...logForm, value: e.target.value })} style={input} /></label><label style={label}>Notes<input maxLength={1000} value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} style={input} /></label><label style={{ ...label, alignContent: 'end' }}><span>Résultat</span><span style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 38 }}><input type="checkbox" checked={logForm.isCompliant} onChange={(e) => setLogForm({ ...logForm, isCompliant: e.target.checked })} /> Conforme</span></label></div><button disabled={busy} style={primary}><Plus size={16} /> Enregistrer le contrôle</button></form>}
    {view === 'taches' && <form onSubmit={createTask} style={card}><h2 style={h2}>Nouvelle tâche récurrente</h2><div style={grid}><label style={label}>Tâche<input required value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} style={input} /></label><label style={label}>Fréquence<select value={taskForm.frequency} onChange={(e) => setTaskForm({ ...taskForm, frequency: e.target.value })} style={input}><option value="DAILY">Chaque jour</option><option value="WEEKLY">Chaque semaine</option><option value="MONTHLY">Chaque mois</option></select></label><label style={label}>Moment<select value={taskForm.timeOfDay} onChange={(e) => setTaskForm({ ...taskForm, timeOfDay: e.target.value })} style={input}><option value="MORNING">Ouverture</option><option value="MIDDAY">Midi</option><option value="CLOSING">Fermeture</option></select></label></div><button disabled={busy} style={primary}>Enregistrer la tâche</button></form>}
    <section style={card}><h2 style={h2}>{view === 'taches' ? 'Tâches enregistrées' : 'Contrôles enregistrés'}</h2>{loading ? <Empty text="Chargement…" /> : view === 'taches' ? (tasks.length === 0 ? <Empty text="Aucune tâche HACCP." /> : tasks.map((task) => <article key={task.id} style={row}><div><strong>{task.name}</strong><div style={small}>{task.frequency} · {task.timeOfDay}</div></div><div style={{ display: 'flex', gap: 8 }}><button onClick={() => void toggleTask(task)} style={task.isActive ? goodBadge : mutedBadge}>{task.isActive ? 'Active' : 'Désactivée'}</button><button onClick={() => void deleteTask(task)} aria-label={`Supprimer ${task.name}`} style={danger}><Trash2 size={15} /></button></div></article>)) : (displayedLogs.length === 0 ? <Empty text="Aucun contrôle enregistré." /> : displayedLogs.map((log) => <article key={log.id} style={row}><div><strong>{typeLabel(log.type)}{log.value !== null ? ` · ${log.value}${log.type === 'FRIDGE_TEMP' ? ' °C' : ''}` : ''}</strong><div style={small}>{new Date(log.loggedAt).toLocaleString('fr-LU')} · {log.loggedBy}{log.notes ? ` · ${log.notes}` : ''}</div></div>{log.isCompliant ? <span style={goodBadge}><CheckCircle2 size={14} /> Conforme</span> : <span style={warnBadge}><AlertTriangle size={14} /> Non conforme</span>}</article>))}</section>
  </main>
}

function typeLabel(type: string) { return ({ FRIDGE_TEMP: 'Température', CLEANING: 'Nettoyage', RECEIVING: 'Réception', PEST_CONTROL: 'Nuisibles' } as Record<string, string>)[type] || type }
function Stat({ label: text, value, good, warn }: { label: string; value: string | number; good?: boolean; warn?: boolean }) { return <div style={{ ...card, margin: 0 }}><span style={small}>{text}</span><strong style={{ display: 'block', marginTop: 4, fontSize: 25, color: good ? '#047857' : warn ? '#b91c1c' : '#0f172a' }}>{value}</strong></div> }
function Empty({ text }: { text: string }) { return <div style={{ padding: 28, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12 }}>{text}</div> }
const page: CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '26px 20px 50px', color: '#0f172a' }
const header: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }
const eyebrow: CSSProperties = { margin: 0, color: '#b45309', fontSize: 12, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '.1em' }
const titleStyle: CSSProperties = { margin: '4px 0 0', fontSize: 32, letterSpacing: '-.03em' }
const subtitle: CSSProperties = { color: '#64748b', margin: '7px 0 0' }
const card: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)', marginBottom: 16 }
const stats: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }
const h2: CSSProperties = { margin: '0 0 14px', fontSize: 18, display: 'flex', gap: 8, alignItems: 'center' }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 11, marginBottom: 13 }
const label: CSSProperties = { display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }
const input: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 9, padding: '9px 10px', color: '#0f172a', background: '#fff', font: 'inherit', boxSizing: 'border-box', width: '100%' }
const primary: CSSProperties = { border: 0, borderRadius: 9, padding: '9px 13px', background: '#b45309', color: '#fff', fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
const secondary: CSSProperties = { ...primary, background: '#fff', color: '#334155', border: '1px solid #cbd5e1' }
const row: CSSProperties = { padding: 13, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }
const small: CSSProperties = { color: '#64748b', fontSize: 12 }
const goodBadge: CSSProperties = { border: 0, borderRadius: 999, padding: '6px 9px', background: '#ecfdf5', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 750, cursor: 'pointer' }
const warnBadge: CSSProperties = { ...goodBadge, background: '#fef2f2', color: '#b91c1c', cursor: 'default' }
const mutedBadge: CSSProperties = { ...goodBadge, background: '#f1f5f9', color: '#64748b' }
const danger: CSSProperties = { border: 0, borderRadius: 8, padding: 7, background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }
