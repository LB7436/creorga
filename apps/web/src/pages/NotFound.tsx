import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, LayoutGrid, Bug, Search, ArrowRight } from 'lucide-react'

interface ActionCard {
  icon: typeof Home
  title: string
  desc: string
  onClick: () => void
  accent: string
}

export default function NotFound() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const cards: ActionCard[] = [
    {
      icon: Home,
      title: 'Retour au Dashboard',
      desc: 'Revenir à votre tableau de bord principal',
      onClick: () => navigate('/'),
      accent: '#6366f1',
    },
    {
      icon: LayoutGrid,
      title: 'Voir les modules',
      desc: 'Parcourir tous les modules disponibles',
      onClick: () => navigate('/modules'),
      accent: '#8b5cf6',
    },
    {
      icon: Bug,
      title: 'Signaler un problème',
      desc: 'Nous aider à identifier ce lien cassé',
      onClick: () => navigate('/support'),
      accent: '#ec4899',
    },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/modules?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background:
          'linear-gradient(180deg, #ffffff 0%, #f8fafc 60%, #eef2ff 100%)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#1e293b',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft decorative orbs */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
          top: '-10%',
          left: '-10%',
          pointerEvents: 'none',
        }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
          bottom: '-10%',
          right: '-5%',
          pointerEvents: 'none',
        }}
        animate={{ x: [0, -25, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 960,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Animated illustration: plate with ? */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 14 }}
          style={{ marginBottom: 8 }}
        >
          <motion.svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            animate={{ rotate: [0, -4, 4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <defs>
              <linearGradient id="plateGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e0e7ff" />
                <stop offset="100%" stopColor="#c7d2fe" />
              </linearGradient>
              <linearGradient id="qGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            {/* Plate outer */}
            <circle cx="70" cy="70" r="60" fill="url(#plateGrad)" />
            {/* Plate inner ring */}
            <circle
              cx="70"
              cy="70"
              r="48"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            {/* Question mark */}
            <text
              x="70"
              y="92"
              textAnchor="middle"
              fontSize="72"
              fontWeight="800"
              fill="url(#qGrad)"
              fontFamily="Inter, sans-serif"
            >
              ?
            </text>
          </motion.svg>
        </motion.div>

        {/* Huge 404 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 120, damping: 14 }}
          style={{
            fontSize: 'clamp(6rem, 18vw, 10rem)',
            fontWeight: 900,
            letterSpacing: '-0.06em',
            lineHeight: 0.9,
            margin: 0,
            backgroundImage:
              'linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          404
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
            fontWeight: 700,
            margin: '4px 0 6px',
            color: '#1e293b',
            letterSpacing: '-0.02em',
          }}
        >
          Page introuvable
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          style={{
            color: '#64748b',
            fontSize: 16,
            fontWeight: 500,
            margin: 0,
            maxWidth: 520,
          }}
        >
          Cette page semble s'être perdue en cuisine 🍳
        </motion.p>

        {/* Search bar */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          onSubmit={handleSearch}
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            maxWidth: 460,
            padding: '10px 14px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            boxShadow: '0 4px 20px rgba(15,23,42,0.04)',
          }}
        >
          <Search size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un module..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14.5,
              color: '#1e293b',
              fontFamily: 'inherit',
              background: 'transparent',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Chercher
            <ArrowRight size={14} />
          </button>
        </motion.form>

        {/* Action cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.55 }}
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            width: '100%',
            maxWidth: 820,
          }}
        >
          {cards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.button
                key={card.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.08, duration: 0.4 }}
                whileHover={{ y: -4 }}
                onClick={card.onClick}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '20px 18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 4px 20px rgba(15,23,42,0.04)',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = card.accent
                  e.currentTarget.style.boxShadow = `0 12px 28px ${card.accent}25`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,0.04)'
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `${card.accent}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} style={{ color: card.accent }} />
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#1e293b',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    lineHeight: 1.5,
                  }}
                >
                  {card.desc}
                </div>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          style={{
            marginTop: 40,
            fontSize: 12,
            color: '#94a3b8',
            fontWeight: 500,
            letterSpacing: '0.04em',
          }}
        >
          Erreur 404 — Creorga OS v2.0
        </motion.div>
      </div>
    </div>
  )
}
