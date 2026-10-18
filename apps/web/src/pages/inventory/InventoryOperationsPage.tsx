import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AlertTriangle, Check, PackagePlus, RefreshCw, Trash2, Truck } from 'lucide-react'
import api, { assertAuthScope } from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { authDataScope } from '@/lib/authScope'
import { useAuthStore } from '@/stores/authStore'

type Supplier = { id: string; name: string; contactName?: string | null; email?: string | null; phone?: string | null }
type Ingredient = { id: string; name: string; unit: string; costPerUnit?: number | null; currentStock: number; minStockLevel: number; lowStock?: boolean; supplier?: Supplier | null }
type PurchaseOrder = { id: string; status: string; total: number; createdAt: string; supplier: Supplier; items: Array<{ id: string; quantity: number; unitCost: number; ingredient: Ingredient }> }
type View = 'stock' | 'suppliers' | 'orders'

export default function InventoryOperationsPage({ view = 'stock' }: { view?: View }) {
  const scope = useAuthStore(authDataScope)
  const access = useAuthStore(state => state.businessAccess)
  const capability = view === 'stock' ? 'inventory.quantities.read' : 'finance.costs.read'
  if (!access?.capabilities.includes(capability)) return <main role="alert" style={page}>{access
    ? view === 'stock' ? 'La lecture des quantités n’est pas autorisée pour votre accès.' : 'La lecture des fournisseurs et commandes nécessite le droit de lire les coûts.'
    : 'Accès à l’inventaire en cours de vérification.'}</main>
  return <ScopedInventoryOperationsPage key={`${scope}:${view}`} scope={scope} view={view} />
}

