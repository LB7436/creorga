import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEnvMode } from '@/stores/envModeStore'

/**
 * Top-right admin quick menu — configure any module, activate Test / Dev /
 * Coming Soon modes, open the room designer, jump to the local AI.
 * Mounted in the main /modules page and in the AppShell.
 */
export default function AdminQuickMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const popRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const { testMode, developerMode, comingSoonMode, setTestMode, setDeveloperMode, setComingSoonMode } = useEnvMode()

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const go = (path: string) => { setOpen(false); navigate(path) }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        title="Panneau administrateur"
        style={{
          width: 36, height: 36, borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          background: open ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          color: open ? '#a78bfa' : 'rgba(203,213,225,0.85)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, transition: 'all .2s',
        }}
      >⚙</button>

      {open && (
        <div ref={popRef} style={popover}>
          <div style={popHeader}>⚡ Admin panel</div>

          <div style={popSection}>
            <div style={popLabel}>Configuration</div>
            <MenuItem icon="🧩" label="Configurer les modules"   sub="Visible / Masqué / Bientôt" onClick={() => go('/settings/modules')} />
            <MenuItem icon="📐" label="Designer la salle"        sub="Murs, fenêtres, comptoir, escaliers" onClick={() => go('/pos/design')} />
            <MenuItem icon="🪑" label="Plan de salle & chaises"   sub="Tables, chaises, transferts" onClick={() => go('/pos/floor')} />
            <MenuItem icon="👥" label="Clients & portail"         sub="QR code, logo, personnalisation" onClick={() => go('/clients')} />
            <MenuItem icon="🎨" label="Thèmes & apparence"        sub="Mauve, Indigo, Or, Émeraude…" onClick={() => go('/settings/theme')} />
          </div>

          <div style={popSection}>
            <div style={popLabel}>Modes</div>
            <ToggleRow label="Mode Test"           emoji="⚠️" value={testMode}        onChange={setTestMode}        color="#f59e0b" />
            <ToggleRow label="Entwickler Modus"    emoji="🛠" value={developerMode}   onChange={setDeveloperMode}   color="#8b5cf6" />
            <ToggleRow label="Coming Soon display" emoji="🚧" value={comingSoonMode}  onChange={setComingSoonMode}  color="#06b6d4" />
          </div>

          <div style={popSection}>
            <div style={popLabel}>Modules</div>
            <MenuItem icon="🤖" label="Assistant IA local (Gemma)" sub="Ollama pour Raspberry Pi 5"    onClick={() => go('/ai/local')} />
            <MenuItem icon="💳" label="Facturation"                sub="Factures / devis / avoirs"      onClick={() => go('/invoices/devis')} />
            <MenuItem icon="🏛" label="Super Admin"                sub="Panel founder"                  onClick={() => go('/admin')} />
          </div>

          <div style={popFooter}>
            Creorga OS v2.0 · Café um Rond-Point
          </div>
        </div>
      )}
    </>
  )
}

function MenuItem({ icon, label, sub, onClick }: { icon: string; label: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={menuItemStyle}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ color: 'rgba(148,163,184,0.75)', fontSize: 11 }}>{sub}</div>}
      </div>
      <div style={{ color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>›</div>
    </button>
  )
}

function ToggleRow({ label, emoji, value, onChange, color }: { label: string; emoji: string; value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ flex: 1, color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        position: 'relative', width: 38, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: value ? color : 'rgba(148,163,184,0.3)', transition: 'all .2s',
      }}>
        <span style={{
          position: 'absolute', width: 16, height: 16, top: 3, left: value ? 19 : 3,
          background: '#fff', borderRadius: '50%', transition: 'all .2s',
        }} />
      </button>
    </div>
  )
}

const popover: React.CSSProperties = {
  position: 'absolute', right: 32, top: 72, width: 340, zIndex: 1000,
  background: 'rgba(15,15,35,0.95)', backdropFilter: 'blur(16px)',
  border: '1px solid rgba(139,92,246,0.25)', borderRadius: 16,
  boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)',
  overflow: 'hidden',
}
const popHeader: React.CSSProperties = {
  padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  fontWeight: 700, color: '#f1f5f9', fontSize: 14,
  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
}
const popSection: React.CSSProperties = {
  padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.04)',
}
const popLabel: React.CSSProperties = {
  padding: '4px 10px', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
  color: 'rgba(148,163,184,0.55)', fontWeight: 700,
}
const popFooter: React.CSSProperties = {
  padding: '10px 16px', fontSize: 10, color: 'rgba(148,163,184,0.45)',
  textAlign: 'center',
}
const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: 'none', background: 'transparent', cursor: 'pointer',
  transition: 'background .15s',
}
