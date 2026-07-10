import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ActionButton,
  CardBack,
  Game3DShell,
  MiniCard,
  StatPill,
  ghostButtonStyle,
} from './arcade3d'
import { ACCENT, ACCENT2, BORDER, MUTED, SURFACE2, TEXT } from './theme'
import GameOverModal from './GameOverModal'
import { useGameScore } from './useGameScore'

type GameProps = { onBack?: () => void }
type CardSuit = 'S' | 'H' | 'D' | 'C'
type Card = { id: string; rank: string; suit: CardSuit; value: number }
type Tile = { id: string; color: string; number: number }

const cardSuits: CardSuit[] = ['S', 'H', 'D', 'C']
const cardRanks = [
  { rank: 'A', value: 1 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
]

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function makeDeck(prefix = 'deck') {
  return shuffle(cardSuits.flatMap((suit) => cardRanks.map((card) => ({
    id: `${prefix}-${card.rank}-${suit}`,
    suit,
    rank: card.rank,
    value: card.value,
  }))))
}

function cardPoints(card: Card) {
  return Math.min(card.value, 10)
}

function drawCards(deck: Card[], count: number) {
  return { hand: deck.slice(0, count), deck: deck.slice(count) }
}

function gameSide({
  stats,
  message,
  children,
}: {
  stats: { label: string; value: ReactNode; color?: string }[]
  message: string
  children?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {stats.map((stat) => <StatPill key={stat.label} {...stat} />)}
      </div>
      <div style={hintStyle}>{message}</div>
      {children}
    </div>
  )
}

function Stage({
  children,
  tone,
  floor,
}: {
  children: ReactNode
  tone: 'terrace' | 'felt' | 'court' | 'pool' | 'bamboo' | 'salon' | 'neon'
  floor?: CSSProperties
}) {
  return (
    <div style={{ ...stageStyle, background: stageBackground(tone) }}>
      <div style={distantDecorStyle(tone)} />
      <div style={stageSetPieceStyle(tone, 'left')} />
      <div style={stageSetPieceStyle(tone, 'right')} />
      <div style={{ ...floorStyle, ...floor }} />
      <div style={stageContentStyle}>{children}</div>
    </div>
  )
}

function stageBackground(tone: Parameters<typeof Stage>[0]['tone']) {
  if (tone === 'court') return 'linear-gradient(180deg, #082f49 0%, #0f172a 45%, #111827 100%)'
  if (tone === 'pool') return 'linear-gradient(180deg, #1f2937 0%, #0f172a 52%, #020617 100%)'
  if (tone === 'bamboo') return 'linear-gradient(180deg, #064e3b 0%, #0f172a 70%)'
  if (tone === 'salon') return 'linear-gradient(180deg, #3b1d1d 0%, #101827 68%)'
  if (tone === 'neon') return 'linear-gradient(180deg, #17113a 0%, #070710 72%)'
  if (tone === 'felt') return 'radial-gradient(circle at 50% 0%, #14532d 0%, #052e16 48%, #020617 100%)'
  return 'linear-gradient(180deg, #0c4a6e 0%, #12361f 56%, #111827 100%)'
}

function distantDecorStyle(tone: Parameters<typeof Stage>[0]['tone']): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.9,
  }
  if (tone === 'terrace') {
    return {
      ...base,
      background:
        'radial-gradient(circle at 16% 24%, rgba(34,197,94,0.42) 0 42px, transparent 43px), radial-gradient(circle at 23% 28%, rgba(22,163,74,0.36) 0 30px, transparent 31px), linear-gradient(90deg, transparent 0 68%, rgba(148,163,184,0.12) 68% 70%, transparent 70%), linear-gradient(0deg, transparent 0 58%, rgba(255,255,255,0.12) 58% 60%, transparent 60%)',
    }
  }
  if (tone === 'court') {
    return { ...base, background: 'linear-gradient(90deg, transparent 0 14%, rgba(255,255,255,0.08) 14.5% 15%, transparent 15.5% 85%, rgba(255,255,255,0.08) 85.5% 86%, transparent 86.5%), radial-gradient(circle at 50% 18%, rgba(245,158,11,0.2), transparent 18%)' }
  }
  if (tone === 'pool') {
    return { ...base, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 80px), linear-gradient(180deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 80px)' }
  }
  if (tone === 'bamboo') {
    return { ...base, background: 'repeating-linear-gradient(90deg, rgba(187,247,208,0.12) 0 5px, transparent 5px 42px), radial-gradient(circle at 18% 20%, rgba(250,204,21,0.2), transparent 18%)' }
  }
  if (tone === 'salon') {
    return { ...base, background: 'radial-gradient(circle at 22% 12%, rgba(245,158,11,0.26), transparent 18%), linear-gradient(90deg, transparent 0 70%, rgba(148,163,184,0.1) 70% 72%, transparent 72%)' }
  }
  if (tone === 'neon') {
    return { ...base, background: 'radial-gradient(circle at 18% 18%, rgba(6,182,212,0.26), transparent 18%), radial-gradient(circle at 80% 24%, rgba(236,72,153,0.2), transparent 18%)' }
  }
  return { ...base, background: 'radial-gradient(circle at 50% 0%, rgba(34,197,94,0.22), transparent 26%)' }
}

