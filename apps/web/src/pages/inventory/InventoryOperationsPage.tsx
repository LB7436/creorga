import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AlertTriangle, Check, PackagePlus, RefreshCw, Trash2, Truck } from 'lucide-react'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

type Supplier = { id: string; name: string; contactName?: string | null; email?: string | null; phone?: string | null }
type Ingredient = { id: string; name: string; unit: string; costPerUnit: number; currentStock: number; minStockLevel: number; lowStock?: boolean; supplier?: Supplier | null }
type PurchaseOrder = { id: string; status: string; total: number; createdAt: string; supplier: Supplier; items: Array<{ id: string; quantity: number; unitCost: number; ingredient: Ingredient }> }
type View = 'stock' | 'suppliers' | 'orders'

export default function InventoryOperationsPage({ view = 'stock' }: { view?: View }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: 'pièce', currentStock: '0', minStockLevel: '0', costPerUnit: '0', supplierId: '' })
  const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', email: '', phone: '' })
  const [orderForm, setOrderForm] = useState({ supplierId: '', ingredientId: '', quantity: '1', unitCost: '0' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ingredientResponse, supplierResponse, orderResponse] = await Promise.all([
        api.get<Ingredient[]>('/inventory/ingredients'),
        api.get<Supplier[]>('/inventory/suppliers'),
        api.get<PurchaseOrder[]>('/inventory/purchase-orders'),
      ])
      setIngredients(ingredientResponse.data)
      setSuppliers(supplierResponse.data)
      setOrders(orderResponse.data)
    } catch (error: any) {
      toastError(error?.response?.data?.message || 'Impossible de charger l’inventaire')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  const lowStock = useMemo(() => ingredients.filter((item) => item.currentStock <= item.minStockLevel), [ingredients])

  async function createIngredient(event: React.FormEvent) {
    event.preventDefault(); setBusy(true)
    try {
      await api.post('/inventory/ingredients', {
        ...ingredientForm,
        currentStock: Number(ingredientForm.currentStock), minStockLevel: Number(ingredientForm.minStockLevel), costPerUnit: Number(ingredientForm.costPerUnit),
        supplierId: ingredientForm.supplierId || null,
      })
      setIngredientForm({ name: '', unit: 'pièce', currentStock: '0', minStockLevel: '0', costPerUnit: '0', supplierId: '' })
      await load(); toastSuccess('Article de stock enregistré')
    } catch (error: any) { toastError(error?.response?.data?.message || 'Enregistrement impossible') } finally { setBusy(false) }
  }

  async function updateStock(item: Ingredient, value: string) {
    const amount = Number(value)
    if (!Number.isFinite(amount) || amount < 0) return toastError('Le stock doit être un nombre positif')
    try {
      await api.put(`/inventory/ingredients/${item.id}`, { currentStock: amount })
      setIngredients((list) => list.map((entry) => entry.id === item.id ? { ...entry, currentStock: amount, lowStock: amount <= entry.minStockLevel } : entry))
      toastSuccess('Stock enregistré sur le serveur')
    } catch (error: any) { toastError(error?.response?.data?.message || 'Modification impossible') }
  }

  async function removeIngredient(item: Ingredient) {
    if (!window.confirm(`Supprimer ${item.name} du stock ?`)) return
    try { await api.delete(`/inventory/ingredients/${item.id}`); await load(); toastSuccess('Article supprimé') }
    catch (error: any) { toastError(error?.response?.data?.message || 'Suppression impossible') }
  }

  async function createSupplier(event: React.FormEvent) {
    event.preventDefault(); setBusy(true)
    try { await api.post('/inventory/suppliers', supplierForm); setSupplierForm({ name: '', contactName: '', email: '', phone: '' }); await load(); toastSuccess('Fournisseur enregistré') }
    catch (error: any) { toastError(error?.response?.data?.message || 'Enregistrement impossible') } finally { setBusy(false) }
  }

  async function createOrder(event: React.FormEvent) {
    event.preventDefault(); setBusy(true)
    try {
      await api.post('/inventory/purchase-orders', { supplierId: orderForm.supplierId, items: [{ ingredientId: orderForm.ingredientId, quantity: Number(orderForm.quantity), unitCost: Number(orderForm.unitCost) }] })
      setOrderForm((value) => ({ ...value, quantity: '1', unitCost: '0' })); await load(); toastSuccess('Bon de commande enregistré')
    } catch (error: any) { toastError(error?.response?.data?.message || 'Création impossible') } finally { setBusy(false) }
  }

  async function receiveOrder(order: PurchaseOrder) {
    try { await api.put(`/inventory/purchase-orders/${order.id}/receive`); await load(); toastSuccess('Réception enregistrée et stock crédité') }
    catch (error: any) { toastError(error?.response?.data?.message || 'Réception impossible') }
  }

  return <main style={page}>
    <header style={header}><div><p style={eyebrow}>Inventaire enregistré</p><h1 style={title}>{view === 'stock' ? 'Stock réel' : view === 'suppliers' ? 'Fournisseurs' : 'Bons de commande'}</h1><p style={subtitle}>Aucune donnée de démonstration : chaque action ci-dessous écrit dans la base de votre société.</p></div><button onClick={() => void load()} disabled={loading} style={secondary}><RefreshCw size={16} /> Actualiser</button></header>
    {view === 'stock' && <>
      <section style={stats}><Stat label="Articles" value={ingredients.length} /><Stat label="Alertes de stock" value={lowStock.length} warn={lowStock.length > 0} /><Stat label="Valeur estimée" value={`${ingredients.reduce((sum, item) => sum + item.currentStock * item.costPerUnit, 0).toFixed(2)} €`} /></section>
      <form onSubmit={createIngredient} style={card}><h2 style={h2}><PackagePlus size={19} /> Ajouter un article</h2><div style={formGrid}><Field label="Nom"><input required value={ingredientForm.name} onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })} style={input} /></Field><Field label="Unité"><input required value={ingredientForm.unit} onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })} style={input} /></Field><Field label="Stock actuel"><input required type="number" min="0" step="0.01" value={ingredientForm.currentStock} onChange={(e) => setIngredientForm({ ...ingredientForm, currentStock: e.target.value })} style={input} /></Field><Field label="Seuil d’alerte"><input required type="number" min="0" step="0.01" value={ingredientForm.minStockLevel} onChange={(e) => setIngredientForm({ ...ingredientForm, minStockLevel: e.target.value })} style={input} /></Field><Field label="Coût unitaire"><input required type="number" min="0" step="0.01" value={ingredientForm.costPerUnit} onChange={(e) => setIngredientForm({ ...ingredientForm, costPerUnit: e.target.value })} style={input} /></Field><Field label="Fournisseur"><select value={ingredientForm.supplierId} onChange={(e) => setIngredientForm({ ...ingredientForm, supplierId: e.target.value })} style={input}><option value="">Aucun</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field></div><button disabled={busy} style={primary}>Enregistrer l’article</button></form>
      <section style={card}><h2 style={h2}>Articles en stock</h2>{loading ? <Empty text="Chargement…" /> : ingredients.length === 0 ? <Empty text="Aucun article. Ajoutez votre premier ingrédient ci-dessus." /> : <div style={{ overflowX: 'auto' }}><table style={table}><thead><tr>{['Article', 'Fournisseur', 'Coût', 'Stock', 'Seuil', 'État', ''].map((cell) => <th key={cell} style={th}>{cell}</th>)}</tr></thead><tbody>{ingredients.map((item) => <tr key={item.id}><td style={td}><strong>{item.name}</strong><small style={small}> / {item.unit}</small></td><td style={td}>{item.supplier?.name || '—'}</td><td style={td}>{item.costPerUnit.toFixed(2)} €</td><td style={td}><input aria-label={`Stock de ${item.name}`} type="number" min="0" step="0.01" defaultValue={item.currentStock} onBlur={(e) => void updateStock(item, e.target.value)} style={{ ...input, width: 95 }} /></td><td style={td}>{item.minStockLevel}</td><td style={td}>{item.currentStock <= item.minStockLevel ? <span style={warning}><AlertTriangle size={14} /> Bas</span> : <span style={ok}><Check size={14} /> OK</span>}</td><td style={td}><button onClick={() => void removeIngredient(item)} aria-label={`Supprimer ${item.name}`} style={icon}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}</section>
    </>}
    {view === 'suppliers' && <><form onSubmit={createSupplier} style={card}><h2 style={h2}><Truck size={19} /> Nouveau fournisseur</h2><div style={formGrid}><Field label="Société"><input required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} style={input} /></Field><Field label="Contact"><input value={supplierForm.contactName} onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })} style={input} /></Field><Field label="Email"><input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} style={input} /></Field><Field label="Téléphone"><input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} style={input} /></Field></div><button disabled={busy} style={primary}>Enregistrer le fournisseur</button></form><section style={card}>{suppliers.length === 0 ? <Empty text="Aucun fournisseur enregistré." /> : suppliers.map((supplier) => <article key={supplier.id} style={row}><strong>{supplier.name}</strong><span style={small}>{supplier.contactName || 'Aucun contact'} · {supplier.email || supplier.phone || 'coordonnées non renseignées'}</span></article>)}</section></>}
    {view === 'orders' && <><form onSubmit={createOrder} style={card}><h2 style={h2}>Créer un bon de commande</h2>{suppliers.length === 0 || ingredients.length === 0 ? <Empty text="Ajoutez d’abord un fournisseur et un article de stock." /> : <><div style={formGrid}><Field label="Fournisseur"><select required value={orderForm.supplierId} onChange={(e) => setOrderForm({ ...orderForm, supplierId: e.target.value })} style={input}><option value="">Choisir…</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field><Field label="Article"><select required value={orderForm.ingredientId} onChange={(e) => setOrderForm({ ...orderForm, ingredientId: e.target.value })} style={input}><option value="">Choisir…</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Quantité"><input required type="number" min="0.01" step="0.01" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} style={input} /></Field><Field label="Coût unitaire"><input required type="number" min="0" step="0.01" value={orderForm.unitCost} onChange={(e) => setOrderForm({ ...orderForm, unitCost: e.target.value })} style={input} /></Field></div><button disabled={busy} style={primary}>Enregistrer le bon</button></>}</form><section style={card}>{orders.length === 0 ? <Empty text="Aucun bon de commande." /> : orders.map((order) => <article key={order.id} style={row}><div><strong>{order.supplier.name} · {order.total.toFixed(2)} €</strong><div style={small}>{order.items.map((item) => `${item.ingredient.name} × ${item.quantity}`).join(', ')}</div></div>{order.status === 'RECEIVED' ? <span style={ok}><Check size={14} /> Réceptionné</span> : <button onClick={() => void receiveOrder(order)} style={primary}>Réceptionner</button>}</article>)}</section></>}
  </main>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={fieldLabel}>{label}{children}</label> }
function Stat({ label, value, warn = false }: { label: string; value: string | number; warn?: boolean }) { return <div style={{ ...card, margin: 0 }}><span style={small}>{label}</span><strong style={{ display: 'block', fontSize: 25, color: warn ? '#b45309' : '#0f172a' }}>{value}</strong></div> }
function Empty({ text }: { text: string }) { return <div style={{ padding: 28, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12 }}>{text}</div> }
const page: CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '26px 20px 50px', color: '#0f172a' }
const header: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }
const eyebrow: CSSProperties = { margin: 0, color: '#92400e', fontSize: 12, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '.1em' }
const title: CSSProperties = { margin: '4px 0 0', fontSize: 32, letterSpacing: '-.03em' }
const subtitle: CSSProperties = { color: '#64748b', margin: '7px 0 0' }
const card: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)', marginBottom: 16 }
const stats: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 16 }
const h2: CSSProperties = { margin: '0 0 14px', fontSize: 18, display: 'flex', gap: 8, alignItems: 'center' }
const formGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 11, marginBottom: 13 }
const fieldLabel: CSSProperties = { display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }
const input: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 9, padding: '9px 10px', color: '#0f172a', background: '#fff', font: 'inherit', boxSizing: 'border-box', width: '100%' }
const primary: CSSProperties = { border: 0, borderRadius: 9, padding: '9px 13px', background: '#92400e', color: '#fff', fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
const secondary: CSSProperties = { ...primary, background: '#fff', color: '#334155', border: '1px solid #cbd5e1' }
const row: CSSProperties = { padding: 13, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }
const small: CSSProperties = { color: '#64748b', fontSize: 12 }
const warning: CSSProperties = { color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 750 }
const ok: CSSProperties = { color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 750 }
const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: 720 }
const th: CSSProperties = { textAlign: 'left', padding: 10, fontSize: 11, color: '#64748b', borderBottom: '1px solid #e2e8f0' }
const td: CSSProperties = { padding: 10, borderBottom: '1px solid #f1f5f9', fontSize: 13 }
const icon: CSSProperties = { border: 0, background: '#fef2f2', color: '#dc2626', borderRadius: 8, padding: 7, cursor: 'pointer' }
