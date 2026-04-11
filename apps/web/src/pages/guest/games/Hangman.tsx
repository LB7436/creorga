import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Word bank ─────────────────────────────────────────────────────────────────

type Category = 'Animaux' | 'Nourriture' | 'Pays' | 'Objets' | 'Sports' | 'Sciences' | 'Vêtements' | 'Transports'

interface WordEntry { word: string; category: Category }

const WORDS: WordEntry[] = [
  // Animaux
  { word: 'CHAT', category: 'Animaux' }, { word: 'CHIEN', category: 'Animaux' },
  { word: 'LION', category: 'Animaux' }, { word: 'TIGRE', category: 'Animaux' },
  { word: 'AIGLE', category: 'Animaux' }, { word: 'REQUIN', category: 'Animaux' },
  { word: 'BALEINE', category: 'Animaux' }, { word: 'GIRAFE', category: 'Animaux' },
  { word: 'ELEPHANT', category: 'Animaux' }, { word: 'PINGOUIN', category: 'Animaux' },
  { word: 'DAUPHIN', category: 'Animaux' }, { word: 'PERROQUET', category: 'Animaux' },
  { word: 'CROCODILE', category: 'Animaux' }, { word: 'HIPPOPOTAME', category: 'Animaux' },
  { word: 'CHAMEAU', category: 'Animaux' }, { word: 'RHINOCEROS', category: 'Animaux' },
  { word: 'KANGOUROU', category: 'Animaux' }, { word: 'SCORPION', category: 'Animaux' },
  { word: 'PAPILLON', category: 'Animaux' }, { word: 'LIBELLULE', category: 'Animaux' },
  { word: 'TORTUE', category: 'Animaux' }, { word: 'SERPENT', category: 'Animaux' },
  { word: 'CAMELEON', category: 'Animaux' }, { word: 'AUTRUCHE', category: 'Animaux' },
  { word: 'FLAMANT', category: 'Animaux' }, { word: 'PIEUVRE', category: 'Animaux' },
  { word: 'RENARD', category: 'Animaux' }, { word: 'LOUP', category: 'Animaux' },
  { word: 'OURS', category: 'Animaux' }, { word: 'PANDA', category: 'Animaux' },
  { word: 'ZEBRE', category: 'Animaux' }, { word: 'JAGUAR', category: 'Animaux' },
  { word: 'PANTHÈRE', category: 'Animaux' }, { word: 'LYNX', category: 'Animaux' },
  { word: 'VAUTOUR', category: 'Animaux' }, { word: 'CIGOGNE', category: 'Animaux' },
  { word: 'HIBOU', category: 'Animaux' }, { word: 'COLIBRI', category: 'Animaux' },
  { word: 'CORNEILLE', category: 'Animaux' }, { word: 'PÉLICAN', category: 'Animaux' },
  { word: 'MORSE', category: 'Animaux' }, { word: 'NARVAL', category: 'Animaux' },
  { word: 'ORQUE', category: 'Animaux' }, { word: 'PHOQUE', category: 'Animaux' },
  { word: 'LOUTRE', category: 'Animaux' }, { word: 'CASTOR', category: 'Animaux' },
  { word: 'HAMSTER', category: 'Animaux' }, { word: 'COBAYE', category: 'Animaux' },

  // Nourriture
  { word: 'PIZZA', category: 'Nourriture' }, { word: 'PÂTES', category: 'Nourriture' },
  { word: 'CROISSANT', category: 'Nourriture' }, { word: 'BAGUETTE', category: 'Nourriture' },
  { word: 'FROMAGE', category: 'Nourriture' }, { word: 'YAOURT', category: 'Nourriture' },
  { word: 'CHOCOLAT', category: 'Nourriture' }, { word: 'GATEAU', category: 'Nourriture' },
  { word: 'TARTE', category: 'Nourriture' }, { word: 'MACARON', category: 'Nourriture' },
  { word: 'BRIOCHE', category: 'Nourriture' }, { word: 'ECLAIR', category: 'Nourriture' },
  { word: 'PROFITEROLE', category: 'Nourriture' }, { word: 'CREPE', category: 'Nourriture' },
  { word: 'QUICHE', category: 'Nourriture' }, { word: 'RATATOUILLE', category: 'Nourriture' },
  { word: 'CASSOULET', category: 'Nourriture' }, { word: 'BOUILLABAISSE', category: 'Nourriture' },
  { word: 'CHOUQUETTE', category: 'Nourriture' }, { word: 'MADELEINE', category: 'Nourriture' },
  { word: 'CAMEMBERT', category: 'Nourriture' }, { word: 'ROQUEFORT', category: 'Nourriture' },
  { word: 'BRIE', category: 'Nourriture' }, { word: 'GRUYERE', category: 'Nourriture' },
  { word: 'FONDUE', category: 'Nourriture' }, { word: 'RACLETTE', category: 'Nourriture' },
  { word: 'ESCARGOT', category: 'Nourriture' }, { word: 'FOIEGRAS', category: 'Nourriture' },
  { word: 'BOEUFBOURGUIGNON', category: 'Nourriture' }, { word: 'COQAUVIN', category: 'Nourriture' },
  { word: 'SORBET', category: 'Nourriture' }, { word: 'MERINGUE', category: 'Nourriture' },
  { word: 'NOUGAT', category: 'Nourriture' }, { word: 'CARAMEL', category: 'Nourriture' },
  { word: 'ANANAS', category: 'Nourriture' }, { word: 'MANGUE', category: 'Nourriture' },
  { word: 'CERISE', category: 'Nourriture' }, { word: 'FRAMBOISE', category: 'Nourriture' },
  { word: 'MYRTILLE', category: 'Nourriture' }, { word: 'ABRICOT', category: 'Nourriture' },

  // Pays
  { word: 'FRANCE', category: 'Pays' }, { word: 'ESPAGNE', category: 'Pays' },
  { word: 'ITALIE', category: 'Pays' }, { word: 'ALLEMAGNE', category: 'Pays' },
  { word: 'PORTUGAL', category: 'Pays' }, { word: 'BELGIQUE', category: 'Pays' },
  { word: 'SUISSE', category: 'Pays' }, { word: 'LUXEMBOURG', category: 'Pays' },
  { word: 'JAPON', category: 'Pays' }, { word: 'CHINE', category: 'Pays' },
  { word: 'BRESIL', category: 'Pays' }, { word: 'MEXIQUE', category: 'Pays' },
  { word: 'MAROC', category: 'Pays' }, { word: 'EGYPTE', category: 'Pays' },
  { word: 'NIGERIA', category: 'Pays' }, { word: 'KENYA', category: 'Pays' },
  { word: 'ARGENTINE', category: 'Pays' }, { word: 'COLOMBIE', category: 'Pays' },
  { word: 'AUSTRALIE', category: 'Pays' }, { word: 'NOUVELLE-ZELANDE', category: 'Pays' },
  { word: 'CANADA', category: 'Pays' }, { word: 'PEROU', category: 'Pays' },
  { word: 'DANEMARK', category: 'Pays' }, { word: 'SUEDE', category: 'Pays' },
  { word: 'NORVEGE', category: 'Pays' }, { word: 'FINLANDE', category: 'Pays' },
  { word: 'POLOGNE', category: 'Pays' }, { word: 'HONGRIE', category: 'Pays' },
  { word: 'ROUMANIE', category: 'Pays' }, { word: 'UKRAINE', category: 'Pays' },
  { word: 'TURQUIE', category: 'Pays' }, { word: 'RUSSIE', category: 'Pays' },
  { word: 'GRECE', category: 'Pays' }, { word: 'CROATIE', category: 'Pays' },

  // Objets
  { word: 'TELEPHONE', category: 'Objets' }, { word: 'ORDINATEUR', category: 'Objets' },
  { word: 'TELEVISION', category: 'Objets' }, { word: 'CLAVIER', category: 'Objets' },
  { word: 'BUREAU', category: 'Objets' }, { word: 'LAMPE', category: 'Objets' },
  { word: 'FENETRE', category: 'Objets' }, { word: 'MIROIR', category: 'Objets' },
  { word: 'CALENDRIER', category: 'Objets' }, { word: 'HORLOGE', category: 'Objets' },
  { word: 'BOUTEILLE', category: 'Objets' }, { word: 'LUNETTES', category: 'Objets' },
  { word: 'PARAPLUIE', category: 'Objets' }, { word: 'VALISE', category: 'Objets' },
  { word: 'PORTEFEUILLE', category: 'Objets' }, { word: 'MARTEAU', category: 'Objets' },
  { word: 'TOURNEVIS', category: 'Objets' }, { word: 'TELESCOPE', category: 'Objets' },
  { word: 'MICROSCOPE', category: 'Objets' }, { word: 'PARACHUTE', category: 'Objets' },
  { word: 'ASPIRATEUR', category: 'Objets' }, { word: 'REFRIGERATEUR', category: 'Objets' },
  { word: 'LAVE-VAISSELLE', category: 'Objets' }, { word: 'MICROONDES', category: 'Objets' },

  // Sports
  { word: 'FOOTBALL', category: 'Sports' }, { word: 'TENNIS', category: 'Sports' },
  { word: 'NATATION', category: 'Sports' }, { word: 'CYCLISME', category: 'Sports' },
  { word: 'ATHLETISME', category: 'Sports' }, { word: 'BASKETBALL', category: 'Sports' },
  { word: 'VOLLEYBALL', category: 'Sports' }, { word: 'HANDBALL', category: 'Sports' },
  { word: 'RUGBY', category: 'Sports' }, { word: 'BOXE', category: 'Sports' },
  { word: 'JUDO', category: 'Sports' }, { word: 'KARATE', category: 'Sports' },
  { word: 'ESCRIME', category: 'Sports' }, { word: 'AVIRON', category: 'Sports' },
  { word: 'HALTEROPHILIE', category: 'Sports' }, { word: 'ALPINISME', category: 'Sports' },
  { word: 'SKATEBOARD', category: 'Sports' }, { word: 'SNOWBOARD', category: 'Sports' },
  { word: 'PARACHUTISME', category: 'Sports' }, { word: 'PLONGEE', category: 'Sports' },
  { word: 'EQUITATION', category: 'Sports' }, { word: 'PELOTE', category: 'Sports' },
  { word: 'PETANQUE', category: 'Sports' }, { word: 'BADMINTON', category: 'Sports' },

  // Sciences
  { word: 'CHIMIE', category: 'Sciences' }, { word: 'PHYSIQUE', category: 'Sciences' },
  { word: 'BIOLOGIE', category: 'Sciences' }, { word: 'ASTRONOMIE', category: 'Sciences' },
  { word: 'GEOLOGIE', category: 'Sciences' }, { word: 'MATHEMATIQUES', category: 'Sciences' },
  { word: 'INFORMATIQUE', category: 'Sciences' }, { word: 'ELECTRONIQUE', category: 'Sciences' },
  { word: 'MECANIQUE', category: 'Sciences' }, { word: 'THERMODYNAMIQUE', category: 'Sciences' },
  { word: 'ELECTROMAGNETISME', category: 'Sciences' }, { word: 'ALGORITHME', category: 'Sciences' },
  { word: 'MOLECULE', category: 'Sciences' }, { word: 'CHROMOSOME', category: 'Sciences' },
  { word: 'PHOTOSYNTHESE', category: 'Sciences' }, { word: 'METABOLISM', category: 'Sciences' },
  { word: 'EVAPORATION', category: 'Sciences' }, { word: 'PRECIPITATION', category: 'Sciences' },
  { word: 'TELESCOPIE', category: 'Sciences' }, { word: 'GRAVITATION', category: 'Sciences' },
  { word: 'ANTIBIOTIQUE', category: 'Sciences' }, { word: 'VACCINATION', category: 'Sciences' },
  { word: 'NEURONE', category: 'Sciences' }, { word: 'PROTEINE', category: 'Sciences' },

  // Vêtements
  { word: 'MANTEAU', category: 'Vêtements' }, { word: 'VESTE', category: 'Vêtements' },
  { word: 'PANTALON', category: 'Vêtements' }, { word: 'CHEMISE', category: 'Vêtements' },
  { word: 'CRAVATE', category: 'Vêtements' }, { word: 'CHAUSSURES', category: 'Vêtements' },
  { word: 'SANDALES', category: 'Vêtements' }, { word: 'ECHARPE', category: 'Vêtements' },
  { word: 'GANTS', category: 'Vêtements' }, { word: 'CHAPEAU', category: 'Vêtements' },
  { word: 'IMPERMÉABLE', category: 'Vêtements' }, { word: 'SWEATSHIRT', category: 'Vêtements' },
  { word: 'BLOUSON', category: 'Vêtements' }, { word: 'COMBINAISON', category: 'Vêtements' },

  // Transports
  { word: 'AVION', category: 'Transports' }, { word: 'TRAIN', category: 'Transports' },
  { word: 'VOITURE', category: 'Transports' }, { word: 'BATEAU', category: 'Transports' },
  { word: 'HELICOPTERE', category: 'Transports' }, { word: 'SUBMARINE', category: 'Transports' },
  { word: 'TRAMWAY', category: 'Transports' }, { word: 'METRO', category: 'Transports' },
  { word: 'MOTOCYCLETTE', category: 'Transports' }, { word: 'BICYCLETTE', category: 'Transports' },
  { word: 'CAMION', category: 'Transports' }, { word: 'AMBULANCE', category: 'Transports' },
  { word: 'FUSEE', category: 'Transports' }, { word: 'DIRIGEABLE', category: 'Transports' },
  { word: 'CATAMARAN', category: 'Transports' }, { word: 'HOVERCRAFT', category: 'Transports' },
]

