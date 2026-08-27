import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Company, UserCompany } from '@/types'

// v3.18.6 — viewMode permet au patron de basculer en "vue employé" pour
// voir uniquement les données du collaborateur sélectionné. Par défaut le
// patron voit tout. Un employé qui se connecte (role !== 'owner') a forcément
// viewMode='employee' et viewAsEmployeeId=son propre id.
export type ViewMode = 'owner' | 'employee'

function membershipRole(role: UserCompany['role'] | string | undefined): 'owner' | 'manager' | 'employee' {
  const normalized = String(role ?? '').toUpperCase()
  if (normalized === 'OWNER') return 'owner'
  if (normalized === 'MANAGER') return 'manager'
  return 'employee'
}

function userDisplayName(user: User | null): string | null {
  if (!user) return null
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  return name || user.email || null
}

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
  updateActiveCompany: (company: Company) => void
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
        // Le rôle est porté par l'adhésion UserCompany, jamais par User (cf. CLAUDE.md) :
        // l'API ne renvoie AUCUN user.role. L'ancien repli — « owner seulement si
        // l'e-mail est admin@creorga.local » — classait donc tous les autres comptes
        // en « employee », propriétaires compris, à qui 6 modules étaient masqués
        // (owner, sites, rgpd, backup, api, maintenance). Et ce compte de repli est
        // désactivé en production : plus personne n'était patron.
        const userRole = membershipRole(companies[0]?.role)
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
          viewAsEmployeeName: userRole === 'employee' ? userDisplayName(user) : null,
        })
      },
      setRole: (role) => set((state) => ({
        role,
        viewMode: role === 'employee' ? 'employee' : 'owner',
        viewAsEmployeeId: role === 'employee' ? state.user?.id ?? null : null,
        viewAsEmployeeName: role === 'employee' ? userDisplayName(state.user) : null,
      })),
      setViewMode: (mode, employeeId, employeeName) => set({
        viewMode: mode,
        viewAsEmployeeId: mode === 'employee' ? (employeeId || null) : null,
        viewAsEmployeeName: mode === 'employee' ? (employeeName || null) : null,
      }),

      setAccessToken: (token) => {
        set({ accessToken: token })
      },

      setActiveCompany: (companyId) => {
        const { companies, user } = get()
        const uc = companies.find((c) => c.companyId === companyId)
        if (uc) {
          const role = membershipRole(uc.role)
          set({
            company: uc.company,
            companyId: uc.companyId,
            role,
            viewMode: role === 'employee' ? 'employee' : 'owner',
            viewAsEmployeeId: role === 'employee' ? user?.id ?? null : null,
            viewAsEmployeeName: role === 'employee' ? userDisplayName(user) : null,
          })
        }
      },

      updateActiveCompany: (company) => set((state) => ({
        company,
        companyId: company.id,
        companies: state.companies.map((membership) =>
          membership.companyId === company.id ? { ...membership, company } : membership
        ),
      })),

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
