import { useI18n, LOCALES } from '@/lib/i18n'

/**
 * Full-page Language settings — large dropdown with flag, native name, code.
 * Optimized for Luxembourg : LU/FR/DE/PT/EN officially supported.
 */
const DESCRIPTIONS: Record<string, string> = {
  fr: 'Français — langue principale Luxembourg',
  de: 'Deutsch — langue officielle, fréquente en région Nord',
  en: 'English — visiteurs internationaux, anglophones',
  pt: 'Português — communauté lusophone résidente',
  lu: 'Lëtzebuergesch — langue nationale, salutations & menu',
}

export default function SettingsLanguage() {
  const { locale, setLocale } = useI18n()

  return (
    <div style={{ maxWidth: 720 }}>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>🌍 Langue de l'interface</h2>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Sélectionnez la langue par défaut. Le portail client peut afficher d'autres
          langues selon les préférences clients.
        </p>
      </header>

      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18,
        marginBottom: 14,
      }}>
        <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, display: 'block' }}>
          Langue active
        </label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as any)}
          style={{
            width: '100%', padding: '14px 16px', fontSize: 15, fontWeight: 600,
            border: '2px solid #6366f1', borderRadius: 10, background: '#fafbff',
            cursor: 'pointer', boxSizing: 'border-box',
          }}
        >
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag}  {l.label}  ({l.code.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          Toutes les langues disponibles
        </div>
        {LOCALES.map((l) => {
          const active = locale === l.code
          return (
            <button
              key={l.code}
              onClick={() => setLocale(l.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 14, borderRadius: 12, cursor: 'pointer',
                border: active ? '2px solid #6366f1' : '1px solid #e2e8f0',
                background: active ? '#eef2ff' : '#fff',
                textAlign: 'left', transition: 'all .15s',
              }}>
              <span style={{ fontSize: 32 }}>{l.flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
                  {l.label}
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8, fontFamily: 'monospace' }}>
                    {l.code.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {DESCRIPTIONS[l.code] || l.label}
                </div>
              </div>
              {active && (
                <span style={{
                  padding: '4px 10px', background: '#6366f1', color: '#fff',
                  borderRadius: 999, fontSize: 11, fontWeight: 800,
                }}>✓ Actif</span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{
        marginTop: 18, padding: 14, background: '#f8fafc', borderRadius: 10,
        fontSize: 12, color: '#64748b',
      }}>
        💡 <strong>Note Luxembourg</strong> : la majorité des clients comprennent FR/DE/LU.
        Pour les touristes EN est recommandé en deuxième choix. PT pour les résidents lusophones (~16% de la population).
      </div>
    </div>
  )
}
