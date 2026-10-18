import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import api from '@/lib/api'
import { authDataScope } from '@/lib/authScope'
import { useAuthStore } from '@/stores/authStore'

type Status = 'waiting' | 'preparing' | 'ready'
type ChangeStatus = Status | 'served' | 'cancelled'
type Item = { id: string; name: string; qty: number; note: string }
type Routing = { tableName: string; coverLabel: string; name: string; qty: number; kitchenNote: string; barNote: string }
type Ticket = { id: string; tableName: string; coverLabel: string; status: Status; createdAt: number; updatedAt: number; items: Item[]; routing: Routing[] }
const columns: Array<{ id: Status; label: string; next: ChangeStatus; action: string; color: string }> = [
  { id: 'waiting', label: 'À préparer', next: 'preparing', action: 'Commencer', color: '#b45309' },
  { id: 'preparing', label: 'En préparation', next: 'ready', action: 'Marquer prêt', color: '#1d4ed8' },
  { id: 'ready', label: 'Prêt à servir', next: 'served', action: 'Marquer servi', color: '#047857' },
]
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
function optionalText(value: unknown): string {
  if (value == null) return ''
  if (typeof value !== 'string') throw new Error('Texte de ticket invalide')
  return value
}
function identifier(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Identifiant de ticket invalide')
  return value
}

/** Projection du seul contrat cuisine : ni prix, ni personnel, ni allergies déduites. */
function readTickets(value: unknown): Ticket[] {
  if (!record(value) || !finite(value.revision) || !Array.isArray(value.tickets)) throw new Error('Lecture cuisine incomplète')
  const ids = new Set<string>()
  return value.tickets.map((raw): Ticket => {
    if (!record(raw) || !columns.some(column => column.id === raw.status) || !finite(raw.createdAt) || !finite(raw.updatedAt)
      || raw.createdAt < 0 || raw.updatedAt < 0 || !Array.isArray(raw.items) || raw.routing != null && !Array.isArray(raw.routing)) {
      throw new Error('Ticket cuisine incomplet')
    }
    const id = identifier(raw.id)
    if (ids.has(id)) throw new Error('Ticket cuisine dupliqué')
    ids.add(id)
    const items = raw.items.map((item): Item => {
      if (!record(item) || !finite(item.qty)) throw new Error('Ligne cuisine incomplète')
      // Les lots de correction peuvent porter une quantité négative.
      return { id: identifier(item.id), name: optionalText(item.name) || 'Produit non renseigné', qty: item.qty, note: optionalText(item.note) }
    })
    const routing = ((raw.routing ?? []) as unknown[]).map((route): Routing => {
      if (!record(route) || !finite(route.qty)) throw new Error('Routage cuisine incomplet')
      return { tableName: optionalText(route.tableName) || 'Table non renseignée', coverLabel: optionalText(route.coverLabel),
        name: optionalText(route.name) || 'Produit non renseigné', qty: route.qty, kitchenNote: optionalText(route.kitchenNote), barNote: optionalText(route.barNote) }
    })
    return { id, tableName: optionalText(raw.tableName) || 'Table non renseignée', coverLabel: optionalText(raw.coverLabel),
      status: raw.status as Status, createdAt: raw.createdAt, updatedAt: raw.updatedAt, items, routing }
  })
}

export default function Kitchen() {
  const scope = useAuthStore(authDataScope)
  const access = useAuthStore(state => state.businessAccess)
  const authenticated = useAuthStore(state => state.isAuthenticated && !!state.user?.id && !!state.companyId)
  if (!authenticated || !access?.capabilities.includes('service.read')) {
    return <main style={page}><h1>Cuisine</h1><p role="alert">{access
      ? 'La lecture de la cuisine n’est pas autorisée pour votre accès.'
      : 'Accès à la cuisine en cours de vérification.'}</p><a href="/modules">Retour aux modules</a></main>
  }
  return <ScopedKitchen key={scope} scope={scope} />
}

