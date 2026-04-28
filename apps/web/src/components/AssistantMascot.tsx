import { motion } from 'framer-motion'

/**
 * Assistant Mascot — 6 designs SVG vectoriels Creorga.
 * Tous en gradient mauve / rose / cyan. Animés (clignote, balance, pulse).
 *
 *   <AssistantMascot variant="robot" size={120} animated />
 */

export type MascotVariant = 'robot' | 'spark' | 'chef' | 'fox' | 'crystal' | 'cup'

interface Props {
  variant: MascotVariant
  size?: number
  animated?: boolean
  /** Speaking state — opens mouth / shows soundwaves */
  speaking?: boolean
  /** Listening state — pulse mic ring */
  listening?: boolean
}

export default function AssistantMascot({ variant, size = 120, animated = true, speaking, listening }: Props) {
  const W = size, H = size
  const common = { width: W, height: H, viewBox: '0 0 200 200' }
  const animProps = animated ? {
    animate: { y: [0, -4, 0], rotate: [-1, 1, -1] },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  } : {}

  return (
    <motion.svg {...common} {...(animProps as any)} style={{ filter: listening ? 'drop-shadow(0 0 16px rgba(236,72,153,0.6))' : 'drop-shadow(0 4px 12px rgba(139,92,246,0.4))' }}>
      <defs>
        <linearGradient id={`grad-${variant}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`grad-${variant}-light`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`grad-${variant}-glow`}>
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Listening pulse ring */}
      {listening && (
        <motion.circle cx="100" cy="100" r="92"
          stroke="#ec4899" strokeWidth="2" fill="none"
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      {/* ── ROBOT ── */}
      {variant === 'robot' && (
        <g>
          {/* Antenna */}
          <line x1="100" y1="42" x2="100" y2="22" stroke="#8b5cf6" strokeWidth="3" />
          <motion.circle cx="100" cy="18" r="6" fill={`url(#grad-${variant}-glow)`}
            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <circle cx="100" cy="18" r="3" fill="#fbbf24" />
          {/* Head */}
          <rect x="50" y="42" width="100" height="80" rx="22" fill={`url(#grad-${variant}-body)`} />
          <rect x="50" y="42" width="100" height="40" rx="22" fill={`url(#grad-${variant}-light)`} />
          {/* Eyes */}
          <motion.g
            animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 0.51] }}
            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
            <circle cx="78"  cy="78" r="9" fill="#fff" />
            <circle cx="122" cy="78" r="9" fill="#fff" />
            <circle cx="80"  cy="80" r="4" fill="#0f172a" />
            <circle cx="124" cy="80" r="4" fill="#0f172a" />
          </motion.g>
          {/* Smile */}
          <path d={speaking
            ? 'M 75 100 Q 100 110, 125 100 Q 100 116, 75 100 Z'
            : 'M 75 100 Q 100 112, 125 100'}
            stroke="#fff" strokeWidth="3" fill={speaking ? '#fff' : 'none'} strokeLinecap="round" />
          {/* Body / chest */}
          <rect x="62" y="125" width="76" height="50" rx="14" fill={`url(#grad-${variant}-body)`} opacity="0.85" />
          <circle cx="100" cy="148" r="10" fill="#0f172a" />
          <circle cx="100" cy="148" r="5" fill="#10b981" />
          {/* Arms */}
          <rect x="32" y="130" width="20" height="10" rx="5" fill="#8b5cf6" />
          <rect x="148" y="130" width="20" height="10" rx="5" fill="#8b5cf6" />
        </g>
      )}

      {/* ── SPARK (étoile sparkle humanoïde) ── */}
      {variant === 'spark' && (
        <g>
          {/* Star body */}
          <path d="M 100 30 L 118 80 L 170 88 L 130 122 L 142 174 L 100 148 L 58 174 L 70 122 L 30 88 L 82 80 Z"
            fill={`url(#grad-${variant}-body)`} stroke="#fff" strokeWidth="1.5" />
          {/* Eyes */}
          <circle cx="86"  cy="100" r="6" fill="#fff" />
          <circle cx="114" cy="100" r="6" fill="#fff" />
          <circle cx="87"  cy="101" r="3" fill="#0f172a" />
          <circle cx="115" cy="101" r="3" fill="#0f172a" />
          {/* Smile */}
          <path d={speaking
            ? 'M 88 118 Q 100 128, 112 118 Q 100 132, 88 118 Z'
            : 'M 88 118 Q 100 126, 112 118'}
            stroke="#fff" strokeWidth="2.5" fill={speaking ? '#fff' : 'none'} strokeLinecap="round" />
          {/* Sparkles */}
          <motion.g animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '100px 100px' }}>
            <circle cx="40"  cy="40"  r="3" fill="#fbbf24" />
            <circle cx="160" cy="40"  r="2" fill="#fbbf24" />
            <circle cx="160" cy="160" r="3" fill="#fbbf24" />
            <circle cx="40"  cy="160" r="2" fill="#fbbf24" />
          </motion.g>
        </g>
      )}

      {/* ── CHEF (toque + cuillère) ── */}
      {variant === 'chef' && (
        <g>
          {/* Toque */}
          <ellipse cx="100" cy="48" rx="38" ry="22" fill="#fff" />
          <ellipse cx="80"  cy="38" rx="18" ry="20" fill="#fff" />
          <ellipse cx="120" cy="38" rx="18" ry="20" fill="#fff" />
          <ellipse cx="100" cy="32" rx="16" ry="18" fill="#fff" />
          <rect x="62" y="60" width="76" height="8" rx="2" fill="#e2e8f0" />
          {/* Face circle */}
          <circle cx="100" cy="108" r="42" fill={`url(#grad-${variant}-body)`} />
          <circle cx="100" cy="108" r="42" fill={`url(#grad-${variant}-light)`} />
          {/* Eyes (closed/open friendly) */}
          <motion.g
            animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 5, repeat: Infinity, times: [0, 0.5, 0.51] }}
            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
            <circle cx="86"  cy="105" r="5" fill="#0f172a" />
            <circle cx="114" cy="105" r="5" fill="#0f172a" />
            <circle cx="87.5" cy="103.5" r="1.5" fill="#fff" />
            <circle cx="115.5" cy="103.5" r="1.5" fill="#fff" />
          </motion.g>
          {/* Smile big */}
          <path d={speaking
            ? 'M 80 122 Q 100 138, 120 122 Q 100 144, 80 122 Z'
            : 'M 80 122 Q 100 136, 120 122'}
            stroke="#fff" strokeWidth="3" fill={speaking ? '#fff' : 'none'} strokeLinecap="round" />
          {/* Cheeks */}
          <circle cx="74"  cy="118" r="5" fill="#ec4899" opacity="0.5" />
          <circle cx="126" cy="118" r="5" fill="#ec4899" opacity="0.5" />
          {/* Spoon */}
          <line x1="160" y1="160" x2="180" y2="180" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="180" cy="180" rx="6" ry="4" fill="#fbbf24" />
        </g>
      )}

      {/* ── FOX (renard mignon) ── */}
      {variant === 'fox' && (
        <g>
          {/* Ears */}
          <path d="M 55 70 L 70 30 L 85 70 Z" fill={`url(#grad-${variant}-body)`} />
          <path d="M 145 70 L 130 30 L 115 70 Z" fill={`url(#grad-${variant}-body)`} />
          <path d="M 62 60 L 70 38 L 78 60 Z" fill="#fff" opacity="0.6" />
          <path d="M 138 60 L 130 38 L 122 60 Z" fill="#fff" opacity="0.6" />
          {/* Face */}
          <ellipse cx="100" cy="110" rx="55" ry="48" fill={`url(#grad-${variant}-body)`} />
          <ellipse cx="100" cy="125" rx="32" ry="22" fill="#fff" />
          {/* Eyes */}
          <motion.g
            animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 0.51] }}
            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
            <circle cx="80"  cy="100" r="7" fill="#0f172a" />
            <circle cx="120" cy="100" r="7" fill="#0f172a" />
            <circle cx="82"  cy="98"  r="2" fill="#fff" />
            <circle cx="122" cy="98"  r="2" fill="#fff" />
          </motion.g>
          {/* Nose */}
          <ellipse cx="100" cy="120" rx="6" ry="4" fill="#0f172a" />
          {/* Smile */}
          <path d={speaking
            ? 'M 90 132 Q 100 142, 110 132 Q 100 146, 90 132 Z'
            : 'M 92 132 Q 100 140, 108 132'}
            stroke="#0f172a" strokeWidth="2.5" fill={speaking ? '#0f172a' : 'none'} strokeLinecap="round" />
        </g>
      )}

      {/* ── CRYSTAL (gemme abstraite) ── */}
      {variant === 'crystal' && (
        <g>
          {/* Crystal facets */}
          <path d="M 100 30 L 60 80 L 100 170 L 140 80 Z" fill={`url(#grad-${variant}-body)`} stroke="#fff" strokeWidth="1.5" />
          <path d="M 100 30 L 60 80 L 100 90 Z" fill="#fff" opacity="0.3" />
          <path d="M 100 30 L 140 80 L 100 90 Z" fill="#0f172a" opacity="0.15" />
          <path d="M 60 80 L 100 90 L 100 170 Z" fill="#fff" opacity="0.15" />
          <path d="M 140 80 L 100 90 L 100 170 Z" fill="#0f172a" opacity="0.2" />
          {/* Eyes */}
          <ellipse cx="86"  cy="105" rx="5" ry="7" fill="#fff" />
          <ellipse cx="114" cy="105" rx="5" ry="7" fill="#fff" />
          <ellipse cx="86"  cy="106" rx="2" ry="3" fill="#0f172a" />
          <ellipse cx="114" cy="106" rx="2" ry="3" fill="#0f172a" />
          {/* Smile */}
          <path d={speaking
            ? 'M 88 125 Q 100 135, 112 125 Q 100 140, 88 125 Z'
            : 'M 88 125 Q 100 133, 112 125'}
            stroke="#fff" strokeWidth="2.5" fill={speaking ? '#fff' : 'none'} strokeLinecap="round" />
          {/* Sparkle */}
          <motion.path d="M 50 50 L 53 56 L 60 58 L 53 60 L 50 66 L 47 60 L 40 58 L 47 56 Z"
            fill="#fbbf24"
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ transformOrigin: '50px 58px' }} />
        </g>
      )}

      {/* ── CUP (tasse de café mascotte) ── */}
      {variant === 'cup' && (
        <g>
          {/* Steam */}
          <motion.path d="M 80 25 Q 75 18, 80 8 Q 85 0, 78 -10"
            stroke="#cbd5e1" strokeWidth="3" fill="none" strokeLinecap="round"
            animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }} />
          <motion.path d="M 100 22 Q 95 12, 100 4 Q 105 -4, 98 -14"
            stroke="#cbd5e1" strokeWidth="3" fill="none" strokeLinecap="round"
            animate={{ y: [0, -4, 0] }} transition={{ duration: 2, delay: 0.5, repeat: Infinity }} />
          <motion.path d="M 120 25 Q 115 18, 120 8 Q 125 0, 118 -10"
            stroke="#cbd5e1" strokeWidth="3" fill="none" strokeLinecap="round"
            animate={{ y: [0, -4, 0] }} transition={{ duration: 2, delay: 1, repeat: Infinity }} />
          {/* Cup */}
          <path d="M 50 60 L 55 170 Q 55 180 65 180 L 135 180 Q 145 180 145 170 L 150 60 Z"
            fill={`url(#grad-${variant}-body)`} stroke="#fff" strokeWidth="2" />
          {/* Coffee surface */}
          <ellipse cx="100" cy="62" rx="50" ry="8" fill="#0f172a" />
          <ellipse cx="100" cy="60" rx="50" ry="8" fill="#78350f" />
          {/* Handle */}
          <path d="M 150 80 Q 175 80 175 110 Q 175 140 150 140" stroke={`url(#grad-${variant}-body)`} strokeWidth="10" fill="none" />
          {/* Face on cup */}
          <circle cx="85"  cy="115" r="6" fill="#fff" />
          <circle cx="115" cy="115" r="6" fill="#fff" />
          <circle cx="86"  cy="116" r="3" fill="#0f172a" />
          <circle cx="116" cy="116" r="3" fill="#0f172a" />
          <path d={speaking
            ? 'M 85 138 Q 100 152, 115 138 Q 100 156, 85 138 Z'
            : 'M 85 138 Q 100 150, 115 138'}
            stroke="#fff" strokeWidth="3" fill={speaking ? '#fff' : 'none'} strokeLinecap="round" />
          <circle cx="78"  cy="133" r="4" fill="#ec4899" opacity="0.5" />
          <circle cx="122" cy="133" r="4" fill="#ec4899" opacity="0.5" />
        </g>
      )}
    </motion.svg>
  )
}

export const MASCOT_OPTIONS: { variant: MascotVariant; name: string; description: string }[] = [
  { variant: 'robot',   name: 'Robot Pixel',     description: 'Robot mignon avec antenne LED · Style Pixar' },
  { variant: 'spark',   name: 'Étoile Sparkle',  description: 'Étoile humanoïde animée · Style magique' },
  { variant: 'chef',    name: 'Chef Émile',      description: 'Chef avec toque + cuillère · Restaurant' },
  { variant: 'fox',     name: 'Petit Renard',    description: 'Animal cute aux grands yeux · Friendly' },
  { variant: 'crystal', name: 'Cristal Gemma',   description: 'Gemme abstraite scintillante · Tech-art' },
  { variant: 'cup',     name: 'Tasse Câline',    description: 'Tasse de café mascotte · Café um Rond-Point' },
]
