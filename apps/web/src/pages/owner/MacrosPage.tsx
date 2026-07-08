import { useEffect, useState } from 'react'
import { Play, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'

type Macro = { id: string; name: string; icon: string; intents: string[] }

export default function MacrosPage() {
  const [macros, setMacros] = useState<Macro[]>([])
  const [name, setName] = useState('Fin de service')
  const [icon, setIcon] = useState('🏁')
  const [intents, setIntents] = useState('pos.close-all-tables\nacc.cloture-caisse\ndaily-briefing.evening')
  const [status, setStatus] = useState('')

  const load = () => { api.get('/owner/macros').then((r) => setMacros(Array.isArray(r.data) ? r.data : [])).catch(() => setMacros([])) }
  useEffect(() => { load() }, [])

  const save = async () => {
    const body = { name, icon, intents: intents.split('\n').map((line) => line.trim()).filter(Boolean) }
    await api.post('/owner/macros', body)
    setStatus('Macro enregistree')
    load()
  }

  const execute = async (macro: Macro) => {
    setStatus(`Execution: ${macro.name}`)
    await api.post('/assistant/workflow', { text: macro.intents.join(' et ') }).catch(() => undefined)
    setStatus(`Workflow lance: ${macro.name}`)
  }

  const remove = async (id: string) => {
    await api.delete(`/owner/macros/${id}`)
    load()
  }

  return (
    <div style={{ padding: 28, maxWidth: 1180, margin: '0 auto' }}>
      <h1 style={{ color: '#f8fafc', fontSize: 30, margin: 0 }}>Stickers d'action patron</h1>
      <p style={{ color: '#94a3b8', marginTop: 6 }}>Creez des macros qui enchainent plusieurs intents Robi en un geste.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, marginTop: 22 }}>
        <div style={card}>
          <h2 style={title}>Nouvelle macro</h2>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" style={input} />
          <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Emoji" style={input} />
          <textarea value={intents} onChange={(e) => setIntents(e.target.value)} rows={8} style={{ ...input, resize: 'vertical' }} />
          <button onClick={save} style={primary}><Plus size={15} /> Enregistrer</button>
          {status && <p style={{ color: '#86efac', fontSize: 12, fontWeight: 800 }}>{status}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {macros.map((macro) => (
            <div key={macro.id} style={card}>
              <div style={{ fontSize: 34 }}>{macro.icon}</div>
              <h3 style={{ color: '#f8fafc', margin: '8px 0 4px' }}>{macro.name}</h3>
              <ul style={{ color: '#cbd5e1', paddingLeft: 18, minHeight: 76, fontSize: 12 }}>
                {macro.intents.map((intent) => <li key={intent}>{intent}</li>)}
              </ul>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => execute(macro)} style={primary}><Play size={14} /> Execute</button>
                <button onClick={() => remove(macro.id)} style={danger}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const card: React.CSSProperties = { border: '1px solid rgba(148,163,184,0.16)', background: 'rgba(15,23,42,0.72)', borderRadius: 18, padding: 18 }
const title: React.CSSProperties = { margin: '0 0 12px', color: '#f8fafc', fontSize: 18 }
const input: React.CSSProperties = { width: '100%', marginBottom: 10, borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(2,6,23,0.5)', color: '#fff', padding: '11px 12px', boxSizing: 'border-box' }
const primary: React.CSSProperties = { border: 'none', borderRadius: 12, background: '#16a34a', color: '#fff', padding: '10px 12px', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 900 }
const danger: React.CSSProperties = { border: 'none', borderRadius: 12, background: 'rgba(239,68,68,0.18)', color: '#fecaca', padding: '10px 12px', cursor: 'pointer' }