function stageSetPieceStyle(tone: Parameters<typeof Stage>[0]['tone'], side: 'left' | 'right'): CSSProperties {
  const isLeft = side === 'left'
  const colors: Record<Parameters<typeof Stage>[0]['tone'], [string, string]> = {
    terrace: ['#22c55e', '#92400e'],
    felt: ['#16a34a', '#064e3b'],
    court: ['#f97316', '#0ea5e9'],
    pool: ['#0f766e', '#78350f'],
    bamboo: ['#84cc16', '#166534'],
    salon: ['#f59e0b', '#7f1d1d'],
    neon: ['#06b6d4', '#a855f7'],
  }
  const [primary, secondary] = colors[tone]
  return {
    position: 'absolute',
    left: isLeft ? '5%' : undefined,
    right: isLeft ? undefined : '5%',
    bottom: isLeft ? 42 : 58,
    width: isLeft ? 86 : 118,
    height: isLeft ? 42 : 52,
    borderRadius: '50%',
    background: `linear-gradient(145deg, ${primary}, ${secondary})`,
    opacity: 0.38,
    transform: `rotateX(62deg) rotateZ(${isLeft ? -8 : 12}deg)`,
    boxShadow: `0 22px 34px rgba(0,0,0,0.34), inset 0 5px 0 rgba(255,255,255,0.18)`,
    pointerEvents: 'none',
    zIndex: 1,
  }
}

const mahjongFaces = ['bam', 'lotus', 'moon', 'sun', 'tea', 'chef', 'tower', 'leaf', 'wok', 'rice', 'star', 'bell']

function createMahjongTiles() {
  return shuffle(mahjongFaces.flatMap((face) => [0, 1].map((copy) => ({ id: `${face}-${copy}`, face, matched: false }))))
}

export function MahjongGame({ onBack }: GameProps) {
  const [tiles, setTiles] = useState(createMahjongTiles)
  const [revealed, setRevealed] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [locked, setLocked] = useState(false)
  const [message, setMessage] = useState('Retournez deux tuiles pour trouver une paire.')
  const [gameOver, setGameOver] = useState(false)
  const timerRef = useRef<number>()

  const { best, submit } = useGameScore('mahjong3d')
  const [isNewRecord, setIsNewRecord] = useState(false)

  const matchedCount = tiles.filter((tile) => tile.matched).length
  const score = Math.max(0, 1000 - moves * 10 - seconds * 2)

  useEffect(() => {
    if (gameOver) return
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(timerRef.current)
  }, [gameOver])

  useEffect(() => {
    if (matchedCount === tiles.length && tiles.length > 0 && !gameOver) {
      setGameOver(true)
      const record = submit(score)
      setIsNewRecord(record)
    }
  }, [matchedCount, tiles.length, gameOver, score, submit])

  const clickTile = (id: string) => {
    if (locked) return
    const tile = tiles.find((item) => item.id === id)
    if (!tile || tile.matched || revealed.includes(id)) return

    if (!selected) {
      setSelected(id)
      setRevealed((list) => [...list, id])
      return
    }
    if (selected === id) return

    const first = tiles.find((item) => item.id === selected)
    setRevealed((list) => [...list, id])
    setMoves((value) => value + 1)

    if (first?.face === tile.face) {
      setTiles((list) => list.map((item) => item.face === tile.face ? { ...item, matched: true } : item))
      setSelected(null)
      setMessage('Paire valide.')
    } else {
      setLocked(true)
      setMessage('Pas la bonne paire, memorisez la position.')
      window.setTimeout(() => {
        setRevealed((list) => list.filter((r) => r !== id && r !== selected))
        setSelected(null)
        setLocked(false)
      }, 900)
    }
  }

  const restart = () => {
    setTiles(createMahjongTiles())
    setRevealed([])
    setSelected(null)
    setMoves(0)
    setSeconds(0)
    setGameOver(false)
    setIsNewRecord(false)
    setMessage('Plateau melange.')
  }

  return (
    <>
    <Game3DShell
      title="Mahjong Bamboo 3D"
      subtitle="Memory chronometre, tuiles face cachee"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Paires', value: `${matchedCount / 2}/12`, color: '#22c55e' },
          { label: 'Coups', value: moves, color: ACCENT2 },
          { label: 'Temps', value: `${seconds}s`, color: '#f59e0b' },
        ],
        message,
        children: <button onClick={restart} style={ghostButtonStyle}>Melanger</button>,
      })}
    >
      <Stage tone="bamboo">
        <div style={mahjongGridStyle}>
          {tiles.map((tile, index) => {
            const faceUp = tile.matched || revealed.includes(tile.id)
            return (
              <button
                key={tile.id}
                onClick={() => clickTile(tile.id)}
                style={{
                  ...mahjongTileStyle,
                  transform: `translateZ(${(index % 3) * 2}px) rotateX(10deg)`,
                  opacity: tile.matched ? 0.22 : 1,
                  borderColor: selected === tile.id ? ACCENT2 : 'rgba(255,255,255,0.18)',
                  background: faceUp ? undefined : '#0f766e',
                }}
              >
                {faceUp ? (
                  <>
                    <span style={mahjongGlyphStyle}>{tileFace(tile.face)}</span>
                    <span style={{ fontSize: 10, color: '#064e3b', fontWeight: 900 }}>{tile.face}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)' }}>?</span>
                )}
              </button>
            )
          })}
        </div>
      </Stage>
    </Game3DShell>
    {gameOver && (
      <GameOverModal score={score} best={best} isNewRecord={isNewRecord} onReplay={restart} onBack={onBack} />
    )}
    </>
  )
}

