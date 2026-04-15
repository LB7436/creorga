import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PortalToggle {
  id: string
  label: string
  description: string
  emoji: string
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
  { id: 'showMenu', label: 'Afficher le menu', description: 'Les clients peuvent parcourir la carte depuis leur appareil', emoji: '\�\�\️' },
  { id: 'tableOrder', label: 'Permettre la commande depuis la table', description: 'Les clients passent commande directement depuis leur t\él\éphone', emoji: '\�\�' },
  { id: 'enableGames', label: 'Activer les jeux', description: 'Affiche la section jeux dans le portail client', emoji: '\�\�' },
  { id: 'enableChat', label: 'Activer le chat', description: 'Permet aux clients de communiquer avec le personnel', emoji: '\�\�' },
  { id: 'askReviews', label: 'Demander les avis', description: 'Affiche un formulaire de retour / notation apr\ès la visite', emoji: '\⭐' },
  { id: 'showAnnouncements', label: 'Afficher les annonces', description: 'Affiche les promotions et annonces en cours', emoji: '\�\�' },
]

const GAMES: GameEntry[] = [
  { id: 'chess', name: '\Échecs', emoji: '\♟\️' },
  { id: 'solitaire', name: 'Solitaire', emoji: '\�\�' },
  { id: 'blackjack', name: 'Blackjack', emoji: '\�\�' },
  { id: 'snake', name: 'Snake', emoji: '\�\�' },
  { id: 'minesweeper', name: 'D\émineur', emoji: '\�\�' },
  { id: '2048', name: '2048', emoji: '\�\�' },
  { id: 'bingo', name: 'Bingo', emoji: '\�\�' },
  { id: 'simon', name: 'Simon', emoji: '\�\�' },
  { id: 'yahtzee', name: 'Yahtzee', emoji: '\�\�' },
  { id: 'motus', name: 'Motus', emoji: '\�\�\️' },
  { id: 'poker', name: 'Poker', emoji: '\�\�' },
  { id: 'mastermind', name: 'Mastermind', emoji: '\�\�' },
  { id: 'hangman', name: 'Pendu', emoji: '\�\�' },
  { id: 'war', name: 'Bataille', emoji: '\⚔\️' },
  { id: 'memory', name: 'Memory', emoji: '\�\�' },
  { id: 'puzzle', name: 'Puzzle', emoji: '\�\�' },
  { id: 'highlow', name: 'Plus ou Moins', emoji: '\�\�' },
  { id: 'farkle', name: 'Farkle', emoji: '\�\�' },
  { id: 'tictactoe', name: 'Morpion', emoji: '\❌' },
  { id: 'wordsearch', name: 'Mots M\êl\és', emoji: '\�\�' },
  { id: 'numbermemory', name: 'M\émoire des Nombres', emoji: '\�\�' },
  { id: 'reaction', name: 'R\éaction', emoji: '\⚡' },
  { id: 'pig', name: 'Cochon', emoji: '\�\�' },
  { id: 'connect4', name: 'Puissance 4', emoji: '\�\�' },
  { id: '421', name: '421', emoji: '\�\�' },
  { id: 'quiz', name: 'Quiz', emoji: '\❓' },
  { id: 'reversi', name: 'Reversi', emoji: '\⚫' },
  { id: 'towerdefense', name: 'Tower Defense', emoji: '\�\�' },
]

const ACCENT_COLORS = [
  { id: 'indigo', label: 'Indigo', value: '#6366f1' },
  { id: 'purple', label: 'Violet', value: '#a855f7' },
  { id: 'emerald', label: '\Émeraude', value: '#10b981' },
  { id: 'rose', label: 'Rose', value: '#f43f5e' },
  { id: 'amber', label: 'Ambre', value: '#f59e0b' },
  { id: 'cyan', label: 'Cyan', value: '#06b6d4' },
]

// ---------------------------------------------------------------------------
// Default settings factory
// ---------------------------------------------------------------------------

function createDefaults(): PortalSettings {
  const toggles: Record<string, boolean> = {}
  PORTAL_TOGGLES.forEach((t) => { toggles[t.id] = t.id === 'showMenu' })

  const games: Record<string, boolean> = {}
  GAMES.forEach((g) => { games[g.id] = false })

  return {
    toggles,
    games,
    welcomeMessage: '',
    accentColor: '#6366f1',
    tableNumber: '1',
  }
}

// ---------------------------------------------------------------------------
// Reusable Toggle Switch
// ---------------------------------------------------------------------------

