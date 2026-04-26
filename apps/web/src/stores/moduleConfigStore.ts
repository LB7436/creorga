import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleId } from './moduleStore'

/**
 * Per-module visibility + coming-soon state.
 * Admin can enable/disable each module and mark modules as "coming soon".
 */
export type ModuleDisplayMode = 'visible' | 'hidden' | 'coming_soon'

export interface ModuleConfig {
  displayMode: ModuleDisplayMode
  pinnedToDashboard: boolean
  customLabel?: string
  order: number
}

interface ModuleConfigState {
  config: Record<string, ModuleConfig>
  setDisplayMode: (id: ModuleId | string, mode: ModuleDisplayMode) => void
  setPinned: (id: ModuleId | string, pinned: boolean) => void
  setLabel: (id: ModuleId | string, label: string) => void
  setOrder: (id: ModuleId | string, order: number) => void
  reset: () => void
  get: (id: ModuleId | string) => ModuleConfig
}

const DEFAULT: ModuleConfig = {
  displayMode: 'visible',
  pinnedToDashboard: false,
  order: 0,
}

export const useModuleConfig = create<ModuleConfigState>()(
  persist(
    (set, get) => ({
      config: {},
      setDisplayMode: (id, mode) => set((s) => ({
        config: { ...s.config, [id]: { ...(s.config[id] ?? DEFAULT), displayMode: mode } },
      })),
      setPinned: (id, pinned) => set((s) => ({
        config: { ...s.config, [id]: { ...(s.config[id] ?? DEFAULT), pinnedToDashboard: pinned } },
      })),
      setLabel: (id, label) => set((s) => ({
        config: { ...s.config, [id]: { ...(s.config[id] ?? DEFAULT), customLabel: label } },
      })),
      setOrder: (id, order) => set((s) => ({
        config: { ...s.config, [id]: { ...(s.config[id] ?? DEFAULT), order } },
      })),
      reset: () => set({ config: {} }),
      get: (id) => get().config[id] ?? DEFAULT,
    }),
    { name: 'creorga-module-config' }
  )
)
