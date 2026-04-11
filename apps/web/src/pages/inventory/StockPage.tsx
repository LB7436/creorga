import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button, Modal } from '@/components/ui'

const fmt = (n: number) => new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(n)

const schema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  costPerUnit: z.coerce.number().min(0),
  currentStock: z.coerce.number().min(0),
  minStockLevel: z.coerce.number().min(0),
  supplierId: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Ingredient {
  id: string
  name: string
  unit: string
  currentStock: number
  minStockLevel: number
  costPerUnit: number
  supplier?: { id: string; name: string }
}

export default function StockPage() {
  const companyId = useAuthStore((s) => s.companyId)
  const headers = { 'x-company-id': companyId! }
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [adjusting, setAdjusting] = useState<Record<string, string>>({})

  const { data: ingredients = [], isLoading } = useQuery<Ingredient[]>({
    queryKey: ['ingredients', companyId],
    queryFn: async () => (await api.get('/inventory/ingredients', { headers })).data,
  })

  const { data: suppliers = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['suppliers', companyId],
    queryFn: async () => (await api.get('/inventory/suppliers', { headers })).data,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/inventory/ingredients', data, { headers }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); setShowModal(false); toast.success('Ingrédient ajouté') },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const adjustMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) =>
      api.put(`/inventory/ingredients/${id}`, { currentStock: qty }, { headers }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Stock ajusté') },
    onError: () => toast.error('Erreur'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const totalValue = ingredients.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0)
  const alerts = ingredients.filter((i) => i.currentStock < i.minStockLevel)
  const lowStock = ingredients.filter((i) => i.currentStock >= i.minStockLevel && i.currentStock < i.minStockLevel * 1.5)

  const getAlert = (i: Ingredient) => {
    if (i.currentStock < i.minStockLevel) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><AlertTriangle size={10} /> Rupture</span>
    if (i.currentStock < i.minStockLevel * 1.5) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><AlertTriangle size={10} /> Bas</span>
    return <span className="text-xs text-gray-400">OK</span>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold text-gray-900">Gestion du stock</h1></div>
        <Button leftIcon={<Plus size={16} />} onClick={() => { reset(); setShowModal(true) }}>Ajouter un ingrédient</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-card">
          <p className="text-sm text-gray-500">Total ingrédients</p>
          <p className="text-2xl font-bold text-gray-900">{ingredients.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-card">
          <p className="text-sm text-gray-500">En alerte</p>
          <p className="text-2xl font-bold text-red-600">{alerts.length + lowStock.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-card">
          <p className="text-sm text-gray-500">Valeur totale</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalValue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Ingrédient', 'Unité', 'Stock actuel', 'Stock min', 'Coût/unité', 'Fournisseur', 'Alerte', 'Ajuster'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : ingredients.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucun ingrédient enregistré</td></tr>
            ) : ingredients.map((i) => (
              <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                <td className="px-4 py-3 text-gray-600">{i.unit}</td>
                <td className="px-4 py-3 text-gray-900">{i.currentStock}</td>
                <td className="px-4 py-3 text-gray-600">{i.minStockLevel}</td>
                <td className="px-4 py-3 text-gray-600">{fmt(i.costPerUnit)}</td>
                <td className="px-4 py-3 text-gray-600">{i.supplier?.name ?? '—'}</td>
                <td className="px-4 py-3">{getAlert(i)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={adjusting[i.id] ?? ''}
                      onChange={(e) => setAdjusting((p) => ({ ...p, [i.id]: e.target.value }))}
                      placeholder="±qty"
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={() => {
                        const delta = parseFloat(adjusting[i.id] ?? '0')
                        if (!isNaN(delta)) {
                          adjustMutation.mutate({ id: i.id, qty: Math.max(0, i.currentStock + delta) })
                          setAdjusting((p) => ({ ...p, [i.id]: '' }))
                        }
                      }}
                      className="px-2 py-1 bg-primary text-white rounded-lg text-xs hover:bg-primary-600"
                    >OK</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Ajouter un ingrédient">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input {...register('name')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {errors.name && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
              <input {...register('unit')} placeholder="kg, L, pcs..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coût/unité (€)</label>
              <input {...register('costPerUnit')} type="number" step="0.01" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock actuel</label>
              <input {...register('currentStock')} type="number" step="0.1" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock minimum</label>
              <input {...register('minStockLevel')} type="number" step="0.1" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
              <select {...register('supplierId')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">— Aucun —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Annuler</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Ajouter</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
