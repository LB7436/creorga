import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Save } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import SettingsLayout from './SettingsLayout'
import { Button, Card, Input, Spinner, Modal, Badge } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/format'
import api from '@/lib/api'
import type { Category, Product } from '@/types'

export default function SettingsCatalog() {
  const companyId = useAuthStore((s) => s.companyId)
  const queryClient = useQueryClient()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Partial<Product>>({})
  const [newCategory, setNewCategory] = useState({ name: '', icon: '', color: '#3B82F6' })

  const headers = { 'x-company-id': companyId! }

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-settings', companyId],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories', { headers })
      return res.data
    },
    enabled: !!companyId,
  })

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-settings', companyId, activeCategory],
    queryFn: async () => {
      const params = activeCategory ? { categoryId: activeCategory } : {}
      const res = await api.get<Product[]>('/products', { headers, params })
      return res.data
    },
    enabled: !!companyId,
  })

  const addCategoryMutation = useMutation({
    mutationFn: async () => {
      await api.post('/categories', newCategory, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-settings'] })
      setShowCategoryModal(false)
      setNewCategory({ name: '', icon: '', color: '#3B82F6' })
      toast.success('Catégorie ajoutée')
    },
  })

  const addProductMutation = useMutation({
    mutationFn: async () => {
      if (editProduct.id) {
        await api.put(`/products/${editProduct.id}`, editProduct, { headers })
      } else {
        await api.post('/products', editProduct, { headers })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-settings'] })
      setShowProductModal(false)
      setEditProduct({})
      toast.success(editProduct.id ? 'Produit modifié' : 'Produit ajouté')
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-settings'] })
      toast.success('Produit supprimé')
    },
  })

  const openAddProduct = () => {
    setEditProduct({
      categoryId: activeCategory || categories[0]?.id || '',
      name: '',
      price: 0,
      taxRate: 17,
    })
    setShowProductModal(true)
  }

  const openEditProduct = (product: Product) => {
    setEditProduct(product)
    setShowProductModal(true)
  }

  return (
    <SettingsLayout>
      <div className="flex gap-6">
        {/* Catégories sidebar */}
        <div className="w-56 shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Catégories</h4>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="p-1 rounded-lg hover:bg-surface-2 text-gray-400 hover:text-primary transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={() => setActiveCategory(null)}
            className={clsx(
              'w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all',
              !activeCategory ? 'bg-primary text-white' : 'text-gray-600 hover:bg-surface-2',
            )}
          >
            Tous les produits
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={clsx(
                'w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                activeCategory === cat.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-surface-2',
              )}
            >
              {cat.icon && <span>{cat.icon}</span>}
              <span className="truncate">{cat.name}</span>
              <Badge variant="neutral" className="ml-auto text-[10px]">
                {cat._count?.products ?? 0}
              </Badge>
            </button>
          ))}
        </div>

        {/* Produits */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {activeCategory
                ? categories.find((c) => c.id === activeCategory)?.name ?? 'Produits'
                : 'Tous les produits'}
            </h3>
            <Button size="sm" leftIcon={<Plus size={16} />} onClick={openAddProduct}>
              Ajouter un produit
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" className="text-primary" />
            </div>
          ) : products.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-gray-400 mb-4">Aucun produit dans cette catégorie</p>
              <Button size="sm" leftIcon={<Plus size={16} />} onClick={openAddProduct}>
                Ajouter un produit
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {products.map((product) => (
                <Card key={product.id} padding="sm" className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-surface-2 rounded-xl flex items-center justify-center text-lg shrink-0">
                    {product.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                    <p className="text-xs text-gray-400">TVA {product.taxRate}%</p>
                  </div>
                  <span className="font-mono font-semibold text-sm text-gray-700">
                    {formatCurrency(product.price)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditProduct(product)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-primary hover:bg-primary-50 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteProductMutation.mutate(product.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal catégorie */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Nouvelle catégorie" size="sm">
        <div className="space-y-4">
          <Input
            label="Nom"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
          />
          <Input
            label="Icône (emoji)"
            placeholder="🍽️"
            value={newCategory.icon}
            onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
          />
          <Button
            fullWidth
            isLoading={addCategoryMutation.isPending}
            onClick={() => addCategoryMutation.mutate()}
            disabled={!newCategory.name}
          >
            Ajouter la catégorie
          </Button>
        </div>
      </Modal>

      {/* Modal produit */}
      <Modal
        isOpen={showProductModal}
        onClose={() => { setShowProductModal(false); setEditProduct({}) }}
        title={editProduct.id ? 'Modifier le produit' : 'Nouveau produit'}
      >
        <div className="space-y-4">
          <Input
            label="Nom du produit"
            value={editProduct.name ?? ''}
            onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prix HT (€)"
              type="number"
              step="0.01"
              value={editProduct.price ?? ''}
              onChange={(e) => setEditProduct({ ...editProduct, price: parseFloat(e.target.value) || 0 })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">TVA (%)</label>
              <select
                value={editProduct.taxRate ?? 17}
                onChange={(e) => setEditProduct({ ...editProduct, taxRate: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value={3}>3% (alimentaire)</option>
                <option value={8}>8%</option>
                <option value={14}>14%</option>
                <option value={17}>17% (standard)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie</label>
            <select
              value={editProduct.categoryId ?? ''}
              onChange={(e) => setEditProduct({ ...editProduct, categoryId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Description (optionnel)"
            value={editProduct.description ?? ''}
            onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
          />
          <Button
            fullWidth
            leftIcon={<Save size={18} />}
            isLoading={addProductMutation.isPending}
            onClick={() => addProductMutation.mutate()}
            disabled={!editProduct.name || !editProduct.categoryId}
          >
            {editProduct.id ? 'Modifier' : 'Ajouter'}
          </Button>
        </div>
      </Modal>
    </SettingsLayout>
  )
}
