import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

export const THEMES = {
  light: {
    bg: '#f8fafc',
    bgCard: '#ffffff',
    bgSidebar: '#ffffff',
    bgHeader: 'rgba(255,255,255,0.9)',
    text: '#1e293b',
    textMuted: '#64748b',
    textLight: '#94a3b8',
    border: '#e2e8f0',
    accent: '#6366f1',
    accentLight: '#eef2ff',
  },
  dark: {
    bg: '#07070d',
    bgCard: 'rgba(255,255,255,0.04)',
    bgSidebar: '#0a0a14',
    bgHeader: 'rgba(10,10,20,0.9)',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    textLight: '#475569',
    border: 'rgba(255,255,255,0.08)',
    accent: '#818cf8',
    accentLight: 'rgba(99,102,241,0.15)',
  },
} as const

export type ThemeColors = typeof THEMES.light

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeState {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark' as Theme,
      resolvedTheme: 'dark' as ResolvedTheme,
      setTheme: (theme: Theme) => {
        const resolved: ResolvedTheme = theme === 'auto' ? getSystemTheme() : theme
        set({ theme, resolvedTheme: resolved })
      },
    }),
    {
      name: 'creorga-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved: ResolvedTheme =
            state.theme === 'auto' ? getSystemTheme() : state.theme
          state.resolvedTheme = resolved
        }
      },
    }
  )
)

/** Returns current theme color palette */
export function useThemeColors(): ThemeColors {
  const resolved = useTheme((s) => s.resolvedTheme)
  return THEMES[resolved]
}

/* Listen for system theme changes when in 'auto' mode */
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    const state = useTheme.getState()
    if (state.theme === 'auto') {
      state.setTheme('auto')
    }
  })
}