function tileFace(face: string) {
  const faces: Record<string, string> = {
    bam: 'III',
    lotus: '*',
    moon: 'C',
    sun: 'O',
    tea: 'T',
    chef: 'H',
    tower: 'A',
    leaf: 'Y',
    wok: 'W',
    rice: '#',
    star: '+',
    bell: 'B',
  }
  return faces[face] ?? '?'
}

const differences = [
  { id: 'tower-light', label: 'lumiere tour', x: 72, y: 16 },
  { id: 'tree-fruit', label: 'fruit arbre', x: 19, y: 23 },
  { id: 'menu-price', label: 'prix menu', x: 51, y: 42 },
  { id: 'chair', label: 'chaise', x: 67, y: 62 },
  { id: 'cup', label: 'tasse', x: 31, y: 64 },
  { id: 'lamp', label: 'lampe', x: 83, y: 41 },
  { id: 'stripe', label: 'store', x: 42, y: 22 },
  { id: 'plate', label: 'assiette', x: 47, y: 67 },
  { id: 'window', label: 'fenetre', x: 73, y: 35 },
  { id: 'path', label: 'dalle', x: 57, y: 82 },
  { id: 'flower', label: 'fleur', x: 16, y: 72 },
]

export function SpotErrorGame({ onBack }: GameProps) {
  const [found, setFound] = useState<string[]>([])
  const [message, setMessage] = useState('Reperez les 11 erreurs dans la scene de droite.')
  const mark = (id: string, label: string) => {
    if (found.includes(id)) return
    const next = [...found, id]
    setFound(next)
    setMessage(next.length === differences.length ? 'Parfait, les 11 erreurs sont trouvees.' : `Trouve: ${label}.`)
  }

  return (
    <Game3DShell
      title="Erreur 11 Terrasse"
      subtitle="Trouver les differences, decor arbre et tour"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Trouvees', value: `${found.length}/11`, color: '#22c55e' },
          { label: 'Restantes', value: 11 - found.length, color: '#f59e0b' },
        ],
        message,
        children: <button onClick={() => { setFound([]); setMessage('Nouvelle observation.') }} style={ghostButtonStyle}>Recommencer</button>,
      })}
    >
      <Stage tone="terrace">
        <div style={spotWrapperStyle}>
          <BistroScene variant="left" />
          <div style={{ position: 'relative' }}>
            <BistroScene variant="right" />
            {differences.map((diff) => (
              <button
                key={diff.id}
                onClick={() => mark(diff.id, diff.label)}
                title={diff.label}
                style={{
                  position: 'absolute',
                  left: `${diff.x}%`,
                  top: `${diff.y}%`,
                  width: 26,
                  height: 26,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 999,
                  border: found.includes(diff.id) ? '2px solid #22c55e' : '2px solid transparent',
                  background: found.includes(diff.id) ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </Stage>
    </Game3DShell>
  )
}

function BistroScene({ variant }: { variant: 'left' | 'right' }) {
  return (
    <div style={bistroPanelStyle}>
      <div style={{ ...sceneTreeStyle, ...(variant === 'right' ? { boxShadow: '18px -8px 0 rgba(245,158,11,0.9)' } : {}) }} />
      <div style={sceneTowerStyle}>
        <span style={{ background: variant === 'right' ? '#22c55e' : '#f59e0b' }} />
      </div>
      <div style={awningStyle}>
        <span style={{ background: variant === 'right' ? '#06b6d4' : '#ef4444' }} />
        <span />
        <span />
      </div>
      <div style={menuBoardStyle}>{variant === 'right' ? '11' : '10'}</div>
      <div style={tableSceneShapeStyle}>
        <span style={{ left: variant === 'right' ? 46 : 36 }} />
        <span style={{ background: variant === 'right' ? '#f8fafc' : '#facc15' }} />
      </div>
      <div style={{ ...chairShapeStyle, right: variant === 'right' ? 40 : 56 }} />
      <div style={{ ...lampShapeStyle, opacity: variant === 'right' ? 0.35 : 1 }} />
      <div style={{ ...flowerShapeStyle, transform: variant === 'right' ? 'scale(1.25)' : 'scale(1)' }} />
    </div>
  )
}

function createRun21Deck() {
  return shuffle(makeDeck('run21').map((card) => ({ ...card, value: Math.min(card.value, 10) })))
}

export function Run21Game({ onBack }: GameProps) {
  const initial = useMemo(() => createRun21Deck(), [])
  const [deck, setDeck] = useState(initial.slice(1))
  const [current, setCurrent] = useState<Card | null>(initial[0])
  const [columns, setColumns] = useState<Card[][]>([[], [], [], [], []])
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState('Placez les cartes dans 5 colonnes sans depasser 21.')

  const sums = columns.map((column) => column.reduce((sum, card) => sum + card.value, 0))
  const locked = current ? sums.every((sum) => sum + current.value > 21) : true

  const place = (index: number) => {
    if (!current) return
    if (sums[index] + current.value > 21) {
      setMessage('Colonne trop haute.')
      return
    }
    const nextColumns = columns.map((column, colIndex) => colIndex === index ? [...column, current] : column)
    const nextSum = sums[index] + current.value
    setColumns(nextColumns)
    setScore((value) => value + current.value + (nextSum === 21 ? 25 : 0))
    setCurrent(deck[0] ?? null)
    setDeck((list) => list.slice(1))
    setMessage(nextSum === 21 ? 'Run 21 parfait: bonus.' : 'Carte posee.')
  }

  const reset = () => {
    const next = createRun21Deck()
    setDeck(next.slice(1))
    setCurrent(next[0])
    setColumns([[], [], [], [], []])
    setScore(0)
    setMessage('Nouvelle grille Run 21.')
  }

  return (
    <Game3DShell
      title="Run 21 Creorga"
      subtitle="Arcade cartes: 5 colonnes, objectif 21"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Score', value: score, color: '#f59e0b' },
          { label: 'Pioche', value: deck.length, color: ACCENT2 },
        ],
        message: locked ? 'Plus aucun placement possible. Relancez une grille.' : message,
        children: <button onClick={reset} style={ghostButtonStyle}>Nouvelle grille</button>,
      })}
    >
      <Stage tone="felt">
        <div style={cardArcadeLayoutStyle}>
          <div style={currentCardSlotStyle}>
            {current ? <MiniCard rank={current.rank} suit={current.suit} selected /> : <CardBack />}
          </div>
          <div style={runColumnsStyle}>
            {columns.map((column, index) => (
              <button key={index} onClick={() => place(index)} style={runColumnStyle(sums[index], current ? sums[index] + current.value <= 21 : false)}>
                <strong style={{ color: sums[index] === 21 ? '#22c55e' : TEXT }}>{sums[index]}</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                  {column.slice(-5).map((card) => <MiniCard key={card.id} rank={card.rank} suit={card.suit} small />)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Stage>
    </Game3DShell>
  )
}

function createTriCards() {
  const deck = makeDeck('tri')
  return { open: deck.slice(0, 18), stock: deck.slice(18), foundation: deck[18] }
}

function adjacent(a: Card, b: Card) {
  const lowA = a.value === 1 ? 14 : a.value
  const lowB = b.value === 1 ? 14 : b.value
  return Math.abs(lowA - lowB) === 1 || Math.abs(a.value - b.value) === 12
}

export function TriTowersGame({ onBack }: GameProps) {
  const init = useMemo(createTriCards, [])
  const [open, setOpen] = useState(init.open)
  const [stock, setStock] = useState(init.stock)
  const [foundation, setFoundation] = useState(init.foundation)
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState('Montez ou descendez d un rang pour vider les tours.')

  const play = (card: Card) => {
    if (!adjacent(card, foundation)) {
      setMessage('Il faut une carte adjacente.')
      return
    }
    setFoundation(card)
    setOpen((cards) => cards.filter((item) => item.id !== card.id))
    setScore((value) => value + 10)
    setMessage(open.length === 1 ? 'Tours nettoyees.' : 'Belle suite.')
  }

  const draw = () => {
    if (!stock.length) return
    setFoundation(stock[0])
    setStock((cards) => cards.slice(1))
    setMessage('Nouvelle carte de base.')
  }

  return (
    <Game3DShell
      title="Tri-Tours Neon"
      subtitle="Solitaire arcade reinventee, rythme Megatouch sans copie"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Score', value: score, color: '#f59e0b' },
          { label: 'Stock', value: stock.length, color: ACCENT2 },
          { label: 'Tours', value: open.length, color: '#22c55e' },
        ],
        message,
        children: <ActionButton onClick={draw} disabled={!stock.length}>Tirer</ActionButton>,
      })}
    >
      <Stage tone="neon">
        <div style={triLayoutStyle}>
          <div style={triTowersStyle}>
            {open.map((card, index) => (
              <div key={card.id} style={{ transform: `translateY(${Math.abs((index % 6) - 2.5) * 8}px)` }}>
                <MiniCard rank={card.rank} suit={card.suit} selected={adjacent(card, foundation)} onClick={() => play(card)} />
              </div>
            ))}
          </div>
          <div style={foundationStyle}>
            <CardBack />
            <MiniCard rank={foundation.rank} suit={foundation.suit} selected />
          </div>
        </div>
      </Stage>
    </Game3DShell>
  )
}

