import { useEffect, useRef, useState } from 'react'
import { BusinessGuard } from '../components/BusinessGuard'
import { usePOS } from '../store/posStore'
import { hasCapability, requireCapability } from '../lib/business-access'
import { api, sessionCompany, sessionGeneration } from '../lib/server'

type Drawer = { id: string; companyId: string; openedAt?: string; openAmount: number; closedAt: string | null; ledgerVersion: number }
type CashReport = { openingCents: number; cashReceiptsCents: number; movementInCents: number; movementOutCents: number; expectedCents: number }
type Pending = { requestId: string; closeAmount?: number; openAmount?: number; notes?: string }
const cashFields = ['openingCents', 'cashReceiptsCents', 'movementInCents', 'movementOutCents', 'expectedCents'] as const
const euro = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`
const scopeFor = () => JSON.stringify([sessionGeneration(), sessionCompany(), usePOS.getState().currentStaff?.id, usePOS.getState().businessAccess?.revision])
const field = { display: 'block', padding: 12, width: '100%', maxWidth: 480, margin: '8px 0 16px', boxSizing: 'border-box' as const }
const button = { padding: '12px 18px', margin: '8px 8px 8px 0', cursor: 'pointer' }
function parseAmount(value: string) {
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(value.trim())) throw Error('Saisissez un montant positif avec au plus deux décimales.')
  const cents = Math.round(Number(value.trim().replace(',', '.')) * 100)
  if (!Number.isSafeInteger(cents) || cents > 1e9) throw Error('Montant hors limite.')
  return cents / 100
}

export default function CashDrawerPage(props: { onExit: () => void }) {
  return <BusinessGuard anyOf={['cash.open', 'cash.close']} onBack={props.onExit}><CashDrawerContent {...props} /></BusinessGuard>
}
function CashDrawerContent({ onExit }: { onExit: () => void }) {
  const access = usePOS(state => state.businessAccess)
  const [scope] = useState(scopeFor)
  const [drawers, setDrawers] = useState<Drawer[]>([]), [selected, setSelected] = useState('')
  const [report, setReport] = useState<CashReport | null>(null)
  const [amount, setAmount] = useState(''), [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [listConfirmed, setListConfirmed] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const mounted = useRef(false), locked = useRef(false), selectionEpoch = useRef(0)
  const current = () => mounted.current && scope === scopeFor()
  const ownerScope = `${sessionCompany()}:${usePOS.getState().currentStaff?.id}`
  const keyFor = (id: string) => id ? `creorga-pos-drawer-close:${ownerScope}:${id}` : `creorga-pos-drawer-open:${ownerScope}`
  const active = drawers.find(drawer => drawer.id === selected)
  async function reload() {
    const list = await api<unknown>('/accounting/cash-drawers')
    if (!current()) return
    if (!Array.isArray(list) || list.some(drawer => typeof drawer?.id !== 'string' || drawer.companyId !== sessionCompany())) throw Error('Sessions de caisse non vérifiables pour cet établissement.')
    // Le panneau ne garde jamais un snapshot global de ventes, même si un
    // compte plus privilégié reçoit d'autres champs dans cette réponse.
    const projected = list.filter(drawer => !drawer.closedAt).map(drawer => ({ id: drawer.id, companyId: drawer.companyId,
      openAmount: drawer.openAmount, openedAt: drawer.openedAt, closedAt: drawer.closedAt, ledgerVersion: drawer.ledgerVersion }))
    setDrawers(projected)
    setListConfirmed(true)
    setSelected(previous => projected.some(drawer => drawer.id === previous) ? previous : projected.length === 1 ? projected[0].id : '')
    const openingKey = keyFor(''), savedOpening = localStorage.getItem(openingKey)
    if (savedOpening) {
      const payload = JSON.parse(savedOpening) as Pending
      const proof = list.find(drawer => drawer.id === payload.requestId && drawer.companyId === sessionCompany()
        && drawer.userId === usePOS.getState().currentStaff?.id && drawer.openAmount === payload.openAmount && drawer.ledgerVersion === 2)
      if (proof) {
        localStorage.removeItem(openingKey)
        setNotice('Ouverture précédente retrouvée sur le serveur par sa référence, son auteur et son fond. Aucune nouvelle ouverture envoyée.')
      }
    }
  }
  useEffect(() => {
    mounted.current = true
    void reload().catch(error => { if (current()) setError(error.message) }).finally(() => { if (current()) setLoading(false) })
    return () => { mounted.current = false; selectionEpoch.current++ }
  }, [])
  useEffect(() => {
    const epoch = ++selectionEpoch.current
    setReport(null); setConfirmed(false); setAmount(''); setNotes(''); setPending(null)
    try {
      const saved = localStorage.getItem(keyFor(selected))
      if (saved) {
        const payload = JSON.parse(saved) as Pending
        if (typeof payload.requestId !== 'string' || !Number.isFinite(selected ? payload.closeAmount : payload.openAmount)) throw Error('Référence locale illisible : ne créez pas une nouvelle opération. Faites vérifier la demande conservée.')
        setPending(payload); setAmount(String(selected ? payload.closeAmount : payload.openAmount)); setNotes(payload.notes || '')
        setNotice('Une demande précédente reste à vérifier. Réessayer conserve sa référence et ses montants, sans nouvelle opération automatique.')
      }
    } catch (error) { setError((error as Error).message); return }
    if (!selected || !hasCapability('cash.close')) return
    void api<any>(`/accounting/cash-drawers/${encodeURIComponent(selected)}/report`).then(value => {
      if (!current() || epoch !== selectionEpoch.current) return
      if (value.drawerId !== selected || cashFields.some(key => !Number.isSafeInteger(value[key]))) throw Error('Rapport espèces non vérifiable. Aucune clôture autorisée sur un total déduit.')
      setReport(Object.fromEntries(cashFields.map(key => [key, value[key]])) as CashReport)
    }).catch(error => { if (current() && epoch === selectionEpoch.current) setError(error.message) })
  }, [selected])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (locked.current || !current()) return
    locked.current = true; setBusy(true); setError(''); setNotice('')
    const id = selected, key = keyFor(id)
    try {
      requireCapability(id ? 'cash.close' : 'cash.open')
      if (id && (!report || active?.ledgerVersion !== 2)) throw Error('Rapport du tiroir v2 requis. Les anciennes sessions ne sont pas réinterprétées.')
      if (!id && (!listConfirmed || drawers.length)) throw Error('Liste de tiroirs non confirmée ou caisse déjà ouverte : aucune nouvelle ouverture permise.')
      const saved = localStorage.getItem(key)
      const payload: Pending = saved ? JSON.parse(saved) : { requestId: crypto.randomUUID(),
        ...(id ? { closeAmount: parseAmount(amount) } : { openAmount: parseAmount(amount) }), ...(notes.trim() ? { notes: notes.trim() } : {}) }
      if (id && Math.round(payload.closeAmount! * 100) !== report!.expectedCents && (payload.notes?.length || 0) < 5) throw Error('Justifiez l’écart espèces avec au moins cinq caractères.')
      localStorage.setItem(key, JSON.stringify(payload)); setPending(payload)
      const response = await api<any>(id ? `/accounting/cash-drawers/${encodeURIComponent(id)}/close` : '/accounting/cash-drawers/open',
        { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) })
      if (!current()) return
      if (id ? response.id !== id || !response.closedAt || response.closeAmount !== payload.closeAmount
        : response.id !== payload.requestId || response.closedAt || response.ledgerVersion !== 2) throw Error('Accusé de caisse incomplet : résultat à rapprocher avec la référence conservée.')
      localStorage.removeItem(key); setPending(null); setConfirmed(true)
      setNotice(id ? 'Clôture du tiroir confirmée. Ce résultat ne constitue pas un rapport de ventes ni une confirmation bancaire.' : 'Ouverture du tiroir confirmée.')
      if (!id) await reload().catch(() => { if (current()) setNotice('Ouverture du tiroir confirmée ; actualisation de la liste en attente. Ne créez pas une seconde ouverture.') })
    } catch (error: any) {
      if (current()) {
        // Seuls les refus de validation explicites démontrent ici l'absence
        // d'opération. Un 403, conflit ou incident réseau conserve la demande.
        if ([400, 422].includes(error.status)) { localStorage.removeItem(key); setPending(null) }
        setError(`Résultat à vérifier : ${error.message || 'confirmation serveur absente'}. Toute demande conservée doit être reprise avec sa référence d’origine.`)
      }
    } finally { locked.current = false; if (current()) setBusy(false) }
  }
  return <main style={{ height: '100%', overflow: 'auto', boxSizing: 'border-box', padding: 24, color: '#f8fafc', background: '#0f172a', fontFamily: 'system-ui' }}>
    <button style={button} onClick={onExit}>← Retour</button>
    <h1>Clôture du tiroir (hors rapport de ventes)</h1>
    <p>Comptage des espèces uniquement. Ni chiffre d’affaires, ni TVA des ventes, ni paiements carte ou virements ne sont reconstruits dans cet écran.</p>
    {error && <p role="alert" style={{ color: '#fecaca' }}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Lecture des tiroirs autorisés…</p> : !listConfirmed ? <p role="alert">Liste des tiroirs non confirmée. Aucune ouverture n’est proposée à partir d’une liste inconnue. Revenez à cet écran pour vérifier de nouveau.</p> : <>
      {drawers.length > 1 && <label>Tiroir à compter<select aria-label="Tiroir à compter" value={selected} disabled={busy} onChange={event => setSelected(event.target.value)} style={field}>
        <option value="">Choisir explicitement un tiroir</option>{drawers.map(drawer => <option key={drawer.id} value={drawer.id}>Tiroir {drawer.id}</option>)}
      </select></label>}
      {active && <p>Tiroir actif · Fonds initial : {euro(Math.round(active.openAmount * 100))}</p>}
      {report && <dl>{cashFields.map((key, index) => <div key={key}><dt>{['Fond initial', 'Entrées espèces enregistrées', 'Mouvements entrants', 'Mouvements sortants', 'Espèces théoriques'][index]}</dt><dd>{euro(report[key])}</dd></div>)}</dl>}
      {!confirmed && (active && hasCapability('cash.close', access) || !drawers.length && hasCapability('cash.open', access)) && <form onSubmit={submit}>
        <h2>{active ? 'Compter et clôturer le tiroir v2' : 'Ouvrir le tiroir v2'}</h2>
        <label>{active ? 'Espèces comptées (€)' : 'Fond initial espèces (€)'}<input aria-label={active ? 'Espèces comptées (€)' : 'Fond initial espèces (€)'} inputMode="decimal" required value={amount} disabled={busy || Boolean(pending)} onChange={event => setAmount(event.target.value)} style={field} /></label>
        <label>Motif / observation<textarea aria-label="Motif caisse" maxLength={1000} value={notes} disabled={busy || Boolean(pending)} onChange={event => setNotes(event.target.value)} style={field} /></label>
        <p>L’écart espèces éventuel doit être justifié. Une demande incertaine garde sa référence, même après rechargement.</p>
        <button disabled={busy || Boolean(active && (!report || active.ledgerVersion !== 2))} style={button}>{busy ? 'Vérification serveur…' : pending ? 'Réessayer la même demande' : active ? 'Confirmer la clôture du tiroir' : 'Ouvrir le tiroir'}</button>
      </form>}
      {active?.ledgerVersion !== undefined && active.ledgerVersion !== 2 && <p role="alert">Ancienne session : rapprochement manuel nécessaire, aucun montant historique réinterprété.</p>}
      {!drawers.length && !hasCapability('cash.open', access) && <p>Aucun tiroir actif autorisé. Demandez une ouverture à une personne habilitée.</p>}
    </>}
  </main>
}
