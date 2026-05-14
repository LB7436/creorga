import type { CSSProperties, ReactNode } from 'react'
import { ACCENT, ACCENT2, BG, BORDER, MUTED, SURFACE, TEXT } from './theme'

export const PLAYER_COLORS = ['#22c55e', '#a855f7', '#f59e0b', '#ef4444'] as const

export function Game3DShell({
  title,
  subtitle,
  onBack,
  children,
  side,
}: {
  title: string
  subtitle: string
  onBack?: () => void
  children: ReactNode
  side?: ReactNode
}) {
  return (
    <>
      <style>
        {`
          @media (max-width: 760px) {
            .creorga-game3d-body {
              grid-template-columns: 1fr !important;
              overflow-y: auto;
            }
            .creorga-game3d-playfield {
              min-height: min(620px, 78vh);
            }
            .creorga-game3d-side {
              border-left: 0 !important;
              border-top: 1px solid ${BORDER};
            }
          }
        `}
      </style>
      <div style={shellStyle}>
        <div style={topBarStyle}>
          {onBack && (
            <button onClick={onBack} style={ghostButtonStyle}>
              Retour
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ color: TEXT, fontSize: 15, fontWeight: 900 }}>{title}</div>
            <div style={{ color: MUTED, fontSize: 11 }}>{subtitle}</div>
          </div>
        </div>
        <div className="creorga-game3d-body" style={bodyStyle}>
          <div className="creorga-game3d-playfield" style={playfieldStyle}>{children}</div>
          {side && <div className="creorga-game3d-side" style={sideStyle}>{side}</div>}
        </div>
      </div>
    </>
  )
}

export function StatPill({ label, value, color = ACCENT }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div style={{ ...statStyle, borderColor: `${color}44` }}>
      <span style={{ color, fontWeight: 900 }}>{value}</span>
      <span style={{ color: MUTED, fontSize: 10 }}>{label}</span>
    </div>
  )
}

export function PlayerBadge({ index, active, label, score }: { index: number; active?: boolean; label: string; score?: ReactNode }) {
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length]
  return (
    <div
      style={{
        ...playerBadgeStyle,
        borderColor: active ? color : BORDER,
        background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: 'inline-block' }} />
      <span style={{ color: TEXT, fontWeight: 800 }}>{label}</span>
      {score !== undefined && <span style={{ marginLeft: 'auto', color }}>{score}</span>}
    </div>
  )
}

export function ActionButton({
  children,
  onClick,
  disabled,
  tone = 'primary',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  tone?: 'primary' | 'secondary' | 'danger'
}) {
  const color = tone === 'danger' ? '#ef4444' : tone === 'secondary' ? ACCENT2 : ACCENT
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...buttonStyle,
        background: disabled ? 'rgba(255,255,255,0.08)' : `linear-gradient(145deg, ${color}, ${color}cc)`,
        color: disabled ? MUTED : '#fff',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: disabled ? 'none' : `0 12px 22px ${color}33, inset 0 1px 0 rgba(255,255,255,0.22)`,
      }}
    >
      {children}
    </button>
  )
}

function suitGlyph(suit: string) {
  if (suit === 'S') return '♠'
  if (suit === 'H') return '♥'
  if (suit === 'D') return '♦'
  if (suit === 'C') return '♣'
  return suit
}

export function MiniCard({
  rank,
  suit,
  selected,
  muted,
  onClick,
  small,
}: {
  rank: string
  suit: string
  selected?: boolean
  muted?: boolean
  onClick?: () => void
  small?: boolean
}) {
  const red = suit === '♦' || suit === '♥' || suit === 'D' || suit === 'C'
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        ...card3DStyle,
        width: small ? 54 : 72,
        height: small ? 78 : 104,
        transform: selected ? 'translateY(-10px) rotateX(9deg) rotateZ(-2deg)' : 'rotateX(9deg)',
        opacity: muted ? 0.45 : 1,
        borderColor: selected ? ACCENT2 : 'rgba(255,255,255,0.18)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ color: red ? '#ef4444' : '#111827', fontSize: small ? 16 : 20, fontWeight: 950 }}>{rank}</span>
      <span style={{ color: red ? '#ef4444' : '#111827', fontSize: small ? 22 : 28, lineHeight: 1 }}>{suitGlyph(suit)}</span>
    </button>
  )
}

export function CardBack({ small }: { small?: boolean }) {
  return (
    <div
      style={{
        ...card3DStyle,
        width: small ? 42 : 56,
        height: small ? 60 : 78,
        background: 'linear-gradient(145deg, #39245f, #0f172a)',
        borderColor: 'rgba(168,85,247,0.35)',
      }}
    >
      <span style={{ width: '72%', height: '72%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.22)' }} />
    </div>
  )
}

export function Die3D({ value, rolling }: { value: number; rolling?: boolean }) {
  return (
    <div style={{ ...dieStyle, transform: rolling ? 'rotateX(28deg) rotateZ(24deg) scale(1.04)' : 'rotateX(18deg) rotateZ(-10deg)' }}>
      {value}
    </div>
  )
}

export const shellStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  background: BG,
  color: TEXT,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const topBarStyle: CSSProperties = {
  height: 52,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  background: SURFACE,
  borderBottom: `1px solid ${BORDER}`,
}

const bodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) clamp(180px, 24vw, 280px)',
}

const playfieldStyle: CSSProperties = {
  minHeight: 0,
  position: 'relative',
  overflow: 'hidden',
  perspective: 1100,
}

const sideStyle: CSSProperties = {
  minHeight: 0,
  overflowY: 'auto',
  borderLeft: `1px solid ${BORDER}`,
  background: 'rgba(14,13,32,0.96)',
  padding: 12,
}

const statStyle: CSSProperties = {
  border: '1px solid',
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 8,
  padding: '7px 9px',
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  minWidth: 66,
}

const playerBadgeStyle: CSSProperties = {
  border: '1px solid',
  borderRadius: 8,
  padding: '7px 9px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
}

export const ghostButtonStyle: CSSProperties = {
  border: `1px solid ${BORDER}`,
  background: 'rgba(255,255,255,0.04)',
  color: MUTED,
  borderRadius: 8,
  padding: '8px 10px',
  cursor: 'pointer',
  fontWeight: 700,
}

const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '10px 12px',
  fontWeight: 900,
  fontSize: 12,
  transition: 'transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
}

const card3DStyle: CSSProperties = {
  border: '2px solid',
  borderRadius: 10,
  background: 'linear-gradient(145deg, #fff7ed, #f8fafc)',
  color: '#111827',
  boxShadow: '0 18px 22px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.8)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  transition: 'transform 160ms ease, border-color 160ms ease, opacity 160ms ease',
  transformStyle: 'preserve-3d',
}

const dieStyle: CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 12,
  background: 'linear-gradient(145deg, #f8fafc, #cbd5e1)',
  color: '#111827',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 950,
  fontSize: 24,
  boxShadow: '0 18px 26px rgba(0,0,0,0.34), inset 0 2px 0 rgba(255,255,255,0.9)',
  transition: 'transform 180ms ease',
}
