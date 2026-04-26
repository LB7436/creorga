import { useTheme, THEMES } from '@/stores/themeStore'

/**
 * Theme picker — lets the user pick between mauve / indigo / slate / gold / …
 * The mauve option restores the original POS 5175 look.
 */
export default function SettingsTheme() {
  const current = useTheme((s) => s.themeId)
  const setTheme = useTheme((s) => s.setTheme)

  return (
    <div style={{ maxWidth: 960 }}>
      <header style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Thèmes & apparence</h2>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Choisissez le design de l'interface. Le thème <strong>Mauve</strong> restaure le look original du POS 5175.
        </p>
      </header>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {THEMES.map((t) => {
          const active = current === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                border: active ? `3px solid ${t.primary}` : '2px solid #e2e8f0',
                borderRadius: 16, padding: 0, cursor: 'pointer',
                background: '#fff', overflow: 'hidden',
                transition: 'all .2s',
                boxShadow: active ? `0 8px 24px ${t.primary}40` : '0 1px 3px rgba(0,0,0,0.04)',
                transform: active ? 'translateY(-3px)' : 'none',
                textAlign: 'left',
              }}
            >
              {/* Preview */}
              <div style={{ background: t.bg, padding: 16, height: 120, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: t.gradient, boxShadow: `0 4px 16px ${t.primary}80`,
                }} />
                <div style={{
                  position: 'absolute', right: 12, top: 12,
                  padding: '4px 10px', background: t.surface, borderRadius: 999,
                  color: t.textMuted, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${t.primary}30`,
                }}>Aperçu</div>
                <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', gap: 6 }}>
                  <div style={{ height: 6, flex: 2, background: t.primary, borderRadius: 3 }} />
                  <div style={{ height: 6, flex: 1, background: t.accent, borderRadius: 3 }} />
                  <div style={{ height: 6, flex: 1, background: t.primaryLight, borderRadius: 3, opacity: 0.6 }} />
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>{t.emoji}</span>
                  <strong style={{ fontSize: 15 }}>{t.name}</strong>
                  {active && <span style={{
                    marginLeft: 'auto', padding: '2px 8px', borderRadius: 999,
                    background: t.primary, color: '#fff', fontSize: 11, fontWeight: 700,
                  }}>✓ Actif</span>}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{t.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
