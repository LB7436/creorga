import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

/**
 * Universal "back to start" floating button.
 * - Navigates to the Modules home (/)
 * - Also scrolls to top of the current page
 * - Appears on every page, hidden at the root itself
 */
export default function BackToStart() {
  const navigate = useNavigate()
  const location = useLocation()
  const [visible, setVisible] = useState(false)

  // Hide on root/login paths
  const isRoot = location.pathname === '/' ||
                 location.pathname === '/login' ||
                 location.pathname === '/modules'

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 120 || !isRoot)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [isRoot, location.pathname])

  if (isRoot) return null
  if (!visible) return null

  const goHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    navigate('/')
  }

  return (
    <button
      onClick={goHome}
      title="Retour au début"
      style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 300,
        width: 52, height: 52, borderRadius: 999,
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
        border: 'none', cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, transition: 'transform .2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      🏠
    </button>
  )
}
