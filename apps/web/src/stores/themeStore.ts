import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Design theme selector — user can pick their preferred palette.
 * Applies to POS, Room Designer, and Configurator views.
 */
export type ThemeId = 'mauve' | 'indigo' | 'slate' | 'gold' | 'emerald' | 'rose'

export interface Theme {
  id: ThemeId
  name: string
  emoji: string
  description: string
  // Palette
  primary: string
  primaryLight: string
  accent: string
  bg: string
  surface: string
  text: string
  textMuted: string
  gradient: string
}

export const THEMES: Theme[] = [
  {
    id: 'mauve',
    name: 'Mauve (original)',
    emoji: '🟣',
    description: 'Le design historique — violet profond avec accents fluo',
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    accent: '#ec4899',
    bg: 'linear-gradient(145deg, #0a0a1a 0%, #1a0a2e 30%, #2d1b4e 60%, #1a0a2e 100%)',
    surface: 'rgba(139,92,246,0.08)',
    text: '#f1f5f9',
    textMuted: '#a78bfa',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  },
  {
    id: 'indigo',
    name: 'Indigo actuel',
    emoji: '🟦',
    description: 'Indigo moderne — le thème actuel (post-refonte)',
    primary: '#6366f1',
    primaryLight: '#818cf8',
    accent: '#06b6d4',
    bg: 'linear-gradient(145deg, #0a0a1a 0%, #0f0f2e 30%, #0d0b24 60%, #080818 100%)',
    surface: 'rgba(99,102,241,0.08)',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
  },
  {
    id: 'slate',
    name: 'Ardoise pro',
    emoji: '⚫',
    description: 'Neutre professionnel — gris ardoise et bleu acier',
    primary: '#475569',
    primaryLight: '#64748b',
    accent: '#0ea5e9',
    bg: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    surface: 'rgba(100,116,139,0.1)',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    gradient: 'linear-gradient(135deg, #475569 0%, #0ea5e9 100%)',
  },
  {
    id: 'gold',
    name: 'Or premium',
    emoji: '🟡',
    description: 'Luxe — noir profond et accents or',
    primary: '#eab308',
    primaryLight: '#facc15',
    accent: '#f59e0b',
    bg: 'linear-gradient(145deg, #0a0a0a 0%, #1a1407 30%, #0a0a0a 100%)',
    surface: 'rgba(234,179,8,0.08)',
    text: '#fef3c7',
    textMuted: '#ca8a04',
    gradient: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
  },
  {
    id: 'emerald',
    name: 'Émeraude',
    emoji: '🟢',
    description: 'Frais et naturel — vert émeraude sur fond sombre',
    primary: '#10b981',
    primaryLight: '#34d399',
    accent: '#14b8a6',
    bg: 'linear-gradient(145deg, #022c22 0%, #064e3b 50%, #022c22 100%)',
    surface: 'rgba(16,185,129,0.08)',
    text: '#ecfdf5',
    textMuted: '#6ee7b7',
    gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
  },
  {
    id: 'rose',
    name: 'Rose brasserie',
    emoji: '🟥',
    description: 'Chaleureux — rose brûlé et rouge brique',
    primary: '#f43f5e',
    primaryLight: '#fb7185',
    accent: '#f97316',
    bg: 'linear-gradient(145deg, #1f0a0e 0%, #3f0d15 50%, #1f0a0e 100%)',
    surface: 'rgba(244,63,94,0.08)',
    text: '#ffe4e6',
    textMuted: '#fda4af',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
  },
]

interface ThemeState {
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
  theme: () => Theme
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: 'indigo',
      setTheme: (id) => set({ themeId: id }),
      theme: () => THEMES.find((t) => t.id === get().themeId) || THEMES[1],
    }),
    { name: 'creorga-theme' }
  )
)

export function getTheme(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[1]
}
