import { CalendarRange, Users, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import ModuleLayout from '@/components/layout/ModuleLayout'
import { useAuthStore } from '@/stores/authStore'
import { fetchAuth } from '@/lib/fetchAuth'

const items = [
  { label: 'Planning', path: '/hr/planning', icon: CalendarRange },
  { label: 'Équipe', path: '/hr/equipe', icon: Users },
]

// v3.18.6 — fetch employees for the "view as" picker (owner side)
function getBackend(): string {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  return localStorage.getItem('creorga.backend.remote')
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}

export default function HrLayout() {
  const role = useAuthStore((s) => s.role)
  const viewMode = useAuthStore((s) => s.viewMode)
  const viewAsName = useAuthStore((s) => s.viewAsEmployeeName)
  const setViewMode = useAuthStore((s) => s.setViewMode)
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    fetchAuth(`${getBackend()}/api/hr/team`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.team || []
        setEmployees(list.map((e: any) => ({
          id: e.id || `${e.firstName || ''}-${e.lastName || ''}`,
          name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
        })).filter((e: any) => e.name))
      })
      .catch(() => { /* ignore */ })
  }, [])

  const isOwner = role === 'owner' || role === 'manager'

  // v3.18.6 — Banner avec sélecteur "Voir en tant que"
  const banner = (
    <div style={{
      padding: '10px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      background: viewMode === 'employee'
        ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.06))'
        : 'transparent',
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {viewMode === 'employee' ? <Eye size={14} color="#f59e0b" /> : <EyeOff size={14} color="#94a3b8" />}
        <span style={{ color: viewMode === 'employee' ? '#92400e' : '#475569', fontWeight: 600 }}>
          {viewMode === 'employee'
            ? `Vue collaborateur — vous voyez les données de ${viewAsName || 'cet employé'}`
            : 'Vue patron — vous voyez tout'}
        </span>
      </div>
      {isOwner && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#fff', color: '#1e293b', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            {viewMode === 'employee' ? '↩ Repasser en patron' : '👁 Voir en tant que…'}
            <ChevronDown size={12} />
          </button>
          {pickerOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 100,
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, minWidth: 240,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 320, overflowY: 'auto',
            }}>
              <button
                onClick={() => { setViewMode('owner'); setPickerOpen(false) }}
                style={{
                  width: '100%', padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                  background: viewMode === 'owner' ? '#f1f5f9' : 'transparent',
                  border: 'none', borderBottom: '1px solid #f1f5f9',
                  fontWeight: 700, color: '#1e293b', fontSize: 12,
                }}>
                👨‍💼 Vue patron (tout voir)
              </button>
              {employees.map((e) => (
                <button key={e.id}
                  onClick={() => { setViewMode('employee', e.id, e.name); setPickerOpen(false) }}
                  style={{
                    width: '100%', padding: '8px 14px', textAlign: 'left', cursor: 'pointer',
                    background: 'transparent', border: 'none', fontSize: 12, color: '#475569',
                  }}>
                  👤 {e.name}
                </button>
              ))}
              {employees.length === 0 && (
                <div style={{ padding: 14, color: '#94a3b8', fontSize: 11 }}>Aucun employé</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return <ModuleLayout title="Planning & équipe" color="#991B1B" items={items} banner={banner} />
}
