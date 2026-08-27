import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import LogoUploader from '@/components/LogoUploader'
import QRCodeCanvas from '@/components/QRCodeCanvas'
import PhotoWall from '@/components/PhotoWall'
import { useBrand } from '@/stores/brandStore'
import { usePortalConfig } from '@/hooks/usePortalConfig'
import { JEUX_SELECTIONNES, estCasino, estJouable, libelleJoueurs } from '@/pages/guest/games/catalog'
import { toastError } from '@/lib/toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PortalToggle {
  id: string
  label: string
  description: string
  emoji: string
  previewTab?: string
}

interface GameEntry {
  id: string
  name: string
  emoji: string
  /** Sous-titre honnête : joueurs réels, mention Bêta ou casino. */
  detail: string
  beta: boolean
  casino: boolean
}

interface PortalSettings {
  toggles: Record<string, boolean>
  games: Record<string, boolean>
  welcomeMessage: string
  accentColor: string
  tableNumber: string
  themeMode: 'dark' | 'light'
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PORTAL_TOGGLES: PortalToggle[] = [
  { id: 'menu', label: 'Afficher le menu', description: 'Les clients peuvent consulter votre carte', emoji: '\u{1F4CB}', previewTab: 'menu' },
  { id: 'order', label: 'Commande en ligne', description: 'Permettre la commande depuis la table', emoji: '\u{1F6D2}', previewTab: 'order' },
  { id: 'games', label: 'Activer les jeux', description: 'Section divertissement pour les clients', emoji: '\u{1F3AE}', previewTab: 'games' },
  { id: 'reviews', label: 'Demander les avis', description: 'Formulaire de notation après la visite', emoji: '⭐', previewTab: 'reviews' },
]

// Même registre que le portail client : un jeu « bientôt » n'est pas proposé,
// un jeu bêta ou casino est signalé comme tel au restaurateur avant qu'il ne
// l'active pour ses clients.
const GAMES: GameEntry[] = JEUX_SELECTIONNES
  .filter(estJouable)
  .map((game) => ({
    id: game.id,
    name: game.name,
    emoji: game.icon,
    detail: estCasino(game) ? 'Casino · mises fictives · 18+' : libelleJoueurs(game),
    beta: game.statut === 'beta',
    casino: estCasino(game),
  }))

const ACCENT_COLORS = [
  { id: 'indigo', label: 'Indigo', value: '#6366f1' },
  { id: 'purple', label: 'Violet', value: '#a855f7' },
  { id: 'emerald', label: 'Émeraude', value: '#10b981' },
  { id: 'rose', label: 'Rose', value: '#f43f5e' },
  { id: 'amber', label: 'Ambre', value: '#f59e0b' },
  { id: 'cyan', label: 'Cyan', value: '#06b6d4' },
]

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

function createDefaults(): PortalSettings {
  const toggles: Record<string, boolean> = {}
  PORTAL_TOGGLES.forEach((t) => { toggles[t.id] = true })
  const games: Record<string, boolean> = {}
  GAMES.forEach((g) => { games[g.id] = true })
  return { toggles, games, welcomeMessage: '', accentColor: '#6366f1', tableNumber: '1', themeMode: 'dark' }
}

function getPortalPreviewUrl(settings: PortalSettings, companyId: string | null) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5174'
  const url = new URL('/c', origin)
  url.searchParams.set('table', settings.tableNumber || '1')
  url.searchParams.set('preview', 'admin')
  if (companyId) url.searchParams.set('companyId', companyId)
  return url.toString()
}

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function ToggleSwitch({ active, onToggle, label, disabled }: { active: boolean; onToggle: () => void; label: string; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#6366f1' : '#94a3b8', minWidth: 28, textAlign: 'right' }}>
        {active ? 'ON' : 'OFF'}
      </span>
      <button
        onClick={onToggle}
        disabled={disabled}
        aria-checked={active}
        aria-busy={disabled || undefined}
        aria-label={label}
        role="switch"
        style={{
          position: 'relative', width: 48, height: 28, borderRadius: 14, border: 'none', cursor: disabled ? 'progress' : 'pointer',
          background: active ? '#6366f1' : '#d1d5db', transition: 'background 0.25s ease', flexShrink: 0, padding: 0,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <motion.div
          animate={{ x: active ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            position: 'absolute', top: 2, width: 24, height: 24, borderRadius: 12,
            background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section Card
// ---------------------------------------------------------------------------

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16,
        padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <h2 style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.6,
        color: '#64748b', marginBottom: 20, marginTop: 0,
      }}>
        {title}
      </h2>
      {children}
    </motion.section>
  )
}

// ---------------------------------------------------------------------------
// Phone Preview
// ---------------------------------------------------------------------------

function PhonePreview({ settings, companyId }: { settings: PortalSettings; companyId: string | null }) {
  const accent = settings.accentColor || '#6366f1'
  const dark = settings.themeMode !== 'light'
  const phoneBg = dark ? '#060513' : '#f8fafc'
  const previewUrl = getPortalPreviewUrl(settings, companyId)

  return (
    <div style={{ width: '100%', maxWidth: 430, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <p style={{
        fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2.4,
        color: '#64748b', margin: '0 0 14px',
      }}>
        Apercu en direct
      </p>
      <div style={{
        width: 310,
        height: 640,
        borderRadius: 34,
        background: '#111827',
        padding: 10,
        boxShadow: `0 24px 70px ${accent}26, 0 18px 36px rgba(15,23,42,0.22)`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          width: 86, height: 24, borderRadius: '0 0 14px 14px', background: '#111827', zIndex: 2,
        }} />
        <iframe
          title="Apercu portail client Creorga"
          src={previewUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            borderRadius: 26,
            background: phoneBg,
            overflow: 'hidden',
          }}
          allow="clipboard-write; fullscreen"
        />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            borderRadius: 999,
            background: accent,
            color: '#fff',
            padding: '9px 14px',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Tester dans un onglet
        </a>
        <span style={{
          borderRadius: 999,
          border: '1px solid #dbe4f0',
          color: '#64748b',
          padding: '9px 14px',
          fontSize: 12,
          fontWeight: 700,
          background: '#fff',
        }}>
          Table {settings.tableNumber || '1'}
        </span>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
        Les changements sont sauvegardés et visibles immédiatement sur le portail client.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ClientsConfig() {
  const company = useAuthStore((s) => s.company)
  const companyId = useAuthStore((s) => s.companyId)
  const [settings, setSettings] = useState<PortalSettings>(createDefaults)
  const {
    config: configServeur,
    error: erreurConfig,
    update: updateRemoteConfig,
    refresh: rechargerConfig,
  } = usePortalConfig(0) // no polling here, we're the writer
  const [enregistrement, setEnregistrement] = useState(false)
  const [configSynchronisee, setConfigSynchronisee] = useState(false)
  const settingsRef = useRef(settings)
  const settingsConfirmesRef = useRef(settings)
  const enregistrementRef = useRef(false)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    setConfigSynchronisee(false)
  }, [companyId])

  // La valeur affichée est celle du serveur : c'est elle que voit le portail
  // des clients. Un cache local global mélangerait les réglages de deux
  // restaurants utilisant le même navigateur, il n'est donc pas utilisé ici.
  useEffect(() => {
    if (!configServeur || enregistrementRef.current) return
    const prev = settingsRef.current
    const synchronise: PortalSettings = {
      ...prev,
      toggles: { ...prev.toggles, ...(configServeur.toggles ?? {}) },
      games: Object.keys(configServeur.games ?? {}).length ? { ...prev.games, ...configServeur.games } : prev.games,
      welcomeMessage: configServeur.welcomeMessage ?? prev.welcomeMessage,
      accentColor: configServeur.accentColor || prev.accentColor,
      tableNumber: configServeur.tableNumber || prev.tableNumber,
      themeMode: configServeur.themeMode ?? prev.themeMode,
    }
    settingsRef.current = synchronise
    settingsConfirmesRef.current = synchronise
    setSettings(synchronise)
    setConfigSynchronisee(true)
  }, [configServeur])

  const persist = useCallback((next: PortalSettings) => {
    // La valeur visible ne change qu'après confirmation du serveur. C'est plus
    // sûr qu'un état optimiste : un GET concurrent ne peut pas réappliquer une
    // valeur pendant le rollback d'un PATCH refusé.
    const precedent = settingsConfirmesRef.current
    settingsRef.current = next
    setSettings(next)
    enregistrementRef.current = true
    setEnregistrement(true)
    updateRemoteConfig({
      toggles: next.toggles,
      games: next.games,
      welcomeMessage: next.welcomeMessage,
      accentColor: next.accentColor,
      tableNumber: next.tableNumber,
      themeMode: next.themeMode,
    })
      .then((serveur) => {
        // Le serveur a le dernier mot sur ce qui est réellement enregistré.
        const confirme: PortalSettings = {
          toggles: { ...next.toggles, ...(serveur.toggles ?? {}) },
          games: Object.keys(serveur.games ?? {}).length ? { ...next.games, ...serveur.games } : next.games,
          welcomeMessage: serveur.welcomeMessage ?? next.welcomeMessage,
          accentColor: serveur.accentColor || next.accentColor,
          tableNumber: serveur.tableNumber || next.tableNumber,
          themeMode: serveur.themeMode ?? next.themeMode,
        }
        settingsConfirmesRef.current = confirme
        settingsRef.current = confirme
        setSettings(confirme)
      })
      .catch((e: any) => {
        settingsRef.current = precedent
        setSettings(precedent)
        toastError(e?.message || 'Enregistrement refusé par le serveur — le réglage a été annulé.')
      })
      .finally(() => {
        enregistrementRef.current = false
        setEnregistrement(false)
      })
  }, [updateRemoteConfig])

  const toggleFeature = (id: string) => {
    const current = settingsRef.current
    persist({ ...current, toggles: { ...current.toggles, [id]: !current.toggles[id] } })
  }
  const toggleGame = (id: string) => {
    const current = settingsRef.current
    persist({ ...current, games: { ...current.games, [id]: !current.games[id] } })
  }
  const setWelcome = (msg: string) => {
    const next = { ...settingsRef.current, welcomeMessage: msg }
    settingsRef.current = next
    setSettings(next)
  }
  const setAccent = (c: string) => persist({ ...settingsRef.current, accentColor: c })
  const setTable = (n: string) => {
    const next = { ...settingsRef.current, tableNumber: n }
    settingsRef.current = next
    setSettings(next)
  }
  const setThemeMode = (mode: 'dark' | 'light') => persist({ ...settingsRef.current, themeMode: mode })

  if (!configSynchronisee) {
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 32 }}>
        <div role="status" style={{ maxWidth: 460, textAlign: 'center', color: '#475569' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{erreurConfig ? '⚠️' : '⏳'}</div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            {erreurConfig ? 'Configuration indisponible' : 'Chargement de la configuration…'}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6 }}>
            {erreurConfig || 'Les commandes seront disponibles dès que les réglages enregistrés auront été vérifiés.'}
          </p>
          {erreurConfig && (
            <button
              type="button"
              onClick={() => void rechargerConfig()}
              style={{ marginTop: 16, border: 0, borderRadius: 10, padding: '10px 16px', background: '#4f46e5', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
            >
              Réessayer
            </button>
          )}
        </div>
      </div>
    )
  }

  const selectAllGames = () => {
    const g: Record<string, boolean> = {}
    GAMES.forEach((game) => { g[game.id] = true })
    persist({ ...settingsRef.current, games: g })
  }
  const deselectAllGames = () => {
    const g: Record<string, boolean> = {}
    GAMES.forEach((game) => { g[game.id] = false })
    persist({ ...settingsRef.current, games: g })
  }

  const activeGamesCount = GAMES.filter((game) => settings.games[game.id]).length
  const restaurantName = company?.name || 'Mon Restaurant'

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#1e293b', minHeight: '100vh',
    }}>
      {/* Header */}
      <motion.header
        className="portal-config-header"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ padding: '32px 32px 0', marginBottom: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>
            {'\u{1F4F1}'}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5, color: '#0f172a' }}>
              Portail Client
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Configurez l'expérience de vos clients &mdash; {restaurantName}
            </p>
          </div>
        </div>
      </motion.header>

      {/* Two-panel layout */}
      <div className="portal-config-layout" style={{ display: 'flex', gap: 32, padding: '0 32px 60px', alignItems: 'flex-start' }}>

        {/* LEFT — Config (60%) */}
        <div className="portal-config-controls" style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Toggles */}
          <Section title="Fonctionnalités du portail" delay={0}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {PORTAL_TOGGLES.map((toggle, i) => {
                const isActive = !!settings.toggles[toggle.id]
                return (
                  <motion.div
                    key={toggle.id}
                    data-tour={i === 0 ? 'portal-toggle' : undefined}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i + 0.1, duration: 0.3 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px',
                      borderBottom: i < PORTAL_TOGGLES.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 22, width: 36, textAlign: 'center', flexShrink: 0 }}>{toggle.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isActive ? '#0f172a' : '#94a3b8', transition: 'color 0.2s' }}>
                        {toggle.label}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                        {toggle.description}
                      </p>
                    </div>
                    <ToggleSwitch active={isActive} onToggle={() => toggleFeature(toggle.id)} label={toggle.label} disabled={enregistrement} />
                  </motion.div>
                )
              })}
            </div>
          </Section>

          {/* Games */}
          <Section title="Jeux disponibles" delay={0.1}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                {activeGamesCount} / {GAMES.length} jeux activés
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ label: 'Tout activer', fn: selectAllGames }, { label: 'Tout désactiver', fn: deselectAllGames }].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.fn}
                    style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                      padding: '5px 14px', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="portal-config-games" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {GAMES.map((game, i) => {
                const checked = !!settings.games[game.id]
                return (
                  <motion.button
                    key={game.id}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.012 * i + 0.15, duration: 0.25 }}
                    onClick={() => toggleGame(game.id)}
                    disabled={enregistrement}
                    style={{
                      position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '14px 6px 12px', borderRadius: 14, cursor: 'pointer',
                      border: checked ? '1.5px solid rgba(99,102,241,0.5)' : '1px solid #e2e8f0',
                      background: checked ? 'rgba(99,102,241,0.06)' : '#fafbfc',
                      transition: 'all 0.2s ease', color: '#1e293b',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 7, right: 7, width: 16, height: 16, borderRadius: 5,
                      border: checked ? 'none' : '1.5px solid #cbd5e1',
                      background: checked ? '#6366f1' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                    }}>
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5L4.2 7.5L8 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 24 }}>{game.emoji}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.3, transition: 'color 0.2s',
                      // indigo-500 : lisible sur le fond clair d'origine comme sur
                      // le thème sombre (l'indigo-900 y disparaissait).
                      color: checked ? '#6366f1' : '#64748b',
                    }}>
                      {game.name}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
                      color: game.casino ? '#be185d' : '#94a3b8',
                    }}>
                      {game.detail}
                    </span>
                    {game.beta && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, letterSpacing: 0.6, padding: '1px 5px', borderRadius: 5,
                        background: 'rgba(245,158,11,0.15)', color: '#b45309', border: '1px solid rgba(245,158,11,0.45)',
                      }}>
                        BÊTA
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </Section>

          {/* Customization */}
          <Section title="Personnalisation" delay={0.2}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Welcome */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#334155' }}>
                  Message de bienvenue
                </label>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={(e) => setWelcome(e.target.value)}
                  disabled={enregistrement}
                  placeholder="Ex: Bienvenue chez nous ! Scannez le QR code pour découvrir notre carte..."
                  rows={3}
                  style={{
                    width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                    padding: '12px 14px', color: '#1e293b', fontSize: 13, fontFamily: 'inherit',
                    resize: 'vertical', outline: 'none', lineHeight: 1.6, transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => persist(settingsRef.current)}
                    disabled={enregistrement || settings.welcomeMessage === settingsConfirmesRef.current.welcomeMessage}
                    style={{ border: 0, borderRadius: 9, padding: '8px 13px', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 800, cursor: enregistrement ? 'progress' : 'pointer', opacity: enregistrement || settings.welcomeMessage === settingsConfirmesRef.current.welcomeMessage ? 0.5 : 1 }}
                  >
                    {enregistrement ? 'Enregistrement…' : 'Enregistrer le message'}
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#334155' }}>
                  Design de l'expérience client
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  {([
                    { id: 'dark' as const, label: 'Sombre', desc: 'Immersif, premium, parfait le soir', bg: '#070617', fg: '#f8fafc' },
                    { id: 'light' as const, label: 'Clair', desc: 'Lumineux, lisible, style cafÃ© moderne', bg: '#f8fafc', fg: '#0f172a' },
                  ]).map((theme) => {
                    const active = settings.themeMode === theme.id
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setThemeMode(theme.id)}
                        style={{
                          border: active ? `2px solid ${settings.accentColor}` : '1px solid #e2e8f0',
                          borderRadius: 14,
                          padding: 12,
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: theme.bg,
                          color: theme.fg,
                          boxShadow: active ? `0 0 0 4px ${settings.accentColor}18` : 'none',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>{theme.label}</span>
                        <span style={{ display: 'block', fontSize: 11, opacity: 0.72, marginTop: 4 }}>{theme.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Accent color */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#334155' }}>
                  Couleur d'accent
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setAccent(c.value)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 12, background: c.value,
                        border: settings.accentColor === c.value ? '3px solid #0f172a' : '3px solid transparent',
                        boxShadow: settings.accentColor === c.value ? `0 0 16px ${c.value}50` : 'none',
                        transition: 'all 0.25s ease',
                      }} />
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo upload — real uploader with persist */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#334155' }}>
                  Logo du restaurant
                </label>
                <LogoUploader />
              </div>
            </div>
          </Section>

          {/* QR Code — real QR generator */}
          <Section title="QR Code" delay={0.3}>
            <QRSection
              tableNumber={settings.tableNumber}
              onTableChange={setTable}
              onSave={() => persist(settingsRef.current)}
              saving={enregistrement}
              hasChanges={settings.tableNumber !== settingsConfirmesRef.current.tableNumber}
              companyId={companyId}
            />
          </Section>
        </div>

        {/* RIGHT — Live Preview (40%) */}
        <motion.div
          className="portal-config-preview"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            flex: '0 0 38%', position: 'sticky', top: 32,
            display: 'flex', justifyContent: 'center', paddingTop: 8,
          }}
        >
          <PhonePreview settings={settings} companyId={companyId} />
        </motion.div>
      </div>

      {/* Photo Wall — album staff + clients + café */}
      <div style={{ padding: '0 32px 32px' }}>
        <PhotoWall moduleId="clients" />
      </div>
    </div>
  )
}

