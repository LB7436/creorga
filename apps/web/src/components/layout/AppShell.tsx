import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useModuleStore, MODULES } from '@/stores/moduleStore'
import { useI18n } from '@/lib/i18n'
import NotificationCenter from '@/components/NotificationCenter'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function AppShell() {
  const navigate = useNavigate()
  const { user, company } = useAuthStore()
  const logout = useAuthStore((s) => s.logout)
  const activeModule = useModuleStore((s) => s.activeModule)
  const clearModule = useModuleStore((s) => s.clearModule)
  const { t } = useI18n()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
        background: '#0a0a1a',
        display: 'flex',
        flexDirection: 'column',
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
          background: 'rgba(10,10,20,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
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

        {/* ── center: breadcrumb ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {currentModule && (
            <>
              <button
                onClick={handleGoModules}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(148,163,184,0.5)',
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#a5b4fc'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(148,163,184,0.5)'
                }}
              >
                {t('modules')}
              </button>
              <span style={{ color: 'rgba(148,163,184,0.3)', fontSize: 12 }}>/</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
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
                <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
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
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(148,163,184,0.7)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(99,102,241,0.1)'
              el.style.borderColor = 'rgba(99,102,241,0.3)'
              el.style.color = '#a5b4fc'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(255,255,255,0.04)'
              el.style.borderColor = 'rgba(255,255,255,0.08)'
              el.style.color = 'rgba(148,163,184,0.7)'
            }}
          >
            <span style={{ fontSize: 14 }}>{'▦'}</span>
            {t('modules')}
          </button>

          {/* language switcher */}
          <LanguageSwitcher />

          {/* notification bell */}
          <button
            onClick={() => setNotifOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(148,163,184,0.6)',
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
              el.style.background = 'rgba(255,255,255,0.08)'
              el.style.color = '#e2e8f0'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(255,255,255,0.04)'
              el.style.color = 'rgba(148,163,184,0.6)'
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
                border: '2px solid rgba(10,10,20,0.9)',
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
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
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
              <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 500 }}>
                {user?.firstName}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: 'rgba(148,163,184,0.5)',
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
                  background: 'rgba(20,20,40,0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  padding: 6,
                  zIndex: 100,
                }}
              >
                {/* user info header */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ color: 'rgba(148,163,184,0.5)', fontSize: 11, marginTop: 2 }}>
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
                      color: 'rgba(203,213,225,0.8)',
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.color = '#e2e8f0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'rgba(203,213,225,0.8)'
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}

                {/* separator */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

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
    </div>
  )
}
