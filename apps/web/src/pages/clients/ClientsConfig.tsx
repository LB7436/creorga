import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import LogoUploader from '@/components/LogoUploader'
import QRCodeCanvas from '@/components/QRCodeCanvas'
import PhotoWall from '@/components/PhotoWall'
import { useBrand } from '@/stores/brandStore'
import { usePortalConfig } from '@/hooks/usePortalConfig'

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
}

interface PortalSettings {
  toggles: Record<string, boolean>
  games: Record<string, boolean>
  welcomeMessage: string
  accentColor: string
  tableNumber: string
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'creorga-guest-portal-settings'

const PORTAL_TOGGLES: PortalToggle[] = [
  { id: 'showMenu', label: 'Afficher le menu', description: 'Les clients peuvent consulter votre carte', emoji: '\u{1F4CB}', previewTab: 'menu' },
  { id: 'tableOrder', label: 'Commande en ligne', description: 'Permettre la commande depuis la table', emoji: '\u{1F6D2}', previewTab: 'order' },
  { id: 'enableGames', label: 'Activer les jeux', description: 'Section divertissement pour les clients', emoji: '\u{1F3AE}', previewTab: 'games' },
  { id: 'enableChat', label: 'Activer le chat', description: 'Communication directe avec le personnel', emoji: '\u{1F4AC}', previewTab: 'chat' },
  { id: 'askReviews', label: 'Demander les avis', description: 'Formulaire de notation après la visite', emoji: '⭐', previewTab: 'reviews' },
  { id: 'showAnnouncements', label: 'Afficher les annonces', description: 'Promotions et actualités', emoji: '\u{1F4E2}', previewTab: 'annonces' },
]

const GAMES: GameEntry[] = [
  { id: 'chess', name: 'Échecs', emoji: '♟️' },
  { id: 'solitaire', name: 'Solitaire', emoji: '\u{1F0CF}' },
  { id: 'blackjack', name: 'Blackjack', emoji: '\u{1F0A1}' },
  { id: 'snake', name: 'Snake', emoji: '\u{1F40D}' },
  { id: 'minesweeper', name: 'Démineur', emoji: '\u{1F4A3}' },
  { id: '2048', name: '2048', emoji: '\u{1F522}' },
  { id: 'bingo', name: 'Bingo', emoji: '\u{1F3B1}' },
  { id: 'simon', name: 'Simon', emoji: '\u{1F534}' },
  { id: 'yahtzee', name: 'Yahtzee', emoji: '\u{1F3B2}' },
  { id: 'motus', name: 'Motus', emoji: '\u{1F520}' },
  { id: 'poker', name: 'Poker', emoji: '\u{1F0CF}' },
  { id: 'mastermind', name: 'Mastermind', emoji: '\u{1F9E0}' },
  { id: 'hangman', name: 'Pendu', emoji: '\u{1F464}' },
  { id: 'war', name: 'Bataille', emoji: '⚔️' },
  { id: 'memory', name: 'Memory', emoji: '\u{1F9E9}' },
  { id: 'puzzle', name: 'Puzzle', emoji: '\u{1F9E9}' },
  { id: 'highlow', name: 'Plus ou Moins', emoji: '\u{1F4CA}' },
  { id: 'farkle', name: 'Farkle', emoji: '\u{1F3B2}' },
  { id: 'tictactoe', name: 'Morpion', emoji: '❌' },
  { id: 'wordsearch', name: 'Mots Mêlés', emoji: '\u{1F524}' },
  { id: 'numbermemory', name: 'Mémoire des Nombres', emoji: '\u{1F4AF}' },
  { id: 'reaction', name: 'Réaction', emoji: '⚡' },
  { id: 'pig', name: 'Cochon', emoji: '\u{1F437}' },
  { id: 'connect4', name: 'Puissance 4', emoji: '\u{1F534}' },
  { id: '421', name: '421', emoji: '\u{1F3B2}' },
  { id: 'quiz', name: 'Quiz', emoji: '❓' },
  { id: 'reversi', name: 'Reversi', emoji: '⚫' },
  { id: 'towerdefense', name: 'Tower Defense', emoji: '\u{1F3F0}' },
]

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
  PORTAL_TOGGLES.forEach((t) => { toggles[t.id] = t.id === 'showMenu' })
  const games: Record<string, boolean> = {}
  GAMES.forEach((g) => { games[g.id] = false })
  return { toggles, games, welcomeMessage: '', accentColor: '#6366f1', tableNumber: '1' }
}

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function ToggleSwitch({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#6366f1' : '#94a3b8', minWidth: 28, textAlign: 'right' }}>
        {active ? 'ON' : 'OFF'}
      </span>
      <button
        onClick={onToggle}
        aria-checked={active}
        aria-label={label}
        role="switch"
        style={{
          position: 'relative', width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
          background: active ? '#6366f1' : '#d1d5db', transition: 'background 0.25s ease', flexShrink: 0, padding: 0,
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

function PhonePreview({ settings, restaurantName }: { settings: PortalSettings; restaurantName: string }) {
  const accent = settings.accentColor || '#6366f1'
  const enabledTabs = PORTAL_TOGGLES.filter((t) => settings.toggles[t.id] && t.previewTab)
  const [activeTab, setActiveTab] = useState(enabledTabs[0]?.previewTab || 'menu')

  useEffect(() => {
    if (!enabledTabs.find((t) => t.previewTab === activeTab)) {
      setActiveTab(enabledTabs[0]?.previewTab || '')
    }
  }, [settings.toggles])

  const activeGames = GAMES.filter((g) => settings.games[g.id])

  const renderContent = () => {
    if (!activeTab) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{'\u{1F6AB}'}</div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Aucune fonctionnalité activée</p>
          <p style={{ fontSize: 10, color: '#cbd5e1', margin: '4px 0 0' }}>Activez des options dans le panneau de configuration</p>
        </div>
      )
    }

    switch (activeTab) {
      case 'menu':
        return (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notre Carte</p>
            {['Entrées', 'Plats', 'Desserts', 'Boissons'].map((cat, i) => (
              <div key={cat} style={{
                background: '#f8fafc', borderRadius: 10, padding: '10px 12px',
                border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: `${accent}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                }}>
                  {['\u{1F957}', '\u{1F355}', '\u{1F370}', '\u{1F377}'][i]}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{cat}</p>
                  <p style={{ margin: 0, fontSize: 9, color: '#94a3b8' }}>{[4, 6, 3, 8][i]} articles</p>
                </div>
              </div>
            ))}
          </div>
        )
      case 'order':
        return (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Commander</p>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#1e293b' }}>Margherita</p>
                  <p style={{ margin: 0, fontSize: 9, color: '#94a3b8' }}>Tomate, mozzarella, basilic</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>12,50€</span>
              </div>
            </div>
            <div style={{ background: accent, borderRadius: 10, padding: '8px 0', textAlign: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Voir le panier (2)</span>
            </div>
          </div>
        )
      case 'games':
        return (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Jeux</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {(activeGames.length > 0 ? activeGames.slice(0, 6) : GAMES.slice(0, 6)).map((g) => (
                <div key={g.id} style={{
                  background: '#f8fafc', borderRadius: 8, padding: '8px 4px', textAlign: 'center',
                  border: '1px solid #f1f5f9',
                }}>
                  <div style={{ fontSize: 18 }}>{g.emoji}</div>
                  <p style={{ margin: '2px 0 0', fontSize: 8, color: '#64748b', fontWeight: 500 }}>{g.name}</p>
                </div>
              ))}
            </div>
            {activeGames.length > 6 && (
              <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, textAlign: 'center' }}>+{activeGames.length - 6} autres jeux</p>
            )}
          </div>
        )
      case 'chat':
        return (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Chat</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', borderRadius: '10px 10px 10px 2px', padding: '6px 10px', maxWidth: '80%' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#475569' }}>Bonjour ! Comment puis-je vous aider ?</p>
              </div>
              <div style={{ alignSelf: 'flex-end', background: accent, borderRadius: '10px 10px 2px 10px', padding: '6px 10px', maxWidth: '80%' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#fff' }}>L'addition svp !</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 8, padding: '6px 8px', fontSize: 9, color: '#94a3b8' }}>Votre message...</div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{'\u{1F4E8}'}</div>
            </div>
          </div>
        )
      case 'reviews':
        return (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Votre avis</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '8px 0' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} style={{ fontSize: 22, cursor: 'pointer', filter: s <= 4 ? 'none' : 'grayscale(1) opacity(0.3)' }}>{'⭐'}</span>
              ))}
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', border: '1px solid #f1f5f9', minHeight: 40 }}>
              <p style={{ margin: 0, fontSize: 9, color: '#94a3b8' }}>Racontez-nous votre expérience...</p>
            </div>
            <div style={{ background: accent, borderRadius: 8, padding: '6px 0', textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>Envoyer mon avis</span>
            </div>
          </div>
        )
      case 'annonces':
        return (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Annonces</p>
            <div style={{ background: `${accent}12`, borderRadius: 10, padding: 10, border: `1px solid ${accent}30` }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{'\u{1F389}'} Happy Hour</p>
              <p style={{ margin: '2px 0 0', fontSize: 9, color: '#64748b' }}>-50% sur les cocktails de 17h à 19h !</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 10, border: '1px solid #f1f5f9' }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{'\u{1F3B5}'} Soirée live</p>
              <p style={{ margin: '2px 0 0', fontSize: 9, color: '#64748b' }}>Concert acoustique vendredi 20h</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.6, color: '#64748b', margin: 0 }}>
        Aperçu en direct
      </p>
      {/* Phone frame */}
      <div style={{
        width: 280, height: 560, borderRadius: 36, background: '#111827', padding: 8,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          width: 80, height: 22, background: '#111827', borderRadius: '0 0 14px 14px', zIndex: 10,
        }} />
        {/* Screen */}
        <div style={{
          width: '100%', height: '100%', borderRadius: 28, background: '#ffffff', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Status bar */}
          <div style={{ height: 36, background: accent, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>{restaurantName}</span>
          </div>

          {/* Welcome message */}
          {settings.welcomeMessage && (
            <div style={{ padding: '8px 12px', background: `${accent}08`, borderBottom: '1px solid #f1f5f9' }}>
              <p style={{ margin: 0, fontSize: 9, color: '#64748b', lineHeight: 1.4 }}>{settings.welcomeMessage}</p>
            </div>
          )}

          {/* Table badge */}
          <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{
              background: `${accent}15`, borderRadius: 6, padding: '2px 8px',
              fontSize: 9, fontWeight: 700, color: accent,
            }}>
              Table {settings.tableNumber || '1'}
            </div>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%' }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom nav */}
          {enabledTabs.length > 0 && (
            <div style={{
              display: 'flex', borderTop: '1px solid #e2e8f0', background: '#fff',
              padding: '6px 4px 10px',
            }}>
              {enabledTabs.map((tab) => {
                const isActive = activeTab === tab.previewTab
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.previewTab!)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{tab.emoji}</span>
                    <span style={{
                      fontSize: 7, fontWeight: isActive ? 700 : 500,
                      color: isActive ? accent : '#94a3b8',
                    }}>
                      {tab.label.split(' ').slice(-1)[0]}
                    </span>
                    {isActive && (
                      <motion.div layoutId="phone-tab-indicator" style={{
                        width: 16, height: 2, borderRadius: 1, background: accent, marginTop: 1,
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, textAlign: 'center', maxWidth: 240 }}>
        Les modifications sont reflétées en temps réel
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ClientsConfig() {
  const company = useAuthStore((s) => s.company)
  const [settings, setSettings] = useState<PortalSettings>(createDefaults)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PortalSettings>
        setSettings((prev) => ({
          ...prev, ...parsed,
          toggles: { ...prev.toggles, ...(parsed.toggles ?? {}) },
          games: { ...prev.games, ...(parsed.games ?? {}) },
        }))
      }
    } catch { /* ignore */ }
  }, [])

  const { update: updateRemoteConfig } = usePortalConfig(0) // no polling here, we're the writer

  const persist = useCallback((next: PortalSettings) => {
    setSettings(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* quota */ }
    // Sync to backend so the guest portal (5178) picks it up.
    updateRemoteConfig({
      toggles: next.toggles,
      games: next.games,
      welcomeMessage: next.welcomeMessage,
      accentColor: next.accentColor,
      tableNumber: next.tableNumber,
    }).catch(() => { /* offline ok */ })
  }, [updateRemoteConfig])

  const toggleFeature = (id: string) => persist({ ...settings, toggles: { ...settings.toggles, [id]: !settings.toggles[id] } })
  const toggleGame = (id: string) => persist({ ...settings, games: { ...settings.games, [id]: !settings.games[id] } })
  const setWelcome = (msg: string) => persist({ ...settings, welcomeMessage: msg })
  const setAccent = (c: string) => persist({ ...settings, accentColor: c })
  const setTable = (n: string) => persist({ ...settings, tableNumber: n })

  const selectAllGames = () => {
    const g: Record<string, boolean> = {}
    GAMES.forEach((game) => { g[game.id] = true })
    persist({ ...settings, games: g })
  }
  const deselectAllGames = () => {
    const g: Record<string, boolean> = {}
    GAMES.forEach((game) => { g[game.id] = false })
    persist({ ...settings, games: g })
  }

  const activeGamesCount = Object.values(settings.games).filter(Boolean).length
  const restaurantName = company?.name || 'Mon Restaurant'

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#1e293b', minHeight: '100vh',
    }}>
      {/* Header */}
      <motion.header
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
      <div style={{ display: 'flex', gap: 32, padding: '0 32px 60px', alignItems: 'flex-start' }}>

        {/* LEFT — Config (60%) */}
        <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Toggles */}
          <Section title="Fonctionnalités du portail" delay={0}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {PORTAL_TOGGLES.map((toggle, i) => {
                const isActive = !!settings.toggles[toggle.id]
                return (
                  <motion.div
                    key={toggle.id}
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
                    <ToggleSwitch active={isActive} onToggle={() => toggleFeature(toggle.id)} label={toggle.label} />
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {GAMES.map((game, i) => {
                const checked = !!settings.games[game.id]
                return (
                  <motion.button
                    key={game.id}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.012 * i + 0.15, duration: 0.25 }}
                    onClick={() => toggleGame(game.id)}
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
                      color: checked ? '#312e81' : '#64748b',
                    }}>
                      {game.name}
                    </span>
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
            <QRSection tableNumber={settings.tableNumber} onTableChange={setTable} />
          </Section>
        </div>

        {/* RIGHT — Live Preview (40%) */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            flex: '0 0 38%', position: 'sticky', top: 32,
            display: 'flex', justifyContent: 'center', paddingTop: 8,
          }}
        >
          <PhonePreview settings={settings} restaurantName={restaurantName} />
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
function QRSection({ tableNumber, onTableChange }: { tableNumber: string; onTableChange: (v: string) => void }) {
  const portalBase = useBrand((s) => s.portalBaseUrl)
  const url = `${portalBase}${portalBase.includes('?') ? '&' : '?'}table=${encodeURIComponent(tableNumber || '1')}`
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
            placeholder="1"
            style={{
              width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '10px 14px', color: '#1e293b', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: '#64748b', wordBreak: 'break-all', padding: 10, background: '#f8fafc', borderRadius: 8 }}>
          <strong>URL :</strong> {url}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
          Le QR code redirige les clients vers le portail avec la table {tableNumber || '1'} pré-sélectionnée.
          Modifiez l'URL de base dans Paramètres → Marque.
        </p>
      </div>
    </div>
  )
}