// ─── QR Section ─────────────────────────────────────────────────────────────
function QRSection({
  tableNumber,
  onTableChange,
  onSave,
  saving,
  hasChanges,
  companyId,
}: {
  tableNumber: string
  onTableChange: (v: string) => void
  onSave: () => void
  saving: boolean
  hasChanges: boolean
  companyId: string | null
}) {
  const portalBase = useBrand((s) => s.portalBaseUrl)
  const portalUrl = new URL(portalBase, window.location.origin)
  portalUrl.searchParams.set('table', tableNumber || '1')
  if (companyId) portalUrl.searchParams.set('companyId', companyId)
  const url = portalUrl.toString()
  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <QRCodeCanvas value={url} size={200} label={`table-${tableNumber || '1'}`} />
      <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#475569' }}>
            Numéro de table pour le QR Code
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => onTableChange(e.target.value)}
            disabled={saving}
            placeholder="1"
            style={{
              width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '10px 14px', color: '#1e293b', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !hasChanges || !tableNumber.trim()}
            style={{ marginTop: 8, border: 0, borderRadius: 9, padding: '8px 13px', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 800, cursor: saving ? 'progress' : 'pointer', opacity: saving || !hasChanges || !tableNumber.trim() ? 0.5 : 1 }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer la table'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', wordBreak: 'break-all', padding: 10, background: '#f8fafc', borderRadius: 8 }}>
          <strong>URL :</strong> {url}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
          Le QR code redirige les clients vers le portail de cet établissement avec la table {tableNumber || '1'} pré-sélectionnée.
        </p>
      </div>
    </div>
  )
}