function sortHand(hand: Card[]) {
  const suitOrder: Record<CardSuit, number> = { S: 0, H: 1, D: 2, C: 3 }
  return [...hand].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || a.value - b.value)
}

function isRamiMeld(cards: Card[]) {
  if (cards.length < 3) return false
  const sameRank = cards.every((card) => card.value === cards[0].value)
  const differentSuits = new Set(cards.map((card) => card.suit)).size === cards.length
  if (sameRank && differentSuits) return true
  const sameSuit = cards.every((card) => card.suit === cards[0].suit)
  const values = cards.map((card) => card.value).sort((a, b) => a - b)
  const run = values.every((value, index) => index === 0 || value === values[index - 1] + 1)
  return sameSuit && run
}

/** Cherche une combinaison valide (meld) dans une main — brute force sur triples/quadruples. */
function findMeld(hand: Card[]): Card[] | null {
  const n = hand.length
  for (let size = 3; size <= 4; size++) {
    const combo: number[] = []
    const backtrack = (start: number): Card[] | null => {
      if (combo.length === size) {
        const cards = combo.map((i) => hand[i])
        return isRamiMeld(cards) ? cards : null
      }
      for (let i = start; i < n; i++) {
        combo.push(i)
        const found = backtrack(i + 1)
        combo.pop()
        if (found) return found
      }
      return null
    }
    const result = backtrack(0)
    if (result) return result
  }
  return null
}

