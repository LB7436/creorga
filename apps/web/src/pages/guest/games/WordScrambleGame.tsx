import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, Clock, Trophy, Zap, RotateCcw } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Word Bank ──────────────────────────────────────────────────────────────
type Category = 'Animaux' | 'Nourriture' | 'Sports' | 'Pays' | 'Couleurs' | 'Nature' | 'Métiers' | 'Objets'

interface Word { w: string; h: string; cat: Category }

const WORD_BANK: Word[] = [
  // Animaux
  { w: 'ELEPHANT', h: 'Grand mammifère à trompe', cat: 'Animaux' },
  { w: 'GIRAFE', h: 'Animal au long cou', cat: 'Animaux' },
  { w: 'CROCODILE', h: 'Reptile des marais', cat: 'Animaux' },
  { w: 'PAPILLON', h: 'Insecte aux ailes colorées', cat: 'Animaux' },
  { w: 'DAUPHIN', h: 'Mammifère marin intelligent', cat: 'Animaux' },
  { w: 'PERROQUET', h: 'Oiseau qui imite', cat: 'Animaux' },
  { w: 'CHAMELEON', h: 'Reptile qui change de couleur', cat: 'Animaux' },
  { w: 'HIPPOPOTAME', h: 'Grand mammifère aquatique', cat: 'Animaux' },
  { w: 'RHINOCEROS', h: 'Animal à corne', cat: 'Animaux' },
  { w: 'KANGOUROU', h: 'Animal à poche', cat: 'Animaux' },
  { w: 'PINGOUIN', h: 'Oiseau des glaces', cat: 'Animaux' },
  { w: 'FLAMANT', h: 'Oiseau rose sur une patte', cat: 'Animaux' },
  { w: 'TORTUE', h: 'Reptile lent à carapace', cat: 'Animaux' },
  { w: 'SERPENT', h: 'Reptile sans pattes', cat: 'Animaux' },
  { w: 'RENARD', h: 'Canidé roux rusé', cat: 'Animaux' },
  { w: 'CASTOR', h: 'Rongeur constructeur de barrage', cat: 'Animaux' },
  { w: 'HIBOU', h: 'Oiseau nocturne sage', cat: 'Animaux' },
  { w: 'POULPE', h: 'Mollusque à huit tentacules', cat: 'Animaux' },
  { w: 'BALEINE', h: 'Plus grand mammifère marin', cat: 'Animaux' },
  { w: 'MOUETTE', h: 'Oiseau blanc des côtes', cat: 'Animaux' },
  { w: 'ECUREUIL', h: 'Rongeur qui grimpe aux arbres', cat: 'Animaux' },
  { w: 'GORILLE', h: 'Grand singe d\'Afrique', cat: 'Animaux' },
  { w: 'ZEBRE', h: 'Cheval rayé africain', cat: 'Animaux' },
  { w: 'AUTRUCHE', h: 'Grand oiseau coureur', cat: 'Animaux' },
  { w: 'ARAIGNEE', h: 'Arthropode à huit pattes', cat: 'Animaux' },
  // Nourriture
  { w: 'CHOCOLAT', h: 'Douceur sucrée au cacao', cat: 'Nourriture' },
  { w: 'BAGUETTE', h: 'Pain français emblématique', cat: 'Nourriture' },
  { w: 'FROMAGE', h: 'Produit laitier fermenté', cat: 'Nourriture' },
  { w: 'CROISSANT', h: 'Viennoiserie en forme de lune', cat: 'Nourriture' },
  { w: 'CONFITURE', h: 'Fruit cuit avec du sucre', cat: 'Nourriture' },
  { w: 'SAUCISSON', h: 'Charcuterie sèche en tranches', cat: 'Nourriture' },
  { w: 'MACARON', h: 'Petit gâteau coloré parisien', cat: 'Nourriture' },
  { w: 'CAMEMBERT', h: 'Fromage normand rond', cat: 'Nourriture' },
  { w: 'FRAMBOISE', h: 'Petit fruit rouge acidulé', cat: 'Nourriture' },
  { w: 'ANANAS', h: 'Fruit tropical épineux', cat: 'Nourriture' },
  { w: 'AUBERGINE', h: 'Légume violet long', cat: 'Nourriture' },
  { w: 'COURGETTE', h: 'Légume vert d\'été', cat: 'Nourriture' },
  { w: 'CHAMPIGNON', h: 'Champignon qu\'on mange', cat: 'Nourriture' },
  { w: 'ARTICHAUT', h: 'Légume à feuilles et fond', cat: 'Nourriture' },
  { w: 'MADELEINE', h: 'Petit gâteau ovale', cat: 'Nourriture' },
  { w: 'BRIOCHE', h: 'Pain brioché au beurre', cat: 'Nourriture' },
  { w: 'CREPE', h: 'Fine galette sucrée', cat: 'Nourriture' },
  { w: 'ECLAIR', h: 'Gâteau allongé au chocolat', cat: 'Nourriture' },
  { w: 'MOUSSE', h: 'Dessert aérien au chocolat', cat: 'Nourriture' },
  { w: 'TARTE', h: 'Gâteau plat à pâte et garniture', cat: 'Nourriture' },
  // Sports
  { w: 'BASKETBALL', h: 'Sport de balle en panier', cat: 'Sports' },
  { w: 'FOOTBALL', h: 'Sport le plus populaire au monde', cat: 'Sports' },
  { w: 'NATATION', h: 'Sport pratiqué dans l\'eau', cat: 'Sports' },
  { w: 'CYCLISME', h: 'Sport à vélo', cat: 'Sports' },
  { w: 'ATHLETISME', h: 'Course, saut et lancer', cat: 'Sports' },
  { w: 'ESCRIME', h: 'Sport d\'épée et fleuret', cat: 'Sports' },
  { w: 'TRIATHLON', h: 'Trois sports enchaînés', cat: 'Sports' },
  { w: 'BADMINTON', h: 'Sport au volant', cat: 'Sports' },
  { w: 'RUGBY', h: 'Sport oval avec plaquages', cat: 'Sports' },
  { w: 'HANDBALL', h: 'Sport de balle à la main', cat: 'Sports' },
  { w: 'VOLLEYBALL', h: 'Sport de balle par-dessus filet', cat: 'Sports' },
  { w: 'TENNIS', h: 'Sport de raquette sur court', cat: 'Sports' },
  { w: 'BOXE', h: 'Combat à poings', cat: 'Sports' },
  { w: 'JUDO', h: 'Art martial japonais', cat: 'Sports' },
  { w: 'KARATE', h: 'Art martial aux coups secs', cat: 'Sports' },
  // Pays
  { w: 'ALLEMAGNE', h: 'Pays de la bière et des saucisses', cat: 'Pays' },
  { w: 'PORTUGAL', h: 'Pays du fado et du pastel', cat: 'Pays' },
  { w: 'AUSTRALIE', h: 'Pays continent', cat: 'Pays' },
  { w: 'ARGENTINE', h: 'Pays du tango et du football', cat: 'Pays' },
  { w: 'JAPON', h: 'Pays du soleil levant', cat: 'Pays' },
  { w: 'MAROC', h: 'Pays du Maghreb royal', cat: 'Pays' },
  { w: 'MEXIQUE', h: 'Pays des tacos et mariachis', cat: 'Pays' },
  { w: 'NORVEGE', h: 'Pays des fjords', cat: 'Pays' },
  { w: 'SUEDE', h: 'Pays d\'IKEA et Volvo', cat: 'Pays' },
  { w: 'TURQUIE', h: 'Pays entre Europe et Asie', cat: 'Pays' },
  { w: 'TUNISIE', h: 'Pays d\'Afrique du Nord', cat: 'Pays' },
  { w: 'POLOGNE', h: 'Pays d\'Europe centrale', cat: 'Pays' },
  { w: 'UKRAINE', h: 'Grand pays d\'Europe de l\'Est', cat: 'Pays' },
  { w: 'NIGERIA', h: 'Pays le plus peuplé d\'Afrique', cat: 'Pays' },
  { w: 'COLOMBIE', h: 'Pays du café et d\'Escobar', cat: 'Pays' },
  // Couleurs
  { w: 'TURQUOISE', h: 'Bleu-vert des mers tropicales', cat: 'Couleurs' },
  { w: 'ECARLATE', h: 'Rouge vif intense', cat: 'Couleurs' },
  { w: 'VERMILLON', h: 'Rouge orangé vif', cat: 'Couleurs' },
  { w: 'INDIGO', h: 'Bleu violet profond', cat: 'Couleurs' },
  { w: 'MAGENTA', h: 'Rose fuchsia', cat: 'Couleurs' },
  { w: 'OCRE', h: 'Jaune brun terreux', cat: 'Couleurs' },
  { w: 'BEIGE', h: 'Blanc cassé chaleureux', cat: 'Couleurs' },
  { w: 'BORDEAUX', h: 'Rouge sombre comme le vin', cat: 'Couleurs' },
  { w: 'GRENAT', h: 'Rouge profond pierreux', cat: 'Couleurs' },
  { w: 'LILAS', h: 'Violet clair fleuri', cat: 'Couleurs' },
  { w: 'IVOIRE', h: 'Blanc légèrement jaune', cat: 'Couleurs' },
  { w: 'SAUMON', h: 'Rose orangé comme le poisson', cat: 'Couleurs' },
  { w: 'MARINE', h: 'Bleu foncé marin', cat: 'Couleurs' },
  { w: 'CORAIL', h: 'Orange rosé comme le corail', cat: 'Couleurs' },
  { w: 'CITRON', h: 'Jaune vif comme le fruit', cat: 'Couleurs' },
  // Nature
  { w: 'MONTAGNE', h: 'Relief élevé', cat: 'Nature' },
  { w: 'VOLCAN', h: 'Montagne crachant de la lave', cat: 'Nature' },
  { w: 'GLACIER', h: 'Fleuve de glace', cat: 'Nature' },
  { w: 'CASCADE', h: 'Chute d\'eau naturelle', cat: 'Nature' },
  { w: 'MANGROVE', h: 'Forêt de palétuviers côtière', cat: 'Nature' },
  { w: 'SAVANE', h: 'Plaine herbeuse tropicale', cat: 'Nature' },
  { w: 'TOUNDRA', h: 'Plaine froide arctique', cat: 'Nature' },
  { w: 'PRAIRIE', h: 'Étendue herbacée ouverte', cat: 'Nature' },
  { w: 'FALAISE', h: 'Paroi rocheuse à pic', cat: 'Nature' },
  { w: 'TEMPETE', h: 'Forte perturbation atmosphérique', cat: 'Nature' },
  { w: 'ORAGE', h: 'Pluie avec tonnerre et éclairs', cat: 'Nature' },
  { w: 'TORNADE', h: 'Tourbillon de vent violent', cat: 'Nature' },
  { w: 'AURORE', h: 'Lumières colorées polaires', cat: 'Nature' },
  { w: 'BROUILLARD', h: 'Nuage au ras du sol', cat: 'Nature' },
  { w: 'GROTTE', h: 'Cavité naturelle dans la roche', cat: 'Nature' },
  // Métiers
  { w: 'BOULANGER', h: 'Artisan du pain', cat: 'Métiers' },
  { w: 'CHIRURGIEN', h: 'Médecin qui opère', cat: 'Métiers' },
  { w: 'ARCHITECTE', h: 'Concepteur de bâtiments', cat: 'Métiers' },
  { w: 'POMPIER', h: 'Héros contre les incendies', cat: 'Métiers' },
  { w: 'MENUISIER', h: 'Artisan du bois', cat: 'Métiers' },
  { w: 'ELECTRICIEN', h: 'Technicien des circuits', cat: 'Métiers' },
  { w: 'PLOMBIER', h: 'Technicien de la tuyauterie', cat: 'Métiers' },
  { w: 'DIPLOMATE', h: 'Représentant d\'un pays', cat: 'Métiers' },
  { w: 'ASTRONOME', h: 'Scientifique des étoiles', cat: 'Métiers' },
  { w: 'BOTANISTE', h: 'Scientifique des plantes', cat: 'Métiers' },
  { w: 'JOURNALISTE', h: 'Professionnel de l\'info', cat: 'Métiers' },
  { w: 'PHOTOGRAPHE', h: 'Artiste de l\'image', cat: 'Métiers' },
  { w: 'BIBLIOTHECAIRE', h: 'Gardien des livres', cat: 'Métiers' },
  { w: 'VETERINAIRE', h: 'Médecin des animaux', cat: 'Métiers' },
  { w: 'PHARMACIEN', h: 'Expert des médicaments', cat: 'Métiers' },
  // Objets
  { w: 'PARAPLUIE', h: 'Protection contre la pluie', cat: 'Objets' },
  { w: 'TELESCOPE', h: 'Instrument d\'observation des étoiles', cat: 'Objets' },
  { w: 'MICROSCOPE', h: 'Instrument d\'observation du minuscule', cat: 'Objets' },
  { w: 'BOUSSOLE', h: 'Instrument d\'orientation', cat: 'Objets' },
  { w: 'HORLOGE', h: 'Instrument qui mesure le temps', cat: 'Objets' },
  { w: 'CHANDELIER', h: 'Support à bougies', cat: 'Objets' },
  { w: 'ACCORDEON', h: 'Instrument de musique soufflet', cat: 'Objets' },
  { w: 'TROMPETTE', h: 'Instrument à vent en cuivre', cat: 'Objets' },
  { w: 'VIOLONCELLE', h: 'Grand violon joué assis', cat: 'Objets' },
  { w: 'XYLOPHONE', h: 'Instrument à lames frappées', cat: 'Objets' },
  { w: 'KALÉIDOSCOPE', h: 'Tube aux reflets colorés', cat: 'Objets' },
  { w: 'THERMOSTAT', h: 'Régulateur de température', cat: 'Objets' },
  { w: 'PERISCOPE', h: 'Instrument optique de sous-marin', cat: 'Objets' },
  { w: 'CATAPULTE', h: 'Machine de guerre médiévale', cat: 'Objets' },
  { w: 'PENDULE', h: 'Poids oscillant régulier', cat: 'Objets' },
]

