import { useEffect, useState } from 'react'
import api from '@/lib/api'
import QRCodeCanvas from './QRCodeCanvas'
import { useAuthStore } from '@/stores/authStore'

interface Table { id: string; name: string }
interface Visit { id: string; tableId: string; expiresAt: string }
export default function VisitQrPanel() {
  const companyId = useAuthStore(s => s.companyId)
  const [tables, setTables] = useState<Table[]>([]), [visits, setVisits] = useState<Visit[]>([])
  const [selected, setSelected] = useState(''), [link, setLink] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [reason, setReason] = useState(''), [acknowledge, setAcknowledge] = useState(false)
  async function load() {
    const { data } = await api.get<{ tables: Table[]; visits: Visit[] }>('/guest-visits')
    setTables(data.tables); setVisits(data.visits)
    setSelected(value => data.tables.some(t => t.id === value) ? value : data.tables[0]?.id || '')
  }
  useEffect(() => { let alive = true; setLink(''); setError(''); setTables([]); setVisits([])
    load().catch(() => { if (alive) setError('Chargement des accès client impossible.') })
    return () => { alive = false }
  }, [companyId])
  const visit = visits.find(v => v.tableId === selected && new Date(v.expiresAt).getTime() > Date.now())
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action() } catch (e: any) { setError(e.response?.data?.error || 'Opération non confirmée. Actualisez avant de recommencer.') }
    finally { setBusy(false) }
  }
  return <section aria-label="Accès client par visite" style={{ padding: 20, border: '1px solid #cbd5e1', borderRadius: 14, background: '#fff', color: '#0f172a', margin: '16px 0' }}>
    <h2>Accès client de la table</h2>
    <p>Le QR permanent ouvre la carte. Pour commander, suivre l’addition ou payer, donnez aux clients le QR de leur visite. Terminer la visite révoque ses liens et conserve les éventuels impayés pour le personnel.</p>
    <label>Table réelle <select aria-label="Table de la visite" value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); setLink(''); setReason(''); setAcknowledge(false) }}>
      <option value="">Choisir une table</option>{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select></label>
    {!tables.length && <p>Créez d’abord vos tables dans le plan de salle.</p>}
    <p>{visit ? `Visite ouverte jusqu’au ${new Date(visit.expiresAt).toLocaleString('fr-LU')}.` : 'Aucune visite ouverte pour cette table.'}</p>
    <button disabled={busy || !selected} onClick={() => run(async () => {
      let id = visit?.id
      if (!id) id = (await api.post<Visit>('/guest-visits', { tableId: selected })).data.id
      const { data } = await api.post<{ visitId: string; tableId: string; token: string }>(`/guest-visits/${id}/link`)
      const url = new URL('/c', location.origin); url.searchParams.set('companyId', companyId!); url.searchParams.set('table', data.tableId)
      url.hash = new URLSearchParams({ visit: data.visitId, access: data.token }).toString()
      setLink(url.href); await load()
    })}>{busy ? 'Traitement…' : visit ? 'Afficher un QR pour cette visite' : 'Ouvrir la visite et afficher son QR'}</button>
    <button disabled={busy} onClick={() => run(load)} style={{ marginLeft: 8 }}>Actualiser</button>
    {link && <div style={{ marginTop: 16 }}><QRCodeCanvas value={link} size={240} label="qr-visite-prive" />
      <a href={link} target="_blank" rel="noreferrer">Ouvrir le portail de cette visite</a>
      <p>Ce lien permet d’accéder à cette addition. Partagez-le uniquement avec les clients de cette table.</p>
      <button onClick={() => run(async () => { await navigator.clipboard.writeText(link) })}>Copier le lien de visite</button>
    </div>}
    {visit && <fieldset disabled={busy} style={{ marginTop: 18 }}><legend>Terminer les accès de cette visite</legend>
      <label>Motif <input aria-label="Motif de fermeture de visite" minLength={3} maxLength={300} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <label style={{ display: 'block', margin: '12px 0' }}><input type="checkbox" checked={acknowledge} onChange={e => setAcknowledge(e.target.checked)} /> Je conserve au suivi du personnel toute addition impayée et tout paiement en cours.</label>
      <button disabled={reason.trim().length < 3} onClick={() => run(async () => {
        await api.post(`/guest-visits/${visit.id}/close`, { reason, acknowledgeOutstanding: acknowledge })
        setLink(''); setReason(''); setAcknowledge(false); await load()
      })}>Terminer la visite et révoquer ses QR</button>
    </fieldset>}
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
  </section>
}