export function RamiGame({ onBack }: GameProps) {
  const initial = useMemo(() => {
    const deck = makeDeck('rami')
    const player = deck.slice(0, 14)
    const cpu = deck.slice(14, 28)
    const stock = deck.slice(28)
    return { player, cpu, stock }
  }, [])
  const [deck, setDeck] = useState(initial.stock)
  const [hand, setHand] = useState(sortHand(initial.player))
  const [cpuHand, setCpuHand] = useState(initial.cpu)
  const [cpuDiscard, setCpuDiscard] = useState<Card | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [score, setScore] = useState(0)
  const [cpuScore, setCpuScore] = useState(0)
  const [mode, setMode] = useState<'normal' | 'sortie40'>('sortie40')
  const [opened, setOpened] = useState(false)
  const [message, setMessage] = useState('Selectionnez une combinaison: brelan/carre ou suite.')
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<'player' | 'cpu' | null>(null)
  const cpuTurnTimeout = useRef<number>()

  const { best, submit } = useGameScore('rami')
  const [isNewRecord, setIsNewRecord] = useState(false)

  const selectedCards = hand.filter((card) => selected.includes(card.id))
  const value = selectedCards.reduce((sum, card) => sum + cardPoints(card), 0)
  const valid = isRamiMeld(selectedCards) && (opened || mode === 'normal' || value >= 40)

  const finalScore = score + (winner === 'player' ? 50 : 0) - hand.reduce((s, c) => s + cardPoints(c), 0)

  const endGame = (who: 'player' | 'cpu') => {
    if (gameOver) return
    setGameOver(true)
    setWinner(who)
    const s = score + (who === 'player' ? 50 : 0) - hand.reduce((sum, c) => sum + cardPoints(c), 0)
    const record = submit(Math.max(0, s))
    setIsNewRecord(record)
  }

  const cpuTurn = () => {
    if (gameOver) return
    let nextHand = [...cpuHand]
    let nextDeck = deck
    if (nextDeck.length > 0) {
      nextHand = [...nextHand, nextDeck[0]]
      nextDeck = nextDeck.slice(1)
      setDeck(nextDeck)
    }
    const meld = findMeld(nextHand)
    if (meld) {
      const meldValue = meld.reduce((s, c) => s + cardPoints(c), 0)
      nextHand = nextHand.filter((c) => !meld.includes(c))
      setCpuScore((s) => s + meldValue)
      setMessage(`Le CPU pose une combinaison (${meldValue} pts).`)
    } else {
      const discardIdx = nextHand.reduce((maxI, c, i, arr) => cardPoints(c) > cardPoints(arr[maxI]) ? i : maxI, 0)
      setCpuDiscard(nextHand[discardIdx])
      nextHand = nextHand.filter((_, i) => i !== discardIdx)
      setMessage('Le CPU pioche et defausse.')
    }
    setCpuHand(nextHand)
    if (nextHand.length === 0) endGame('cpu')
  }

  const toggle = (id: string) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const meld = () => {
    if (!valid) {
      setMessage(mode === 'sortie40' && !opened ? 'Pour la sortie 40, la premiere pose doit valoir 40 points.' : 'Combinaison non valide.')
      return
    }
    setHand((cards) => cards.filter((card) => !selected.includes(card.id)))
    setScore((points) => points + value)
    setOpened(true)
    setSelected([])
    setMessage(`Combinaison posee: ${value} pts.`)
    if (hand.length - selected.length === 0) { endGame('player'); return }
    cpuTurnTimeout.current = window.setTimeout(cpuTurn, 800)
  }
  const draw = () => {
    if (!deck.length) return
    setHand((cards) => sortHand([...cards, deck[0]]))
    setDeck((cards) => cards.slice(1))
    setMessage('Carte piochee.')
    cpuTurnTimeout.current = window.setTimeout(cpuTurn, 800)
  }

  useEffect(() => () => window.clearTimeout(cpuTurnTimeout.current), [])

  const restart = () => {
    const d = makeDeck('rami')
    setHand(sortHand(d.slice(0, 14)))
    setCpuHand(d.slice(14, 28))
    setDeck(d.slice(28))
    setCpuDiscard(null)
    setSelected([])
    setScore(0)
    setCpuScore(0)
    setOpened(false)
    setGameOver(false)
    setWinner(null)
    setIsNewRecord(false)
    setMessage('Nouvelle partie contre le CPU.')
  }

  return (
    <>
    <Game3DShell
      title="Rami Salon 3D"
      subtitle="Vs CPU — mode normal ou sortie 40"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Score', value: score, color: '#f59e0b' },
          { label: 'Main', value: hand.length, color: ACCENT2 },
          { label: 'CPU', value: `${cpuHand.length} cartes`, color: '#ef4444' },
          { label: 'Pose', value: value, color: ACCENT },
        ],
        message,
        children: (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button onClick={() => setMode('sortie40')} style={{ ...ghostButtonStyle, borderColor: mode === 'sortie40' ? ACCENT : BORDER }}>Sortie 40</button>
              <button onClick={() => setMode('normal')} style={{ ...ghostButtonStyle, borderColor: mode === 'normal' ? ACCENT : BORDER }}>Normal</button>
            </div>
            <ActionButton onClick={meld} disabled={!selected.length}>Poser</ActionButton>
            <button onClick={draw} style={ghostButtonStyle}>Piocher</button>
            {cpuDiscard && (
              <div style={{ fontSize: 11, color: MUTED }}>Defausse CPU : {cpuDiscard.rank}{cpuDiscard.suit}</div>
            )}
          </>
        ),
      })}
    >
      <Stage tone="salon">
        <div style={ramiTableStyle}>
          <div style={meldPreviewStyle}>
            {selectedCards.length ? selectedCards.map((card) => <MiniCard key={card.id} rank={card.rank} suit={card.suit} selected small />) : <span>Selectionnez 3 cartes ou plus</span>}
          </div>
          <div style={ramiHandStyle}>
            {hand.map((card) => (
              <MiniCard key={card.id} rank={card.rank} suit={card.suit} selected={selected.includes(card.id)} onClick={() => toggle(card.id)} />
            ))}
          </div>
        </div>
      </Stage>
    </Game3DShell>
    {gameOver && (
      <GameOverModal
        score={Math.max(0, finalScore)}
        best={best}
        isNewRecord={isNewRecord}
        onReplay={restart}
        onBack={onBack}
      />
    )}
    </>
  )
}

