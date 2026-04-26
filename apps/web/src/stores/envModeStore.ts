import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Environment modes — global switches that alter the runtime UX.
 *  - testMode           → bannière "TEST" + blocage paiements réels
 *  - developerMode      → "Entwickler Modus" : logs console, panneau debug
 *  - comingSoonMode     → splash "Bientôt disponible" sur modules non prêts
 */
export interface EnvModeState {
  testMode: boolean
  developerMode: boolean
  comingSoonMode: boolean
  setTestMode: (on: boolean) => void
  setDeveloperMode: (on: boolean) => void
  setComingSoonMode: (on: boolean) => void
  reset: () => void
}

export const useEnvMode = create<EnvModeState>()(
  persist(
    (set) => ({
      testMode: false,
      developerMode: false,
      comingSoonMode: false,
      setTestMode: (on) => set({ testMode: on }),
      setDeveloperMode: (on) => set({ developerMode: on }),
      setComingSoonMode: (on) => set({ comingSoonMode: on }),
      reset: () => set({ testMode: false, developerMode: false, comingSoonMode: false }),
    }),
    { name: 'creorga-env-mode' }
  )
)
