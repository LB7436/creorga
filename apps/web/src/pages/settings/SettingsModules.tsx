import { useState, useMemo } from 'react'
import { MODULES } from '@/stores/moduleStore'
import { useModuleConfig, type ModuleDisplayMode } from '@/stores/moduleConfigStore'

/**
 * Module configurator — admin can enable/disable/coming-soon every module,
 * set custom labels, pin to dashboard, reorder.
 */
const MODE_LABELS: Record<ModuleDisplayMode, { label: string; color: string; emoji: string }> = {
  visible:     { label: 'Visible',      color: '#10b981', emoji: '👁' },
  hidden:      { label: 'Masqué',       color: '#64748b', emoji: '🔒' },
  coming_soon: { label: 'Bientôt',      color: '#f59e0b', emoji: '🚧' },
}

export default function SettingsModules() {
  const { config, setDisplayMode, setPinned, setLabel, reset } = useModuleConfig()
  const [filter, setFilter] = useState('')

  const modules = useMemo(() => {
    const q = filter.toLowerCase()
    return MODULES.filter((m) =>
      !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q)
    )
  }, [filter])

  const count = useMemo(() => {
    const counts = { visible: 0, hidden: 0, coming_soon: 0 }
    MODULES.forEach((m) => {
      const mode = config[m.id]?.displayMode ?? 'visible'
      counts[mode]++
    })
    return counts
  }, [config])

  return (
    <div style={{ maxWidth: 960 }}>
      <header style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Configurateur de modules</h2>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Activez, masquez ou marquez comme « Bientôt » chacun des {MODULES.length} modules.
          Vous pouvez aussi personnaliser leur libellé et les épingler au tableau de bord.
        </p>
      </header>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['visible', 'coming_soon', 'hidden'] as ModuleDisplayMode[]).map((m) => (
          <div key={m} style={{
            flex: 1, minWidth: 140,
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 24 }}>{MODE_LABELS[m].emoji}</div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{MODE_LABELS[m].label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: MODE_LABELS[m].color }}>{count[m]}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Rechercher un module…"
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: '1px solid #e2e8f0', fontSize: 14, outline: 'none',
          }}
        />
        <button onClick={reset} style={{
          padding: '10px 14px', borderRadius: 10, border: '1px solid #fee2e2', background: '#fef2f2',
          color: '#991b1b', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>↺ Réinitialiser</button>
      </div>

      {/* Modules list */}
      <div style={{ display: 'grid', gap: 8 }}>
        {modules.map((m) => {
          const c = config[m.id] ?? { displayMode: 'visible' as ModuleDisplayMode, pinnedToDashboard: false, order: 0 }
          return (
            <div key={m.id} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14,
              display: 'grid', gridTemplateColumns: '52px 1fr auto auto', gap: 14, alignItems: 'center',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: `${m.color ?? '#6366f1'}15`, color: m.color ?? '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>{m.icon ?? '📦'}</div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.customLabel || m.name}
                  <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{m.id}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{m.description}</div>
                <input
                  type="text"
                  value={c.customLabel ?? ''}
                  onChange={(e) => setLabel(m.id, e.target.value)}
                  placeholder={`Libellé personnalisé (défaut: ${m.name})`}
                  style={{
                    marginTop: 6, width: '100%', padding: '6px 10px', fontSize: 12,
                    border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc',
                  }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={c.pinnedToDashboard}
                  onChange={(e) => setPinned(m.id, e.target.checked)}
                />
                📌 Épingler
              </label>

              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 999, padding: 3 }}>
                {(['visible', 'coming_soon', 'hidden'] as ModuleDisplayMode[]).map((mode) => {
                  const active = c.displayMode === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => setDisplayMode(m.id, mode)}
                      style={{
                        padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: active ? MODE_LABELS[mode].color : 'transparent',
                        color: active ? '#fff' : '#64748b',
                        fontSize: 12, fontWeight: 600, transition: 'all .15s',
                      }}
                    >
                      {MODE_LABELS[mode].emoji} {MODE_LABELS[mode].label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
