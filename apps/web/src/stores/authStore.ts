import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Company, UserCompany } from '@/types'

// v3.18.6 — viewMode permet au patron de basculer en "vue employé" pour
// voir uniquement les données du collaborateur sélectionné. Par défaut le
// patron voit tout. Un employé qui se connecte (role !== 'owner') a forcément
// viewMode='employee' et viewAsEmployeeId=son propre id.
export type ViewMode = 'owner' | 'employee'

interface AuthState {
  accessToken: string | null
  user: User | null
  companies: UserCompany[]
  company: Company | null
  companyId: string | null
  isAuthenticated: boolean

  // v3.18.6 — Permissions par rôle RH
  role: 'owner' | 'manager' | 'employee'
  viewMode: ViewMode
  viewAsEmployeeId: string | null   // quand viewMode='employee', quel employé est imité
  viewAsEmployeeName: string | null

  setAuth: (data: {
    accessToken: string
    user: User
    companies: UserCompany[]
  }) => void
  setAccessToken: (token: string) => void
  setActiveCompany: (companyId: string) => void
  setRole: (role: 'owner' | 'manager' | 'employee') => void
  setViewMode: (mode: ViewMode, employeeId?: string, employeeName?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      companies: [],
      company: null,
      companyId: null,
      isAuthenticated: false,

      // v3.18.6 — defaults : patron voit tout
      role: 'owner',
      viewMode: 'owner',
      viewAsEmployeeId: null,
      viewAsEmployeeName: null,

      setAuth: ({ accessToken, user, companies }) => {
        const activeCompany = companies[0]?.company ?? null
        // Détecte le rôle depuis user (admin email = 'owner')
        const userRole = (user as any)?.role || ((user as any)?.email === 'admin@creorga.local' ? 'owner' : 'employee')
        set({
          accessToken,
          user,
          companies,
          company: activeCompany,
          companyId: activeCompany?.id ?? null,
          isAuthenticated: true,
          role: userRole,
          viewMode: userRole === 'employee' ? 'employee' : 'owner',
          viewAsEmployeeId: userRole === 'employee' ? (user as any)?.id : null,
          viewAsEmployeeName: userRole === 'employee' ? (user as any)?.name : null,
        })
      },
      setRole: (role) => set({ role, viewMode: role === 'employee' ? 'employee' : 'owner' }),
      setViewMode: (mode, employeeId, employeeName) => set({
        viewMode: mode,
        viewAsEmployeeId: mode === 'employee' ? (employeeId || null) : null,
        viewAsEmployeeName: mode === 'employee' ? (employeeName || null) : null,
      }),

      setAccessToken: (token) => {
        set({ accessToken: token })
      },

      setActiveCompany: (companyId) => {
        const { companies } = get()
        const uc = companies.find((c) => c.companyId === companyId)
        if (uc) {
          set({ company: uc.company, companyId: uc.companyId })
        }
      },

      logout: () => {
        set({
          accessToken: null,
          user: null,
          companies: [],
          company: null,
          companyId: null,
          isAuthenticated: false,
          role: 'owner',
          viewMode: 'owner',
          viewAsEmployeeId: null,
          viewAsEmployeeName: null,
        })
      },
    }),
    {
      name: 'creorga-auth',
      // ✓ v3.11 fix #26 : persist auth across navigations (session was lost
      // every time the user clicked a direct URL because the store was
      // in-memory only — React Router would re-mount and lose state).
      partialize: (s) => ({
        accessToken: s.accessToken,
        user: s.user,
        companies: s.companies,
        company: s.company,
        companyId: s.companyId,
        isAuthenticated: s.isAuthenticated,
        role: s.role,
        viewMode: s.viewMode,
        viewAsEmployeeId: s.viewAsEmployeeId,
        viewAsEmployeeName: s.viewAsEmployeeName,
      }),
    }
  )
)
