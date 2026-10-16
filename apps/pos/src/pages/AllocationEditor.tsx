import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/server'
import { previewAllocationServer, confirmAllocationServer, retryAllocationServer, type AllocationDecision, type AllocationDraft } from '../lib/floorBridge'

const field = { display: 'block', width: '100%', minHeight: 40, boxSizing: 'border-box' as const, padding: 8, background: '#111827', color: '#f8fafc', border: '1px solid #94a3b8', borderRadius: 6 }
const money = (n: number) => (n / 100).toFixed(2).replace('.', ',') + ' €'
type Group = AllocationDraft['groups'][number] & { quantities: Record<string, number>; payments: Record<string, string> }
export default function AllocationEditor({ orderId, tables, onDone }: { orderId: string; tables: { id: string; name: string }[]; onDone: () => void }) {
  const [source, setSource] = useState<any>(null), [groups, setGroups] = useState<Group[]>([]), [reason, setReason] = useState('')
  const [decision, setDecision] = useState<AllocationDecision | null>(null), [ack, setAck] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const previewHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    let active = true
    Promise.all([api('/orders/' + encodeURIComponent(orderId)), api('/orders/' + encodeURIComponent(orderId) + '/payment-balance')]).then(([order, balance]) => {
      if (!active) return
      setSource({ order, balance }); setGroups([1, 2].map(i => ({ key: crypto.randomUUID(), label: 'Groupe ' + i, tableId: order.externalTableId, kitchenNote: '', barNote: '', lines: [], quantities: {}, payments: {} })))
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [orderId])
  useEffect(() => { if (decision) previewHeading.current?.focus() }, [decision])
  const changed = () => { setDecision(null); setAck(false); setError('') }
  function update(index: number, next: Partial<Group>) { changed(); setGroups(previous => previous.map((g, i) => i === index ? { ...g, ...next } : g)) }
  async function preview() {
    setBusy(true); setError(''); setAck(false)
    try {
      const cents = (v: string) => { if (!/^\d+(?:[,.]\d{1,2})?$/.test(v)) throw Error('Chaque acompte doit être réparti avec au plus deux décimales.'); return Math.round(Number(v.replace(',', '.')) * 100) }
      if (source.balance.payments.some((t: any) => groups.reduce((n, g) => n + (g.payments[t.id] ? cents(g.payments[t.id]) : 0), 0) !== t.amountCents)) throw Error('Répartissez explicitement chaque acompte au centime entre les groupes avant de demander l’aperçu.')
      const draft = { orderId, reason, groups: groups.map(({ quantities, payments, ...g }) => ({ ...g, lines: Object.entries(quantities).filter(([, qty]) => qty > 0).map(([itemId, qty]) => ({ itemId, qty })) })),
        tenderDecisions: source.balance.payments.map((t: any) => ({ tenderId: t.id, parts: groups.filter(g => g.payments[t.id] && cents(g.payments[t.id]) > 0).map(g => ({ groupKey: g.key, amountCents: cents(g.payments[t.id]) })) })) }
      setDecision(await previewAllocationServer(draft))
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  async function confirm(retry = false) {
    setBusy(true); setError('')
    try { if (retry) await retryAllocationServer(orderId); else if (decision && ack) await confirmAllocationServer(decision); else throw Error('Relisez l’aperçu et confirmez votre décision.'); onDone() }
    catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  return <div style={{ color: '#e2e8f0', overflowWrap: 'anywhere' }}>
    <p>Répartir la créance, sans recréer la vente. Chaque quantité et chaque acompte doivent être affectés explicitement. Les documents émis, le stock et le ticket de préparation restent ceux de l’original.</p>
    <p>Les centimes de remise et de TVA sont répartis suivant les identifiants stables des groupes ; l’aperçu affiche la décision exacte. Paiement des portions auprès du personnel uniquement.</p>
    {source ? <>
      <p>Total historique : <strong>{money(source.balance.totalCents)}</strong> · Acomptes : {money(source.balance.paidCents)} · Solde : {money(source.balance.outstandingCents)}</p>
      {groups.map((g, index) => <fieldset key={g.key} disabled={busy} style={{ margin: '12px 0', minWidth: 0, border: '1px solid #64748b', borderRadius: 8 }}>
        <legend>Groupe {index + 1}</legend>
        <label>Nom du groupe {index + 1}<input style={field} maxLength={80} value={g.label} onChange={e => update(index, { label: e.target.value })} /></label>
        <label>Table du groupe {index + 1}<select style={field} value={g.tableId} onChange={e => update(index, { tableId: e.target.value })}>{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        {source.order.items.map((line: any) => <label key={line.id}>Quantité {line.productName || line.product?.name} — groupe {index + 1} (total {line.quantity})<input style={field} type="number" min={0} max={line.quantity} step={1} value={g.quantities[line.id] ?? 0} onChange={e => update(index, { quantities: { ...g.quantities, [line.id]: Number(e.target.value) } })} /></label>)}
        <label>Consigne cuisine — groupe {index + 1}<input style={field} maxLength={500} value={g.kitchenNote} onChange={e => update(index, { kitchenNote: e.target.value })} /></label>
        <label>Consigne bar — groupe {index + 1}<input style={field} maxLength={500} value={g.barNote} onChange={e => update(index, { barNote: e.target.value })} /></label>
        {source.balance.payments.map((t: any, paymentIndex: number) => <label key={t.id}>Acompte {paymentIndex + 1} {t.method} ({money(t.amountCents)}) — groupe {index + 1} (€)<input style={field} inputMode="decimal" value={g.payments[t.id] || ''} onChange={e => update(index, { payments: { ...g.payments, [t.id]: e.target.value } })} /></label>)}
      </fieldset>)}
      <button disabled={busy || groups.length >= 10} style={{ ...field, marginBottom: 12 }} onClick={() => { changed(); setGroups([...groups, { key: crypto.randomUUID(), label: 'Groupe ' + (groups.length + 1), tableId: groups[0].tableId, kitchenNote: '', barNote: '', lines: [], quantities: {}, payments: {} }]) }}>Ajouter un groupe</button>
      <label>Motif de la répartition (10 caractères minimum)<textarea style={field} maxLength={1000} value={reason} disabled={busy} onChange={e => { changed(); setReason(e.target.value) }} /></label>
      <button disabled={busy} onClick={preview} style={{ ...field, background: '#3730a3', marginTop: 12 }}>Calculer l’aperçu sans enregistrer</button>
    </> : <p role="status">Chargement de la commande historique…</p>}
    {decision?.plan && <section aria-label="Aperçu financier" style={{ marginTop: 16 }}>
      <h3 ref={previewHeading} tabIndex={-1}>Aperçu — aucun montant encore déplacé</h3>
      {decision.plan.groups.map((g: any) => <p key={g.key}><strong>{g.label}</strong> : {money(g.totalCents)} TTC, remise {money(g.discountCents)}, TVA {money(g.taxCents)}, acompte {money(g.paidCents)}, reste {money(g.outstandingCents)}.</p>)}
      <label style={{ display: 'flex', alignItems: 'start', gap: 10 }}><input type="checkbox" checked={ack} disabled={busy} onChange={e => setAck(e.target.checked)} style={{ minWidth: 24, minHeight: 24 }} />Je valide en tant que responsable les quantités, les centimes et l’affectation de chaque acompte. Les anciens QR seront révoqués.</label>
      <button disabled={busy || !ack} onClick={() => confirm()} style={{ ...field, marginTop: 12, background: '#3730a3' }}>{busy ? 'Vérification…' : 'Confirmer la répartition financière'}</button>
    </section>}
    {error && <p role="alert" style={{ color: '#fda4af' }}>{error}</p>}
    <button disabled={busy} style={{ ...field, marginTop: 12 }} onClick={() => confirm(true)}>Réessayer une décision conservée après coupure</button>
  </div>
}
