import { useEnvMode } from '@/stores/envModeStore'

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16,
  border: '1px solid #e5e7eb',
}

interface ToggleRowProps {
  title: string
  description: string
  emoji: string
  value: boolean
  onChange: (v: boolean) => void
  accent: string
}

function ToggleRow({ title, description, emoji, value, onChange, accent }: ToggleRowProps) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          fontSize: 32, width: 52, height: 52, borderRadius: 12,
          background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{emoji}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>{description}</p>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 28, flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute', cursor: 'pointer', inset: 0,
            background: value ? accent : '#cbd5e1',
            borderRadius: 999, transition: 'all .2s',
          }} />
          <span style={{
            position: 'absolute', width: 22, height: 22,
            left: value ? 23 : 3, top: 3,
            background: '#fff', borderRadius: 999,
            transition: 'all .2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }} />
        </label>
      </div>
    </div>
  )
}

export default function SettingsEnvMode() {
  const { testMode, developerMode, comingSoonMode, setTestMode, setDeveloperMode, setComingSoonMode } = useEnvMode()

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Modes d'environnement</h2>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
        Active des modes spéciaux pour tester, développer ou masquer temporairement des modules.
      </p>

      <ToggleRow
        title="Mode Test"
        description="Bloque les paiements réels et affiche une bannière d'avertissement. Idéal pour les formations staff."
        emoji="⚠️"
        value={testMode}
        onChange={setTestMode}
        accent="#f59e0b"
      />

      <ToggleRow
        title="Entwickler Modus (Developer Mode)"
        description="Active les logs console détaillés, panneau de debug, et affichage des IDs techniques."
        emoji="🛠"
        value={developerMode}
        onChange={setDeveloperMode}
        accent="#8b5cf6"
      />

      <ToggleRow
        title="Mode Coming Soon"
        description="Affiche un écran « Bientôt disponible » sur les modules non finalisés plutôt qu'une page vide."
        emoji="🚧"
        value={comingSoonMode}
        onChange={setComingSoonMode}
        accent="#06b6d4"
      />
    </div>
  )
}
