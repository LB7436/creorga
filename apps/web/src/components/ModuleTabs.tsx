import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MODULES } from '@/stores/moduleStore'
import { useModuleUXStore } from '@/stores/moduleUXStore'

export default function ModuleTabs() {
  const navigate = useNavigate()
  const usageStats = useModuleUXStore((s) => s.usageStats)
  const closeRecentModule = useModuleUXStore((s) => s.closeRecentModule)

  const tabs = MODULES
    .filter((mod) => usageStats[mod.id])
    .sort((a, b) => (usageStats[b.id]?.lastOpened ?? 0) - (usageStats[a.id]?.lastOpened ?? 0))
    .slice(0, 5)

  if (!tabs.length) return null

  return (
    <div
      style={{
        height: 42,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 18px',
        borderBottom: '1px solid rgba(148,163,184,0.12)',
        background: 'rgba(2,6,23,0.42)',
        overflowX: 'auto',
      }}
    >
      {tabs.map((mod) => (
        <div
          key={mod.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            borderRadius: 999,
            border: `1px solid ${mod.color}44`,
            background: `${mod.color}18`,
            color: '#e2e8f0',
            height: 28,
            padding: '0 5px 0 10px',
            fontSize: 12,
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          <button onClick={() => navigate(mod.path)} style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 0 }}>
            {mod.name}
          </button>
          <button
            onClick={() => closeRecentModule(mod.id)}
            title="Fermer l'onglet"
            style={{ border: 'none', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', borderRadius: 999, width: 20, height: 20, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
