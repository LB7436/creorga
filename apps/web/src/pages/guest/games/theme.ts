export const ACCENT = '#a855f7'
export const ACCENT2 = '#06b6d4'
export const BG = '#05050f'
export const SURFACE = '#0e0d20'
export const SURFACE2 = '#16153a'
export const BORDER = 'rgba(168,85,247,0.18)'
export const TEXT = '#f8fafc'
export const MUTED = '#94a3b8'

export const btn = (color = ACCENT) => ({
  background: color,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
} as const)

export const card = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
} as const
