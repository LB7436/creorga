import { useModuleUXStore, type ViewMode } from '@/stores/moduleUXStore'

const MODES: Array<{ id: ViewMode; label: string; icon: string }> = [
  { id: 'service', label: 'Service', icon: '🍽' },
  { id: 'admin', label: 'Admin', icon: '🏢' },
  { id: 'all', label: 'Tout', icon: '🌐' },
]

export default function ViewModeToggle() {
  const viewMode = useModuleUXStore((s) => s.viewMode)
  const setViewMode = useModuleUXStore((s) => s.setViewMode)

  return (
    <div
      data-tour="view-mode-toggle"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: 3,
        borderRadius: 999,
        border: '1px solid rgba(148,163,184,0.22)',
        background: 'rgba(15,23,42,0.42)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {MODES.map((mode) => {
        const active = viewMode === mode.id
        return (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '7px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              background: active ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : 'transparent',
              color: active ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              transition: 'all 0.18s ease',
            }}
            title={`Vue ${mode.label}`}
          >
            <span aria-hidden>{mode.icon}</span>
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
