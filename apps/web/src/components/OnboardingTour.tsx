import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Check } from 'lucide-react'

/**
 * v4.6 — OnboardingTour : 5 étapes pour découvrir Creorga en 30 sec.
 *
 * Démarre auto à la 1ère connexion (localStorage `creorga.onboardingDone` absent)
 * OU sur la route /tour (réaccessible à tout moment).
 *
 * Étapes :
 *   1. ModuleSelector — les 18 cards organisées
 *   2. Cmd+K — recherche globale
 *   3. Robi launcher — l'assistant en bas-droite
 *   4. ViewModeToggle — Service / Admin / Tout
 *   5. Retour /modules — comment revenir
 *
 * Boutons : Suivant → étape+1, Skip tour → marque done, Voir plus tard → ferme sans marquer.
 */

const STORAGE_KEY = 'creorga.onboardingDone'

interface Step {
  emoji: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    emoji: '🧭',
    title: 'Bienvenue sur Creorga',
    body: '18 modules organisés en 4 catégories. Cliquez sur une carte pour ouvrir un module — vos plus utilisés remontent en tête automatiquement.',
  },
  {
    emoji: '🔍',
    title: 'Recherche globale Cmd+K',
    body: 'Tapez Cmd+K (ou Ctrl+K) n\'importe où dans Creorga : clients, factures, shifts, tables ouvertes. Saisie naturelle.',
  },
  {
    emoji: '🤖',
    title: 'Robi, votre copilote',
    body: 'Bouton en bas-droite. Parlez-lui : "qui travaille demain", "ferme table 3", "rapport HACCP". Voix, image, PDF — tout est géré.',
  },
  {
    emoji: '🎛️',
    title: 'Mode Service / Admin',
    body: 'En topbar, basculez entre vues Service (4 modules opérationnels), Admin (6 modules config) ou Tout (les 18).',
  },
  {
    emoji: '↩️',
    title: 'Retour rapide',
    body: 'À tout moment : clic logo Creorga en haut-gauche ou tapez /modules dans l\'URL. Vous pouvez relancer ce tour via /tour.',
  },
]

export default function OnboardingTour() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)

  // Décide d'ouvrir : 1ère visite OU route /tour
  useEffect(() => {
    const onTourRoute = location.pathname === '/tour'
    let done = false
    try { done = !!localStorage.getItem(STORAGE_KEY) } catch { /* */ }

    // Jamais pendant le wizard de configuration initiale (/setup) ni tant
    // qu'il n'est pas terminé — sinon les deux modales se superposent.
    const setupDone = !!localStorage.getItem('creorga-onboarded')
    const onSetup = location.pathname.startsWith('/setup')

    if (onTourRoute) {
      setOpen(true)
      setStepIdx(0)
    } else if (!done && setupDone && !onSetup) {
      // Délai pour ne pas spammer sur load initial
      const t = window.setTimeout(() => setOpen(true), 1200)
      return () => window.clearTimeout(t)
    }
  }, [location.pathname])

  const markDone = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch { /* */ }
    setOpen(false)
    if (location.pathname === '/tour') navigate('/modules', { replace: true })
  }

  const dismissTemp = () => {
    // "Voir plus tard" : ferme sans marquer done
    setOpen(false)
    if (location.pathname === '/tour') navigate('/modules', { replace: true })
  }

  const next = () => {
    if (stepIdx >= STEPS.length - 1) {
      markDone()
    } else {
      setStepIdx((i) => i + 1)
    }
  }

  if (!open) return null

  const step = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(2,6,23,0.78)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(160deg,#0f172a 0%,#1e1b4b 100%)',
            border: '1px solid rgba(139,92,246,0.35)',
            borderRadius: 22, padding: 28,
            maxWidth: 520, width: '100%',
            color: '#f8fafc',
            boxShadow: '0 30px 80px rgba(139,92,246,0.3)',
            position: 'relative',
          }}>
          {/* Bouton X dismiss temp */}
          <button onClick={dismissTemp} title="Voir plus tard"
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 32, height: 32, borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.2)',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <X size={16} />
          </button>

          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 14 }}>{step.emoji}</div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 4, flex: 1, borderRadius: 4,
                background: i <= stepIdx ? '#a78bfa' : 'rgba(148,163,184,0.2)',
                transition: 'background 0.25s ease',
              }} />
            ))}
          </div>

          <h2 style={{
            margin: '0 0 10px', fontSize: 24, fontWeight: 900,
            background: 'linear-gradient(135deg,#a78bfa,#ec4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>{step.title}</h2>

          <p style={{ margin: '0 0 22px', color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
            {step.body}
          </p>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={markDone}
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: 'transparent', border: '1px solid rgba(148,163,184,0.25)',
                color: '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
              Skip tour
            </button>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
              {stepIdx + 1} / {STEPS.length}
            </div>
            <button onClick={next}
              style={{
                padding: '10px 18px', borderRadius: 12,
                background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                border: 'none', color: '#fff', fontWeight: 800, fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              {isLast ? (<><Check size={14} /> Terminer</>) : (<>Suivant <ArrowRight size={14} /></>)}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
