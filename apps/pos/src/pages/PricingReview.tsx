import { useState } from 'react'
import { usePOS, type OrderItem } from '../store/posStore'
import { reviewLinePricing } from '../lib/floorBridge'

function ReviewLine({ line }: { line: OrderItem }) {
  const products = usePOS(s => s.menu)
  const [productId, setProductId] = useState(line.menuItemId === 'produit-a-verifier' ? '' : line.menuItemId)
  const [price, setPrice] = useState(String(line.price))
  const [rate, setRate] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <form onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('')
    try { await reviewLinePricing(line.id, { productId, price: Number(price), taxRate: Number(rate), reason }) }
    catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }} style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid #b45309', borderRadius: 8 }}>
    <strong>{line.qty} × {line.name} — prix enregistré {line.price.toFixed(2)} € TTC</strong>
    <label>Produit à rattacher <select required value={productId} onChange={e => setProductId(e.target.value)}>
      <option value="">Choisir le produit</option>
      {productId && !products.some(p => p.id === productId) && <option value={productId}>{line.name} (ancienne référence)</option>}
      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label>
    <label>Prix unitaire TTC vérifié (€) <input required type="number" step="0.01" min="0" max="1000000" value={price} onChange={e => setPrice(e.target.value)} /></label>
    <label>TVA historique vérifiée (%) <input required type="number" step="0.01" min="0" max="100" placeholder="Ne pas déduire du catalogue actuel" value={rate} onChange={e => setRate(e.target.value)} /></label>
    <label>Motif et source de vérification <input required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex. tarif papier du jour vérifié" /></label>
    <button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Confirmer le prix et la TVA de cette ligne'}</button>
    {error && <p role="alert">{error}</p>}
  </form>
}

export default function PricingReview({ lines }: { lines: OrderItem[] }) {
  const role = usePOS(s => s.currentStaff?.role)
  if (!lines.length) return null
  return <section aria-label="Vérification des anciennes lignes" style={{ padding: 16, color: '#fde68a', background: '#422006', borderRadius: 12, marginBottom: 16 }}>
    <h3>Anciennes lignes à vérifier avant encaissement</h3>
    <p>Ces données ne contiennent pas de TVA historique vérifiée. Leur prix enregistré est conservé. La confirmation du responsable est tracée ; elle ne constitue pas une reconstitution automatique.</p>
    {role === 'OWNER' || role === 'MANAGER' ? lines.map(line => <ReviewLine key={line.id} line={line} />)
      : <p>Connectez un propriétaire ou un responsable pour vérifier ces lignes.</p>}
  </section>
}
