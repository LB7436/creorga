import { useState } from 'react'
import { type Cover, coverTotal } from '../store/posStore'
import { payPartServer, type PartialResult } from '../lib/floorBridge'
import { moneyMinor } from '../../../backend/src/lib/money'

export default function PartialPaymentPanel({ tableId, covers, onDone }: { tableId: string; covers: Cover[]; onDone: () => void }) {
  const [amount, setAmount] = useState(''), [cashPart, setCashPart] = useState(''), [received, setReceived] = useState('')
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'MIXED'>('CASH'), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [result, setResult] = useState<PartialResult | null>(null)
  const hasShares = covers.some(c => c.id.startsWith('guest:share:'))
  const [selectedGroup, setSelectedGroup] = useState('')
  const selected = hasShares ? covers.filter(c => c.id === selectedGroup) : covers
  const outstanding = selected.reduce((n, c) => n + (c.payment?.outstandingCents ?? moneyMinor(coverTotal(c))), 0)
  const paid = selected.reduce((n, c) => n + (c.payment?.paidCents || 0), 0)
  const euros = (cents: number) => (cents / 100).toFixed(2) + ' €'
  const parse = (v: string) => { if (!/^\d+(?:[,.]\d{1,2})?$/.test(v)) throw new Error('Saisissez un montant avec au plus deux décimales.'); return moneyMinor(Number(v.replace(',', '.'))) }
  async function submit() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const cents = amount ? parse(amount) : outstanding, cash = method === 'MIXED' ? parse(cashPart) : method === 'CASH' ? cents : 0
      if (!cents || cents > outstanding || cash > cents) throw new Error('Montant supérieur au restant dû ou ventilation incorrecte.')
      const r = await payPartServer({ tableId, coverIds: selected.map(c => c.id), amountCents: cents, expectedOutstandingCents: outstanding, method,
        ...(cash ? { cashReceivedCents: received ? parse(received) : cash } : {}),
        ...(method === 'MIXED' ? { allocations: [{ method: 'CASH' as const, amountCents: cash }, { method: 'CARD' as const, amountCents: cents - cash }] } : {}) })
      setResult(r); setAmount(''); setReceived(''); setCashPart('')
    } catch (e: any) { setError(e.message || 'Résultat inconnu : réessayez avec la référence conservée.') }
    finally { setBusy(false) }
  }
  const inputStyle = { padding: 10, borderRadius: 8, width: '100%', background: '#111827', color: '#f8fafc', border: '1px solid #64748b', boxSizing: 'border-box' as const }
  return <section aria-label="Acompte et solde" style={{ margin: 16, padding: 18, border: '1px solid #818cf8', borderRadius: 14, color: '#e2e8f0' }}>
    <h2 style={{ fontSize: 18 }}>Acompte / paiement partiel / solde</h2>
    {hasShares && <label>Groupe à encaisser — choix obligatoire<select aria-label="Groupe à encaisser" value={selectedGroup} disabled={busy} style={inputStyle} onChange={e => { setSelectedGroup(e.target.value); setResult(null); setAmount(''); setReceived(''); setCashPart('') }}><option value="">Choisir un groupe</option>{covers.map(c => <option value={c.id} key={c.id}>{c.label} — {euros(c.payment?.outstandingCents ?? moneyMinor(coverTotal(c)))}</option>)}</select></label>}
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
