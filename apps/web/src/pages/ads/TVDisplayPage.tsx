import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface Ad {
  id: string
  imageDataUrl?: string
  title: string
  subtitle?: string
  price?: number
  currency?: string
  cta?: string
  durationSec: number
  isLive: boolean
  bgColor?: string
  textColor?: string
}

interface ElementProgramme {
  id: string
  type: 'image' | 'video'
  url: string
  nom: string
  /** 0 sur une vidéo : jouer jusqu'au bout. */
  dureeSec: number
}

interface CreneauVide {
  mode: 'noir' | 'sequence' | 'message'
  message?: string
}

/**
 * Écran TV plein écran.
 *
 * Deux sources, dans cet ordre de priorité :
 *   1. la grille hebdomadaire (`/api/affichage/maintenant`) — vidéos et images
 *      téléversées, jouées en boucle avec la durée choisie par créneau ;
 *   2. à défaut, les publicités « en direct » de la régie historique, pour ne
 *      rien casser de ce qui existait avant la programmation.
 *
 * Si les deux sont vides, on applique le réglage des créneaux vides : écran
 * noir ou message. Échap pour quitter.
 */
export default function TVDisplayPage() {
  const companyId = new URLSearchParams(window.location.search).get('companyId') || ''
  const [elements, setElements] = useState<ElementProgramme[]>([])
  const [nomSequence, setNomSequence] = useState<string | null>(null)
  const [creneauVide, setCreneauVide] = useState<CreneauVide>({ mode: 'noir' })
  const [ads, setAds] = useState<Ad[]>([])
  const [idx, setIdx] = useState(0)
  const [now, setNow] = useState(Date.now())
  const videoRef = useRef<HTMLVideoElement>(null)

  // ─── Interrogation du serveur ─────────────────────────────────────────

  useEffect(() => {
    if (!companyId) return
    const relever = async () => {
      try {
        const r = await fetch(`${BACKEND}/api/affichage/maintenant?companyId=${encodeURIComponent(companyId)}`)
        if (r.ok) {
          const p = await r.json()
          setElements(p.elements || [])
          setNomSequence(p.sequence?.nom || null)
          setCreneauVide(p.creneauVide || { mode: 'noir' })
        }
      } catch { /* hors ligne : on garde la dernière programmation connue */ }

      try {
        const r = await fetch(`${BACKEND}/api/ads/live?companyId=${encodeURIComponent(companyId)}`)
        if (r.ok) {
          const data = await r.json()
          setAds(data.ads || [])
        }
      } catch { /* hors ligne */ }
    }
    relever()
    const id = setInterval(relever, 10_000)
    return () => clearInterval(id)
  }, [companyId])

  // La programmation prime ; la régie historique sert de repli.
  const suiteProgrammee = elements.length > 0
  const total = suiteProgrammee ? elements.length : ads.length

  // Repartir du début quand la source change, sinon l'index déborde.
  useEffect(() => { setIdx(0) }, [suiteProgrammee, total])

  const elementCourant = suiteProgrammee ? elements[idx % elements.length] : null
  const pubCourante = !suiteProgrammee && ads.length > 0 ? ads[idx % ads.length] : null

  const avancer = () => setIdx((i) => (total > 0 ? (i + 1) % total : 0))

  // ─── Enchaînement ─────────────────────────────────────────────────────
  //
  // Une vidéo dont la durée vaut 0 s'arrête d'elle-même : on attend
  // l'événement `ended` plutôt qu'un minuteur, sinon on la couperait au
  // milieu ou on laisserait un écran figé.
  useEffect(() => {
    if (total === 0) return
    const attenteVideoEntiere = elementCourant?.type === 'video' && elementCourant.dureeSec === 0
    if (attenteVideoEntiere) return

    const secondes = elementCourant
      ? elementCourant.dureeSec || 8
      : pubCourante?.durationSec || 8

    const t = setTimeout(avancer, secondes * 1000)
    return () => clearTimeout(t)
  }, [idx, total, elementCourant, pubCourante])

  // Relancer la lecture à chaque changement d'élément.
  useEffect(() => {
    if (elementCourant?.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {
        /* La vidéo est muette : la politique d'autoplay ne devrait pas bloquer. */
      })
    }
  }, [elementCourant?.id, idx])

  // Horloge du bandeau
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Échap pour sortir
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') window.history.back() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const rienAAfficher = total === 0

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: '#000', color: '#fff', cursor: 'none',
    }}>
      {/* ─── Créneau vide ─────────────────────────────────────────────── */}
      {rienAAfficher && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: creneauVide.mode === 'noir'
            ? '#000'
            : 'linear-gradient(135deg, #0f172a, #1e293b)',
          padding: 60, textAlign: 'center',
        }}>
          {!companyId ? (
            <div role="alert" style={{ maxWidth: 720 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 56px)', margin: 0 }}>Écran TV non configuré</h1>
              <p style={{ fontSize: 'clamp(15px, 1.8vw, 24px)', color: '#94a3b8', lineHeight: 1.6 }}>
                Ouvrez cet écran depuis la régie ou la programmation du restaurant afin d’utiliser son lien sécurisé.
              </p>
            </div>
          ) : creneauVide.mode === 'message' && creneauVide.message ? (
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 96px)', fontWeight: 900, margin: 0, lineHeight: 1.15 }}>
              {creneauVide.message}
            </h1>
          ) : creneauVide.mode === 'noir' ? (
            <div aria-live="polite" style={{ opacity: 0.72 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>◉</div>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 56px)', margin: 0 }}>Creorga TV</h1>
              <p style={{ fontSize: 'clamp(14px, 1.6vw, 22px)', color: '#94a3b8', marginTop: 12 }}>
                Écran en veille · aucune diffusion programmée
              </p>
              <p style={{ fontSize: 18, color: '#64748b' }}>
                {new Date(now).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 80 }}>📺</div>
              <h1 style={{ fontSize: 36, fontWeight: 800, margin: '20px 0 8px' }}>Creorga TV</h1>
              <p style={{ fontSize: 16, color: '#94a3b8', maxWidth: 520 }}>
                Aucune séquence programmée sur ce créneau, et aucune publicité en direct.<br />
                Programmez la semaine depuis « Affichage TV &amp; Ambiance → Programmation ».
              </p>
            </>
          )}
        </div>
      )}

      {/* ─── Élément programmé (vidéo ou image) ───────────────────────── */}
      <AnimatePresence mode="wait">
        {elementCourant && (
          <motion.div
            key={`${elementCourant.id}-${idx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'absolute', inset: 0, background: '#000' }}
          >
            {elementCourant.type === 'video' ? (
              <video
                ref={videoRef}
                src={`${BACKEND}${elementCourant.url}`}
                autoPlay
                muted
                playsInline
                onEnded={() => { if (elementCourant.dureeSec === 0) avancer() }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />
            ) : (
              <img
                src={`${BACKEND}${elementCourant.url}`}
                alt={elementCourant.nom}
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Publicité de la régie historique (repli) ─────────────────── */}
      <AnimatePresence mode="wait">
        {pubCourante && (
          <motion.div
            key={pubCourante.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'absolute', inset: 0,
              background: pubCourante.imageDataUrl
                ? `url(${pubCourante.imageDataUrl}) center/cover`
                : pubCourante.bgColor || '#1e293b',
              color: pubCourante.textColor || '#fff',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 60, textAlign: 'center',
            }}
          >
            {pubCourante.imageDataUrl && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7) 100%)',
              }} />
            )}

            <motion.h1
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{
                fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: 900,
                margin: 0, letterSpacing: -2, lineHeight: 1.1,
                textShadow: pubCourante.imageDataUrl ? '0 4px 24px rgba(0,0,0,0.5)' : 'none',
                position: 'relative', zIndex: 5,
              }}
            >
              {pubCourante.title}
            </motion.h1>

            {pubCourante.subtitle && (
              <motion.p
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                style={{
                  fontSize: 'clamp(20px, 2.5vw, 36px)', fontWeight: 500,
                  margin: '16px 0 0', maxWidth: 1200, opacity: 0.9,
                  textShadow: pubCourante.imageDataUrl ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
                  position: 'relative', zIndex: 5,
                }}
              >
                {pubCourante.subtitle}
              </motion.p>
            )}

            {pubCourante.price !== undefined && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5, type: 'spring' }}
                style={{
                  marginTop: 40, padding: '16px 36px',
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  borderRadius: 999, fontSize: 'clamp(28px, 4vw, 60px)',
                  fontWeight: 900, color: '#fff',
                  boxShadow: '0 12px 32px rgba(245,158,11,0.4)',
                  position: 'relative', zIndex: 5,
                }}
              >
                {pubCourante.price.toFixed(2)} {pubCourante.currency || '€'}
              </motion.div>
            )}

            {pubCourante.cta && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                style={{
                  marginTop: 28, padding: '14px 32px',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderRadius: 999, fontSize: 'clamp(16px, 2vw, 24px)',
                  fontWeight: 700, position: 'relative', zIndex: 5,
                }}
              >
                {pubCourante.cta}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bandeau haut-droite */}
      {!rienAAfficher && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 100,
          display: 'flex', gap: 12, alignItems: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          padding: '8px 14px', borderRadius: 999,
          fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)',
        }}>
          <span>🔴 LIVE</span>
          <span>·</span>
          <span>{new Date(now).toLocaleTimeString('fr-FR')}</span>
          {nomSequence && suiteProgrammee && (
            <>
              <span>·</span>
              <span>{nomSequence}</span>
            </>
          )}
          <span>·</span>
          <span>{(idx % total) + 1} / {total}</span>
        </div>
      )}

      {/* Barre de progression — masquée quand la vidéo décide elle-même de sa durée */}
      {!rienAAfficher && !(elementCourant?.type === 'video' && elementCourant.dureeSec === 0) && (
        <motion.div
          key={`bar-${elementCourant?.id || pubCourante?.id}-${idx}`}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{
            duration: elementCourant ? (elementCourant.dureeSec || 8) : (pubCourante?.durationSec || 8),
            ease: 'linear',
          }}
          style={{
            position: 'fixed', bottom: 0, left: 0,
            height: 4, background: 'linear-gradient(90deg, #6366f1, #ec4899)',
            zIndex: 100,
          }}
        />
      )}

      <div style={{
        position: 'fixed', bottom: 20, left: 24, zIndex: 100,
        fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace',
      }}>
        ESC pour quitter
      </div>
    </div>
  )
}
