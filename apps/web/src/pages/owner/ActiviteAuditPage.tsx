import { useEffect, useMemo, useState } from 'react'
import { Activity, Filter } from 'lucide-react'
import { fetchAuth } from '@/lib/fetchAuth'

type AuditEntry = {
  id: string
  ts: string
  userId: string
  method: string
  path: string
  status?: number
  module?: string
  body?: Record<string, string>
}

export default function ActiviteAuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([])
  const [user, setUser] = useState('')
  const [module, setModule] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (user) params.set('user', user)
    if (module) params.set('module', module)
    if (date) params.set('date', date)
    fetchAuth(`/api/owner/audit?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
  }, [date, module, user])

  const modules = useMemo(() => Array.from(new Set(items.map((item) => item.module).filter(Boolean))), [items])

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#86efac', fontWeight: 900, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            <Activity size={16} /> Audit systeme
          </div>
          <h1 style={{ margin: '8px 0 4px', color: '#f8fafc', fontSize: 30, fontWeight: 900 }}>Activite</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>Timeline chronologique des actions sensibles POST, PUT, PATCH et DELETE.</p>
        </div>
        <div style={{ color: '#bbf7d0', fontWeight: 900 }}>{items.length} actions</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: 10, marginBottom: 22, padding: 14, border: '1px solid rgba(148,163,184,0.14)', borderRadius: 16, background: 'rgba(15,23,42,0.58)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1' }}>
          <Filter size={14} />
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Utilisateur" style={inputStyle} />
        </label>
        <input value={module} onChange={(e) => setModule(e.target.value)} list="audit-modules" placeholder="Module" style={inputStyle} />
        <datalist id="audit-modules">{modules.map((m) => <option key={m} value={m} />)}</datalist>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ position: 'relative', paddingLeft: 26 }}>
        <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'linear-gradient(#22c55e, rgba(34,197,94,0))' }} />
        {items.map((entry) => (
          <div key={entry.id} style={{ position: 'relative', marginBottom: 14, padding: 16, border: '1px solid rgba(148,163,184,0.14)', borderRadius: 16, background: 'rgba(15,23,42,0.72)' }}>
            <div style={{ position: 'absolute', left: -24, top: 18, width: 14, height: 14, borderRadius: 999, background: methodColor(entry.method), boxShadow: `0 0 0 4px rgba(15,23,42,1)` }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ color: '#f8fafc', fontWeight: 900 }}>{entry.method} {entry.path}</div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(entry.ts).toLocaleString('fr-LU')}</div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
              <span style={pillStyle}>user: {entry.userId}</span>
              <span style={pillStyle}>module: {entry.module || 'system'}</span>
              <span style={pillStyle}>status: {entry.status || '-'}</span>
            </div>
            {entry.body && Object.keys(entry.body).length > 0 && (
              <pre style={{ margin: '10px 0 0', color: '#cbd5e1', fontSize: 11, whiteSpace: 'pre-wrap', background: 'rgba(2,6,23,0.42)', borderRadius: 12, padding: 10 }}>
                {JSON.stringify(entry.body, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {!items.length && (
          <div style={{ padding: 30, color: '#94a3b8', textAlign: 'center', border: '1px dashed rgba(148,163,184,0.2)', borderRadius: 16 }}>
            Aucune action auditee pour ces filtres.
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(2,6,23,0.42)',
  color: '#f8fafc',
  borderRadius: 12,
  padding: '10px 12px',
  outline: 'none',
}

const pillStyle: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,0.16)',
  background: 'rgba(255,255,255,0.05)',
  color: '#cbd5e1',
  borderRadius: 999,
  padding: '4px 9px',
}

function methodColor(method: string) {
  if (method === 'DELETE') return '#ef4444'
  if (method === 'POST') return '#22c55e'
  if (method === 'PATCH') return '#f59e0b'
  return '#38bdf8'
}
