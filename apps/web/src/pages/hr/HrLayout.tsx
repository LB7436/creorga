import { CalendarRange, Clock3, Palmtree, Users, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import ModuleLayout from '@/components/layout/ModuleLayout'
import { useAuthStore } from '@/stores/authStore'
import { fetchAuth } from '@/lib/fetchAuth'
import { planningTeamOptions } from './planningTime'
import { authDataScope } from '@/lib/authScope'

const items = [
  { label: 'Planning', path: '/hr/planning', icon: CalendarRange },
  { label: 'Équipe', path: '/hr/equipe', icon: Users },
  { label: 'Pointages', path: '/hr/pointages', icon: Clock3 },
  { label: 'Congés', path: '/hr/conges', icon: Palmtree },
]

// v3.18.6 — fetch employees for the "view as" picker (owner side)
function getBackend(): string {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  return localStorage.getItem('creorga.backend.remote')
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}

export default function HrLayout() {
  const scope = useAuthStore(authDataScope)
  const access = useAuthStore(state => state.businessAccess)
  const userId = useAuthStore(state => state.user?.id)
  const companyId = useAuthStore(state => state.companyId)
  // A display mode is not an authorization role. Delegated ADMIN arrives with
  // the legacy personal display default; initialize its authorized team view.
  useEffect(() => {
    const current = useAuthStore.getState()
    if (access?.capabilities.includes('hr.manage') && current.role === 'employee' && current.viewAsEmployeeId === userId) current.setViewMode('owner')
  }, [access?.revision, userId, companyId])
  return <ScopedHrLayout key={scope} scope={scope} />
}

function ScopedHrLayout({ scope }: { scope: string }) {
  const access = useAuthStore(state => state.businessAccess)
  const canManage = access?.capabilities.includes('hr.manage') === true
  const viewMode = useAuthStore((s) => s.viewMode)
  const viewAsName = useAuthStore((s) => s.viewAsEmployeeName)
  const setViewMode = useAuthStore((s) => s.setViewMode)
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!canManage) return
    let current = true
    fetchAuth(`${getBackend()}/api/hr/team`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.team || []
        if (current && scope === authDataScope(useAuthStore.getState())) setEmployees(planningTeamOptions(list))
      })
      .catch(() => { /* ignore */ })
    return () => { current = false }
  }, [scope, canManage])
  const preview = canManage && viewMode === 'employee'

  // v3.18.6 — Banner avec sélecteur "Voir en tant que"
  const banner = (
    <div style={{
      padding: '10px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      background: preview
        ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.06))'
        : 'transparent',
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {preview ? <Eye size={14} color="#f59e0b" /> : <EyeOff size={14} color="#94a3b8" />}
        <span style={{ color: preview ? '#92400e' : '#475569', fontWeight: 600 }}>
          {preview
            ? `Vue collaborateur — vous voyez les données de ${viewAsName || 'cet employé'}`
            : canManage ? 'Vue gestion RH — selon vos permissions' : 'Mes données RH — accès personnel'}
        </span>
      </div>
      {canManage && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { if (scope === authDataScope(useAuthStore.getState())) setPickerOpen((o) => !o) }}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#fff', color: '#1e293b', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            {preview ? '↩ Revenir à la gestion RH' : '👁 Voir en tant que…'}
            <ChevronDown size={12} />
          </button>
          {pickerOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 100,
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, minWidth: 240,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 320, overflowY: 'auto',
            }}>
              <button
                onClick={() => { if (scope !== authDataScope(useAuthStore.getState())) return; setViewMode('owner'); setPickerOpen(false) }}
                style={{
                  width: '100%', padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                  background: viewMode === 'owner' ? '#f1f5f9' : 'transparent',
                  border: 'none', borderBottom: '1px solid #f1f5f9',
                  fontWeight: 700, color: '#1e293b', fontSize: 12,
                }}>
                👨‍💼 Vue gestion RH (permissions actuelles)
              </button>
              {employees.map((e) => (
                <button key={e.id}
                  onClick={() => { if (scope !== authDataScope(useAuthStore.getState())) return; setViewMode('employee', e.id, e.name); setPickerOpen(false) }}
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
