import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Minus, Trash2, Search, Check } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'
import { Button, Spinner } from '@/components/ui'
import type { Category, Product } from '@/types'

interface CartItem {
  productId: string
  product: Product
  quantity: number
  notes: string | null
}

export default function OrderPage() {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const headers = { 'x-company-id': companyId! }

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', companyId],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories', { headers })
      return res.data
    },
    enabled: !!companyId,
  })

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', companyId, activeCategory],
    queryFn: async () => {
      const params = activeCategory ? { categoryId: activeCategory } : {}
      const res = await api.get<Product[]>('/products', { headers, params })
      return res.data
    },
    enabled: !!companyId,
  })

  const filteredProducts = searchQuery
    ? products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : products

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(
        '/orders',
        {
          tableId,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        },
        { headers },
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Commande envoyée !')
      navigate('/pos')
    },
    onError: () => {
      toast.error('Erreur lors de la création de la commande')
    },
  })

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...prev, { productId: product.id, product, quantity: 1, notes: null }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const taxAmount = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity * (item.product.taxRate / 100),
    0,
  )
  const total = subtotal + taxAmount

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
        <button
          onClick={() => navigate('/pos')}
          className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Nouvelle commande</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Colonne gauche — Catalogue */}
        <div className="flex-1 flex flex-col border-r border-gray-100">
          {/* Recherche */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Catégories */}
          <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-gray-50">
            <button
              onClick={() => setActiveCategory(null)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                !activeCategory
                  ? 'bg-primary text-white'
                  : 'bg-surface-2 text-gray-600 hover:bg-surface-3',
              )}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  activeCategory === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-surface-2 text-gray-600 hover:bg-surface-3',
                )}
              >
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grille produits */}
          <div className="flex-1 p-4 overflow-y-auto">
            {productsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner size="lg" className="text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((c) => c.productId === product.id)
                  return (
                    <motion.button
                      key={product.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => addToCart(product)}
                      className={clsx(
                        'relative p-4 rounded-2xl border text-left transition-all',
                        'hover:shadow-card-hover hover:-translate-y-0.5',
                        inCart
                          ? 'border-primary bg-primary-50'
                          : 'border-gray-100 bg-white',
                      )}
                    >
                      {/* Placeholder image */}
                      <div
                        className="w-full h-20 rounded-xl mb-3 flex items-center justify-center text-2xl"
                        style={{ backgroundColor: product.image ? undefined : '#F1F5F9' }}
                      >
                        {product.name.charAt(0)}
                      </div>

                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                        {product.name}
                      </h4>
                      <p className="text-sm font-mono font-semibold text-accent-dark">
                        {formatCurrency(product.price * (1 + product.taxRate / 100))}
                      </p>

                      {product.stock !== null && product.stock < 10 && (
                        <span className="absolute top-2 right-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                          Stock: {product.stock}
                        </span>
                      )}

                      {inCart && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {inCart.quantity}
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite — Panier */}
        <div className="w-[380px] flex flex-col bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Commande</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mb-3">
                  <Plus size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">
                  Ajoutez des articles depuis le catalogue
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {cart.map((item) => (
                    <motion.div
                      key={item.productId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-3 py-2 border-b border-gray-50"
                    >
                      {/* Qty controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Nom */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{item.product.name}</p>
                      </div>

                      {/* Prix */}
                      <span className="text-sm font-mono text-gray-600 shrink-0">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>

                      {/* Supprimer */}
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer totaux */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 px-5 py-4 space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Sous-total HT</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>TVA</span>
                  <span className="font-mono">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-1">
                  <span>Total TTC</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                leftIcon={<Check size={20} />}
                isLoading={createOrderMutation.isPending}
                onClick={() => createOrderMutation.mutate()}
              >
                Valider la commande
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