function ScopedInventoryOperationsPage({ view, scope }: { view: View; scope: string }) {
  const access = useAuthStore(state => state.businessAccess)
  const has = (...capabilities: string[]) => capabilities.every(capability => access?.capabilities.includes(capability))
  const canAdjust = has('inventory.adjust'), canReadCosts = has('finance.costs.read')
  const canCreateIngredient = has('inventory.adjust', 'finance.costs.read', 'finance.manage')
  const canWriteSupplier = has('inventory.adjust', 'finance.costs.read')
  const canCreateOrder = canCreateIngredient && has('inventory.quantities.read')
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({})
  const [stockSaving, setStockSaving] = useState<Record<string, boolean>>({})
  const stockRequests = useRef(new Set<string>())
  const receiveRequests = useRef(new Set<string>())
  const [receiving, setReceiving] = useState<Record<string, boolean>>({})
  const loadRevision = useRef(0)
  const mounted = useRef(true)
  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: 'pièce', currentStock: '0', minStockLevel: '0', costPerUnit: '', supplierId: '' })
  const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', email: '', phone: '' })
  const [orderForm, setOrderForm] = useState({ supplierId: '', ingredientId: '', quantity: '1', unitCost: '' })
  const isCurrent = useCallback(() => {
    if (!mounted.current) return false
    try { assertAuthScope(scope); return true } catch { return false }
  }, [scope])
  const mayWrite = (...capabilities: string[]) => isCurrent()
    && capabilities.every(capability => useAuthStore.getState().businessAccess?.capabilities.includes(capability))

  const load = useCallback(async () => {
    if (!isCurrent()) return false
    const revision = ++loadRevision.current
    const currentRead = () => isCurrent() && revision === loadRevision.current
    setLoading(true); setLoadError(null)
    try {
      const [ingredientResponse, supplierResponse, orderResponse] = await Promise.all([
        view === 'stock' || view === 'orders' && canCreateOrder ? api.get<Ingredient[]>('/inventory/ingredients') : Promise.resolve({ data: [] as Ingredient[] }),
        view === 'suppliers' || view === 'stock' && canCreateIngredient || view === 'orders' && canCreateOrder ? api.get<Supplier[]>('/inventory/suppliers') : Promise.resolve({ data: [] as Supplier[] }),
        view === 'orders' ? api.get<PurchaseOrder[]>('/inventory/purchase-orders') : Promise.resolve({ data: [] as PurchaseOrder[] }),
      ])
      if (!currentRead()) return false
      setIngredients(ingredientResponse.data)
      setSuppliers(supplierResponse.data)
      setOrders(orderResponse.data)
      return true
    } catch (error: any) {
      if (currentRead()) {
        const message = error?.response?.data?.message || 'Impossible de charger l’inventaire'
        setLoadError(message); toastError(message)
      }
      return false
    } finally {
      if (currentRead()) setLoading(false)
    }
  }, [isCurrent, view, canCreateIngredient, canCreateOrder])

  useEffect(() => {
    mounted.current = true
    void load()
    return () => { mounted.current = false; loadRevision.current++ }
  }, [load])
  const lowStock = useMemo(() => ingredients.filter((item) => item.currentStock <= item.minStockLevel), [ingredients])
  const hasCost = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
  const valuation = ingredients.every(item => hasCost(item.costPerUnit))
    ? `${ingredients.reduce((sum, item) => sum + item.currentStock * item.costPerUnit!, 0).toFixed(2)} €` : 'Indisponible : coûts incomplets'
  const costLabel = (value: unknown) => hasCost(value) ? `${value.toFixed(2)} €` : 'Non renseigné'
  const numberInput = (value: string, minimum = 0) => value.trim() && Number.isFinite(Number(value)) && Number(value) >= minimum ? Number(value) : null

  async function createIngredient(event: React.FormEvent) {
    event.preventDefault()
    if (!mayWrite('inventory.adjust', 'finance.costs.read', 'finance.manage') || busy) return
    const cost = numberInput(ingredientForm.costPerUnit), stock = numberInput(ingredientForm.currentStock), minimum = numberInput(ingredientForm.minStockLevel)
    if (cost === null || stock === null || minimum === null) return toastError('Saisissez un coût unitaire et des quantités valides ; un coût absent n’est pas zéro.')
    setBusy(true)
    try {
      await api.post('/inventory/ingredients', {
        ...ingredientForm,
        currentStock: stock, minStockLevel: minimum, costPerUnit: cost,
        supplierId: ingredientForm.supplierId || null,
      })
      if (!isCurrent()) return
      setIngredientForm({ name: '', unit: 'pièce', currentStock: '0', minStockLevel: '0', costPerUnit: '', supplierId: '' })
      await load(); if (isCurrent()) toastSuccess('Article de stock enregistré')
    } catch (error: any) { if (isCurrent()) toastError(error?.response?.data?.message || 'Enregistrement impossible') } finally { if (isCurrent()) setBusy(false) }
  }

  async function updateStock(item: Ingredient, value: string) {
    if (!mayWrite('inventory.adjust') || stockRequests.current.has(item.id)) return
    const clearDraft = () => setStockDrafts(previous => { const next = { ...previous }; delete next[item.id]; return next })
    const amount = Number(value)
    if (!value.trim() || !Number.isFinite(amount) || amount < 0) { clearDraft(); return toastError('Le stock doit être un nombre positif') }
    // Un simple passage du focus ne doit pas réécrire un ancien stock.
    if (amount === item.currentStock) { clearDraft(); return }
    stockRequests.current.add(item.id)
    setStockSaving(previous => ({ ...previous, [item.id]: true }))
    try {
      await api.put(`/inventory/ingredients/${item.id}`, { currentStock: amount })
      if (!isCurrent()) return
      setIngredients((list) => list.map((entry) => entry.id === item.id ? { ...entry, currentStock: amount, lowStock: amount <= entry.minStockLevel } : entry))
      toastSuccess('Stock enregistré sur le serveur')
    } catch (error: any) { if (isCurrent()) toastError(error?.response?.data?.message || 'Modification impossible') }
    finally {
      stockRequests.current.delete(item.id)
      if (isCurrent()) { clearDraft(); setStockSaving(previous => ({ ...previous, [item.id]: false })) }
    }
  }

  async function removeIngredient(item: Ingredient) {
    if (!mayWrite('inventory.adjust')) return
    if (!window.confirm(`Supprimer ${item.name} du stock ?`)) return
    if (!mayWrite('inventory.adjust')) return
    try { await api.delete(`/inventory/ingredients/${item.id}`); if (!isCurrent()) return; await load(); if (isCurrent()) toastSuccess('Article supprimé') }
    catch (error: any) { if (isCurrent()) toastError(error?.response?.data?.message || 'Suppression impossible') }
  }

  async function createSupplier(event: React.FormEvent) {
    event.preventDefault()
    if (!mayWrite('inventory.adjust', 'finance.costs.read') || busy) return
    setBusy(true)
    try { await api.post('/inventory/suppliers', supplierForm); if (!isCurrent()) return; setSupplierForm({ name: '', contactName: '', email: '', phone: '' }); await load(); if (isCurrent()) toastSuccess('Fournisseur enregistré') }
    catch (error: any) { if (isCurrent()) toastError(error?.response?.data?.message || 'Enregistrement impossible') } finally { if (isCurrent()) setBusy(false) }
  }

  async function createOrder(event: React.FormEvent) {
    event.preventDefault()
    if (!mayWrite('inventory.adjust', 'finance.manage', 'finance.costs.read', 'inventory.quantities.read') || busy) return
    const quantity = numberInput(orderForm.quantity, 0.000001), unitCost = numberInput(orderForm.unitCost)
    if (quantity === null || unitCost === null || !orderForm.supplierId || !orderForm.ingredientId) return toastError('Choisissez le fournisseur, l’article et saisissez une quantité et un coût unitaire explicites.')
    setBusy(true)
    try {
      await api.post('/inventory/purchase-orders', { supplierId: orderForm.supplierId, items: [{ ingredientId: orderForm.ingredientId, quantity, unitCost }] })
      if (!isCurrent()) return
      setOrderForm((value) => ({ ...value, quantity: '1', unitCost: '' })); await load(); if (isCurrent()) toastSuccess('Bon de commande enregistré')
    } catch (error: any) { if (isCurrent()) toastError(error?.response?.data?.message || 'Création impossible') } finally { if (isCurrent()) setBusy(false) }
  }

  async function receiveOrder(order: PurchaseOrder) {
    // Le ref ferme aussi la fenêtre entre deux événements avant le rerendu.
    // L'unicité financière reste garantie séparément par la transaction API.
    if (!mayWrite('inventory.adjust', 'finance.costs.read') || receiveRequests.current.has(order.id)) return
    receiveRequests.current.add(order.id)
    setReceiving(current => ({ ...current, [order.id]: true }))
    try {
      await api.put(`/inventory/purchase-orders/${order.id}/receive`)
      if (!isCurrent()) return
      await load()
      if (isCurrent()) toastSuccess('Réception enregistrée et stock crédité')
    } catch (error: any) {
      if (isCurrent()) toastError(error?.response?.data?.message || 'Réception impossible : vérifier l’état serveur avant une nouvelle tentative')
    } finally {
      receiveRequests.current.delete(order.id)
      if (isCurrent()) setReceiving(current => ({ ...current, [order.id]: false }))
    }
  }

  return <main style={page}>
    <header style={header}><div><p style={eyebrow}>Inventaire enregistré</p><h1 style={title}>{view === 'stock' ? 'Stock réel' : view === 'suppliers' ? 'Fournisseurs' : 'Bons de commande'}</h1><p style={subtitle}>Quantités enregistrées pour votre société. Les modifications dépendent de vos autorisations.</p></div><button onClick={() => void load()} disabled={loading} style={secondary}><RefreshCw size={16} /> Actualiser</button></header>
    {loadError && <p role="alert" style={card}>{loadError}. Les données n’ont pas pu être actualisées.</p>}
    {view === 'stock' && <>
      {!loading && !loadError && <section style={stats}><Stat label="Articles" value={ingredients.length} /><Stat label="Alertes de stock" value={lowStock.length} warn={lowStock.length > 0} />{canReadCosts && <Stat label="Valeur estimée" value={valuation} />}</section>}
      {canCreateIngredient ? <form onSubmit={createIngredient} style={card}><h2 style={h2}><PackagePlus size={19} /> Ajouter un article</h2><div style={formGrid}><Field label="Nom"><input required value={ingredientForm.name} onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })} style={input} /></Field><Field label="Unité"><input required value={ingredientForm.unit} onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })} style={input} /></Field><Field label="Stock actuel"><input required type="number" min="0" step="0.01" value={ingredientForm.currentStock} onChange={(e) => setIngredientForm({ ...ingredientForm, currentStock: e.target.value })} style={input} /></Field><Field label="Seuil d’alerte"><input required type="number" min="0" step="0.01" value={ingredientForm.minStockLevel} onChange={(e) => setIngredientForm({ ...ingredientForm, minStockLevel: e.target.value })} style={input} /></Field><Field label="Coût unitaire"><input required type="number" min="0" step="0.01" value={ingredientForm.costPerUnit} onChange={(e) => setIngredientForm({ ...ingredientForm, costPerUnit: e.target.value })} style={input} /></Field><Field label="Fournisseur"><select value={ingredientForm.supplierId} onChange={(e) => setIngredientForm({ ...ingredientForm, supplierId: e.target.value })} style={input}><option value="">Aucun</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field></div><button disabled={busy || loading || !!loadError} style={primary}>Enregistrer l’article</button></form>
        : <p style={card}>{canAdjust ? 'Création d’article indisponible : la lecture et la gestion des coûts ainsi qu’un coût explicite sont nécessaires. Vous pouvez ajuster les quantités existantes.' : 'Consultation des quantités : votre accès ne permet pas de modifier le stock.'}</p>}
      <section style={card}><h2 style={h2}>Articles en stock</h2>{loading ? <Empty text="Chargement…" /> : loadError ? <Empty text="Lecture du stock indisponible." /> : ingredients.length === 0 ? <Empty text="Aucun article enregistré." /> : <div style={{ overflowX: 'auto' }}><table style={table}><thead><tr>{['Article', 'Fournisseur', ...(canReadCosts ? ['Coût'] : []), 'Stock', 'Seuil', 'État', ...(canAdjust ? [''] : [])].map((cell) => <th key={cell} style={th}>{cell}</th>)}</tr></thead><tbody>{ingredients.map((item) => <tr key={item.id}>
        <td style={td}><strong>{item.name}</strong><small style={small}> / {item.unit}</small></td><td style={td}>{item.supplier?.name || '—'}</td>{canReadCosts && <td style={td}>{costLabel(item.costPerUnit)}</td>}
        <td style={td}>{canAdjust ? <input aria-label={`Stock de ${item.name}`} type="number" min="0" step="0.01"
          value={stockDrafts[item.id] ?? String(item.currentStock)} disabled={stockSaving[item.id] === true}
          onChange={e => setStockDrafts(previous => ({ ...previous, [item.id]: e.target.value }))}
          onBlur={e => void updateStock(item, e.target.value)} style={{ ...input, width: 95 }} /> : <span aria-label={`Stock de ${item.name}`}>{item.currentStock}</span>}</td>
        <td style={td}>{item.minStockLevel}</td><td style={td}>{item.currentStock <= item.minStockLevel ? <span style={warning}><AlertTriangle size={14} /> Bas</span> : <span style={ok}><Check size={14} /> OK</span>}</td>{canAdjust && <td style={td}><button disabled={stockSaving[item.id] === true} onClick={() => void removeIngredient(item)} aria-label={`Supprimer ${item.name}`} style={icon}><Trash2 size={16} /></button></td>}
      </tr>)}</tbody></table></div>}</section>
    </>}
    {view === 'suppliers' && <>{canWriteSupplier ? <form onSubmit={createSupplier} style={card}><h2 style={h2}><Truck size={19} /> Nouveau fournisseur</h2><div style={formGrid}><Field label="Société"><input required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} style={input} /></Field><Field label="Contact"><input value={supplierForm.contactName} onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })} style={input} /></Field><Field label="Email"><input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} style={input} /></Field><Field label="Téléphone"><input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} style={input} /></Field></div><button disabled={busy || loading || !!loadError} style={primary}>Enregistrer le fournisseur</button></form> : <p style={card}>La modification des fournisseurs nécessite le droit d’ajuster l’inventaire.</p>}<section style={card}>{loading ? <Empty text="Chargement…" /> : loadError ? <Empty text="Lecture des fournisseurs indisponible." /> : suppliers.length === 0 ? <Empty text="Aucun fournisseur enregistré." /> : suppliers.map((supplier) => <article key={supplier.id} style={row}><strong>{supplier.name}</strong><span style={small}>{supplier.contactName || 'Aucun contact'} · {supplier.email || supplier.phone || 'coordonnées non renseignées'}</span></article>)}</section></>}
    {view === 'orders' && <>{canCreateOrder ? <form onSubmit={createOrder} style={card}><h2 style={h2}>Créer un bon de commande</h2>{loading ? <Empty text="Chargement…" /> : suppliers.length === 0 || ingredients.length === 0 ? <Empty text="Ajoutez d’abord un fournisseur et un article de stock." /> : <><div style={formGrid}><Field label="Fournisseur"><select required value={orderForm.supplierId} onChange={(e) => setOrderForm({ ...orderForm, supplierId: e.target.value })} style={input}><option value="">Choisir…</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field><Field label="Article"><select required value={orderForm.ingredientId} onChange={(e) => setOrderForm({ ...orderForm, ingredientId: e.target.value })} style={input}><option value="">Choisir…</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Quantité"><input required type="number" min="0.01" step="0.01" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} style={input} /></Field><Field label="Coût unitaire"><input required type="number" min="0" step="0.01" value={orderForm.unitCost} onChange={(e) => setOrderForm({ ...orderForm, unitCost: e.target.value })} style={input} /></Field></div><button disabled={busy || !!loadError} style={primary}>Enregistrer le bon</button></>}</form> : <p style={card}>La création de commandes nécessite les droits d’ajuster l’inventaire, de lire les quantités et de gérer les coûts.</p>}<section style={card}>{loading ? <Empty text="Chargement…" /> : loadError ? <Empty text="Lecture des commandes indisponible." /> : orders.length === 0 ? <Empty text="Aucun bon de commande." /> : orders.map((order) => <article key={order.id} style={row}><div><strong>{order.supplier.name} · {costLabel(order.total)}</strong><div style={small}>{order.items.map((item) => `${item.ingredient.name} × ${item.quantity}`).join(', ')}</div></div>{order.status === 'RECEIVED' ? <span style={ok}><Check size={14} /> Réceptionné</span> : canWriteSupplier ? <button disabled={receiving[order.id] === true} onClick={() => void receiveOrder(order)} style={primary}>Réceptionner</button> : <span style={small}>Réception réservée aux accès autorisés à ajuster l’inventaire.</span>}</article>)}</section></>}
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
