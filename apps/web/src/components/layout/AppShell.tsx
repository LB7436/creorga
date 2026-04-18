import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useModuleStore, MODULES } from '@/stores/moduleStore'
import { useI18n } from '@/lib/i18n'
import { useThemeColors } from '@/lib/theme'
import NotificationCenter from '@/components/NotificationCenter'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import CommandPalette from '@/components/CommandPalette'

export default function AppShell() {
  const navigate = useNavigate()
  const { user, company } = useAuthStore()
  const logout = useAuthStore((s) => s.logout)
  const activeModule = useModuleStore((s) => s.activeModule)
  const clearModule = useModuleStore((s) => s.clearModule)
  const { t } = useI18n()
  const colors = useThemeColors()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  /* global Cmd+K / Ctrl+K listener */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const currentModule = activeModule ? MODULES.find((m) => m.id === activeModule) : null

  /* close dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleGoModules = () => {
    clearModule()
    navigate('/modules')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.3s ease',
      }}
    >
      {/* ── sticky header ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: colors.bgHeader,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${colors.border}`,
          transition: 'background 0.3s ease, border-color 0.3s ease',
          flexShrink: 0,
        }}
      >
        {/* ── left: logo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(99,102,241,0.3)',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>C</span>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.01em',
            }}
          >
            Creorga
          </span>
        </div>

        {/* ── center: global search bar + breadcrumb ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'center', maxWidth: 600, margin: '0 24px' }}>
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Rechercher dans Creorga"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.bgCard,
              color: colors.textLight,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
              flex: 1,
              maxWidth: 420,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.accent
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
            }}
          >
            <span style={{ fontSize: 14 }}>{'\u{1F50D}'}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>Rechercher dans Creorga... (Cmd+K)</span>
            <kbd
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 5,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.textLight,
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              {'\u2318'}K
            </kbd>
          </button>
          {currentModule && (
            <>
              <button
                onClick={handleGoModules}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textLight,
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.accent
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.textLight
                }}
              >
                {t('modules')}
              </button>
              <span style={{ color: colors.textLight, fontSize: 12 }}>/</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 8,
                  background: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: currentModule.color,
                    display: 'inline-block',
                    boxShadow: `0 0 8px ${currentModule.color}60`,
                  }}
                />
                <span style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>
                  {currentModule.name}
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── right: actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* modules button */}
          <button
            onClick={handleGoModules}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.bgCard,
              color: colors.textMuted,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.background = colors.accentLight
              el.style.borderColor = colors.accent
              el.style.color = colors.accent
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = colors.bgCard
              el.style.borderColor = colors.border
              el.style.color = colors.textMuted
            }}
          >
            <span style={{ fontSize: 14 }}>{'▦'}</span>
            {t('modules')}
          </button>

          {/* language switcher */}
          <LanguageSwitcher />

          {/* theme toggle */}
          <ThemeToggle />

          {/* notification bell */}
          <button
            onClick={() => setNotifOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.bgCard,
              color: colors.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.background = colors.accentLight
              el.style.color = colors.text
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = colors.bgCard
              el.style.color = colors.textMuted
            }}
          >
            {'\u{1F514}'}
            {/* unread count badge */}
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: '#ef4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: `2px solid ${colors.bg}`,
                lineHeight: 1,
              }}
            >
              8
            </span>
          </button>

          {/* user avatar + dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px 4px 4px',
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: colors.bgCard,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.accentLight
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.bgCard
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <span style={{ color: colors.text, fontSize: 13, fontWeight: 500 }}>
                {user?.firstName}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: colors.textLight,
                  transition: 'transform 0.2s',
                  transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                {'▼'}
              </span>
            </button>

            {/* dropdown menu */}
            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 200,
                  borderRadius: 14,
                  background: colors.bgSidebar,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${colors.border}`,
                  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                  padding: 6,
                  zIndex: 100,
                }}
              >
                {/* user info header */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderBottom: `1px solid ${colors.border}`,
                    marginBottom: 4,
                  }}
                >
                  <div style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ color: colors.textLight, fontSize: 11, marginTop: 2 }}>
                    {company?.name ?? 'Creorga'}
                  </div>
                </div>

                {/* menu items */}
                {[
                  { label: t('profile'), icon: '\u{1F464}', action: () => {} },
                  { label: t('settings'), icon: '\u2699\uFE0F', action: () => {} },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setUserMenuOpen(false)
                      item.action()
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      color: colors.textMuted,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.accentLight
                      e.currentTarget.style.color = colors.text
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = colors.textMuted
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}

                {/* separator */}
                <div style={{ height: 1, background: colors.border, margin: '4px 0' }} />

                {/* logout */}
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    handleLogout()
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(248,113,113,0.8)',
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                    e.currentTarget.style.color = '#f87171'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'rgba(248,113,113,0.8)'
                  }}
                >
                  <span style={{ fontSize: 14 }}>{'\u2197'}</span>
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── main content ── */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Outlet />
      </main>

      {/* ── notification center ── */}
      <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* ── command palette ── */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
