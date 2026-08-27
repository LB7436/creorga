import { useEffect, useState } from 'react'
import { Play, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'

type Macro = { id: string; name: string; icon: string; intents: string[] }
type Feedback = { kind: 'success' | 'error' | 'info'; text: string }

export default function MacrosPage() {
  const [macros, setMacros] = useState<Macro[]>([])
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('⚡')
  const [intents, setIntents] = useState('')
  const [status, setStatus] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const response = await api.get('/owner/macros')
      setMacros(Array.isArray(response.data) ? response.data : [])
    } catch {
      setMacros([])
      setStatus({ kind: 'error', text: 'Impossible de charger les macros sauvegardées.' })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    const actions = intents.split('\n').map((line) => line.trim()).filter(Boolean)
    if (!name.trim() || actions.length === 0) {
      setStatus({ kind: 'error', text: 'Donnez un nom et au moins une action à la macro.' })
      return
    }
    setPending('save')
    setStatus({ kind: 'info', text: 'Enregistrement en cours…' })
    try {
      await api.post('/owner/macros', { name: name.trim(), icon, intents: actions })
      setName('')
      setIcon('⚡')
      setIntents('')
      setStatus({ kind: 'success', text: 'Macro enregistrée sur le serveur.' })
      await load()
    } catch {
      setStatus({ kind: 'error', text: "La macro n'a pas pu être enregistrée." })
    } finally {
      setPending(null)
    }
  }

  const execute = async (macro: Macro) => {
    setPending(`run:${macro.id}`)
    setStatus({ kind: 'info', text: `Exécution de « ${macro.name} »…` })
    try {
      const response = await api.post('/assistant/workflow', {
        text: macro.intents.join(' puis '),
        currentPath: window.location.pathname,
      })
      if (response.data?.success === false || response.data?.kind === 'error') {
        throw new Error(response.data?.summary || response.data?.text || 'Échec du workflow')
      }
      setStatus({ kind: 'success', text: response.data?.summary || `Macro « ${macro.name} » exécutée.` })
    } catch (error: any) {
      setStatus({ kind: 'error', text: error?.response?.data?.message || error?.message || `Échec de « ${macro.name} ».` })
    } finally {
      setPending(null)
    }
  }

  const remove = async (macro: Macro) => {
    if (!window.confirm(`Supprimer définitivement la macro « ${macro.name} » ?`)) return
    setPending(`delete:${macro.id}`)
    try {
      await api.delete(`/owner/macros/${macro.id}`)
      setStatus({ kind: 'success', text: `Macro « ${macro.name} » supprimée.` })
      await load()
    } catch {
      setStatus({ kind: 'error', text: "La macro n'a pas pu être supprimée." })
    } finally {
      setPending(null)
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 1180, margin: '0 auto' }}>
      <h1 style={{ color: '#f8fafc', fontSize: 30, margin: 0 }}>Macros d'action</h1>
      <p style={{ color: '#94a3b8', marginTop: 6 }}>Créez une suite d'instructions Robi, sauvegardée uniquement pour votre établissement.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, marginTop: 22 }}>
        <div style={card}>
          <h2 style={title}>Nouvelle macro</h2>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" style={input} />
          <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Emoji" style={input} />
          <textarea value={intents} onChange={(e) => setIntents(e.target.value)} rows={8} placeholder={'Une instruction par ligne\nEx. Ferme la table 4'} style={{ ...input, resize: 'vertical' }} />
          <button onClick={save} disabled={pending === 'save'} style={{ ...primary, opacity: pending === 'save' ? .65 : 1 }}><Plus size={15} /> {pending === 'save' ? 'Enregistrement…' : 'Enregistrer'}</button>
          {status && <p role="status" style={{ color: status.kind === 'error' ? '#fca5a5' : status.kind === 'success' ? '#86efac' : '#bfdbfe', fontSize: 12, fontWeight: 800 }}>{status.text}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {!loading && macros.length === 0 && (
            <div style={{ ...card, color: '#94a3b8', minHeight: 140, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              Aucune macro enregistrée. Créez la première à gauche.
            </div>
          )}
          {loading && <div style={{ ...card, color: '#94a3b8' }}>Chargement des macros…</div>}
          {macros.map((macro) => (
            <div key={macro.id} style={card}>
              <div style={{ fontSize: 34 }}>{macro.icon}</div>
              <h3 style={{ color: '#f8fafc', margin: '8px 0 4px' }}>{macro.name}</h3>
              <ul style={{ color: '#cbd5e1', paddingLeft: 18, minHeight: 76, fontSize: 12 }}>
                {macro.intents.map((intent) => <li key={intent}>{intent}</li>)}
              </ul>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => execute(macro)} disabled={pending !== null} style={{ ...primary, opacity: pending ? .65 : 1 }}><Play size={14} /> {pending === `run:${macro.id}` ? 'Exécution…' : 'Exécuter'}</button>
                <button onClick={() => remove(macro)} disabled={pending !== null} aria-label={`Supprimer ${macro.name}`} style={{ ...danger, opacity: pending ? .65 : 1 }}><Trash2 size={14} /></button>
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