function makeRummiTiles() {
  const colors = ['#ef4444', '#2563eb', '#f59e0b', '#111827']
  return shuffle([0, 1].flatMap((set) => colors.flatMap((color) => Array.from({ length: 13 }, (_, index) => ({
    id: `tile-${set}-${color}-${index + 1}`,
    color,
    number: index + 1,
  })))))
}

function isRummiMeld(tiles: Tile[]) {
  if (tiles.length < 3) return false
  const sameNumber = tiles.every((tile) => tile.number === tiles[0].number)
  const uniqueColors = new Set(tiles.map((tile) => tile.color)).size === tiles.length
  if (sameNumber && uniqueColors) return true
  const sameColor = tiles.every((tile) => tile.color === tiles[0].color)
  const values = tiles.map((tile) => tile.number).sort((a, b) => a - b)
  return sameColor && values.every((value, index) => index === 0 || value === values[index - 1] + 1)
}

/** Cherche un groupe/suite valide (3-4 tuiles) dans un chevalet — brute force. */
function findRummiMeld(rack: Tile[]): Tile[] | null {
  const n = rack.length
  for (let size = 3; size <= 4; size++) {
    const combo: number[] = []
    const backtrack = (start: number): Tile[] | null => {
      if (combo.length === size) {
        const tiles = combo.map((i) => rack[i])
        return isRummiMeld(tiles) ? tiles : null
      }
      for (let i = start; i < n; i++) {
        combo.push(i)
        const found = backtrack(i + 1)
        combo.pop()
        if (found) return found
      }
      return null
    }
    const result = backtrack(0)
    if (result) return result
  }
  return null
}

const sortTiles = (tiles: Tile[]) => [...tiles].sort((a, b) => a.color.localeCompare(b.color) || a.number - b.number)