const CATEGORIES: Category[] = ['Animaux', 'Nourriture', 'Sports', 'Pays', 'Couleurs', 'Nature', 'Métiers', 'Objets']
const CAT_ICONS: Record<Category, string> = {
  Animaux: '🦁', Nourriture: '🍕', Sports: '⚽', Pays: '🌍',
  Couleurs: '🎨', Nature: '🌿', Métiers: '🔧', Objets: '🎸',
}
const TIME_MODES = [60, 90, 120]

// Letter colors by frequency tier
const LETTER_COLORS: Record<string, string> = {
  E: '#a855f7', A: '#06b6d4', I: '#f59e0b', S: '#22c55e', N: '#ef4444',
  R: '#ec4899', T: '#8b5cf6', O: '#14b8a6', L: '#f97316', U: '#3b82f6',
  D: '#a3e635', C: '#fb7185', M: '#fbbf24', P: '#60a5fa', V: '#34d399',
  H: '#c084fc', G: '#f87171', F: '#38bdf8', B: '#a78bfa', J: '#4ade80',
  Q: '#fde68a', X: '#fca5a5', Y: '#93c5fd', Z: '#6ee7b7', W: '#d8b4fe', K: '#fed7aa',
}

function scramble(w: string): string {
  const arr = w.split('')
  let result: string
  let attempts = 0
  do {
    result = arr.sort(() => Math.random() - 0.5).join('')
    attempts++
  } while (result === w && attempts < 20)
  return result
}

function getLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function setLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

interface Stats { solved: number; totalTime: number; bestStreak: number; bestScore: number }

// ─── Confetti ────────────────────────────────────────────────────────────────
function ConfettiParticle({ x, color }: { x: number; color: string }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-sm pointer-events-none"
      style={{
        left: `${x}%`,
        top: '-10px',
        background: color,
        animation: `confettiFall ${0.8 + Math.random() * 0.8}s ease-in forwards`,
        transform: `rotate(${Math.random() * 360}deg)`,
      }}
    />
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WordScrambleGame({ onBack }: { onBack?: () => void }) {
  const [screen, setScreen] = useState<'menu' | 'game' | 'end'>('menu')
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Tout'>('Tout')
  const [timeMode, setTimeMode] = useState(90)
  const [wordPool, setWordPool] = useState<Word[]>([])
  const [wordIndex, setWordIndex] = useState(0)
  const [tiles, setTiles] = useState<{ letter: string; id: number; placed: boolean }[]>([])
  const [slots, setSlots] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(90)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [hintUsed, setHintUsed] = useState(false)
  const [wordStartTime, setWordStartTime] = useState(Date.now())
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [wordsScored, setWordsScored] = useState(0)
  const [totalTimeUsed, setTotalTimeUsed] = useState(0)
  const [stats] = useState<Stats>(() => getLS('scramble_stats', { solved: 0, totalTime: 0, bestStreak: 0, bestScore: 0 }))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentWord = wordPool[wordIndex]

  // ── Timer ──
  useEffect(() => {
    if (screen !== 'game') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { endGame(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [screen, wordIndex])

  const buildTiles = useCallback((word: string) => {
    const scrambled = scramble(word)
    setTiles(scrambled.split('').map((letter, i) => ({ letter, id: i, placed: false })))
    setSlots(Array(word.length).fill(null))
    setHintUsed(false)
    setWordStartTime(Date.now())
  }, [])

  const startGame = () => {
    const pool = (selectedCategory === 'Tout' ? WORD_BANK : WORD_BANK.filter(w => w.cat === selectedCategory))
      .sort(() => Math.random() - 0.5)
    setWordPool(pool)
    setWordIndex(0)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setWordsScored(0)
    setTotalTimeUsed(0)
    setTimeLeft(timeMode)
    setFeedback(null)
    setScreen('game')
    buildTiles(pool[0]?.w ?? 'CHAT')
  }

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setScreen('end')
    // Save stats
    const elapsed = Math.round((Date.now() - wordStartTime) / 1000)
    const newStats: Stats = {
      solved: stats.solved + wordsScored,
      totalTime: stats.totalTime + totalTimeUsed + elapsed,
      bestStreak: Math.max(stats.bestStreak, bestStreak),
      bestScore: Math.max(stats.bestScore, score),
    }
    setLS('scramble_stats', newStats)
  }

  const clickTile = (tileId: number) => {
    if (feedback) return
    const emptySlot = slots.findIndex(s => s === null)
    if (emptySlot === -1) return
    setTiles(prev => prev.map(t => t.id === tileId ? { ...t, placed: true } : t))
    const newSlots = [...slots]
    newSlots[emptySlot] = tileId
    setSlots(newSlots)
    // Auto-check when all slots filled
    const filled = newSlots.filter(s => s !== null).length
    if (filled === (currentWord?.w.length ?? 0)) {
      checkAnswer(newSlots)
    }
  }

  const clickSlot = (slotIdx: number) => {
    if (feedback) return
    const tileId = slots[slotIdx]
    if (tileId === null) return
    setTiles(prev => prev.map(t => t.id === tileId ? { ...t, placed: false } : t))
    const newSlots = [...slots]
    newSlots[slotIdx] = null
    setSlots(newSlots)
  }

  const checkAnswer = (currentSlots: (number | null)[]) => {
    if (!currentWord) return
    const answer = currentSlots.map(id => id !== null ? tiles[id]?.letter ?? '' : '').join('')
    const isCorrect = answer === currentWord.w
    if (isCorrect) {
      const elapsed = Math.round((Date.now() - wordStartTime) / 1000)
      const speedBonus = Math.max(1, 30 - elapsed)
      const lengthPts = currentWord.w.length * 10
      const streakBonus = streak >= 3 ? 2 : streak >= 1 ? 1.5 : 1
      const pts = Math.round((lengthPts + speedBonus) * streakBonus) - (hintUsed ? 50 : 0)
      const finalPts = Math.max(10, pts)
      setScore(s => s + finalPts)
      setStreak(s => { const ns = s + 1; setBestStreak(b => Math.max(b, ns)); return ns })
      setWordsScored(w => w + 1)
      setTotalTimeUsed(t => t + elapsed)
      setFeedback('correct')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1500)
      setTimeout(() => nextWord(), 1000)
    } else {
      setFeedback('wrong')
      setStreak(0)
      setTimeout(() => {
        // Reset tiles to scrambled
        buildTiles(currentWord.w)
        setFeedback(null)
      }, 900)
    }
  }

  const nextWord = () => {
    const next = wordIndex + 1
    if (next >= wordPool.length) { endGame(); return }
    setWordIndex(next)
    setFeedback(null)
    buildTiles(wordPool[next].w)
  }

  const useHint = () => {
    if (hintUsed || !currentWord || feedback) return
    setHintUsed(true)
    // Reveal first correct letter in first empty slot
    const firstEmpty = slots.findIndex(s => s === null)
    if (firstEmpty === -1) return
    const targetLetter = currentWord.w[firstEmpty]
    const availTile = tiles.find(t => !t.placed && t.letter === targetLetter)
    if (!availTile) return
    const newSlots = [...slots]
    newSlots[firstEmpty] = availTile.id
    setSlots(newSlots)
    setTiles(prev => prev.map(t => t.id === availTile.id ? { ...t, placed: true } : t))
    // Auto-check if all filled
    const filled = newSlots.filter(s => s !== null).length
    if (filled === currentWord.w.length) checkAnswer(newSlots)
  }

  const resetTiles = () => {
    if (!currentWord) return
    buildTiles(currentWord.w)
  }

  const timerPct = (timeLeft / timeMode) * 100
  const timerColor = timeLeft > timeMode * 0.4 ? '#22c55e' : timeLeft > timeMode * 0.2 ? '#f59e0b' : '#ef4444'

  // ── MENU SCREEN ──
  if (screen === 'menu') return (
    <div className="space-y-4">
      <style>{`@keyframes confettiFall { to { transform: translateY(400px) rotate(720deg); opacity: 0; } }`}</style>
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
          <ChevronLeft size={18} />
        </button>
        <span className="font-black text-lg" style={{ color: TEXT }}>🔀 Anagramme Pro</span>
      </div>

      {/* Best score banner */}
      {stats.bestScore > 0 && (
        <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: `${SURFACE}`, border: `1px solid ${BORDER}` }}>
          <Trophy size={20} style={{ color: '#f59e0b' }} />
          <div>
            <p className="text-xs" style={{ color: MUTED }}>Meilleur score</p>
            <p className="font-black text-lg" style={{ color: '#f59e0b' }}>{stats.bestScore} pts</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs" style={{ color: MUTED }}>Mots résolus</p>
            <p className="font-bold" style={{ color: TEXT }}>{stats.solved}</p>
          </div>
        </div>
      )}

      {/* Category selector */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: MUTED }}>Catégorie</p>
        <div className="grid grid-cols-3 gap-2">
          {(['Tout', ...CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as Category | 'Tout')}
              className="rounded-xl py-2 px-2 text-xs font-semibold transition-all"
              style={{
                background: selectedCategory === cat ? ACCENT : SURFACE2,
                border: `1px solid ${selectedCategory === cat ? ACCENT : BORDER}`,
                color: selectedCategory === cat ? '#fff' : TEXT,
              }}
            >
              {cat === 'Tout' ? '✨ Tout' : `${CAT_ICONS[cat as Category]} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* Time mode */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: MUTED }}>Durée</p>
        <div className="grid grid-cols-3 gap-2">
          {TIME_MODES.map(t => (
            <button
              key={t}
              onClick={() => setTimeMode(t)}
              className="rounded-xl py-2 px-3 text-sm font-bold transition-all flex items-center justify-center gap-1"
              style={{
                background: timeMode === t ? ACCENT : SURFACE2,
                border: `1px solid ${timeMode === t ? ACCENT : BORDER}`,
                color: timeMode === t ? '#fff' : TEXT,
              }}
            >
              <Clock size={12} /> {t}s
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={startGame}
        className="w-full py-3.5 rounded-2xl font-black text-base"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: '#fff' }}
      >
        Jouer 🚀
      </button>
    </div>
  )

  // ── END SCREEN ──
  if (screen === 'end') {
    const bestScore = getLS<Stats>('scramble_stats', { solved: 0, totalTime: 0, bestStreak: 0, bestScore: 0 }).bestScore
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
            <ChevronLeft size={18} />
          </button>
          <span className="font-black text-lg" style={{ color: TEXT }}>🔀 Anagramme Pro</span>
        </div>
        <div className="rounded-2xl p-6 text-center space-y-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="text-5xl">{score >= 500 ? '🏆' : score >= 200 ? '🎯' : '💪'}</div>
          <p className="font-black text-4xl" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {score}
          </p>
          <p className="text-sm" style={{ color: MUTED }}>points</p>
          {score >= bestScore && score > 0 && (
            <div className="rounded-xl px-4 py-2 inline-block text-xs font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              🏆 Nouveau record !
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Mots résolus', val: wordsScored, icon: '✓' },
              { label: 'Meilleure série', val: bestStreak, icon: '🔥' },
              { label: 'Temps moyen', val: wordsScored ? `${Math.round(totalTimeUsed / wordsScored)}s` : '—', icon: '⏱' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5" style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}>
                <p className="text-lg font-black" style={{ color: TEXT }}>{s.icon} {s.val}</p>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setScreen('menu')} className="py-3 rounded-2xl font-bold text-sm"
            style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}>
            ← Menu
          </button>
          <button onClick={startGame} className="py-3 rounded-2xl font-black text-sm"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: '#fff' }}>
            Rejouer 🔄
          </button>
        </div>
      </div>
    )
  }

  // ── GAME SCREEN ──
  return (
    <div className="space-y-3 relative">
      <style>{`
        @keyframes confettiFall { to { transform: translateY(500px) rotate(720deg); opacity: 0; } }
        @keyframes correctPop { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes wrongShake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes tileIn { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none" style={{ height: 300, zIndex: 50 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <ConfettiParticle key={i} x={Math.random() * 100} color={['#a855f7', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444', '#ec4899'][i % 6]} />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setScreen('menu') }}
            className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
            <ChevronLeft size={18} />
          </button>
          <span className="font-black text-sm" style={{ color: TEXT }}>
            {CAT_ICONS[currentWord?.cat ?? 'Animaux']} {currentWord?.cat}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: MUTED }}>Mot {wordIndex + 1}/{wordPool.length}</span>
          <span className="font-black" style={{ color: ACCENT }}>{score} pts</span>
          {streak >= 2 && <span style={{ color: '#f59e0b' }}>{streak}🔥</span>}
        </div>
      </div>

      {/* Timer bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: MUTED }}>Temps</span>
          <span className="font-bold" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
        <div className="rounded-full h-2 overflow-hidden" style={{ background: SURFACE2 }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>
      </div>

      {/* Word card */}
      <div className="rounded-2xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <p className="text-[11px] text-center mb-1" style={{ color: MUTED }}>
          {currentWord?.w.length} lettres{hintUsed ? ' · Indice utilisé' : ''}
        </p>
        <p className="text-sm text-center font-medium leading-snug" style={{ color: MUTED }}>
          💡 {currentWord?.h}
        </p>
      </div>

      {/* Answer slots */}
      <div
        className="flex justify-center gap-1.5 flex-wrap py-3 rounded-2xl"
        style={{
          background: feedback === 'correct' ? 'rgba(34,197,94,0.08)' : feedback === 'wrong' ? 'rgba(239,68,68,0.08)' : SURFACE2,
          border: `1px solid ${feedback === 'correct' ? 'rgba(34,197,94,0.3)' : feedback === 'wrong' ? 'rgba(239,68,68,0.3)' : BORDER}`,
          animation: feedback === 'correct' ? 'correctPop 0.4s ease' : feedback === 'wrong' ? 'wrongShake 0.4s ease' : undefined,
        }}
      >
        {slots.map((tileId, i) => {
          const letter = tileId !== null ? tiles[tileId]?.letter : null
          const isHint = hintUsed && letter && i < slots.filter(s => s !== null).length
          return (
            <button
              key={i}
              onClick={() => clickSlot(i)}
              className="rounded-xl flex items-center justify-center font-black text-base transition-all"
              style={{
                width: Math.min(38, Math.floor(280 / (currentWord?.w.length ?? 1)) - 2),
                height: 42,
                background: letter ? (isHint ? 'rgba(6,182,212,0.15)' : SURFACE) : 'transparent',
                border: `2px solid ${letter ? (LETTER_COLORS[letter] ?? ACCENT) : 'rgba(255,255,255,0.1)'}`,
                color: letter ? (LETTER_COLORS[letter] ?? ACCENT) : MUTED,
                cursor: letter ? 'pointer' : 'default',
              }}
            >
              {letter ?? '_'}
            </button>
          )
        })}
      </div>

      {/* Available tiles */}
      <div className="flex justify-center gap-2 flex-wrap min-h-[52px]">
        {tiles.map(tile => {
          if (tile.placed) return <div key={tile.id} style={{ width: 40, height: 46 }} />
          return (
            <button
              key={tile.id}
              onClick={() => clickTile(tile.id)}
              className="rounded-xl flex items-center justify-center font-black text-base transition-all hover:scale-110 active:scale-95"
              style={{
                width: 40,
                height: 46,
                background: `${LETTER_COLORS[tile.letter] ?? ACCENT}20`,
                border: `2px solid ${LETTER_COLORS[tile.letter] ?? ACCENT}`,
                color: LETTER_COLORS[tile.letter] ?? ACCENT,
                animation: 'tileIn 0.2s ease',
                boxShadow: `0 4px 12px ${LETTER_COLORS[tile.letter] ?? ACCENT}30`,
              }}
            >
              {tile.letter}
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={resetTiles}
          className="rounded-xl p-2.5 flex items-center gap-1.5 text-xs font-semibold"
          style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: MUTED }}
        >
          <RotateCcw size={13} /> Remélanger
        </button>
        <button
          onClick={useHint}
          disabled={hintUsed}
          className="flex-1 rounded-xl p-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold"
          style={{
            background: hintUsed ? SURFACE2 : 'rgba(6,182,212,0.1)',
            border: `1px solid ${hintUsed ? BORDER : ACCENT2}`,
            color: hintUsed ? MUTED : ACCENT2,
          }}
        >
          <Zap size={13} /> Indice {hintUsed ? '(utilisé)' : ''}
        </button>
        <button
          onClick={() => nextWord()}
          className="rounded-xl p-2.5 text-xs font-semibold"
          style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: MUTED }}
        >
          Passer →
        </button>
      </div>

      {/* Streak banner */}
      {streak >= 3 && (
        <div className="rounded-xl py-1.5 text-center text-xs font-black"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
          🔥 Série de {streak} ! Multiplicateur ×{streak >= 3 ? '2' : '1.5'}
        </div>
      )}

      {/* Stats row */}
      <div className="flex justify-between text-[10px] px-1" style={{ color: MUTED }}>
        <span>✓ {wordsScored} mots</span>
        <span>⏱ moy. {wordsScored ? Math.round(totalTimeUsed / wordsScored) : 0}s</span>
        <span style={{ color: '#f59e0b' }}>🏆 Record: {Math.max(score, stats.bestScore)} pts</span>
      </div>
    </div>
  )
}
