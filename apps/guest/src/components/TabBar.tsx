import type { GuestTab } from '../App'

const tabs: { id: GuestTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Accueil', icon: '🏠' },
  { id: 'menu', label: 'Menu', icon: '📋' },
  { id: 'order', label: 'Commande', icon: '🛒' },
  { id: 'games', label: 'Jeux', icon: '🎮' },
  { id: 'feedback', label: 'Avis', icon: '⭐' },
  { id: 'account', label: 'Compte', icon: '👤' },
]

const S = {
  bar: {
    position: 'fixed' as const,
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    display: 'flex' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
    height: 64,
    background: '#fff',
    borderTop: '1px solid #e5e7eb',
    zIndex: 50,
  },
  tab: (active: boolean) => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: 2,
    padding: '8px 12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    color: active ? '#6366f1' : '#9ca3af',
    fontSize: 10,
    fontWeight: active ? 600 : 400,
  }),
  icon: { fontSize: 22 },
  badge: {
    position: 'absolute' as const,
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    background: '#ef4444',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: '0 5px',
  },
}

interface TabBarProps {
  active: GuestTab
  onChange: (t: GuestTab) => void
  cartCount: number
  hide?: Partial<Record<GuestTab, boolean>>
  accent?: string
}

export default function TabBar({ active, onChange, cartCount, hide = {}, accent = '#6366f1' }: TabBarProps) {
  const visible = tabs.filter((t) => !hide[t.id])
  return (
    <nav style={S.bar}>
      {visible.map(t => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            style={{ ...S.tab(isActive), color: isActive ? accent : '#9ca3af' }}
            onClick={() => onChange(t.id)}
          >
            <span style={S.icon}>{t.icon}</span>
            {t.id === 'order' && cartCount > 0 && <span style={{ ...S.badge, background: accent }}>{cartCount}</span>}
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