export function RummikubGame({ onBack }: GameProps) {
  const initial = useMemo(() => makeRummiTiles(), [])
  const [pool, setPool] = useState(initial.slice(28))
  const [rack, setRack] = useState(sortTiles(initial.slice(0, 14)))
  const [cpuRack, setCpuRack] = useState(initial.slice(14, 28))
  const [selected, setSelected] = useState<string[]>([])
  const [melds, setMelds] = useState<Tile[][]>([])
  const [cpuMelds, setCpuMelds] = useState<Tile[][]>([])
  const [opened, setOpened] = useState(false)
  const [message, setMessage] = useState('Creez une serie ou un groupe de 3 tuiles minimum.')
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<'player' | 'cpu' | null>(null)
  const cpuTurnTimeout = useRef<number>()

  const { best, submit } = useGameScore('rummikub')
  const [isNewRecord, setIsNewRecord] = useState(false)

  const selectedTiles = rack.filter((tile) => selected.includes(tile.id))
  const selectedValue = selectedTiles.reduce((sum, tile) => sum + tile.number, 0)
  const valid = isRummiMeld(selectedTiles) && (opened || selectedValue >= 30)

  const endGame = (who: 'player' | 'cpu') => {
    if (gameOver) return
    setGameOver(true)
    setWinner(who)
    const s = melds.reduce((sum, m) => sum + m.reduce((a, t) => a + t.number, 0), 0)
      + (who === 'player' ? 50 : 0)
      - rack.reduce((sum, t) => sum + t.number, 0)
    const record = submit(Math.max(0, s))
    setIsNewRecord(record)
  }

  const cpuTurn = () => {
    if (gameOver) return
    let nextRack = [...cpuRack]
    let nextPool = pool
    if (nextPool.length > 0) {
      nextRack = [...nextRack, nextPool[0]]
      nextPool = nextPool.slice(1)
      setPool(nextPool)
    }
    const meld = findRummiMeld(nextRack)
    if (meld) {
      nextRack = nextRack.filter((t) => !meld.includes(t))
      setCpuMelds((items) => [...items, meld])
      setMessage('Le CPU pose une combinaison.')
    } else {
      setMessage('Le CPU pioche une tuile.')
    }
    setCpuRack(nextRack)
    if (nextRack.length === 0) endGame('cpu')
  }

  const place = () => {
    if (!valid) {
      setMessage(opened ? 'Suite ou groupe invalide.' : 'La premiere pose doit atteindre 30 points.')
      return
    }
    setMelds((items) => [...items, selectedTiles])
    setRack((items) => items.filter((tile) => !selected.includes(tile.id)))
    setSelected([])
    setOpened(true)
    setMessage('Combinaison posee sur la table.')
    if (rack.length - selected.length === 0) { endGame('player'); return }
    cpuTurnTimeout.current = window.setTimeout(cpuTurn, 800)
  }
  const draw = () => {
    if (!pool.length) return
    setRack((items) => sortTiles([...items, pool[0]]))
    setPool((items) => items.slice(1))
    setMessage('Tuile piochee.')
    cpuTurnTimeout.current = window.setTimeout(cpuTurn, 800)
  }

  useEffect(() => () => window.clearTimeout(cpuTurnTimeout.current), [])

  const restart = () => {
    const fresh = makeRummiTiles()
    setRack(sortTiles(fresh.slice(0, 14)))
    setCpuRack(fresh.slice(14, 28))
    setPool(fresh.slice(28))
    setSelected([])
    setMelds([])
    setCpuMelds([])
    setOpened(false)
    setGameOver(false)
    setWinner(null)
    setIsNewRecord(false)
    setMessage('Nouvelle partie contre le CPU.')
  }

  return (
    <>
    <Game3DShell
      title="Rummi Kub 3D"
      subtitle="Vs CPU — groupes et suites"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Table', value: melds.length, color: '#22c55e' },
          { label: 'Chevalet', value: rack.length, color: ACCENT2 },
          { label: 'CPU', value: `${cpuRack.length} tuiles`, color: '#ef4444' },
          { label: 'Pose', value: opened ? selectedValue : `${selectedValue}/30`, color: ACCENT },
        ],
        message,
        children: (
          <>
            <ActionButton onClick={place} disabled={!selected.length}>Poser</ActionButton>
            <button onClick={draw} style={ghostButtonStyle}>Piocher</button>
          </>
        ),
      })}
    >
      <Stage tone="bamboo">
        <div style={rummiBoardStyle}>
          <div style={rummiMeldsStyle}>
            {melds.length ? melds.map((meld, index) => (
              <div key={index} style={rummiMeldRowStyle}>
                {meld.map((tile) => <RummiTile key={tile.id} tile={tile} small />)}
              </div>
            )) : <span style={{ color: MUTED }}>Table libre</span>}
          </div>
          <div style={rummiRackStyle}>
            {rack.map((tile) => (
              <RummiTile
                key={tile.id}
                tile={tile}
                selected={selected.includes(tile.id)}
                onClick={() => setSelected((items) => items.includes(tile.id) ? items.filter((id) => id !== tile.id) : [...items, tile.id])}
              />
            ))}
          </div>
        </div>
      </Stage>
    </Game3DShell>
    {gameOver && (
      <GameOverModal
        score={Math.max(0, melds.reduce((sum, m) => sum + m.reduce((a, t) => a + t.number, 0), 0) + (winner === 'player' ? 50 : 0) - rack.reduce((sum, t) => sum + t.number, 0))}
        best={best}
        isNewRecord={isNewRecord}
        onReplay={restart}
        onBack={onBack}
      />
    )}
    </>
  )
}

function RummiTile({ tile, selected, onClick, small }: { tile: Tile; selected?: boolean; onClick?: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        ...rummiTileStyle,
        width: small ? 38 : 48,
        height: small ? 52 : 66,
        borderColor: selected ? ACCENT2 : 'rgba(15,23,42,0.16)',
        transform: selected ? 'translateY(-10px) rotateX(12deg)' : 'rotateX(12deg)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ color: tile.color }}>{tile.number}</span>
    </button>
  )
}

const hintStyle: CSSProperties = {
  color: MUTED,
  fontSize: 12,
  lineHeight: 1.45,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  padding: 10,
}

const stageStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  position: 'relative',
  overflow: 'auto',
  padding: 18,
  perspective: 1200,
  boxShadow: 'inset 0 -90px 120px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
}

const floorStyle: CSSProperties = {
  position: 'absolute',
  left: '7%',
  right: '7%',
  bottom: 18,
  height: '42%',
  borderRadius: '50% 50% 0 0',
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.2), rgba(255,255,255,0.06) 58%, transparent 72%)',
  transform: 'rotateX(64deg)',
  transformOrigin: 'bottom',
  boxShadow: '0 -24px 55px rgba(255,255,255,0.08)',
}

const stageContentStyle: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  minHeight: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const mahjongGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(42px, 74px))',
  gap: 10,
  padding: 16,
  borderRadius: 20,
  background: 'rgba(2,6,23,0.42)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 24px 44px rgba(0,0,0,0.36)',
}

const mahjongTileStyle: CSSProperties = {
  aspectRatio: '0.72',
  borderRadius: 12,
  border: '2px solid rgba(255,255,255,0.18)',
  background: 'linear-gradient(145deg, #f8fafc, #d9f99d)',
  boxShadow: '0 16px 18px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.8)',
  display: 'grid',
  placeItems: 'center',
  gap: 2,
  cursor: 'pointer',
}

