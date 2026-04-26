import { useTheme, THEMES } from '@/stores/themeStore'

/**
 * Single source of truth for theme-aware colors.
 * Use this hook in any component to get colors that adapt to the user's theme.
 *
 * Each theme defines a "shade scale" :
 *   bg          : page background (deepest)
 *   surface     : card / panel background (one shade above bg)
 *   surfaceAlt  : hover, secondary card
 *   text        : main text color (high contrast)
 *   textMuted   : secondary text (60% opacity ish)
 *   border      : standard border
 *   primary     : accent (theme.primary)
 *   primaryLight: accent light variant
 *
 * Status colors stay constant across themes (success/warn/danger always same hue).
 */

export interface ResolvedTheme {
  id: string
  name: string
  isDark: boolean
  bg: string
  surface: string
  surfaceAlt: string
  text: string
  textMuted: string
  textStrong: string
  border: string
  primary: string
  primaryLight: string
  accent: string
  gradient: string
  success: string
  warning: string
  danger: string
  info: string
}

const STATIC_STATUS = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
}

export function useDarkMode(): ResolvedTheme {
  const themeId = useTheme((s) => s.themeId)
  const t = THEMES.find((x) => x.id === themeId) || THEMES[1]

  // Mauve / Indigo / Slate / Gold / Emerald / Rose are all DARK themes
  const isDark = true

  return {
    id: t.id,
    name: t.name,
    isDark,
    bg: isDark ? '#0a0a14' : '#fafbff',
    surface: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    surfaceAlt: isDark ? 'rgba(255,255,255,0.07)' : '#f8fafc',
    text: t.text,
    textMuted: t.textMuted,
    textStrong: isDark ? '#ffffff' : '#0f172a',
    border: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    primary: t.primary,
    primaryLight: t.primaryLight,
    accent: t.accent,
    gradient: t.gradient,
    ...STATIC_STATUS,
  }
}

/**
 * Static helper for non-React code (server, scripts).
 * Returns the default theme (Mauve).
 */
export function getDefaultDark(): ResolvedTheme {
  return {
    id: 'mauve',
    name: 'Mauve',
    isDark: true,
    bg: '#0a0a14',
    surface: 'rgba(255,255,255,0.04)',
    surfaceAlt: 'rgba(255,255,255,0.07)',
    text: '#f1f5f9',
    textMuted: '#a78bfa',
    textStrong: '#ffffff',
    border: 'rgba(255,255,255,0.08)',
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    accent: '#ec4899',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    ...STATIC_STATUS,
  }
}
