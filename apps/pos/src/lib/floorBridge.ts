import { usePOS, type Vente, type OptionsPaiement, type PayMethod, type Cloture } from '../store/posStore'
import { api, sessionHeaders, sessionCompany, clearSession, setSession } from './server'
import { useSeats } from '../store/seatStore'

// Aucune clé de terminal ni aucun code administrateur n'est intégré au navigateur.
export const deviceHeaders = sessionHeaders
let revision = 0
let clean = ''
let applying = false
let unsubscribe: (() => void) | undefined
let unsubscribeSeats: (() => void) | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let poll: ReturnType<typeof setInterval> | undefined
let writing: Promise<void> | null = null
let scope = ''
let bridgeEpoch = 0
let checkingPayment = false
const serial = () => JSON.stringify({ tables: usePOS.getState().tables, editor: usePOS.getState().editor, seats: useSeats.getState().seats })
const status = (message: string, error = false) => window.dispatchEvent(new CustomEvent('pos-sync', { detail: { message, error } }))
const draftKey = () => `creorga-pos-draft:${scope}`
function apply(data: any) {
  applying = true
  revision = data.revision
  usePOS.setState({ ...data, kioskMode: false })
  useSeats.setState({ seats: data.seats || [] })
  clean = serial()
  applying = false
}
export async function loadServerState() {
  const epoch = bridgeEpoch
  const before = serial()
  const data = await api('/pos/bootstrap')
  if (epoch !== bridgeEpoch || before !== serial() || writing || checkingPayment) return
  apply(data)
  status('Données enregistrées sur le serveur')
}
export async function startFloorBridge() {
  stopFloorBridge()
  await loadServerState()
  scope = `${sessionCompany()}:${usePOS.getState().currentStaff?.id}`
  // Rapprocher les réponses perdues avant une nouvelle vente, y compris après fermeture.
  for (const key of Object.keys(localStorage).filter(k => k.startsWith(`creorga-pos-pending:${scope}:`))) {
    try {
      const pending = JSON.parse(localStorage.getItem(key)!)
      const sale = await api<Vente>(`/pos/sales/${encodeURIComponent(pending.requestId)}`)
      localStorage.removeItem(key)
      status(`Règlement n° ${sale.numero} retrouvé sur le serveur (${sale.total.toFixed(2)} €). Il figure au journal.`)
    } catch { status('Un règlement reste à vérifier. Réessayez son encaissement avec la référence conservée.', true) }
  }
  const stored = localStorage.getItem(draftKey())
  if (stored) {
    try {
      const draft = JSON.parse(stored)
      if (draft.revision === revision && window.confirm('Un brouillon non envoyé a été retrouvé pour votre compte. Le reprendre ?')) {
        applying = true; usePOS.setState({ tables: draft.tables, ...(draft.editor ? { editor: draft.editor } : {}) }); if (draft.seats) useSeats.setState({ seats: draft.seats }); applying = false
        status('Brouillon récupéré — cliquez sur Réessayer pour le sauvegarder.', true)
      } else status('Un ancien brouillon est conservé localement ; le plan serveur est affiché.', true)
    } catch { status('Brouillon local illisible : données serveur conservées.', true) }
  }
  const onDraftChanged = () => {
    if (applying || serial() === clean) return
    try { localStorage.setItem(draftKey(), JSON.stringify({ revision, ...JSON.parse(serial()) })) }
    catch { status('Stockage local indisponible. Gardez cette page ouverte.', true) }
    status('Modifications en attente de confirmation')
    clearTimeout(timer)
    timer = setTimeout(() => { void flushFloor().catch(() => {}) }, 450)
  }
  unsubscribe = usePOS.subscribe(onDraftChanged)
  unsubscribeSeats = useSeats.subscribe(onDraftChanged)
  poll = setInterval(() => {
    if (!writing && !checkingPayment && serial() === clean) void loadServerState().catch(() => status('Connexion serveur interrompue. Vos dernières données restent affichées.', true))
  }, 5000)
}
export function stopFloorBridge() {
  bridgeEpoch++
  unsubscribe?.(); unsubscribe = undefined
  unsubscribeSeats?.(); unsubscribeSeats = undefined
  clearTimeout(timer); clearInterval(poll)
}
export async function flushFloor(): Promise<void> {
  if (writing) { await writing; if (serial() !== clean) return flushFloor(); return }
  if (serial() === clean) return
  const snapshot = serial(), expected = revision, epoch = bridgeEpoch
  writing = (async () => {
    try {
      const result = await api('/pos/draft', { method: 'PUT', headers: { 'If-Match': String(expected) }, body: snapshot })
      if (epoch !== bridgeEpoch) return
      revision = result.updatedAt
      clean = snapshot
      if (serial() === clean) localStorage.removeItem(draftKey())
      else localStorage.setItem(draftKey(), JSON.stringify({ revision, ...JSON.parse(serial()) }))
      status('Données enregistrées sur le serveur')
    } catch (e: any) { status(e.message || 'Enregistrement impossible. Brouillon conservé.', true); throw e }
  })().finally(() => { writing = null })
  return writing
}
export async function checkoutServer(tableId: string, method: PayMethod, tip: number, coverIds: string[] | undefined,
  options: OptionsPaiement, expectedTotal: number, cashReceived?: number): Promise<Vente> {
  if (checkingPayment) throw new Error('Un règlement est déjà en cours de vérification.')
  checkingPayment = true
  try {
  const selected = coverIds || usePOS.getState().tables.find(t => t.id === tableId)?.covers.filter(c => !c.paidAt && c.items.length).map(c => c.id) || []
  await flushFloor()
  const key = `creorga-pos-pending:${scope}:${tableId}`
  const stored = localStorage.getItem(key)
  const payload = stored ? JSON.parse(stored) : { requestId: crypto.randomUUID(), tableId, method, tip, coverIds: selected, options, expectedTotal, cashReceived }
  localStorage.setItem(key, JSON.stringify(payload))
  let sale: Vente
  try {
    sale = await api<Vente>('/pos/checkout', { method: 'POST', body: JSON.stringify(payload) })
  } catch (error: any) {
    try { sale = await api<Vente>(`/pos/sales/${encodeURIComponent(payload.requestId)}`) }
    catch (check: any) {
      // Une erreur réseau n'autorise jamais à inventer une nouvelle référence.
      if (error.status >= 400 && error.status < 500 && check.status === 404) localStorage.removeItem(key)
      throw error
    }
  }
  applying = true
  const ids = new Set<string>((sale as Vente & { coverIds?: string[] }).coverIds || payload.coverIds)
  usePOS.setState(s => ({ ventes: [sale, ...s.ventes.filter(v => v.id !== sale.id)], tables: s.tables.map(t => t.id === tableId ? {
    ...t, covers: t.covers.filter(c => !ids.has(c.id)), status: t.covers.every(c => ids.has(c.id) || !c.items.length) ? 'dirty' : 'occupied',
  } : t) }))
  clean = serial(); applying = false
  localStorage.removeItem(draftKey()); localStorage.removeItem(key)
  checkingPayment = false
  await loadServerState().catch(() => status('Vente confirmée ; actualisation du plan en attente.', true))
  return sale
  } finally { checkingPayment = false }
}
export async function closeServerDay(): Promise<Cloture> {
  await flushFloor()
  const key = `creorga-pos-close:${scope}`
  const requestId = localStorage.getItem(key) || crypto.randomUUID()
  localStorage.setItem(key, requestId)
  const closure = await api<Cloture>('/pos/close', { method: 'POST', body: JSON.stringify({ requestId }) })
  applying = true
  usePOS.setState(s => ({ ventes: [], clotures: [closure, ...s.clotures.filter(c => c.id !== closure.id)] }))
  applying = false
  localStorage.removeItem(key)
  return closure
}
export function logoutServer() {
  stopFloorBridge()
  void api('/auth/logout', { method: 'POST' }).catch(() => {})
  clearSession()
  useSeats.setState({ seats: [] })
  applying = true; usePOS.setState({ currentStaff: null, tables: [], menu: [], staff: [], ventes: [], clotures: [], kioskMode: false }); applying = false
}

export async function enterPublicKiosk() {
  await flushFloor()
  await api('/auth/logout', { method: 'POST' })
  const companyId = sessionCompany()
  stopFloorBridge()
  clearSession(); setSession('', companyId)
  useSeats.setState({ seats: [] })
  usePOS.setState(s => ({ currentStaff: null, staff: [], ventes: [], clotures: [], reservations: [], kioskMode: true,
    tables: s.tables.map(t => ({ ...t, covers: [], openedAt: undefined, status: 'available' as const })),
  }))
}
