import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Check, Edit3, Package, Plus, Search, Tag, Trash2, X } from 'lucide-react'
import {
  useCategories,
  useCreateCategory,
  useCreateProduct,
  useDeleteCategory,
  useDeleteProduct,
  useProducts,
  useUpdateCategory,
  useUpdateProduct,
  type Product,
} from '@/hooks/api/useProducts'
import { toastError } from '@/lib/toast'

type ProductForm = {
  name: string
  categoryId: string
  price: string
  taxRate: string
  stock: string
  description: string
}

const EMPTY_PRODUCT: ProductForm = {
  name: '', categoryId: '', price: '', taxRate: '17', stock: '', description: '',
}

export default function AdminCatalog() {
  const categoriesQuery = useCategories()
  const productsQuery = useProducts()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const categories = categoriesQuery.data ?? []
  const products = productsQuery.data ?? []

  const [tab, setTab] = useState<'products' | 'categories'>('products')
  const [search, setSearch] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({})
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT)

  useEffect(() => {
    if (!productForm.categoryId && categories[0]) {
      setProductForm((form) => ({ ...form, categoryId: categories[0].id }))
    }
  }, [categories, productForm.categoryId])

  const filtered = useMemo(() => products.filter((product) => {
    const value = `${product.name} ${product.description ?? ''} ${product.category?.name ?? ''}`.toLowerCase()
    return value.includes(search.trim().toLowerCase())
  }), [products, search])

  const openNewProduct = () => {
    setEditing(null)
    setProductForm({ ...EMPTY_PRODUCT, categoryId: categories[0]?.id ?? '' })
    setEditorOpen(true)
  }

  const openEditProduct = (product: Product) => {
    setEditing(product)
    setProductForm({
      name: product.name,
      categoryId: product.categoryId ?? product.category?.id ?? '',
      price: String(product.price),
      taxRate: String(product.taxRate ?? 17),
      stock: product.stock == null ? '' : String(product.stock),
      description: product.description ?? '',
    })
    setEditorOpen(true)
  }

  const saveProduct = async () => {
    const price = Number(productForm.price)
    const taxRate = Number(productForm.taxRate)
    const stock = productForm.stock.trim() === '' ? null : Number(productForm.stock)
    if (!productForm.name.trim() || !productForm.categoryId || !Number.isFinite(price) || price <= 0) {
      toastError('Renseignez un nom, une catégorie et un prix supérieur à zéro')
      return
    }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100 || (stock !== null && (!Number.isInteger(stock) || stock < 0))) {
      toastError('Vérifiez le taux de TVA et le stock')
      return
    }
    const payload = {
      name: productForm.name.trim(),
      categoryId: productForm.categoryId,
      price,
      taxRate,
      stock,
      description: productForm.description.trim() || null,
      allergens: editing?.allergens ?? [],
      sortOrder: editing?.sortOrder ?? products.length,
    }
    try {
      if (editing) await updateProduct.mutateAsync({ id: editing.id, data: payload })
      else await createProduct.mutateAsync(payload)
      setEditorOpen(false)
    } catch {
      // Le hook affiche l'erreur serveur.
    }
  }

  const addCategory = async () => {
    const name = newCategory.trim()
    if (!name) return
    try {
      await createCategory.mutateAsync({ name, color: '#2563eb', sortOrder: categories.length })
      setNewCategory('')
    } catch {
      // Le hook affiche l'erreur serveur.
    }
  }

  const renameCategory = async (id: string, fallback: string) => {
    const name = (categoryDrafts[id] ?? fallback).trim()
    if (!name) return
    try {
      await updateCategory.mutateAsync({ id, data: { name } })
      setCategoryDrafts((drafts) => { const next = { ...drafts }; delete next[id]; return next })
    } catch {
      // Le hook affiche l'erreur serveur.
    }
  }

  const loading = categoriesQuery.isLoading || productsQuery.isLoading
  const error = categoriesQuery.isError || productsQuery.isError

  return (
    <div style={{ color: '#172033', maxWidth: 1160, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.03em' }}>Catalogue</h1>
          <p style={{ color: '#64748b', margin: '7px 0 0' }}>Produits et catégories réellement enregistrés pour votre établissement.</p>
        </div>
        {tab === 'products' && <button type="button" onClick={openNewProduct} disabled={categories.length === 0} style={{ ...primaryButton, opacity: categories.length === 0 ? .55 : 1 }}><Plus size={16} /> Nouveau produit</button>}
      </header>

      <nav aria-label="Sections du catalogue" style={{ display: 'flex', gap: 6, background: '#eaf0f7', borderRadius: 11, padding: 4, width: 'fit-content', marginBottom: 18 }}>
        <TabButton active={tab === 'products'} onClick={() => setTab('products')} icon={<Package size={15} />} label={`Produits (${products.length})`} />
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')} icon={<Tag size={15} />} label={`Catégories (${categories.length})`} />
      </nav>

      {error && <div role="alert" style={errorStyle}>Le catalogue n'a pas pu être chargé. Vérifiez la connexion puis rechargez la page.</div>}
      {loading ? <Empty text="Chargement du catalogue…" /> : tab === 'products' ? (
        <section style={cardStyle}>
          <label style={{ position: 'relative', display: 'block', maxWidth: 390, marginBottom: 16 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher un produit" style={{ ...inputStyle, paddingLeft: 38 }} />
          </label>
          {categories.length === 0 ? <Empty text="Créez d'abord une catégorie avant d'ajouter un produit." /> : filtered.length === 0 ? <Empty text="Aucun produit ne correspond à cette recherche." /> : (
            <div style={{ display: 'grid', gap: 9 }}>
              {filtered.map((product) => (
                <article key={product.id} style={rowStyle}>
                  <div style={productIcon}><Package size={18} /></div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block' }}>{product.name}</strong>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{product.category?.name || 'Sans catégorie'} · TVA {product.taxRate ?? 17}%</span>
                  </div>
                  <strong style={{ color: '#1d4ed8', whiteSpace: 'nowrap' }}>{product.price.toFixed(2)} €</strong>
                  <span style={{ color: '#64748b', fontSize: 12 }}>Stock : {product.stock == null ? 'non suivi' : product.stock}</span>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <IconButton label={`Modifier ${product.name}`} onClick={() => openEditProduct(product)} icon={<Edit3 size={15} />} />
                    <IconButton danger label={`Supprimer ${product.name}`} onClick={() => { if (window.confirm(`Supprimer « ${product.name} » du catalogue ?`)) void deleteProduct.mutateAsync(product.id) }} icon={<Trash2 size={15} />} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section style={cardStyle}>
          <div style={{ display: 'flex', gap: 9, marginBottom: 18, flexWrap: 'wrap' }}>
            <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addCategory() }} placeholder="Nom de la nouvelle catégorie" aria-label="Nom de la nouvelle catégorie" style={{ ...inputStyle, flex: '1 1 260px' }} />
            <button type="button" onClick={() => void addCategory()} disabled={!newCategory.trim() || createCategory.isPending} style={primaryButton}><Plus size={16} /> Ajouter</button>
          </div>
          {categories.length === 0 ? <Empty text="Aucune catégorie enregistrée." /> : (
            <div style={{ display: 'grid', gap: 9 }}>
              {categories.map((category) => (
                <article key={category.id} style={{ ...rowStyle, gridTemplateColumns: '42px minmax(180px, 1fr) 130px 86px' }}>
                  <div style={{ ...productIcon, background: `${category.color || '#2563eb'}18`, color: category.color || '#2563eb' }}>{category.icon || <Tag size={18} />}</div>
                  <input value={categoryDrafts[category.id] ?? category.name} onChange={(event) => setCategoryDrafts((drafts) => ({ ...drafts, [category.id]: event.target.value }))} aria-label={`Nom de ${category.name}`} style={inputStyle} />
                  <span style={{ color: '#64748b', fontSize: 12 }}>{category._count?.products ?? 0} produit(s)</span>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <IconButton label={`Enregistrer ${category.name}`} onClick={() => void renameCategory(category.id, category.name)} icon={<Check size={15} />} />
                    <IconButton danger label={`Supprimer ${category.name}`} onClick={() => { if (window.confirm(`Supprimer la catégorie « ${category.name} » ?`)) void deleteCategory.mutateAsync(category.id) }} icon={<Trash2 size={15} />} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {editorOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="product-editor-title" style={backdropStyle} onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false) }}>
          <section style={dialogStyle}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 19 }}>
              <h2 id="product-editor-title" style={{ margin: 0, fontSize: 20 }}>{editing ? 'Modifier le produit' : 'Nouveau produit'}</h2>
              <IconButton label="Fermer" onClick={() => setEditorOpen(false)} icon={<X size={17} />} />
            </header>
            <div style={{ display: 'grid', gap: 14 }}>
              <Field label="Nom *"><input value={productForm.name} onChange={(event) => setProductForm((form) => ({ ...form, name: event.target.value }))} style={inputStyle} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <Field label="Catégorie *"><select value={productForm.categoryId} onChange={(event) => setProductForm((form) => ({ ...form, categoryId: event.target.value }))} style={inputStyle}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
                <Field label="Prix TTC *"><input type="number" min="0.01" step="0.01" value={productForm.price} onChange={(event) => setProductForm((form) => ({ ...form, price: event.target.value }))} style={inputStyle} /></Field>
                <Field label="TVA %"><input type="number" min="0" max="100" step="0.1" value={productForm.taxRate} onChange={(event) => setProductForm((form) => ({ ...form, taxRate: event.target.value }))} style={inputStyle} /></Field>
                <Field label="Stock (vide = non suivi)"><input type="number" min="0" step="1" value={productForm.stock} onChange={(event) => setProductForm((form) => ({ ...form, stock: event.target.value }))} style={inputStyle} /></Field>
              </div>
              <Field label="Description"><textarea rows={3} value={productForm.description} onChange={(event) => setProductForm((form) => ({ ...form, description: event.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
              <button type="button" onClick={() => void saveProduct()} disabled={createProduct.isPending || updateProduct.isPending} style={{ ...primaryButton, justifyContent: 'center' }}><Check size={16} /> {createProduct.isPending || updateProduct.isPending ? 'Enregistrement…' : 'Enregistrer sur le serveur'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} style={{ border: 0, borderRadius: 8, padding: '9px 13px', display: 'inline-flex', alignItems: 'center', gap: 7, background: active ? '#fff' : 'transparent', color: active ? '#172033' : '#64748b', fontWeight: 750, cursor: 'pointer', boxShadow: active ? '0 2px 8px rgba(15,23,42,.08)' : 'none' }}>{icon}{label}</button>
}

function IconButton({ label, onClick, icon, danger = false }: { label: string; onClick: () => void; icon: React.ReactNode; danger?: boolean }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} style={{ width: 34, height: 34, border: `1px solid ${danger ? '#fecaca' : '#cbd5e1'}`, borderRadius: 9, background: danger ? '#fff7f7' : '#fff', color: danger ? '#dc2626' : '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{icon}</button>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 12, fontWeight: 750 }}>{label}{children}</label>
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 34, background: '#f8fafc', borderRadius: 12, textAlign: 'center', color: '#64748b' }}>{text}</div>
}

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 20, boxShadow: '0 8px 28px rgba(15,23,42,.05)' }
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: '10px 15px', background: '#1d4ed8', color: '#fff', fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }
const inputStyle: CSSProperties = { width: '100%', minWidth: 0, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 9, padding: '10px 11px', background: '#fff', color: '#172033', font: 'inherit', outlineColor: '#2563eb' }
const rowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '42px minmax(180px, 1fr) 100px 130px 86px', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 13, padding: 11 }
const productIcon: CSSProperties = { width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', color: '#1d4ed8', background: '#eff6ff' }
const errorStyle: CSSProperties = { padding: 14, borderRadius: 11, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', marginBottom: 16 }
const backdropStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 18, background: 'rgba(15,23,42,.58)', backdropFilter: 'blur(4px)' }
const dialogStyle: CSSProperties = { width: 'min(620px, 100%)', maxHeight: 'calc(100vh - 36px)', overflow: 'auto', background: '#fff', borderRadius: 18, padding: 23, boxShadow: '0 25px 80px rgba(15,23,42,.3)' }