// ─── Difficulty ────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFF_CONFIG: Record<Difficulty, { label: string; lives: number; minLen: number; maxLen: number }> = {
  easy:   { label: 'Facile',  lives: 8, minLen: 3,  maxLen: 5  },
  medium: { label: 'Moyen',   lives: 6, minLen: 6,  maxLen: 7  },
  hard:   { label: 'Difficile', lives: 5, minLen: 8, maxLen: 99 },
}

// AZERTY layout
const AZERTY = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN']

// ─── Stats ─────────────────────────────────────────────────────────────────────

interface Stats { played: number; wins: number; streak: number; bestStreak: number }

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem('hangman_stats')
    return raw ? JSON.parse(raw) : { played: 0, wins: 0, streak: 0, bestStreak: 0 }
  } catch { return { played: 0, wins: 0, streak: 0, bestStreak: 0 } }
}

function saveStats(s: Stats) {
  try { localStorage.setItem('hangman_stats', JSON.stringify(s)) } catch { /* ignore */ }
}

// ─── Gallows SVG ──────────────────────────────────────────────────────────────

function Gallows({ wrong, maxLives }: { wrong: number; maxLives: number }) {
  // Normalize to 6 parts regardless of maxLives
  const parts = Math.round((wrong / maxLives) * 6)

  return (
    <svg viewBox="0 0 120 130" width={120} height={130} style={{ display: 'block', margin: '0 auto' }}>
      {/* Static gallows structure */}
      <line x1="10" y1="125" x2="110" y2="125" stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="125" x2="30" y2="10"  stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="10"  x2="80" y2="10"  stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="80" y1="10"  x2="80" y2="25"  stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" />
      {/* Support brace */}
      <line x1="30" y1="30"  x2="55" y2="10"  stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" opacity={0.5} />

      {/* Head */}
      {parts >= 1 && (
        <circle cx="80" cy="35" r="10" stroke={ACCENT} strokeWidth="2.5" fill="none"
          style={{ strokeDasharray: 65, strokeDashoffset: 0, animation: 'drawPath 0.4s ease-out' }} />
      )}
      {/* Body */}
      {parts >= 2 && (
        <line x1="80" y1="45" x2="80" y2="75" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round"
          style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: 'drawPath 0.4s ease-out' }} />
      )}
      {/* Left arm */}
      {parts >= 3 && (
        <line x1="80" y1="55" x2="63" y2="68" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round"
          style={{ strokeDasharray: 25, strokeDashoffset: 0, animation: 'drawPath 0.4s ease-out' }} />
      )}
      {/* Right arm */}
      {parts >= 4 && (
        <line x1="80" y1="55" x2="97" y2="68" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round"
          style={{ strokeDasharray: 25, strokeDashoffset: 0, animation: 'drawPath 0.4s ease-out' }} />
      )}
      {/* Left leg */}
      {parts >= 5 && (
        <line x1="80" y1="75" x2="63" y2="95" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round"
          style={{ strokeDasharray: 25, strokeDashoffset: 0, animation: 'drawPath 0.4s ease-out' }} />
      )}
      {/* Right leg */}
      {parts >= 6 && (
        <line x1="80" y1="75" x2="97" y2="95" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round"
          style={{ strokeDasharray: 25, strokeDashoffset: 0, animation: 'drawPath 0.4s ease-out' }} />
      )}

      {/* Eyes when dead */}
      {parts >= 6 && (
        <>
          <line x1="75" y1="31" x2="78" y2="34" stroke={ACCENT} strokeWidth="1.5" />
          <line x1="78" y1="31" x2="75" y2="34" stroke={ACCENT} strokeWidth="1.5" />
          <line x1="82" y1="31" x2="85" y2="34" stroke={ACCENT} strokeWidth="1.5" />
          <line x1="85" y1="31" x2="82" y2="34" stroke={ACCENT} strokeWidth="1.5" />
        </>
      )}
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Hangman({ onBack }: { onBack?: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [entry, setEntry] = useState<WordEntry | null>(null)
  const [guessed, setGuessed] = useState<Set<string>>(new Set())
  const [hintUsed, setHintUsed] = useState(false)
  const [stats, setStats] = useState<Stats>(loadStats)
  const [revealIdx, setRevealIdx] = useState(0)
  const [celebrating, setCelebrating] = useState(false)

  const pickWord = useCallback((diff: Difficulty) => {
    const cfg = DIFF_CONFIG[diff]
    const pool = WORDS.filter(w =>
      w.word.replace(/[^A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÆŒÇ-]/gi, '').length >= cfg.minLen &&
      w.word.replace(/[^A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÆŒÇ-]/gi, '').length <= cfg.maxLen
    )
    return pool[Math.floor(Math.random() * pool.length)]
  }, [])

  function startGame(diff: Difficulty) {
    setDifficulty(diff)
    setEntry(pickWord(diff))
    setGuessed(new Set())
    setHintUsed(false)
    setRevealIdx(0)
    setCelebrating(false)
  }

  function restart() {
    if (!difficulty) return
    startGame(difficulty)
  }

  const word = entry?.word ?? ''
  const maxLives = difficulty ? DIFF_CONFIG[difficulty].lives : 6
  const wrongLetters = [...guessed].filter(l => !word.includes(l))
  const wrong = wrongLetters.length
  const won = word.length > 0 && word.split('').every(l => guessed.has(l))
  const lost = wrong >= maxLives
  const over = won || lost

  // Reveal letters one by one on lose
  useEffect(() => {
    if (!lost) return
    if (revealIdx >= word.length) return
    const t = setTimeout(() => setRevealIdx(i => i + 1), 120)
    return () => clearTimeout(t)
  }, [lost, revealIdx, word.length])

  // Win celebration
  useEffect(() => {
    if (!won) return
    setCelebrating(true)
    const t = setTimeout(() => setCelebrating(false), 2000)
    return () => clearTimeout(t)
  }, [won])

  // Update stats on game over
  const statsUpdated = useRef(false)
  useEffect(() => {
    if (!over || statsUpdated.current) return
    statsUpdated.current = true
    setStats(prev => {
      const next: Stats = {
        played: prev.played + 1,
        wins: prev.wins + (won ? 1 : 0),
        streak: won ? prev.streak + 1 : 0,
        bestStreak: won ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
      }
      saveStats(next)
      return next
    })
  }, [over, won])

  // Reset statsUpdated when new game starts
  useEffect(() => { statsUpdated.current = false }, [word])

  function guess(letter: string) {
    if (over || guessed.has(letter)) return
    setGuessed(s => new Set(s).add(letter))
  }

  function useHint() {
    if (hintUsed || over) return
    const hidden = word.split('').filter(l => !guessed.has(l))
    if (!hidden.length) return
    const letter = hidden[Math.floor(Math.random() * hidden.length)]
    setHintUsed(true)
    // Cost 1 life: add a wrong letter placeholder
    const dummy = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').find(
      l => !word.includes(l) && !guessed.has(l)
    )
    setGuessed(s => {
      const next = new Set(s)
      next.add(letter)
      if (dummy) next.add(dummy)
      return next
    })
  }

  // ── Difficulty selection screen ──────────────────────────────────────────────
  if (!difficulty || !entry) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>🪢 Pendu</span>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', gap: 8, background: SURFACE2, borderRadius: 12,
          border: `1px solid ${BORDER}`, padding: '10px 14px',
        }}>
          {[
            { label: 'Parties', val: stats.played },
            { label: 'Victoires', val: stats.wins },
            { label: 'Série', val: stats.streak },
            { label: 'Record', val: stats.bestStreak },
          ].map(({ label, val }) => (
            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>{val}</div>
              <div style={{ fontSize: 9, color: MUTED }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, color: MUTED, textAlign: 'center' }}>Choisissez une difficulté</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => {
            const cfg = DIFF_CONFIG[d]
            const colors: Record<Difficulty, string> = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' }
            const col = colors[d]
            return (
              <button key={d} onClick={() => startGame(d)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `${col}10`, border: `1px solid ${col}40`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                transition: 'transform 0.1s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = '' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: MUTED }}>
                    {cfg.lives} vies · mots de {cfg.minLen}{cfg.maxLen < 99 ? `–${cfg.maxLen}` : '+'} lettres
                  </span>
                </div>
                <span style={{ fontSize: 20 }}>
                  {d === 'easy' ? '😊' : d === 'medium' ? '😐' : '😈'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const livesFraction = (maxLives - wrong) / maxLives

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes drawPath {
          from { stroke-dashoffset: 65; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => { setDifficulty(null); setEntry(null) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>🪢 Pendu</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: `${ACCENT}20`, color: ACCENT,
          }}>{entry.category}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
          <span style={{
            color: livesFraction > 0.5 ? '#22c55e' : livesFraction > 0.25 ? '#f59e0b' : '#ef4444',
            fontWeight: 700,
          }}>
            {'❤️'.repeat(maxLives - wrong)}{'🖤'.repeat(wrong)}
          </span>
        </div>
      </div>

      {/* Gallows */}
      <Gallows wrong={wrong} maxLives={maxLives} />

      {/* Word display */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, flexWrap: 'wrap', padding: '4px 0' }}>
        {word.split('').map((letter, i) => {
          const isRevealed = guessed.has(letter) || (lost && i < revealIdx)
          const isNew = celebrating && guessed.has(letter)
          return (
            <div key={i} style={{
              width: 24, minWidth: 24, height: 32,
              borderBottom: `2px solid ${ACCENT}`,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 2, fontWeight: 800, fontSize: 14,
              color: lost && !guessed.has(letter) ? '#ef4444' : TEXT,
              animation: isNew ? `bounce 0.4s ease ${i * 60}ms` : undefined,
            }}>
              {isRevealed ? letter : ''}
            </div>
          )
        })}
      </div>

      {/* Result */}
      {over && (
        <div style={{
          textAlign: 'center', padding: '8px 12px', borderRadius: 12, fontWeight: 700, fontSize: 13,
          background: won ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${won ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
          color: won ? '#22c55e' : '#ef4444',
        }}>
          {won
            ? `🎉 Bravo ! ${stats.streak > 1 ? `Série de ${stats.streak} !` : 'Bien joué !'}`
            : `😞 Perdu ! Le mot était : ${word}`
          }
        </div>
      )}

      {/* Hint button */}
      {!over && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={useHint} disabled={hintUsed}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 8, cursor: hintUsed ? 'default' : 'pointer',
              background: hintUsed ? 'transparent' : `${ACCENT}18`,
              border: `1px solid ${hintUsed ? BORDER : ACCENT}40`,
              color: hintUsed ? MUTED : ACCENT, fontWeight: 600,
              opacity: hintUsed ? 0.4 : 1,
            }}>
            {hintUsed ? 'Indice utilisé' : '💡 Indice (−1 vie)'}
          </button>
        </div>
      )}

      {/* AZERTY keyboard */}
      {!over && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
          {AZERTY.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 4 }}>
              {row.split('').map(l => {
                const used = guessed.has(l)
                const correct = used && word.includes(l)
                const wrong2 = used && !word.includes(l)
                return (
                  <button key={l} onClick={() => guess(l)} disabled={used}
                    style={{
                      width: 30, height: 30, borderRadius: 7,
                      fontSize: 12, fontWeight: 700,
                      background: correct
                        ? 'rgba(34,197,94,0.2)'
                        : wrong2
                          ? 'rgba(239,68,68,0.15)'
                          : SURFACE2,
                      border: `1px solid ${correct ? 'rgba(34,197,94,0.4)' : wrong2 ? 'rgba(239,68,68,0.3)' : BORDER}`,
                      color: correct ? '#22c55e' : wrong2 ? '#ef4444' : TEXT,
                      cursor: used ? 'default' : 'pointer',
                      opacity: used ? 0.55 : 1,
                      transition: 'background 0.15s, transform 0.1s',
                    }}
                    onMouseEnter={e => { if (!used) e.currentTarget.style.transform = 'scale(1.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                  >
                    {l}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Play again */}
      {over && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={restart} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
          }}>
            Rejouer
          </button>
          <button onClick={() => { setDifficulty(null); setEntry(null) }} style={{
            padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: SURFACE2, border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer',
          }}>
            Menu
          </button>
        </div>
      )}
    </div>
  )
}

