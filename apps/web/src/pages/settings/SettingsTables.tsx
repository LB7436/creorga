import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Save, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import SettingsLayout from './SettingsLayout'
import { Button, Card, Input, Spinner, Modal } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import type { Table } from '@/types'

export default function SettingsTables() {
  const companyId = useAuthStore((s) => s.companyId)
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTable, setNewTable] = useState({ name: '', section: 'Salle', capacity: 4 })

  const headers = { 'x-company-id': companyId! }

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables-settings', companyId],
    queryFn: async () => {
      const res = await api.get<Table[]>('/tables', { headers })
      return res.data
    },
    enabled: !!companyId,
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      await api.post('/tables', newTable, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-settings'] })
      setShowAddModal(false)
      setNewTable({ name: '', section: 'Salle', capacity: 4 })
      toast.success('Table ajoutée')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tables/${id}`, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-settings'] })
      toast.success('Table supprimée')
    },
  })

  const sections = [...new Set(tables.map((t) => t.section))]

  return (
    <SettingsLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Plan de salle</h3>
          <p className="text-sm text-gray-500">{tables.length} tables configurées</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Ajouter une table
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section}>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {section}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tables
                  .filter((t) => t.section === section)
                  .map((table) => (
                    <Card key={table.id} padding="sm" className="flex items-center gap-3">
                      <GripVertical size={16} className="text-gray-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{table.name}</p>
                        <p className="text-xs text-gray-400">{table.capacity} places</p>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(table.id)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ajout */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Ajouter une table" size="sm">
        <div className="space-y-4">
          <Input
            label="Nom de la table"
            placeholder="Table 10"
            value={newTable.name}
            onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Section</label>
            <select
              value={newTable.section}
              onChange={(e) => setNewTable({ ...newTable, section: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="Salle">Salle</option>
              <option value="Terrasse">Terrasse</option>
              <option value="Bar">Bar</option>
            </select>
          </div>
          <Input
            label="Capacité"
            type="number"
            value={newTable.capacity}
            onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 4 })}
          />
          <Button
            fullWidth
            leftIcon={<Save size={18} />}
            isLoading={addMutation.isPending}
            onClick={() => addMutation.mutate()}
            disabled={!newTable.name}
          >
            Ajouter
          </Button>
        </div>
      </Modal>
    </SettingsLayout>
  )
}
