import { useEffect, useRef, useState } from 'react'
import { type Cover, coverTotal } from '../store/posStore'
import { payPartServer, type PartialResult } from '../lib/floorBridge'
import { sessionCompany, sessionGeneration } from '../lib/server'
import { moneyMinor } from '../../../backend/src/lib/money'

type Props = { tableId: string; covers: Cover[]; onDone: () => void }
type Selection = { key: string; group: string; emptied: boolean }
type Confirmation = { selection: Selection; result: PartialResult }
const scopeFor = (tableId: string) => JSON.stringify([sessionCompany(), sessionGeneration(), tableId])
const matchesSelection = (source: Selection, current: Selection, settled: boolean) => source.group === current.group &&
  (source.key === current.key || settled && current.emptied)

export default function PartialPaymentPanel(props: Props) {
  const scope = scopeFor(props.tableId)
  // Une nouvelle table, société ou connexion ne reprend jamais le récapitulatif
  // ni les champs de saisie d'un ancien règlement.
  return <PaymentForm key={scope} {...props} scope={scope} />
}

function PaymentForm({ tableId, covers, onDone, scope }: Props & { scope: string }) {
  const [amount, setAmount] = useState(''), [cashPart, setCashPart] = useState(''), [received, setReceived] = useState('')
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'MIXED'>('CASH'), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const hasShares = covers.some(c => c.id.startsWith('guest:share:'))
  const [selectedGroup, setSelectedGroup] = useState('')
  const selected = hasShares ? covers.filter(c => c.id === selectedGroup) : covers
  const selection: Selection = { group: selectedGroup, emptied: !selected.length && (!covers.length || hasShares && Boolean(selectedGroup)),
    key: JSON.stringify(selected.map(c => [c.id, c.items.map(i => [i.id, i.qty, i.price, i.taxRate]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))) }
  const current = useRef(selection), mounted = useRef(false), pending = useRef<Selection | null>(null)
  current.current = selection
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const result = confirmation && scopeFor(tableId) === scope && matchesSelection(confirmation.selection, selection, confirmation.result.status === 'SETTLED') ? confirmation.result : null
  useEffect(() => {
    // Le serveur peut vider le groupe soldé avant de rendre sa réponse. Ce seul
    // changement reste admissible ; une autre sélection invalide définitivement
    // le résultat et les réponses encore attendues de la précédente.
    if (pending.current && !matchesSelection(pending.current, selection, true)) pending.current = null
    if (confirmation && !result) setConfirmation(null)
    setError('')
  }, [selection.key, selection.group])
  // Seul le solde définitif survit à la disparition des couverts. Un groupe
  // encore ouvert continue à suivre ses projections et règlements ultérieurs.
  const settled = result?.status === 'SETTLED' ? result : null
  const outstanding = settled?.outstandingCents ?? selected.reduce((n, c) => n + (c.payment?.outstandingCents ?? moneyMinor(coverTotal(c))), 0)
  const paid = settled?.paidCents ?? selected.reduce((n, c) => n + (c.payment?.paidCents || 0), 0)
  const euros = (cents: number) => (cents / 100).toFixed(2) + ' €'
  const parse = (v: string) => { if (!/^\d+(?:[,.]\d{1,2})?$/.test(v)) throw new Error('Saisissez un montant avec au plus deux décimales.'); return moneyMinor(Number(v.replace(',', '.'))) }
  async function submit() {
    if (busy) return
    setBusy(true); setError('')
    const requested = selection
    pending.current = requested
    const stillCurrent = () => mounted.current && scopeFor(tableId) === scope && pending.current === requested
    try {
      const cents = amount ? parse(amount) : outstanding, cash = method === 'MIXED' ? parse(cashPart) : method === 'CASH' ? cents : 0
      if (!cents || cents > outstanding || cash > cents) throw new Error('Montant supérieur au restant dû ou ventilation incorrecte.')
      const r = await payPartServer({ tableId, coverIds: selected.map(c => c.id), amountCents: cents, expectedOutstandingCents: outstanding, method,
        ...(cash ? { cashReceivedCents: received ? parse(received) : cash } : {}),
        ...(method === 'MIXED' ? { allocations: [{ method: 'CASH' as const, amountCents: cash }, { method: 'CARD' as const, amountCents: cents - cash }] } : {}) })
      if (!stillCurrent() || !matchesSelection(requested, current.current, r.status === 'SETTLED')) return
      setConfirmation({ selection: requested, result: r }); setAmount(''); setReceived(''); setCashPart('')
    } catch (e: any) {
      if (stillCurrent()) setError(e.message === 'Failed to fetch' && e.status === undefined
        ? 'Connexion au serveur interrompue. Résultat à vérifier ; réessayez avec la référence conservée.'
        : e.message || 'Résultat inconnu : réessayez avec la référence conservée.')
    } finally { if (mounted.current) setBusy(false); if (pending.current === requested) pending.current = null }
  }
  const inputStyle = { padding: 10, borderRadius: 8, width: '100%', background: '#111827', color: '#f8fafc', border: '1px solid #64748b', boxSizing: 'border-box' as const }
  return <section aria-label="Acompte et solde" style={{ margin: 16, padding: 18, border: '1px solid #818cf8', borderRadius: 14, color: '#e2e8f0' }}>
    <h2 style={{ fontSize: 18 }}>Acompte / paiement partiel / solde</h2>
    {hasShares && <label>Groupe à encaisser — choix obligatoire<select aria-label="Groupe à encaisser" value={selectedGroup} disabled={busy} style={inputStyle} onChange={e => { pending.current = null; setSelectedGroup(e.target.value); setConfirmation(null); setError(''); setAmount(''); setReceived(''); setCashPart('') }}><option value="">Choisir un groupe</option>{covers.map(c => <option value={c.id} key={c.id}>{c.label} — {euros(c.payment?.outstandingCents ?? moneyMinor(coverTotal(c)))}</option>)}</select></label>}
    <p>Déjà enregistré : {euros(paid)} · Restant dû : <strong>{euros(outstanding)}</strong></p>
    <p style={{ fontSize: 13 }}>Espèces ou carte déclarée manuellement après contrôle du terminal. Aucun débit bancaire automatique. Les lignes avec acompte restent figées ; ajoutez une tournée séparée.</p>
    {result && <div role="status">Règlement déclaré enregistré : {euros(result.paidCents)}. Restant : {euros(result.outstandingCents)}.{result.cashChangeCents > 0 && ` Monnaie à rendre : ${euros(result.cashChangeCents)}.`}
      {result.status === 'SETTLED' && <button onClick={onDone}>{result.sales.length ? 'Terminer — ticket disponible au journal' : 'Terminer — règlement conservé, vente émise au solde de tous les groupes'}</button>}</div>}
    {outstanding > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
      <label>Montant à enregistrer (€)<input aria-label="Montant acompte" inputMode="decimal" placeholder={`Solde : ${(outstanding / 100).toFixed(2)}`} value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} disabled={busy} /></label>
      <label>Moyen de règlement<select aria-label="Moyen acompte" value={method} onChange={e => setMethod(e.target.value as typeof method)} style={inputStyle} disabled={busy}><option value="CASH">Espèces</option><option value="CARD">Carte déclarée</option><option value="MIXED">Espèces + carte déclarée</option></select></label>
      {method === 'MIXED' && <label>Part espèces (€)<input aria-label="Part espèces acompte" inputMode="decimal" value={cashPart} onChange={e => setCashPart(e.target.value)} style={inputStyle} disabled={busy} /></label>}
      {method !== 'CARD' && <label>Espèces reçues (€)<input aria-label="Espèces reçues acompte" inputMode="decimal" value={received} onChange={e => setReceived(e.target.value)} style={inputStyle} disabled={busy} /></label>}
      <button onClick={submit} disabled={busy || !covers.length} style={{ ...inputStyle, background: '#4338ca', cursor: 'pointer' }}>{busy ? 'Vérification serveur…' : amount ? 'Enregistrer ce montant / réessayer' : 'Enregistrer le solde / réessayer'}</button>
    </div>}
    {error && <p role="alert" style={{ color: '#fda4af' }}>{error}</p>}
  </section>
}