const mahjongGlyphStyle: CSSProperties = {
  color: '#14532d',
  fontSize: 22,
  fontWeight: 950,
  lineHeight: 1,
}

const spotWrapperStyle: CSSProperties = {
  width: 'min(860px, 100%)',
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))',
  gap: 14,
}

const bistroPanelStyle: CSSProperties = {
  minHeight: 360,
  position: 'relative',
  borderRadius: 18,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'linear-gradient(180deg, #7dd3fc 0 42%, #fef3c7 42% 48%, #166534 48% 100%)',
  boxShadow: '0 22px 38px rgba(0,0,0,0.34)',
}

const sceneTreeStyle: CSSProperties = {
  position: 'absolute',
  left: 28,
  top: 34,
  width: 94,
  height: 94,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #22c55e 0 56%, #166534 57%)',
}

const sceneTowerStyle: CSSProperties = {
  position: 'absolute',
  right: 44,
  top: 38,
  width: 52,
  height: 130,
  background: 'linear-gradient(180deg, #f8fafc, #94a3b8)',
  clipPath: 'polygon(24% 0, 76% 0, 100% 100%, 0 100%)',
  display: 'flex',
  justifyContent: 'center',
  paddingTop: 18,
}

const awningStyle: CSSProperties = {
  position: 'absolute',
  left: 152,
  top: 78,
  display: 'flex',
  width: 126,
  height: 32,
  borderRadius: '14px 14px 5px 5px',
  overflow: 'hidden',
}

const menuBoardStyle: CSSProperties = {
  position: 'absolute',
  left: '45%',
  top: '38%',
  width: 54,
  height: 70,
  borderRadius: 8,
  background: '#111827',
  color: '#facc15',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 950,
}

const tableSceneShapeStyle: CSSProperties = {
  position: 'absolute',
  left: '34%',
  bottom: 66,
  width: 170,
  height: 70,
  borderRadius: '50%',
  background: '#92400e',
}

const chairShapeStyle: CSSProperties = {
  position: 'absolute',
  bottom: 56,
  width: 38,
  height: 58,
  borderRadius: 12,
  background: '#dc2626',
}

const lampShapeStyle: CSSProperties = {
  position: 'absolute',
  right: 22,
  top: 126,
  width: 22,
  height: 92,
  background: '#111827',
  borderRadius: 999,
}

const flowerShapeStyle: CSSProperties = {
  position: 'absolute',
  left: 46,
  bottom: 72,
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #f9a8d4 0 22%, #be123c 24% 100%)',
}

const cardArcadeLayoutStyle: CSSProperties = {
  display: 'grid',
  gap: 18,
  justifyItems: 'center',
  width: 'min(760px, 100%)',
}

const currentCardSlotStyle: CSSProperties = {
  minHeight: 118,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const runColumnsStyle: CSSProperties = {
  width: '100%',
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(84px, 1fr))',
  gap: 10,
}

function runColumnStyle(sum: number, canPlace: boolean): CSSProperties {
  return {
    minHeight: 280,
    borderRadius: 14,
    padding: 10,
    border: `1px solid ${sum === 21 ? 'rgba(34,197,94,0.65)' : canPlace ? 'rgba(6,182,212,0.44)' : 'rgba(255,255,255,0.12)'}`,
    background: canPlace ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: canPlace ? 'pointer' : 'default',
  }
}

const triLayoutStyle: CSSProperties = {
  width: 'min(820px, 100%)',
  display: 'grid',
  gap: 28,
  justifyItems: 'center',
}

const triTowersStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(54px, 76px))',
  gap: 10,
  padding: 18,
  borderRadius: 18,
  background: 'rgba(2,6,23,0.45)',
  border: '1px solid rgba(255,255,255,0.1)',
}

const foundationStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 18,
}

const ramiTableStyle: CSSProperties = {
  width: 'min(880px, 100%)',
  display: 'grid',
  gap: 18,
}

const meldPreviewStyle: CSSProperties = {
  minHeight: 104,
  borderRadius: 16,
  border: '1px dashed rgba(255,255,255,0.18)',
  background: 'rgba(2,6,23,0.4)',
  color: MUTED,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: 12,
  flexWrap: 'wrap',
}

const ramiHandStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'center',
  padding: 14,
  borderRadius: 18,
  background: 'rgba(2,6,23,0.44)',
  border: '1px solid rgba(255,255,255,0.12)',
}

const rummiBoardStyle: CSSProperties = {
  width: 'min(840px, 100%)',
  display: 'grid',
  gap: 18,
}

const rummiMeldsStyle: CSSProperties = {
  minHeight: 160,
  borderRadius: 18,
  background: 'rgba(2,6,23,0.45)',
  border: '1px solid rgba(255,255,255,0.12)',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  justifyContent: 'center',
}

const rummiMeldRowStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  padding: 7,
  borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
}

const rummiRackStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'center',
  padding: 14,
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(120,53,15,0.9), rgba(69,26,3,0.92))',
  border: '1px solid rgba(251,191,36,0.24)',
}

const rummiTileStyle: CSSProperties = {
  borderRadius: 8,
  border: '2px solid rgba(15,23,42,0.16)',
  background: 'linear-gradient(145deg, #fff7ed, #e2e8f0)',
  boxShadow: '0 14px 18px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.8)',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 950,
  fontSize: 20,
  transition: 'transform 160ms ease, border-color 160ms ease',
}
