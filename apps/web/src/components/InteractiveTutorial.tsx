import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import type { DemoStep } from '@/lib/help-content'

/**
 * InteractiveTutorial — Driver.js-like overlay.
 *
 * Highlights a real DOM element on the live page with a pulsing ring,
 * displays a tooltip card explaining what to do.
 *
 * Falls back gracefully if the selector can't be found (skip with toast).
 *
 *   <InteractiveTutorial steps={article.demo} onClose={...} />
 *
 * Steps without a selector still render — they show in the centre as a
 * narrative block (intro/outro slides).
 */

interface Props {
  steps: DemoStep[]
  onClose: () => void
}

export default function InteractiveTutorial({ steps, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [target, setTarget] = useState<DOMRect | null>(null)
  const [missing, setMissing] = useState(false)
  const observerRef = useRef<MutationObserver | null>(null)

  const step = steps[index]
  const isFirst = index === 0
  const isLast = index === steps.length - 1

  useEffect(() => {
    setMissing(false)
    setTarget(null)
    if (!step?.selector) return // narrative slide
    const find = () => {
      const el = document.querySelector<HTMLElement>(step.selector!)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTarget(rect)
        // Scroll into view if needed
        if (rect.top < 60 || rect.bottom > window.innerHeight - 60) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        return true
      }
      return false
    }
    if (find()) return
    // Retry up to 1.5s — element may render after a click
    let attempts = 0
    const interval = setInterval(() => {
      attempts++
      if (find() || attempts > 30) {
        clearInterval(interval)
        if (attempts > 30) setMissing(true)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [index, step])

  // Recompute on resize/scroll
  useEffect(() => {
    if (!step?.selector) return
    const update = () => {
      const el = document.querySelector<HTMLElement>(step.selector!)
      if (el) setTarget(el.getBoundingClientRect())
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step])

  const next = () => isLast ? onClose() : setIndex((i) => i + 1)
  const prev = () => !isFirst && setIndex((i) => i - 1)

  // Compute tooltip position relative to highlighted target
  const tooltipPos = (() => {
    if (!target) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    const pos = step?.position || 'bottom'
    const margin = 14
    const tooltipW = 320
    const tooltipH = 140
    let top = 0, left = 0
    switch (pos) {
      case 'top':    top = target.top - tooltipH - margin; left = target.left + target.width / 2 - tooltipW / 2; break
      case 'bottom': top = target.bottom + margin;          left = target.left + target.width / 2 - tooltipW / 2; break
      case 'left':   top = target.top + target.height / 2 - tooltipH / 2; left = target.left - tooltipW - margin;  break
      case 'right':  top = target.top + target.height / 2 - tooltipH / 2; left = target.right + margin;            break
    }
    // Keep within viewport
    top  = Math.max(20, Math.min(window.innerHeight - tooltipH - 20, top))
    left = Math.max(20, Math.min(window.innerWidth  - tooltipW - 20, left))
    return { top, left, transform: 'none' }
  })()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none' }}>
      {/* Backdrop with cutout for the target */}
      {target && (
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }} onClick={next}>
          <defs>
            <mask id="hole">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={target.left - 6} y={target.top - 6}
                width={target.width + 12} height={target.height + 12}
                rx={10} ry={10} fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(15,23,42,0.6)" mask="url(#hole)" />
        </svg>
      )}
      {/* Backdrop without target (narrative slide) */}
      {!target && !missing && (
        <div onClick={next} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', pointerEvents: 'auto' }} />
      )}

      {/* Pulsing ring around target */}
      {target && (
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            top:    target.top - 6,
            left:   target.left - 6,
            width:  target.width + 12,
            height: target.height + 12,
            borderRadius: 10,
            boxShadow: '0 0 0 4px #ec4899, 0 0 32px 8px rgba(236,72,153,0.7)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip / step card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            position: 'fixed',
            ...tooltipPos,
            width: 320,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#fff',
            padding: 16, borderRadius: 14,
            boxShadow: '0 20px 50px rgba(139,92,246,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#a78bfa' }}>
              ✨ Démo guidée · Étape {index + 1} / {steps.length}
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          {missing ? (
            <div style={{ fontSize: 13, color: '#fbbf24', lineHeight: 1.5 }}>
              ⚠️ L'élément ciblé n'est pas visible sur cette page.
              <br />
              <span style={{ fontSize: 11, color: '#cbd5e1', display: 'block', marginTop: 6 }}>
                Sélecteur : <code>{step?.selector}</code>
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 14, lineHeight: 1.5, color: '#f1f5f9' }}>{step?.text}</div>
          )}

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 4, marginTop: 12, marginBottom: 10 }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: 18, height: 3, borderRadius: 2,
                background: i <= index ? '#ec4899' : 'rgba(255,255,255,0.15)',
              }} />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            <button onClick={prev} disabled={isFirst}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                background: isFirst ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                color: isFirst ? '#64748b' : '#fff', fontSize: 12, fontWeight: 600,
                cursor: isFirst ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
              <ArrowLeft size={12} /> Précédent
            </button>
            <button onClick={next}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
              {isLast ? <>Terminer <CheckCircle2 size={12} /></> : <>Suivant <ArrowRight size={12} /></>}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
