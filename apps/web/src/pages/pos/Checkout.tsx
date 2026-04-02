import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Banknote, CreditCard, Check, Delete } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'
import { Button, Spinner } from '@/components/ui'
import type { Order, PaymentMethod } from '@/types'

export default function Checkout() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [cashInput, setCashInput] = useState('')
  const [isPaid, setIsPaid] = useState(false)

  const headers = { 'x-company-id': companyId! }

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${orderId}`, { headers })
      return res.data
    },
    enabled: !!orderId,
  })

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(
        `/orders/${orderId}/checkout`,
        {
          paymentMethod,
          cashReceived: paymentMethod === 'CASH' ? parseFloat(cashInput) || null : null,
        },
        { headers },
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsPaid(true)
      toast.success('Paiement enregistré !')
      setTimeout(() => navigate('/pos'), 3000)
    },
    onError: () => {
      toast.error('Erreur lors de l\'encaissement')
    },
  })

  const cashReceived = parseFloat(cashInput) || 0
  const change = order ? cashReceived - order.total : 0

  const handleNumpad = (key: string) => {
    if (key === 'DEL') {
      setCashInput((prev) => prev.slice(0, -1))
    } else if (key === ',') {
      if (!cashInput.includes(',')) {
        setCashInput((prev) => (prev || '0') + ',')
      }
    } else {
      setCashInput((prev) => prev + key)
    }
  }

  const handleQuickAmount = (amount: number) => {
    setCashInput(amount.toFixed(2).replace('.', ','))
  }

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (isPaid) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={48} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement confirmé</h1>
          <p className="text-gray-500 mb-2">
            {order.table?.name ?? 'Comptoir'} &mdash; {formatCurrency(order.total)}
          </p>
          <p className="text-sm text-gray-400">Retour automatique au plan de salle...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          Encaissement &middot; {order.table?.name ?? `Commande #${order.orderNumber}`}
        </h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Récapitulatif */}
        <div className="w-[340px] bg-white border-r border-gray-100 flex flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Articles
            </h3>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{item.quantity}x</span>
                    <span className="text-gray-900">{item.product?.name}</span>
                  </div>
                  <span className="font-mono text-gray-600">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 px-5 py-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Total à payer</p>
              <p className="text-4xl font-bold text-gray-900 font-mono">
                {formatCurrency(order.total)}
              </p>
            </div>
          </div>
        </div>

        {/* Mode de paiement */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {!paymentMethod ? (
            <div className="space-y-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 text-center">
                Mode de paiement
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className="p-8 rounded-2xl border-2 border-gray-200 hover:border-primary hover:bg-primary-50 transition-all flex flex-col items-center gap-3"
                >
                  <Banknote size={36} className="text-emerald-600" />
                  <span className="font-semibold text-gray-900">Espèces</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('CARD')}
                  className="p-8 rounded-2xl border-2 border-gray-200 hover:border-primary hover:bg-primary-50 transition-all flex flex-col items-center gap-3"
                >
                  <CreditCard size={36} className="text-blue-600" />
                  <span className="font-semibold text-gray-900">Carte</span>
                </button>
              </div>
            </div>
          ) : paymentMethod === 'CARD' ? (
            <div className="text-center space-y-6 w-full max-w-md">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <CreditCard size={36} className="text-blue-600" />
              </div>
              <p className="text-gray-600">Présentez la carte au terminal</p>
              <Button
                size="lg"
                fullWidth
                leftIcon={<Check size={20} />}
                isLoading={checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate()}
              >
                Paiement confirmé
              </Button>
              <button
                onClick={() => setPaymentMethod(null)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Changer de mode
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-4">
              {/* Montant reçu */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Montant reçu</p>
                <p className="text-3xl font-bold font-mono text-gray-900">
                  {cashInput || '0,00'} &euro;
                </p>
              </div>

              {/* Monnaie */}
              {cashReceived > 0 && cashReceived >= (order?.total ?? 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-3 bg-emerald-50 rounded-xl"
                >
                  <p className="text-sm text-emerald-600">Monnaie à rendre</p>
                  <p className="text-2xl font-bold font-mono text-emerald-700">
                    {formatCurrency(change)}
                  </p>
                </motion.div>
              )}

              {/* Quick amounts */}
              <div className="flex gap-2">
                <button onClick={() => handleQuickAmount(order.total)} className="flex-1 py-2 rounded-xl bg-surface-2 text-sm font-medium hover:bg-surface-3 transition-colors">
                  Exact
                </button>
                {[5, 10, 20, 50].map((amt) => (
                  <button key={amt} onClick={() => handleQuickAmount(amt)} className="flex-1 py-2 rounded-xl bg-surface-2 text-sm font-medium hover:bg-surface-3 transition-colors">
                    {amt}&euro;
                  </button>
                ))}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'DEL', '0', ','].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleNumpad(key)}
                    className={clsx(
                      'h-14 rounded-xl text-lg font-semibold transition-all',
                      'active:scale-95',
                      key === 'DEL'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-surface-2 text-gray-900 hover:bg-surface-3',
                    )}
                  >
                    {key === 'DEL' ? <Delete size={20} className="mx-auto" /> : key}
                  </button>
                ))}
              </div>

              {/* Confirmer */}
              <Button
                size="lg"
                fullWidth
                leftIcon={<Check size={20} />}
                disabled={cashReceived < (order?.total ?? 0)}
                isLoading={checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate()}
              >
                Confirmer l'encaissement
              </Button>

              <button
                onClick={() => { setPaymentMethod(null); setCashInput('') }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 text-center transition-colors"
              >
                Changer de mode
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
