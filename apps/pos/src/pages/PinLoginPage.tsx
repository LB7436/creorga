import { useState } from 'react'
import { usePOS } from '../store/posStore'

const S = {
  page: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: '100vh',
    background: 'linear-gradient(135deg, #07070d 0%, #0f0f1e 50%, #07070d 100%)',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    gap: 32,
  },
  logo: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 8,
  },
  logoText: { fontSize: 28, fontWeight: 700, color: '#818cf8', letterSpacing: '-0.02em' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: -24, marginBottom: 8 },
  staffGrid: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: 12,
    maxWidth: 460,
    width: '100%',
    padding: '0 24px',
  },
  staffBtn: (color: string, selected: boolean) => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: '16px 12px',
    borderRadius: 16,
    border: selected ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.06)',
    background: selected ? `${color}15` : 'rgba(255,255,255,0.03)',
    cursor: 'pointer',
    transition: 'all .2s',
  }),
  avatar: (color: string) => ({
    width: 48,
    height: 48,
    borderRadius: 24,
    background: color,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
  }),
  name: { fontSize: 13, fontWeight: 500, color: '#e2e8f0' },
  role: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  pinSection: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: 16,
    marginTop: 8,
  },
  dots: { display: 'flex' as const, gap: 10, marginBottom: 4 },
  dot: (filled: boolean) => ({
    width: 14,
    height: 14,
    borderRadius: 7,
    background: filled ? '#818cf8' : 'rgba(255,255,255,0.08)',
    border: filled ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.12)',
    transition: 'all .15s',
  }),
  numpad: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(3, 72px)',
    gap: 10,
  },
  numBtn: {
    width: 72,
    height: 56,
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: 22,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .15s',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  error: { color: '#f43f5e', fontSize: 13, marginTop: -8 },
}

export default function PinLoginPage() {
  const staff = usePOS(s => s.staff)
  const loginStaff = usePOS(s => s.loginStaff)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const selected = staff.find(s => s.id === selectedId)

  function handleDigit(d: string) {
    if (pin.length >= 4) return
    const next = pin + d
    setError(false)
    if (next.length === 4) {
      const ok = loginStaff(next)
      if (!ok) {
        setError(true)
        setTimeout(() => { setPin(''); setError(false) }, 800)
      }
      setPin(next)
    } else {
      setPin(next)
    }
  }

  function handleBackspace() {
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  return (
    <div style={S.page}>
      <div style={S.logo}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="2" fill="#6366f1" opacity=".9"/>
          <rect x="13" y="3" width="8" height="8" rx="2" fill="#6366f1" opacity=".5"/>
          <rect x="3" y="13" width="8" height="8" rx="2" fill="#6366f1" opacity=".5"/>
          <rect x="13" y="13" width="8" height="8" rx="2" fill="#6366f1" opacity=".9"/>
        </svg>
        <span style={S.logoText}>Creorga POS</span>
      </div>
      <div style={S.subtitle}>Sélectionnez votre profil</div>

      <div style={S.staffGrid}>
        {staff.map(s => (
          <button key={s.id} style={S.staffBtn(s.color, selectedId === s.id)} onClick={() => { setSelectedId(s.id); setPin(''); setError(false) }}>
            <div style={S.avatar(s.color)}>{s.name[0]}</div>
            <span style={S.name}>{s.name}</span>
            <span style={S.role}>{s.role}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div style={S.pinSection}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            Code PIN pour <span style={{ color: selected.color, fontWeight: 600 }}>{selected.name}</span>
          </div>
          <div style={S.dots}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={S.dot(i < pin.length)} />
            ))}
          </div>
          {error && <div style={S.error}>Code incorrect</div>}
          <div style={S.numpad}>
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button key={d} style={S.numBtn} onClick={() => handleDigit(d)}>{d}</button>
            ))}
            <button style={{ ...S.numBtn, fontSize: 14, color: '#94a3b8' }} onClick={handleBackspace}>&#9003;</button>
            <button style={S.numBtn} onClick={() => handleDigit('0')}>0</button>
            <div />
          </div>
        </div>
      )}
    </div>
  )
}
