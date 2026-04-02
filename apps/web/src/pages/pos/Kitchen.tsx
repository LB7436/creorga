import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Check, ChefHat } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { getElapsedMinutes } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'
import { useSocket } from '@/hooks/useSocket'
import { Button, Spinner } from '@/components/ui'
import type { Order } from '@/types'

function getUrgencyColor(minutes: number): string {
  if (minutes < 10) return 'border-emerald-400'
  if (minutes < 20) return 'border-amber-400'
  return 'border-red-500'
}

export default function Kitchen() {
  const companyId = useAuthStore((s) => s.companyId)
  const queryClient = useQueryClient()
  const socket = useSocket()

  const headers = { 'x-company-id': companyId! }

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['kitchen-orders', companyId],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders', {
        headers,
        params: { status: 'OPEN' },
      })
      return res.data.filter((o) => o.items.some((i) => i.status !== 'SERVED'))
    },
    enabled: !!companyId,
    refetchInterval: 5000,
  })

  // Écouter les mises à jour temps réel
  useEffect(() => {
    if (!socket) return

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    }

    socket.on('order:new', handleUpdate)
    socket.on('order:updated', handleUpdate)

    return () => {
      socket.off('order:new', handleUpdate)
      socket.off('order:updated', handleUpdate)
    }
  }, [socket, queryClient])

  const markReadyMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.put(`/orders/${orderId}/status`, { status: 'READY' }, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast.success('Commande prête !')
    },
  })

  const markItemReadyMutation = useMutation({
    mutationFn: async ({ orderId, itemId }: { orderId: string; itemId: string }) => {
      await api.put(`/orders/${orderId}/items/${itemId}`, { status: 'READY' }, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })

  const now = new Date()

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header sombre */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <ChefHat size={22} className="text-amber-400" />
          <h1 className="text-lg font-bold text-white">Cuisine</h1>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-400">
            {now.toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-amber-400 font-semibold">
            {orders.length} commande{orders.length !== 1 ? 's' : ''} en attente
          </span>
        </div>
      </header>

      {/* Grille */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <Spinner size="lg" className="text-gray-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
            <ChefHat size={48} className="mb-4 text-gray-600" />
            <p className="text-lg font-medium">Aucune commande en attente</p>
            <p className="text-sm text-gray-600">Les nouvelles commandes apparaîtront ici</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {orders.map((order) => {
                const elapsed = getElapsedMinutes(order.createdAt)
                const urgencyColor = getUrgencyColor(elapsed)

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={clsx(
                      'bg-gray-800 rounded-2xl border-l-4 overflow-hidden',
                      urgencyColor,
                    )}
                  >
                    {/* Header carte */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                      <span className="font-bold text-white text-lg">
                        {order.table?.name ?? `#${order.orderNumber}`}
                      </span>
                      <span className={clsx(
                        'flex items-center gap-1 text-sm font-mono',
                        elapsed >= 20 ? 'text-red-400' : elapsed >= 10 ? 'text-amber-400' : 'text-emerald-400',
                      )}>
                        <Clock size={14} />
                        {elapsed}min
                      </span>
                    </div>

                    {/* Items */}
                    <div className="px-4 py-3 space-y-2">
                      {order.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            item.status !== 'READY' &&
                            markItemReadyMutation.mutate({ orderId: order.id, itemId: item.id })
                          }
                          className={clsx(
                            'flex items-center gap-3 w-full text-left py-1 transition-all',
                            item.status === 'READY'
                              ? 'line-through text-gray-500'
                              : 'text-gray-200 hover:text-white',
                          )}
                        >
                          <div
                            className={clsx(
                              'w-5 h-5 rounded border flex items-center justify-center shrink-0',
                              item.status === 'READY'
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-gray-600',
                            )}
                          >
                            {item.status === 'READY' && <Check size={12} className="text-white" />}
                          </div>
                          <span className="text-sm">
                            <strong>{item.quantity}x</strong> {item.product?.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="px-4 py-2 bg-amber-900/30 text-amber-300 text-xs">
                        Note: {order.notes}
                      </div>
                    )}

                    {/* Bouton prêt */}
                    <div className="px-4 py-3">
                      <Button
                        variant="primary"
                        fullWidth
                        size="sm"
                        leftIcon={<Check size={16} />}
                        isLoading={markReadyMutation.isPending}
                        onClick={() => markReadyMutation.mutate(order.id)}
                        className="!bg-emerald-600 hover:!bg-emerald-700"
                      >
                        Tout est prêt
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
