import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Users, Clock, CreditCard, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import api from '@/lib/api'
import { formatCurrency, formatElapsed } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'
import { Button, Badge, Spinner } from '@/components/ui'
import { TopBar } from '@/components/layout'
import type { Table, Order, TableStatus } from '@/types'

interface TableWithOrder extends Table {
  currentOrder: Order | null
}

function getTableStatus(table: TableWithOrder): TableStatus {
  if (!table.currentOrder) return 'LIBRE'
  if (table.currentOrder.status === 'READY') return 'ADDITION'
  return 'OCCUPEE'
}

const statusStyles: Record<TableStatus, { bg: string; border: string; text: string }> = {
  LIBRE: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  OCCUPEE: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  ADDITION: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  RESERVEE: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
}

const statusLabels: Record<TableStatus, string> = {
  LIBRE: 'Libre',
  OCCUPEE: 'Occupée',
  ADDITION: 'Addition',
  RESERVEE: 'Réservée',
}

export default function FloorPlan() {
  const companyId = useAuthStore((s) => s.companyId)
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<string>('Toutes')
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null)

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', companyId],
    queryFn: async () => {
      const res = await api.get<TableWithOrder[]>('/tables', {
        headers: { 'x-company-id': companyId! },
      })
      return res.data
    },
    enabled: !!companyId,
    refetchInterval: 10000,
  })

  const sections = ['Toutes', ...new Set(tables.map((t) => t.section))]
  const filteredTables = activeSection === 'Toutes'
    ? tables
    : tables.filter((t) => t.section === activeSection)

  const freeCount = tables.filter((t) => !t.currentOrder).length
  const totalRevenue = tables
    .filter((t) => t.currentOrder)
    .reduce((sum, t) => sum + (t.currentOrder?.total ?? 0), 0)

  const handleNewOrder = async (table: TableWithOrder) => {
    try {
      navigate(`/pos/order/${table.id}`)
    } catch {
      // handled by navigation
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar
        title="Plan de salle"
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Users size={16} className="text-gray-400" />
              <span className="text-gray-600">
                <strong>{freeCount}</strong>/{tables.length} libres
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard size={16} className="text-gray-400" />
              <span className="text-gray-600 font-mono font-semibold">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Settings size={16} />}
              onClick={() => navigate('/settings/tables')}
            >
              Éditer
            </Button>
          </div>
        }
      />

      {/* Filtres sections */}
      <div className="px-6 py-3 border-b border-gray-100 bg-white flex gap-2 overflow-x-auto scrollbar-hide">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              activeSection === section
                ? 'bg-primary text-white'
                : 'bg-surface-2 text-gray-600 hover:bg-surface-3',
            )}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Grille tables */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredTables.map((table) => {
              const status = getTableStatus(table)
              const styles = statusStyles[status]

              return (
                <motion.div
                  key={table.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedTable(table)}
                  className={clsx(
                    'relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200',
                    'hover:shadow-card-hover hover:-translate-y-0.5',
                    styles.bg,
                    styles.border,
                    status === 'ADDITION' && 'animate-pulse-soft',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={clsx('font-semibold', styles.text)}>{table.name}</h3>
                    <Badge variant={
                      status === 'LIBRE' ? 'success' :
                      status === 'ADDITION' ? 'danger' : 'warning'
                    }>
                      {statusLabels[status]}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <Users size={14} />
                    <span>{table.capacity} places</span>
                  </div>

                  {table.currentOrder && (
                    <div className="mt-2 pt-2 border-t border-current/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock size={14} />
                          {formatElapsed(table.currentOrder.createdAt)}
                        </span>
                        <span className="font-mono font-semibold text-gray-700">
                          {formatCurrency(table.currentOrder.total)}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Panel latéral table */}
      <AnimatePresence>
        {selectedTable && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setSelectedTable(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-[420px] max-w-full bg-white shadow-modal z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedTable.name}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedTable.capacity} places &middot; {selectedTable.section}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Contenu */}
              <div className="flex-1 p-6 overflow-y-auto">
                {!selectedTable.currentOrder ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users size={28} className="text-emerald-500" />
                    </div>
                    <p className="text-gray-500 mb-6">Table libre</p>
                    <Button
                      size="lg"
                      fullWidth
                      leftIcon={<Plus size={20} />}
                      onClick={() => handleNewOrder(selectedTable)}
                    >
                      Nouvelle commande
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock size={14} />
                      <span>Ouverte depuis {formatElapsed(selectedTable.currentOrder.createdAt)}</span>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      {selectedTable.currentOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 bg-surface-2 rounded-lg flex items-center justify-center text-sm font-semibold text-gray-600">
                              {item.quantity}
                            </span>
                            <span className="text-sm text-gray-900">{item.product?.name}</span>
                          </div>
                          <span className="text-sm font-mono text-gray-600">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Totaux */}
                    <div className="pt-3 border-t border-gray-200 space-y-1">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Sous-total HT</span>
                        <span className="font-mono">{formatCurrency(selectedTable.currentOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>TVA</span>
                        <span className="font-mono">{formatCurrency(selectedTable.currentOrder.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-gray-900 pt-1">
                        <span>Total TTC</span>
                        <span className="font-mono">{formatCurrency(selectedTable.currentOrder.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedTable.currentOrder && (
                <div className="p-6 border-t border-gray-100 space-y-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    leftIcon={<Plus size={18} />}
                    onClick={() => navigate(`/pos/order/${selectedTable.id}`)}
                  >
                    Ajouter des articles
                  </Button>
                  <Button
                    fullWidth
                    leftIcon={<CreditCard size={18} />}
                    onClick={() => navigate(`/pos/checkout/${selectedTable.currentOrder!.id}`)}
                  >
                    Encaisser
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
