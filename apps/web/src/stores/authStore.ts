import { create } from 'zustand'
import type { User, Company, UserCompany } from '@/types'

interface AuthState {
  accessToken: string | null
  user: User | null
  companies: UserCompany[]
  company: Company | null
  companyId: string | null
  isAuthenticated: boolean

  setAuth: (data: {
    accessToken: string
    user: User
    companies: UserCompany[]
  }) => void
  setAccessToken: (token: string) => void
  setActiveCompany: (companyId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  companies: [],
  company: null,
  companyId: null,
  isAuthenticated: false,

  setAuth: ({ accessToken, user, companies }) => {
    const activeCompany = companies[0]?.company ?? null
    set({
      accessToken,
      user,
      companies,
      company: activeCompany,
      companyId: activeCompany?.id ?? null,
      isAuthenticated: true,
    })
  },

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
    })
  },
}))
