import { usePOS, type Vente, type OptionsPaiement, type PayMethod, type Cloture } from '../store/posStore'
import { api, sessionHeaders, sessionCompany, clearSession, setSession, endSession } from './server'
import { useSeats } from '../store/seatStore'
import { reconcileDraftPricing } from './floor-pricing'

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
function assertBridge(epoch: number) { if (epoch !== bridgeEpoch) throw new Error('La session de caisse a changé. Le brouillon précédent reste conservé pour son compte.') }
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
  if (data.companyId !== sessionCompany()) throw new Error('Les données reçues appartiennent à un autre établissement. Reconnectez cette caisse.')
  apply(data)
  status('Données enregistrées sur le serveur')
}
export async function startFloorBridge() {
  stopFloorBridge()
  const epoch = bridgeEpoch
  await loadServerState()
  assertBridge(epoch)
  scope = `${sessionCompany()}:${usePOS.getState().currentStaff?.id}`
  for (const key of Object.keys(localStorage).filter(k => k.startsWith(`creorga-pos-allocation:${scope}:`))) {
    try {
      const pending = JSON.parse(localStorage.getItem(key)!)
      await api(`/pos/table-movements/${encodeURIComponent(pending.requestId)}`)
      assertBridge(epoch); localStorage.removeItem(key)
      status('Répartition financière retrouvée. Les groupes et les soldes du serveur sont conservés.')
    } catch { assertBridge(epoch); status('Une allocation financière reste à vérifier. Sa décision est conservée, sans nouvelle référence.', true) }
  }
  for (const key of Object.keys(localStorage).filter(k => k.startsWith(`creorga-pos-separation:${scope}:`))) {
    try {
      const pending = JSON.parse(localStorage.getItem(key)!)
      await api(`/pos/table-movements/${encodeURIComponent(pending.requestId)}`)
      assertBridge(epoch); localStorage.removeItem(key)
      status('Séparation retrouvée. Les groupes et leurs soldes sont ceux du serveur.')
    } catch { assertBridge(epoch); status('Une séparation reste à vérifier. Sa référence est conservée ; réessayez la même sélection.', true) }
  }
  for (const key of Object.keys(localStorage).filter(k => k.startsWith(`creorga-pos-move:${scope}:`))) {
    try {
      const pending = JSON.parse(localStorage.getItem(key)!)
      await api(`/pos/table-movements/${encodeURIComponent(pending.requestId)}`)
      assertBridge(epoch); localStorage.removeItem(key)
      status('Transfert retrouvé sur le serveur. Renouvelez séparément les QR des groupes concernés.')
    } catch { assertBridge(epoch); status('Un transfert reste à vérifier. Sa référence est conservée ; réessayez la même destination.', true) }
  }
  for (const key of Object.keys(localStorage).filter(k => k.startsWith(`creorga-pos-partial:${scope}:`))) {
    try {
      const pending = JSON.parse(localStorage.getItem(key)!)
      const result = await api<PartialResult>(`/pos/payments/${encodeURIComponent(pending.requestId)}`)
      assertBridge(epoch); localStorage.removeItem(key)
      status(`Règlement retrouvé : ${(result.paidCents / 100).toFixed(2)} € enregistrés, reste ${(result.outstandingCents / 100).toFixed(2)} €.`)
    } catch { assertBridge(epoch); status('Un acompte reste à vérifier. Utilisez Réessayer dans Acompte / solde ; sa référence est conservée.', true) }
  }
  // Rapprocher les réponses perdues avant une nouvelle vente, y compris après fermeture.
  for (const key of Object.keys(localStorage).filter(k => k.startsWith(`creorga-pos-pending:${scope}:`))) {
    try {
      const pending = JSON.parse(localStorage.getItem(key)!)
      const sale = await api<Vente>(`/pos/sales/${encodeURIComponent(pending.requestId)}`)
      assertBridge(epoch)
      localStorage.removeItem(key)
      status(`Règlement n° ${sale.numero} retrouvé sur le serveur (${sale.total.toFixed(2)} €). Il figure au journal.`)
    } catch { assertBridge(epoch); status('Un règlement reste à vérifier. Réessayez son encaissement avec la référence conservée.', true) }
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
  writing = null; checkingPayment = false
  unsubscribe?.(); unsubscribe = undefined
  unsubscribeSeats?.(); unsubscribeSeats = undefined
  clearTimeout(timer); clearInterval(poll)
}
export async function flushFloor(): Promise<void> {
  const currentEpoch = bridgeEpoch
  if (writing) { await writing; assertBridge(currentEpoch); if (serial() !== clean) return flushFloor(); return }
  if (serial() === clean) return
  const snapshot = serial(), expected = revision, epoch = bridgeEpoch
  const task = (async () => {
    try {
      const result = await api('/pos/draft', { method: 'PUT', headers: { 'If-Match': String(expected) }, body: snapshot })
      if (epoch !== bridgeEpoch) return
      revision = result.updatedAt
      clean = JSON.stringify(reconcileDraftPricing(JSON.parse(snapshot), result))
      const current = reconcileDraftPricing(JSON.parse(serial()), result)
      applying = true
      usePOS.setState({ tables: current.tables }); useSeats.setState({ seats: current.seats })
      applying = false
      if (serial() === clean) localStorage.removeItem(draftKey())
      else localStorage.setItem(draftKey(), JSON.stringify({ revision, ...JSON.parse(serial()) }))
      status('Données enregistrées sur le serveur')
    } catch (e: any) { if (epoch === bridgeEpoch) status(e.message || 'Enregistrement impossible. Brouillon conservé.', true); throw e }
  })()
  writing = task
  try { await task } finally { if (writing === task) writing = null }
}
export async function moveTableServer(fromTableId: string, intoTableId: string, kind: 'TRANSFER' | 'MERGE') {
  if (checkingPayment) throw new Error('Une opération de caisse est déjà en cours.')
  const epoch = bridgeEpoch, key = `creorga-pos-move:${scope}:${fromTableId}`
  checkingPayment = true
  try {
    await flushFloor(); assertBridge(epoch)
    const stored = localStorage.getItem(key)
    const payload = stored ? JSON.parse(stored) : { requestId: crypto.randomUUID(), fromTableId, intoTableId, kind, expectedRevision: revision }
    if (payload.intoTableId !== intoTableId || payload.kind !== kind) throw new Error('Un transfert incertain existe vers une autre destination. Vérifiez-le avant de changer la demande.')
    localStorage.setItem(key, JSON.stringify(payload))
    let result: any
    try { result = await api('/pos/table-movements', { method: 'POST', body: JSON.stringify(payload) }) }
    catch (error: any) {
      assertBridge(epoch)
      try { result = await api(`/pos/table-movements/${encodeURIComponent(payload.requestId)}`) }
      catch (check: any) { if (error.status >= 400 && error.status < 500 && check.status === 404) localStorage.removeItem(key); throw error }
    }
    assertBridge(epoch); localStorage.removeItem(key)
    checkingPayment = false
    await loadServerState()
    assertBridge(epoch)
    status('Déplacement confirmé. Les anciens QR sont révoqués : renouvelez un QR distinct pour chaque visite.')
    return result
  } finally { if (epoch === bridgeEpoch) checkingPayment = false }
}
export type ServiceSelection = { kind: 'GROUP' | 'LINES'; fromTableId: string; intoTableId: string; coverId: string; intoCoverId?: string; lines?: Array<{ id: string; qty: number }> }
export type AllocationDraft = { orderId: string; reason: string; groups: Array<{ key: string; tableId: string; label: string; kitchenNote: string; barNote: string; lines: Array<{ itemId: string; qty: number }> }>;
  tenderDecisions: Array<{ tenderId: string; parts: Array<{ groupKey: string; amountCents: number }> }> }
export type AllocationDecision = { input: AllocationDraft & { requestId: string; expectedRevision: number }; confirmHash: string; plan?: any }
export async function previewAllocationServer(draft: AllocationDraft): Promise<AllocationDecision> {
  const epoch = bridgeEpoch
  await flushFloor(); assertBridge(epoch)
  const input = { ...draft, requestId: crypto.randomUUID(), expectedRevision: revision }
  const result = await api('/pos/financial-allocations/preview', { method: 'POST', body: JSON.stringify(input) })
  assertBridge(epoch)
  return { input, ...result }
}
export async function confirmAllocationServer(decision: AllocationDecision) {
  if (checkingPayment) throw new Error('Une opération de caisse est déjà en cours.')
  const epoch = bridgeEpoch, key = `creorga-pos-allocation:${scope}:${decision.input.orderId}`
  checkingPayment = true
  try {
    const payload = { ...decision.input, confirmHash: decision.confirmHash, managerAcknowledged: true }
    const stored = localStorage.getItem(key)
    if (stored && stored !== JSON.stringify(payload)) throw new Error('Une allocation incertaine est conservée. Vérifiez sa référence avant de prendre une autre décision.')
    localStorage.setItem(key, JSON.stringify(payload))
    let result: any
    try { result = await api('/pos/financial-allocations', { method: 'POST', body: JSON.stringify(payload) }) }
    catch (error: any) {
      assertBridge(epoch)
      try { result = await api(`/pos/table-movements/${encodeURIComponent(payload.requestId)}`) }
      catch (check: any) { if (error.status >= 400 && error.status < 500 && check.status === 404) localStorage.removeItem(key); throw error }
    }
    assertBridge(epoch); localStorage.removeItem(key); checkingPayment = false
    await loadServerState(); assertBridge(epoch)
    status('Allocation confirmée. Chaque groupe conserve sa créance ; renouvelez son QR distinct.')
    return result
  } finally { if (epoch === bridgeEpoch) checkingPayment = false }
}
export async function retryAllocationServer(orderId: string) {
  const stored = localStorage.getItem(`creorga-pos-allocation:${scope}:${orderId}`)
  if (!stored) throw new Error('Aucune décision incertaine conservée pour ce groupe et ce compte.')
  const { confirmHash, managerAcknowledged, ...input } = JSON.parse(stored)
  return confirmAllocationServer({ input, confirmHash })
}
export async function separateServiceServer(input: ServiceSelection) {
  if (checkingPayment) throw new Error('Une opération de caisse est déjà en cours.')
  const epoch = bridgeEpoch, key = `creorga-pos-separation:${scope}:${input.coverId}`
  checkingPayment = true
  try {
    await flushFloor(); assertBridge(epoch)
    const stored = localStorage.getItem(key)
    const payload = stored ? JSON.parse(stored) : { ...input, requestId: crypto.randomUUID(), expectedRevision: revision }
    if (JSON.stringify({ ...payload, requestId: undefined, expectedRevision: undefined }) !== JSON.stringify(input)) throw new Error('Une séparation incertaine existe pour une autre sélection. Vérifiez sa référence avant de changer de destination.')
    localStorage.setItem(key, JSON.stringify(payload))
    let result: any
    try { result = await api('/pos/service-separations', { method: 'POST', body: JSON.stringify(payload) }) }
    catch (error: any) {
      assertBridge(epoch)
      try { result = await api(`/pos/table-movements/${encodeURIComponent(payload.requestId)}`) }
      catch (check: any) { if (error.status >= 400 && error.status < 500 && check.status === 404) localStorage.removeItem(key); throw error }
    }
    assertBridge(epoch); localStorage.removeItem(key)
    checkingPayment = false; await loadServerState(); assertBridge(epoch)
    status('Séparation confirmée, sans nouveau règlement ni préparation. Renouvelez les QR des visites concernées.')
    return result
  } finally { if (epoch === bridgeEpoch) checkingPayment = false }
}
export async function reviewLinePricing(lineId: string, input: { productId: string; price: number; taxRate: number; reason: string }) {
  const epoch = bridgeEpoch
  await flushFloor()
  assertBridge(epoch)
  const snapshot = serial()
  const result = await api(`/pos/pricing/${encodeURIComponent(lineId)}/review`, { method: 'POST', headers: { 'If-Match': String(revision) }, body: JSON.stringify(input) })
  assertBridge(epoch)
  revision = result.updatedAt
  const reconciled = reconcileDraftPricing(JSON.parse(serial()), result)
  applying = true
  usePOS.setState({ tables: reconciled.tables }); useSeats.setState({ seats: reconciled.seats })
  applying = false
  clean = JSON.stringify(reconcileDraftPricing(JSON.parse(snapshot), result))
  if (serial() === clean) localStorage.removeItem(draftKey())
  else localStorage.setItem(draftKey(), JSON.stringify({ revision, ...JSON.parse(serial()) }))
  status('Prix et TVA historiques vérifiés par le responsable')
}
export async function checkoutServer(tableId: string, method: PayMethod, tip: number, coverIds: string[] | undefined,
  options: OptionsPaiement, expectedTotal: number, cashReceived?: number): Promise<Vente> {
  if (checkingPayment) throw new Error('Un règlement est déjà en cours de vérification.')
  const epoch = bridgeEpoch, paymentScope = scope
  checkingPayment = true
  try {
  const selected = coverIds || usePOS.getState().tables.find(t => t.id === tableId)?.covers.filter(c => !c.paidAt && c.items.length).map(c => c.id) || []
  await flushFloor()
  assertBridge(epoch)
  const key = `creorga-pos-pending:${paymentScope}:${tableId}`
  const stored = localStorage.getItem(key)
  const payload = stored ? JSON.parse(stored) : { requestId: crypto.randomUUID(), tableId, method, tip, coverIds: selected, options, expectedTotal, cashReceived }
  localStorage.setItem(key, JSON.stringify(payload))
  let sale: Vente
  try {
    sale = await api<Vente>('/pos/checkout', { method: 'POST', body: JSON.stringify(payload) })
  } catch (error: any) {
    assertBridge(epoch)
    try { sale = await api<Vente>(`/pos/sales/${encodeURIComponent(payload.requestId)}`) }
    catch (check: any) {
      // Une erreur réseau n'autorise jamais à inventer une nouvelle référence.
      if (error.status >= 400 && error.status < 500 && check.status === 404) localStorage.removeItem(key)
      throw error
    }
  }
  assertBridge(epoch)
  applying = true
  const ids = new Set<string>((sale as Vente & { coverIds?: string[] }).coverIds || payload.coverIds)
  usePOS.setState(s => ({ ventes: [sale, ...s.ventes.filter(v => v.id !== sale.id)], tables: s.tables.map(t => t.id === tableId ? {
    ...t, covers: t.covers.filter(c => !ids.has(c.id)), status: t.covers.every(c => ids.has(c.id) || !c.items.length) ? 'dirty' : 'occupied',
  } : t) }))
  clean = serial(); applying = false
  localStorage.removeItem(draftKey()); localStorage.removeItem(key)
  checkingPayment = false
  await loadServerState().catch(() => { if (epoch === bridgeEpoch) status('Vente confirmée ; actualisation du plan en attente.', true) })
  assertBridge(epoch)
  return sale
  } finally { if (epoch === bridgeEpoch) checkingPayment = false }
}
export type PartialInput = { tableId: string; coverIds: string[]; amountCents: number; expectedOutstandingCents: number; method: 'CASH' | 'CARD' | 'MIXED';
  cashReceivedCents?: number; allocations?: Array<{ method: 'CASH' | 'CARD'; amountCents: number }> }
export type PartialResult = { requestId: string; status: 'PARTIAL' | 'SETTLED'; confirmation: 'manual_declaration'; paidCents: number; outstandingCents: number; cashChangeCents: number; sales: Vente[] }
export async function payPartServer(input: PartialInput): Promise<PartialResult> {
  if (checkingPayment) throw new Error('Un règlement est déjà en cours de vérification.')
  const epoch = bridgeEpoch, key = `creorga-pos-partial:${scope}:${input.tableId}`
  checkingPayment = true
  try {
    await flushFloor(); assertBridge(epoch)
    const stored = localStorage.getItem(key), payload = stored ? JSON.parse(stored) : { ...input, requestId: crypto.randomUUID() }
    // Une réponse ambiguë conserve le montant ET la référence d'origine, même si l'écran a changé.
    localStorage.setItem(key, JSON.stringify(payload))
    let result: PartialResult
    try { result = await api('/pos/payments', { method: 'POST', body: JSON.stringify(payload) }) }
    catch (error: any) {
      assertBridge(epoch)
      try { result = await api(`/pos/payments/${encodeURIComponent(payload.requestId)}`) }
      catch (check: any) {
        if (error.status >= 400 && error.status < 500 && check.status === 404) localStorage.removeItem(key)
        throw error
      }
    }
    assertBridge(epoch)
    localStorage.removeItem(key)
    checkingPayment = false
    await loadServerState().catch(() => status('Règlement enregistré ; solde affiché à actualiser avant toute autre opération.', true))
    assertBridge(epoch)
    return result
  } finally { if (epoch === bridgeEpoch) checkingPayment = false }
}
export async function closeServerDay(): Promise<Cloture> {
  const epoch = bridgeEpoch, closureScope = scope
  await flushFloor()
  assertBridge(epoch)
  const key = `creorga-pos-close:${closureScope}`
  const requestId = localStorage.getItem(key) || crypto.randomUUID()
  localStorage.setItem(key, requestId)
  const closure = await api<Cloture>('/pos/close', { method: 'POST', body: JSON.stringify({ requestId }) })
  assertBridge(epoch)
  applying = true
  usePOS.setState(s => ({ ventes: [], clotures: [closure, ...s.clotures.filter(c => c.id !== closure.id)] }))
  applying = false
  localStorage.removeItem(key)
  return closure
}
export function logoutServer() {
  stopFloorBridge()
  endSession()
  useSeats.setState({ seats: [] })
  applying = true; usePOS.setState({ currentStaff: null, tables: [], menu: [], staff: [], ventes: [], clotures: [], kioskMode: false }); applying = false
}

export async function enterPublicKiosk() {
  const epoch = bridgeEpoch
  await flushFloor()
  assertBridge(epoch)
  await api('/auth/logout', { method: 'POST' })
  assertBridge(epoch)
  const companyId = sessionCompany()
  stopFloorBridge()
  clearSession(); setSession('', companyId)
  useSeats.setState({ seats: [] })
  usePOS.setState(s => ({ currentStaff: null, staff: [], ventes: [], clotures: [], reservations: [], kioskMode: true,
    tables: s.tables.map(t => ({ ...t, covers: [], openedAt: undefined, status: 'available' as const })),
  }))
}
