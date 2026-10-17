import { useEffect, useRef, useState } from 'react'
import type { AxiosRequestConfig } from 'axios'
import api from '@/lib/api'
import { authDataScope } from '@/lib/authScope'
import { useAuthStore } from '@/stores/authStore'
import { createDocumentLinkList } from '@/lib/document-link-list'

interface LinkRecord { id: string; expiresAt: string; createdAt: string; revokedAt: string | null; revocationReason: string | null }
const button = { padding: '9px 12px', borderRadius: 8, border: '1px solid #94a3b8', background: '#fff', color: '#0f172a', fontWeight: 700, cursor: 'pointer' } as const

export default function InvoiceDocumentLinks({ invoiceId }: { invoiceId: string }) {
  const scope = useAuthStore(authDataScope)
  const [links, setLinks] = useState<LinkRecord[]>([]), [minutes, setMinutes] = useState(15)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [revealed, setRevealed] = useState<{ id: string; url: string } | null>(null)
  const [revokeId, setRevokeId] = useState(''), [reason, setReason] = useState('')
  const request = useRef<{ minutes: number; id: string } | null>(null), life = useRef({ scope, invoiceId, alive: true })
  const reader = useRef<ReturnType<typeof createDocumentLinkList> | null>(null)
  const scoped = { _creorgaScope: scope } as AxiosRequestConfig
  const current = () => life.current.alive && life.current.scope === scope && life.current.invoiceId === invoiceId && authDataScope(useAuthStore.getState()) === scope
  async function load() {
    await reader.current?.read(() => api.get(`/invoices/${invoiceId}/document-links`, scoped).then(response => response.data as LinkRecord[]), data => { if (current()) setLinks(data) })
  }
  useEffect(() => {
    const identity = { scope, invoiceId, alive: true }; life.current = identity
    const activeReader = createDocumentLinkList(); reader.current = activeReader
    setLinks([]); setRevealed(null); setError(''); setNotice(''); setBusy(false); setRevokeId(''); setReason(''); request.current = null
    void load().catch(() => { if (current()) setError('Impossible de charger les liens temporaires. Rechargez avant de continuer.') })
    return () => { identity.alive = false; activeReader.dispose() }
  }, [scope, invoiceId])
  async function create() {
    if (busy || !current()) return
    setBusy(true); setError(''); setNotice('')
    reader.current?.invalidate()
    if (!request.current || request.current.minutes !== minutes) request.current = { minutes, id: crypto.randomUUID() }
    try {
      const response = await api.post(`/invoices/${invoiceId}/document-links`, { requestId: request.current.id, ttlMinutes: minutes }, scoped)
      if (!current()) return
      if (response.data.downloadPath !== '/api/document-download' || !/^v1\.[a-f\d-]{36}\.\d+\.[A-Za-z0-9_-]{43}$/.test(response.data.capability)) throw Error('Réponse de lien non confirmée.')
      const url = new URL('/api/document-download', window.location.origin); url.hash = response.data.capability
      setRevealed({ id: response.data.id, url: url.href }); request.current = null
      setNotice('Lien créé. Rien n’a été envoyé ni copié automatiquement.')
      await load()
    } catch (failure: any) { if (current()) setError(failure?.response?.data?.message || failure.message || 'Création non confirmée. Réessayez : la référence est conservée.') }
    finally { if (current()) setBusy(false) }
  }
  async function revoke(event: React.FormEvent) {
    event.preventDefault()
    if (busy || !current()) return
    setBusy(true); setError(''); setNotice('')
    reader.current?.invalidate()
    try {
      await api.post(`/invoices/${invoiceId}/document-links/${revokeId}/revoke`, { reason: reason.trim() }, scoped)
      if (!current()) return
      if (revealed?.id === revokeId) setRevealed(null)
      setNotice('Lien révoqué pour les nouvelles demandes. Un PDF déjà téléchargé reste en possession de son destinataire.')
      setRevokeId(''); setReason(''); await load()
    } catch (failure: any) { if (current()) setError(failure?.response?.data?.message || 'Révocation non confirmée. Le lien peut encore être utilisable.') }
    finally { if (current()) setBusy(false) }
  }
  return <section aria-label="Liens temporaires du PDF" style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #cbd5e1' }}>
    <h3 style={{ margin: '0 0 8px' }}>Lien temporaire du PDF original</h3>
    <p style={{ fontSize: 14, lineHeight: 1.5 }}>Lien au porteur : toute personne qui le possède peut télécharger cette facture jusqu’à l’échéance ou la révocation. Il n’est pas nominatif. Aucun envoi ni copie automatique.</p>
    {['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <p style={{ fontSize: 14, color: '#334155' }}>Installation locale : cette adresse fonctionne sur ce PC uniquement. Elle n’est pas rendue accessible sur Internet par la création du lien.</p>}
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <label>Durée du lien <select aria-label="Durée du lien" value={minutes} disabled={busy} onChange={event => setMinutes(Number(event.target.value))} style={{ padding: 8, marginLeft: 6 }}><option value={15}>15 minutes</option><option value={60}>60 minutes</option></select></label>
      <button type="button" disabled={busy} onClick={() => void create()} style={button}>{busy ? 'Vérification…' : 'Créer un lien temporaire'}</button>
    </div>
    {revealed && <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
      <a href={revealed.url} target="_blank" rel="noreferrer noopener" referrerPolicy="no-referrer">Ouvrir le lien créé</a>
      <button type="button" style={button} onClick={() => { void navigator.clipboard.writeText(revealed.url).then(() => { if (current()) setNotice('Lien copié à votre demande. Transmettez-le uniquement au destinataire prévu.') }).catch(() => { if (current()) setError('Copie refusée par le navigateur. Vous pouvez ouvrir le lien explicitement.') }) }}>Copier le lien à ma demande</button>
    </div>}
    {error && <p role="alert" style={{ color: '#991b1b', fontWeight: 650 }}>{error}</p>}
    <p role="status" style={{ color: '#334155', lineHeight: 1.5 }}>{notice}</p>
    {links.length > 0 && <ul style={{ paddingLeft: 20 }}>{links.map(link => <li key={link.id} style={{ marginTop: 10, lineHeight: 1.6 }}>
      Lien {link.id.slice(0, 8)} — échéance {new Date(link.expiresAt).toLocaleString('fr-LU', { timeZone: 'Europe/Luxembourg' })} — {link.revokedAt ? 'révoqué' : new Date(link.expiresAt).getTime() <= Date.now() ? 'expiré' : 'actif selon l’échéance affichée ; accès vérifié par le serveur'}
      {link.revokedAt && link.revocationReason && <span> · Motif : {link.revocationReason}</span>}
      {!link.revokedAt && <button type="button" style={{ ...button, marginLeft: 8 }} disabled={busy} onClick={() => { setRevokeId(link.id); setReason('') }}>Révoquer le lien {link.id.slice(0, 8)}</button>}
    </li>)}</ul>}
    {revokeId && <form onSubmit={revoke} style={{ marginTop: 14 }}>
      <label>Motif de révocation <input autoFocus aria-label="Motif de révocation" value={reason} onChange={event => setReason(event.target.value)} required minLength={3} maxLength={300} style={{ display: 'block', width: '100%', padding: 9, marginTop: 6, boxSizing: 'border-box' }} /></label>
      <button type="submit" disabled={busy || reason.trim().length < 3} style={{ ...button, marginTop: 9 }}>Confirmer la révocation</button>
      <button type="button" disabled={busy} onClick={() => setRevokeId('')} style={{ ...button, marginLeft: 8 }}>Annuler</button>
    </form>}
    <p style={{ fontSize: 13, color: '#475569' }}>Après rechargement, le secret du lien n’est pas réaffiché. La liste permet toujours sa révocation. Une demande déjà admise et les copies reçues ne peuvent pas être rappelées.</p>
  </section>
}
