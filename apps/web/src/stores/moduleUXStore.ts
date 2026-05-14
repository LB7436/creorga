import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleId } from '@/stores/moduleStore'

export type ViewMode = 'service' | 'admin' | 'all'

export interface ModuleUsage {
  lastOpened: number
  count: number
}

interface ModuleUXState {
  usageStats: Partial<Record<ModuleId, ModuleUsage>>
  pinnedModules: ModuleId[]
  viewMode: ViewMode
  recordModuleOpen: (id: ModuleId) => void
  togglePin: (id: ModuleId) => void
  closeRecentModule: (id: ModuleId) => void
  setViewMode: (mode: ViewMode) => void
}

function readViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'all'
  const saved = window.localStorage.getItem('creorga.viewMode')
  return saved === 'service' || saved === 'admin' || saved === 'all' ? saved : 'all'
}

export const useModuleUXStore = create<ModuleUXState>()(
  persist(
    (set) => ({
      usageStats: {},
      pinnedModules: [],
      viewMode: readViewMode(),
      recordModuleOpen: (id) =>
        set((state) => {
          const current = state.usageStats[id] ?? { count: 0, lastOpened: 0 }
          return {
            usageStats: {
              ...state.usageStats,
              [id]: { count: current.count + 1, lastOpened: Date.now() },
            },
          }
        }),
      togglePin: (id) =>
        set((state) => ({
          pinnedModules: state.pinnedModules.includes(id)
            ? state.pinnedModules.filter((pinned) => pinned !== id)
            : [...state.pinnedModules, id],
        })),
      closeRecentModule: (id) =>
        set((state) => {
          const next = { ...state.usageStats }
          delete next[id]
          return { usageStats: next }
        }),
      setViewMode: (mode) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('creorga.viewMode', mode)
        }
        set({ viewMode: mode })
      },
    }),
    { name: 'creorga-module-ux' }
  )
)
