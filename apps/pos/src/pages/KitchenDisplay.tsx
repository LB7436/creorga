import { useEffect, useState } from 'react'
import { api } from '../lib/server'

type Ticket = { id: string; tableName: string; coverLabel: string; status: string; createdAt: number; updatedAt: number; items: Array<{ id: string; name: string; qty: number; note: string }> }
const columns = [{ id: 'waiting', label: 'À préparer', next: 'preparing', action: 'Commencer', color: '#fbbf24' }, { id: 'preparing', label: 'En préparation', next: 'ready', action: 'Marquer prêt', color: '#93c5fd' }, { id: 'ready', label: 'Prêt à servir', next: 'served', action: 'Marquer servi', color: '#86efac' }]

/** Aucun ticket de démonstration : toutes les actions sont confirmées par le serveur. */
export default function KitchenDisplay({ onExit }: { onExit: () => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [large, setLarge] = useState(false)
  const [query, setQuery] = useState('')
  const [stamp, setStamp] = useState(0)
  async function refresh() {
    try { const data = await api('/pos/kitchen'); setTickets(data.tickets); setStamp(Date.now()); setError('') }
    catch (e: any) { setError(e.message) }
  }
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 4000); return () => clearInterval(timer) }, [])
  async function change(ticket: Ticket, status: string) {
    if (busy) return
    setBusy(ticket.id)
    try { await api('/pos/kitchen/' + encodeURIComponent(ticket.id), { method: 'PATCH', body: JSON.stringify({ status, updatedAt: ticket.updatedAt }) }); await refresh() }
    catch (e: any) { setError(e.message) }
    finally { setBusy('') }
  }
  const button = { padding: '12px 16px', borderRadius: 10, border: '1px solid #a5b4fc', background: '#312e81', color: 'white', font: 'inherit', cursor: 'pointer' }
  return <main style={{ position: 'fixed', inset: 0, overflow: 'auto', padding: 20, background: '#090f1d', color: '#f8fafc', fontFamily: 'system-ui', fontSize: large ? 22 : 16 }}>
    <header style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}><h1 style={{ flex: 1 }}>Cuisine</h1>
      <button style={button} onClick={() => setLarge(v => !v)} aria-pressed={large}>Texte agrandi</button>
      <button style={button} onClick={() => void refresh()}>Actualiser</button>
      <button style={button} onClick={onExit}>Retour à la caisse</button>
    </header>
    <p>Commandes caisse et QR · Dernière lecture : {stamp ? new Date(stamp).toLocaleTimeString('fr-LU') : 'en cours'}</p>
    <p>Un paiement ne clôture pas la préparation. Marquez le ticket servi une fois la commande remise au client.</p>
    {error && <p role="alert" style={{ color: '#fecdd3', border: '1px solid #fb7185', padding: 16 }}>Confirmation impossible : {error}. Les derniers tickets restent affichés.</p>}
    <label>Filtrer les tables ou les produits <input value={query} onChange={e => setQuery(e.target.value)} style={{ padding: 12, font: 'inherit', maxWidth: '100%', boxSizing: 'border-box' }} /></label>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 20, marginTop: 24 }}>
      {columns.map(column => <section key={column.id}><h2 style={{ color: column.color }}>{column.label}</h2>
        {tickets.filter(t => t.status === column.id && JSON.stringify([t.tableName, t.items]).toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(ticket => <article key={ticket.id} style={{ border: '2px solid ' + column.color, borderRadius: 16, padding: 18, marginBottom: 18, background: '#152139' }}>
          <h3 style={{ marginTop: 0 }}>{ticket.tableName} · {ticket.coverLabel}</h3>
          <p>{Math.max(0, Math.floor((Date.now() - ticket.createdAt) / 60000))} min · {new Date(ticket.createdAt).toLocaleTimeString('fr-LU')}</p>
          <ul>{ticket.items.map(item => <li key={item.id} style={{ margin: '12px 0' }}><strong>{item.qty} × {item.name}</strong>{item.note && <p style={{ color: '#fde68a' }}>{item.note}</p>}</li>)}</ul>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button disabled={!!busy} style={button} onClick={() => void change(ticket, column.next)}>{busy === ticket.id ? 'Enregistrement…' : column.action}</button>
            {column.id !== 'waiting' && <button disabled={!!busy} style={button} onClick={() => void change(ticket, 'waiting')}>À reprendre</button>}
            {!ticket.id.startsWith('guest:') && <button disabled={!!busy} style={button} onClick={() => { if (window.confirm('Annuler uniquement la préparation ? L’addition reste à traiter séparément.')) void change(ticket, 'cancelled') }}>Annuler la préparation</button>}
          </div>
        </article>)}
        {!tickets.some(t => t.status === column.id) && <p>Aucun ticket dans cette colonne.</p>}
      </section>)}
    </div>
  </main>
}
