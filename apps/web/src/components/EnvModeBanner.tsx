import { useEnvMode } from '@/stores/envModeStore'

/**
 * Global banner shown at top of app whenever Test or Developer mode is on.
 */
export default function EnvModeBanner() {
  const testMode = useEnvMode((s) => s.testMode)
  const devMode = useEnvMode((s) => s.developerMode)

  if (!testMode && !devMode) return null

  const bg = testMode ? '#f59e0b' : '#8b5cf6'
  const label = testMode
    ? '⚠️ MODE TEST — Aucun paiement réel ne sera traité'
    : '🛠 ENTWICKLER MODUS — Logs & panneaux debug actifs'

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 999,
      background: bg, color: '#fff', padding: '8px 16px',
      fontWeight: 600, fontSize: 13, textAlign: 'center',
      letterSpacing: 0.3,
    }}>
      {label}
    </div>
  )
}

export function ComingSoonOverlay({ feature }: { feature: string }) {
  const comingSoon = useEnvMode((s) => s.comingSoonMode)
  if (!comingSoon) return null
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, zIndex: 50, color: '#fff', padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56 }}>🚧</div>
      <h3 style={{ margin: '12px 0 4px', fontSize: 22 }}>Bientôt disponible</h3>
      <p style={{ margin: 0, color: '#cbd5e1' }}>{feature} arrive prochainement</p>
    </div>
  )
}
