import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Plus, Search, X, User, Star, Wallet,
  ShoppingBag, ChevronRight, Save, Users
} from 'lucide-react'
import { Modal, Badge, Spinner, Input } from '@/components/ui'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

const fmt = (v: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(v)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-LU')

interface Order {
  id: string
  createdAt: string
  total: number
  status: string
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  loyaltyPoints: number
  walletBalance: number
  createdAt: string
  orders?: Order[]
}

const newCustomerSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
})
type NewCustomerForm = z.infer<typeof newCustomerSchema>

const editSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

function getPointsTier(points: number) {
  if (points >= 500) return { variant: 'success' as const, label: 'Gold' }
  if (points > 0) return { variant: 'info' as const, label: 'Standard' }
  return { variant: 'neutral' as const, label: 'Invité' }
}

export default function ClientsPage() {
  const companyId = useAuthStore((s) => s.companyId)
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showAddPoints, setShowAddPoints] = useState(false)
  const [showRecharge, setShowRecharge] = useState(false)
  const [pointsAmount, setPointsAmount] = useState('')
  const [rechargeAmount, setRechargeAmount] = useState('')

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', companyId],
    queryFn: async () => {
      const { data } = await api.get('/crm/customers')
      return data
    },
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (body: NewCustomerForm) => api.post('/crm/customers', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', companyId] })
      toast.success('Client créé')
      setShowNew(false)
      newForm.reset()
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: EditForm & { id: string }) =>
      api.put(`/crm/customers/${id}`, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['customers', companyId] })
      toast.success('Client mis à jour')
      setSelected((prev) => (prev ? { ...prev, ...vars } : prev))
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const newForm = useForm<NewCustomerForm>({ resolver: zodResolver(newCustomerSchema) })
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: selected
      ? {
          firstName: selected.firstName,
          lastName: selected.lastName,
          email: selected.email,
          phone: selected.phone ?? '',
        }
      : undefined,
  })

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    )
  })

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez votre base clients et leur fidélité</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Nouveau client
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email ou téléphone..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size="lg" className="text-violet-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Users size={40} className="mb-3 opacity-40" />
            <p className="font-medium">Aucun client trouvé</p>
            <p className="text-sm mt-1">Créez votre premier client</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Téléphone</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Solde wallet</th>
                <th className="px-4 py-3 text-left">Inscrit le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => {
                const tier = getPointsTier(c.loyaltyPoints)
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="hover:bg-violet-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-xs">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        {c.firstName} {c.lastName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.email}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={tier.variant}>{c.loyaltyPoints} pts</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(c.walletBalance ?? 0)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <ChevronRight size={16} className="text-gray-400" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
                    {selected.firstName[0]}{selected.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selected.firstName} {selected.lastName}</p>
                    <p className="text-xs text-gray-500">Depuis le {fmtDate(selected.createdAt)}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <form
                  onSubmit={editForm.handleSubmit((vals) =>
                    updateMutation.mutate({ ...vals, id: selected.id })
                  )}
                  className="space-y-3"
                >
                  <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <User size={12} /> Informations
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Prénom" {...editForm.register('firstName')} error={editForm.formState.errors.firstName?.message} />
                    <Input label="Nom" {...editForm.register('lastName')} error={editForm.formState.errors.lastName?.message} />
                  </div>
                  <Input label="Email" type="email" {...editForm.register('email')} error={editForm.formState.errors.email?.message} />
                  <Input label="Téléphone" {...editForm.register('phone')} />
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-60"
                  >
                    <Save size={13} />
                    {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </form>

                <div className="bg-violet-50 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase text-violet-500 tracking-wider flex items-center gap-1.5 mb-3">
                    <Star size={12} /> Points fidélité
                  </p>
                  <p className="text-2xl font-bold text-violet-700">
                    {selected.loyaltyPoints} <span className="text-sm font-normal">points</span>
                  </p>
                  <button
                    onClick={() => setShowAddPoints(true)}
                    className="mt-3 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700"
                  >
                    + Ajouter des points
                  </button>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase text-emerald-500 tracking-wider flex items-center gap-1.5 mb-3">
                    <Wallet size={12} /> Portefeuille
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">{fmt(selected.walletBalance ?? 0)}</p>
                  <button
                    onClick={() => setShowRecharge(true)}
                    className="mt-3 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
                  >
                    + Recharger
                  </button>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5 mb-3">
                    <ShoppingBag size={12} /> Dernières commandes
                  </p>
                  {(selected.orders ?? []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Aucune commande</p>
                  ) : (
                    <div className="space-y-2">
                      {(selected.orders ?? []).slice(0, 5).map((o) => (
                        <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                          <p className="text-sm font-medium">{fmtDate(o.createdAt)}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{fmt(o.total)}</span>
                            <Badge variant={o.status === 'PAID' ? 'success' : o.status === 'CANCELLED' ? 'danger' : 'neutral'}>
                              {o.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Customer Modal */}
      <Modal isOpen={showNew} onClose={() => { setShowNew(false); newForm.reset() }} title="Nouveau client" size="sm">
        <form onSubmit={newForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" {...newForm.register('firstName')} error={newForm.formState.errors.firstName?.message} />
            <Input label="Nom" {...newForm.register('lastName')} error={newForm.formState.errors.lastName?.message} />
          </div>
          <Input label="Email" type="email" {...newForm.register('email')} error={newForm.formState.errors.email?.message} />
          <Input label="Téléphone" {...newForm.register('phone')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 py-2.5 bg-[#7C3AED] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {createMutation.isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Points Modal */}
      <Modal isOpen={showAddPoints} onClose={() => { setShowAddPoints(false); setPointsAmount('') }} title="Ajouter des points" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Ajouter des points à <strong>{selected?.firstName} {selected?.lastName}</strong></p>
          <Input label="Points à ajouter" type="number" min="1" value={pointsAmount} onChange={(e) => setPointsAmount(e.target.value)} placeholder="ex: 50" />
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowAddPoints(false); setPointsAmount('') }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!selected || !pointsAmount) return
                try {
                  await api.put(`/crm/customers/${selected.id}`, { loyaltyPoints: selected.loyaltyPoints + Number(pointsAmount) })
                  qc.invalidateQueries({ queryKey: ['customers', companyId] })
                  toast.success(`${pointsAmount} points ajoutés`)
                  setShowAddPoints(false)
                  setPointsAmount('')
                } catch {
                  toast.error('Erreur')
                }
              }}
              className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:opacity-90"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>

      {/* Recharge Modal */}
      <Modal isOpen={showRecharge} onClose={() => { setShowRecharge(false); setRechargeAmount('') }} title="Recharger le portefeuille" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Recharger le wallet de <strong>{selected?.firstName} {selected?.lastName}</strong></p>
          <Input label="Montant (€)" type="number" min="1" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} placeholder="ex: 20" />
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowRecharge(false); setRechargeAmount('') }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!selected || !rechargeAmount) return
                try {
                  await api.post(`/crm/customers/${selected.id}/wallet`, { amount: Number(rechargeAmount) })
                  qc.invalidateQueries({ queryKey: ['customers', companyId] })
                  toast.success(`${fmt(Number(rechargeAmount))} ajoutés au wallet`)
                  setShowRecharge(false)
                  setRechargeAmount('')
                } catch {
                  toast.error('Erreur')
                }
              }}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:opacity-90"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