function ToggleSwitch({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'relative',
        width: 48,
        height: 28,
        borderRadius: 14,
        border: 'none',
        cursor: 'pointer',
        background: active ? '#6366f1' : 'rgba(255,255,255,0.12)',
        transition: 'background 0.25s ease',
        flexShrink: 0,
        padding: 0,
      }}
      aria-checked={active}
      role="switch"
    >
      <motion.div
        animate={{ x: active ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: 2,
          width: 24,
          height: 24,
          borderRadius: 12,
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, index, children }: { title: string; index: number; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 28,
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <h2
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.6,
          color: 'rgba(255,255,255,0.35)',
          marginBottom: 22,
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </motion.section>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ClientsConfig() {
  const company = useAuthStore((s) => s.company)
  const [settings, setSettings] = useState<PortalSettings>(createDefaults)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PortalSettings>
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          toggles: { ...prev.toggles, ...(parsed.toggles ?? {}) },
          games: { ...prev.games, ...(parsed.games ?? {}) },
        }))
      }
    } catch { /* ignore corrupt data */ }
  }, [])

  // Persist to localStorage on every change
  const persist = useCallback((next: PortalSettings) => {
    setSettings(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* quota */ }
  }, [])

  const togglePortalFeature = (id: string) => {
    persist({ ...settings, toggles: { ...settings.toggles, [id]: !settings.toggles[id] } })
  }

  const toggleGame = (id: string) => {
    persist({ ...settings, games: { ...settings.games, [id]: !settings.games[id] } })
  }

  const setWelcomeMessage = (msg: string) => persist({ ...settings, welcomeMessage: msg })
  const setAccentColor = (c: string) => persist({ ...settings, accentColor: c })
  const setTableNumber = (n: string) => persist({ ...settings, tableNumber: n })

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

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #0a0a0f 0%, #111118 50%, #0d0d14 100%)',
        color: '#fff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: 80,
      }}
    >
      {/* ---- Header ---- */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ padding: '48px 40px 0', maxWidth: 960, margin: '0 auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            {'\�\�'}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
              Portail Client
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Configurez l'exp\érience de vos clients &mdash; {company?.name ?? 'Mon Restaurant'}
            </p>
          </div>
        </div>
      </motion.header>

      {/* ---- Content ---- */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 40px 0', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* === SECTION 1 : Fonctionnalites === */}
        <Section title="Fonctionnalit\és du portail" index={0}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {PORTAL_TOGGLES.map((toggle, i) => {
              const isActive = !!settings.toggles[toggle.id]
              return (
                <motion.div
                  key={toggle.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i + 0.15, duration: 0.35 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 4px',
                    borderBottom: i < PORTAL_TOGGLES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 22, width: 36, textAlign: 'center', flexShrink: 0 }}>{toggle.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'color 0.2s' }}>
                      {toggle.label}
                    </p>
                    <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                      {toggle.description}
                    </p>
                  </div>
                  <ToggleSwitch active={isActive} onToggle={() => togglePortalFeature(toggle.id)} />
                </motion.div>
              )
            })}
          </div>
        </Section>

        {/* === SECTION 2 : Jeux disponibles === */}
        <Section title="Jeux disponibles" index={1}>
          {/* toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {activeGamesCount} / {GAMES.length} jeux activ\és
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={selectAllGames}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '5px 12px',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
              >
                Tout activer
              </button>
              <button
                onClick={deselectAllGames}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '5px 12px',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
              >
                Tout d\ésactiver
              </button>
            </div>
          </div>

          {/* grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
            }}
          >
            {GAMES.map((game, i) => {
              const checked = !!settings.games[game.id]
              return (
                <motion.button
                  key={game.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.015 * i + 0.2, duration: 0.3 }}
                  onClick={() => toggleGame(game.id)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '14px 6px 12px',
                    borderRadius: 14,
                    border: checked ? '1.5px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
                    background: checked ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: '#fff',
                  }}
                  onMouseEnter={(e) => {
                    if (!checked) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'
                  }}
                  onMouseLeave={(e) => {
                    if (!checked) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)'
                  }}
                >
                  {/* checkbox indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 7,
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      border: checked ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                      background: checked ? '#6366f1' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4.2 7.5L8 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  <span style={{ fontSize: 24 }}>{game.emoji}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: checked ? '#fff' : 'rgba(255,255,255,0.45)',
                      textAlign: 'center',
                      lineHeight: 1.3,
                      transition: 'color 0.2s',
                    }}
                  >
                    {game.name}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </Section>

        {/* === SECTION 3 : Personnalisation === */}
        <Section title="Personnalisation" index={2}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Welcome message */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>
                Message de bienvenue
              </label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Ex: Bienvenue chez nous ! Scannez le QR code pour d\écouvrir notre carte..."
                rows={3}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.6,
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Accent color */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'rgba(255,255,255,0.7)' }}>
                Couleur d'accent
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAccentColor(c.value)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: c.value,
                        border: settings.accentColor === c.value ? '3px solid #fff' : '3px solid transparent',
                        boxShadow: settings.accentColor === c.value ? `0 0 16px ${c.value}60` : 'none',
                        transition: 'all 0.25s ease',
                      }}
                    />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Logo upload */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>
                Logo du restaurant
              </label>
              <div
                style={{
                  border: '2px dashed rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '28px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{'\�\�\️'}</div>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                  Glissez votre logo ici ou cliquez pour parcourir
                </p>
                <p style={{ margin: 0, marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                  PNG, JPG ou SVG &mdash; max 2 Mo
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* === SECTION 4 : QR Code === */}
        <Section title="QR Code" index={3}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* QR placeholder */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.08))',
                  border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {/* QR icon grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: [0,1,2,4,5,6,8,10,12,14,18,20,22,23,24].includes(i)
                          ? 'rgba(99,102,241,0.6)'
                          : 'rgba(99,102,241,0.15)',
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                  Aper\çu QR
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                Scannez pour acc\éder au portail
              </p>
            </div>

            {/* Controls */}
            <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Table number */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'rgba(255,255,255,0.5)' }}>
                  Num\éro de table pour le QR Code
                </label>
                <input
                  type="text"
                  value={settings.tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="1"
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                >
                  {'\�\�'} G\én\érer un nouveau QR Code
                </button>

                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: '#ffffff',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
                >
                  {'\⬇\️'} T\él\écharger le QR Code
                </button>
              </div>

              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                Le QR code g\én\ér\é redirigera les clients vers le portail avec la table {settings.tableNumber || '1'} pr\é-s\électionn\ée.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