function ScopedKitchen({ scope }: { scope: string }) {
  const access = useAuthStore(state => state.businessAccess)
  const companyName = useAuthStore(state => state.company?.name)
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [reading, setReading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [readError, setReadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [lastRead, setLastRead] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const mounted = useRef(true), readVersion = useRef(0), busyNow = useRef(false), blocked = useRef(true)
  const currentTickets = useRef<Ticket[] | null>(null)
  const readTransport = useRef<AbortController | null>(null), changeTransport = useRef<AbortController | null>(null)
  const canManage = access?.capabilities.includes('service.manage') === true
  const canCancel = canManage && access?.capabilities.includes('orders.cancel') === true
  const isCurrent = useCallback(() => {
    const current = useAuthStore.getState()
    return mounted.current && scope === authDataScope(current) && current.isAuthenticated
      && current.businessAccess?.capabilities.includes('service.read') === true
  }, [scope])

  const refresh = useCallback(async (replace = false, afterMutation = false): Promise<boolean> => {
    if (!isCurrent() || busyNow.current && !afterMutation || readTransport.current && !replace) return false
    const version = ++readVersion.current, controller = new AbortController()
    readTransport.current?.abort()
    readTransport.current = controller
    const currentRead = () => isCurrent() && version === readVersion.current
    setReading(true); setReadError('')
    if (replace && !afterMutation) setActionError('')
    try {
      const { data } = await api.get('/pos/kitchen', { signal: controller.signal, timeout: 8000 })
      const confirmed = readTickets(data)
      if (!currentRead()) return false
      currentTickets.current = confirmed; blocked.current = false
      setTickets(confirmed); setLastRead(Date.now())
      return true
    } catch {
      if (currentRead()) {
        currentTickets.current = null; blocked.current = true; setTickets(null); setNotice('')
        setReadError('Lecture de la cuisine impossible. Actualisez pour vérifier les tickets ; aucun état vide n’est confirmé.')
      }
      return false
    } finally {
      if (version === readVersion.current) {
        readTransport.current = null
        if (isCurrent()) setReading(false)
      }
    }
  }, [isCurrent])

  useEffect(() => {
    mounted.current = true
    void refresh()
    const timer = setInterval(() => { if (!busyNow.current) void refresh() }, 4000)
    return () => {
      mounted.current = false; readVersion.current++
      clearInterval(timer); readTransport.current?.abort(); changeTransport.current?.abort()
      readTransport.current = null; changeTransport.current = null; busyNow.current = false
    }
  }, [refresh])

  async function change(ticket: Ticket, status: ChangeStatus) {
    const permitted = () => {
      const capabilities = useAuthStore.getState().businessAccess?.capabilities
      return isCurrent() && capabilities?.includes('service.manage')
        && (status !== 'cancelled' || !ticket.id.startsWith('guest:') && capabilities.includes('orders.cancel'))
    }
    const latestTicket = () => currentTickets.current?.find(entry => entry.id === ticket.id)
    if (!permitted() || busyNow.current || blocked.current) return
    const latest = latestTicket()
    const next = columns.find(column => column.id === ticket.status)?.next
    if (!latest || latest.updatedAt !== ticket.updatedAt || latest.status !== ticket.status) {
      setActionError('Le ticket a changé. Actualisez avant de recommencer.'); return
    }
    if (status !== next && status !== 'cancelled' && !(status === 'waiting' && ticket.status !== 'waiting')) return
    if (status === 'cancelled') {
      if (!window.confirm('Annuler uniquement la préparation ? L’addition reste à traiter séparément.')) return
      if (!permitted() || busyNow.current || blocked.current || latestTicket()?.updatedAt !== ticket.updatedAt) return
    }
    // Verrou synchrone : un double clic ne peut pas lancer deux PATCH.
    busyNow.current = true; blocked.current = true
    const controller = new AbortController()
    changeTransport.current = controller
    setBusy(ticket.id); setActionError(''); setNotice('')
    // Une lecture antérieure au PATCH ne doit pas restaurer un état périmé.
    readVersion.current++; readTransport.current?.abort(); readTransport.current = null; setReading(false)
    try {
      const { data } = await api.patch('/pos/kitchen/' + encodeURIComponent(ticket.id), { status, updatedAt: ticket.updatedAt },
        { signal: controller.signal, timeout: 8000 })
      if (!isCurrent()) return
      if (data?.ok !== true) throw new Error('Confirmation cuisine incomplète')
      currentTickets.current = null; setTickets(null)
      const confirmed = await refresh(true, true)
      if (!isCurrent()) return
      if (confirmed) setNotice('Changement confirmé par le serveur.')
      else setActionError('Changement accepté par le serveur, mais relecture impossible. Actualisez avant une nouvelle action.')
    } catch (error: any) {
      if (isCurrent()) {
        currentTickets.current = null; blocked.current = true; setTickets(null)
        setActionError(error?.response?.status === 409 ? 'Le ticket a changé. Actualisez avant de recommencer.'
          : 'Changement non confirmé. Actualisez les tickets avant toute nouvelle tentative. Aucune action n’a été relancée.')
      }
    } finally {
      if (changeTransport.current === controller) {
        changeTransport.current = null; busyNow.current = false
        if (isCurrent()) setBusy(null)
      }
    }
  }

  const search = query.trim().toLocaleLowerCase('fr')
  const matches = (ticket: Ticket) => !search || [ticket.tableName, ticket.coverLabel, ...ticket.items.map(item => item.name)]
    .some(value => value.toLocaleLowerCase('fr').includes(search))
  return <main style={page}>
    <header style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ flex: 1 }}><h1 style={{ margin: 0 }}>Cuisine</h1><p style={muted}>{companyName || 'Établissement courant'} · Commandes caisse et QR</p></div>
      <button type="button" style={button} disabled={!!busy} onClick={() => { void refresh(true) }} aria-busy={reading}>Actualiser</button>
      <a href="/modules" style={{ color: '#1d4ed8' }}>Retour aux modules</a>
    </header>
    <p style={muted}>Actualisation périodique (4 s, hors requête en cours) · Dernière lecture confirmée : {lastRead === null ? 'aucune' : new Date(lastRead).toLocaleTimeString('fr-LU')}.</p>
    <p>Un paiement ne clôture pas la préparation. Marquez le ticket servi après sa remise ; l’annulation de préparation ne traite pas l’addition.</p>
    {!canManage && <p>Lecture seule — les changements nécessitent la permission de gérer le service.</p>}
    {readError && <p role="alert" style={errorStyle}>{readError}</p>}
    {actionError && <p role="alert" style={errorStyle}>{actionError}</p>}
    {notice && <p role="status" style={{ color: '#047857' }}>{notice}</p>}
    <label style={{ display: 'grid', gap: 6 }}>Filtrer les tables ou les produits
      <input value={query} onChange={event => setQuery(event.target.value)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, maxWidth: 440, font: 'inherit' }} />
    </label>
    {reading && tickets === null && <p role="status">Chargement des tickets…</p>}
    {tickets !== null && <>
      {tickets.length === 0 && <p>Aucun ticket à préparer.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,290px),1fr))', gap: 18, marginTop: 20 }}>
        {columns.map(column => {
          const list = tickets.filter(ticket => ticket.status === column.id && matches(ticket))
          return <section key={column.id} aria-label={column.label}><h2 style={{ color: column.color }}>{column.label} ({list.length})</h2>
            {list.map(ticket => <article key={ticket.id} style={{ ...card, borderTop: '4px solid ' + column.color }}>
              <h3 style={{ marginTop: 0 }}>{ticket.tableName}{ticket.coverLabel ? ' · ' + ticket.coverLabel : ''}</h3>
              <p style={muted}>{Math.max(0, Math.floor((Date.now() - ticket.createdAt) / 60000))} min · {new Date(ticket.createdAt).toLocaleTimeString('fr-LU')}</p>
              {!!ticket.routing.length && <div role="note"><strong>Routage après séparation — ne pas préparer une seconde fois</strong><ul>{ticket.routing.map((route, index) =>
                <li key={index}>{route.qty} × {route.name} → {route.tableName}{route.coverLabel ? ' · ' + route.coverLabel : ''}
                  {route.kitchenNote && <p>Cuisine : {route.kitchenNote}</p>}{route.barNote && <p>Bar : {route.barNote}</p>}</li>)}</ul></div>}
              <ul>{ticket.items.map(item => <li key={item.id} style={{ marginBottom: 12 }}><strong>{item.qty} × {item.name}</strong>
                {item.note && <p style={{ color: '#92400e', whiteSpace: 'pre-wrap' }}>{item.note}</p>}</li>)}</ul>
              {canManage && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" style={button} disabled={!!busy || blocked.current} onClick={() => { void change(ticket, column.next) }}>{busy === ticket.id ? 'Enregistrement…' : column.action}</button>
                {column.id !== 'waiting' && <button type="button" style={button} disabled={!!busy || blocked.current} onClick={() => { void change(ticket, 'waiting') }}>À reprendre</button>}
                {canCancel && !ticket.id.startsWith('guest:') && <button type="button" style={button} disabled={!!busy || blocked.current} onClick={() => { void change(ticket, 'cancelled') }}>Annuler la préparation</button>}
              </div>}
            </article>)}
            {list.length === 0 && <p style={muted}>{search ? 'Aucun ticket ne correspond au filtre.' : 'Aucun ticket dans cette colonne.'}</p>}
          </section>
        })}
      </div>
    </>}
  </main>
}

const page: CSSProperties = { background: '#f8fafc', minHeight: '100vh', padding: 24, color: '#0f172a', fontFamily: 'system-ui', boxSizing: 'border-box' }
const card: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, marginBottom: 16 }
const button: CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', font: 'inherit', cursor: 'pointer' }
const muted: CSSProperties = { color: '#64748b', fontSize: 13 }
const errorStyle: CSSProperties = { color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }
