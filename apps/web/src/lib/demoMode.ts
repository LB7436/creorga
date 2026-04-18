import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DemoPersona = 'owner' | 'waiter' | 'cook'

export interface DemoUser {
  id: string
  name: string
  role: string
  email: string
  avatar: string
  persona: DemoPersona
}

const DEMO_DURATION_MS = 60 * 60 * 1000 // 1 heure

const DEMO_USERS: Record<DemoPersona, DemoUser> = {
  owner: {
    id: 'demo-owner',
    name: 'Marie Dubois',
    role: 'admin',
    email: 'demo-owner@creorga.lu',
    avatar: '👩‍💼',
    persona: 'owner',
  },
  waiter: {
    id: 'demo-waiter',
    name: 'Thomas Martin',
    role: 'waiter',
    email: 'demo-waiter@creorga.lu',
    avatar: '🧑‍🍳',
    persona: 'waiter',
  },
  cook: {
    id: 'demo-cook',
    name: 'Paul Leroy',
    role: 'cook',
    email: 'demo-cook@creorga.lu',
    avatar: '👨‍🍳',
    persona: 'cook',
  },
}

interface DemoState {
  active: boolean
  persona: DemoPersona | null
  user: DemoUser | null
  startedAt: number | null
  expiresAt: number | null
  enterDemoMode: (persona: DemoPersona) => void
  exitDemoMode: () => void
  getRemainingMs: () => number
  getRemainingMinutes: () => number
  getDemoExpiry: () => Date | null
}

export const useDemoMode = create<DemoState>()(
  persist(
    (set, get) => ({
      active: false,
      persona: null,
      user: null,
      startedAt: null,
      expiresAt: null,

      enterDemoMode: (persona: DemoPersona) => {
        const now = Date.now()
        const user = DEMO_USERS[persona]
        set({
          active: true,
          persona,
          user,
          startedAt: now,
          expiresAt: now + DEMO_DURATION_MS,
        })
        localStorage.setItem('creorga-demo-mode', 'true')
        localStorage.setItem('creorga-demo-user', JSON.stringify(user))
      },

      exitDemoMode: () => {
        set({ active: false, persona: null, user: null, startedAt: null, expiresAt: null })
        localStorage.removeItem('creorga-demo-mode')
        localStorage.removeItem('creorga-demo-user')
      },

      getRemainingMs: () => {
        const exp = get().expiresAt
        if (!exp) return 0
        return Math.max(0, exp - Date.now())
      },

      getRemainingMinutes: () => {
        return Math.floor(get().getRemainingMs() / 60000)
      },

      getDemoExpiry: () => {
        const exp = get().expiresAt
        return exp ? new Date(exp) : null
      },
    }),
    {
      name: 'creorga-demo-state',
    }
  )
)

export function isDemoMode(): boolean {
  return useDemoMode.getState().active
}

export function getDemoUser(): DemoUser | null {
  return useDemoMode.getState().user
}

export { DEMO_USERS }
