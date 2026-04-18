import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDemoMode, type DemoPersona, DEMO_USERS } from '@/lib/demoMode'
import { useAuthStore } from '@/stores/authStore'

interface PersonaCard {
  key: DemoPersona
  title: string
  subtitle: string
  emoji: string
  color: string
  accent: string
  capabilities: string[]
  landingPath: string
}

const PERSONAS: PersonaCard[] = [
  {
    key: 'owner',
    title: 'Propriétaire café',
    subtitle: 'Accès complet administrateur',
    emoji: '👩‍💼',
    color: '#0EA5E9',
    accent: '#E0F2FE',
    capabilities: [
      'Tableau de bord & statistiques en temps réel',
      'Gestion équipe, planning et pointages',
      'Comptabilité, TVA et clôture de caisse',
      'CRM, fidélité et campagnes marketing',
      'Tous les modules (POS, Stock, HACCP, etc.)',
    ],
    landingPath: '/',
  },
  {
    key: 'waiter',
    title: 'Serveur',
    subtitle: 'Accès POS uniquement',
    emoji: '🧑‍🍳',
    color: '#10B981',
    accent: '#D1FAE5',
    capabilities: [
      'Plan de salle et gestion des tables',
      'Prise de commande rapide',
      'Envoi cuisine & statuts plats',
      'Encaissement et addition',
      'Interface optimisée tablette',
    ],
    landingPath: '/pos',
  },
  {
    key: 'cook',
    title: 'Cuisinier',
    subtitle: 'Kitchen Display System',
    emoji: '👨‍🍳',
    color: '#F59E0B',
    accent: '#FEF3C7',
    capabilities: [
      'File de commandes en temps réel',
      'Minuteurs par plat et par table',
      'Marquage "prêt" en un clic',
      'Vue cuisine optimisée écran',
      'Alertes sonores nouvelles commandes',
    ],
    landingPath: '/pos/kitchen',
  },
]

export default function DemoLanding() {
  const navigate = useNavigate()
  const enterDemoMode = useDemoMode((s) => s.enterDemoMode)
  const setUser = useAuthStore((s) => (s as any).setUser)
  const [selected, setSelected] = useState<DemoPersona | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEnter = async (persona: DemoPersona) => {
    setLoading(true)
    enterDemoMode(persona)
    const demoUser = DEMO_USERS[persona]
    try {
      if (typeof setUser === 'function') {
        setUser({ ...demoUser, token: 'demo-token' })
      } else {
        useAuthStore.setState({
          user: demoUser as any,
          isAuthenticated: true,
          token: 'demo-token',
        } as any)
      }
    } catch {
      // fallback already stored in localStorage by enterDemoMode
    }
    localStorage.setItem('creorga-onboarded', '1')
    const target = PERSONAS.find((p) => p.key === persona)?.landingPath || '/'
    setTimeout(() => navigate(target), 600)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #E0F2FE 100%)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#0F172A',
        padding: '40px 24px',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 1200, margin: '0 auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              C
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>Creorga</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Créer un vrai compte
          </button>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: '#FEF3C7',
              color: '#92400E',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.5px',
              marginBottom: 20,
              textTransform: 'uppercase',
            }}
          >
            🎬 Mode démo gratuit
          </div>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: '-1.5px',
              margin: '0 0 16px',
              lineHeight: 1.05,
              background: 'linear-gradient(135deg, #0F172A 0%, #0EA5E9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Essayez Creorga sans inscription
          </h1>
          <p style={{ fontSize: 18, color: '#64748B', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
            Découvrez l'OS tout-en-un pour restaurants en 1 clic. Choisissez un profil, explorez
            toutes les fonctionnalités avec de vraies données de démo.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 32,
              justifyContent: 'center',
              marginTop: 24,
              flexWrap: 'wrap',
              fontSize: 13,
              color: '#475569',
            }}
          >
            <span>✅ Aucune carte bancaire</span>
            <span>✅ Session de 1 heure</span>
            <span>✅ Données réinitialisées toutes les 24h</span>
          </div>
        </motion.div>

        {/* Personas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}
        >
          {PERSONAS.map((p, i) => (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(15,23,42,0.12)' }}
              onClick={() => setSelected(p.key)}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 28,
                cursor: 'pointer',
                border: selected === p.key ? `2px solid ${p.color}` : '2px solid transparent',
                boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
                transition: 'border-color 0.2s',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: p.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  marginBottom: 16,
                }}
              >
                {p.emoji}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>{p.subtitle}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                {p.capabilities.map((cap, idx) => (
                  <li
                    key={idx}
                    style={{
                      fontSize: 13,
                      color: '#475569',
                      padding: '6px 0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: p.color, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {cap}
                  </li>
                ))}
              </ul>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEnter(p.key)
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  background: p.color,
                  color: '#fff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading && selected === p.key ? 'Chargement...' : 'Entrer en mode démo →'}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Tour guide teaser */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 28,
                marginBottom: 32,
                border: '1px solid #E2E8F0',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
                🎯 Votre visite guidée inclura :
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                }}
              >
                {[
                  { icon: '📍', title: 'Tour interactif', desc: 'Des pop-ups vous expliquent chaque zone' },
                  { icon: '📊', title: 'Données réalistes', desc: 'Restaurant fictif "Le Bistro" pré-rempli' },
                  { icon: '⚡', title: 'Toutes fonctions', desc: 'Rien n\'est bridé, testez tout' },
                  { icon: '🔄', title: 'Reset 24h', desc: 'Les données reviennent à leur état initial' },
                ].map((f) => (
                  <div key={f.title} style={{ padding: 16, background: '#F8FAFC', borderRadius: 10 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer notice */}
        <div
          style={{
            textAlign: 'center',
            padding: 24,
            color: '#64748B',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: '0 0 8px' }}>
            💡 Les données de démo se réinitialisent automatiquement toutes les 24 heures.
          </p>
          <p style={{ margin: 0 }}>
            Prêt à démarrer pour de vrai ?{' '}
            <a
              href="/login"
              style={{ color: '#0EA5E9', textDecoration: 'none', fontWeight: 600 }}
            >
              Créez votre compte en 2 minutes →
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
