import { useState, useEffect, useRef, useCallback } from 'react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types ────────────────────────────────────────────────────────────────────
type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
type Card = { suit: Suit; rank: Rank; faceUp: boolean; id: string }

const isRed = (s: Suit) => s === '♥' || s === '♦'
const rankVal = (r: Rank) => ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].indexOf(r) + 1

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

interface GameState {
  tableau: Card[][]
  foundations: Card[][]
  stock: Card[]
  waste: Card[]
  moves: number
  time: number
  won: boolean
}

// ─── History for undo ─────────────────────────────────────────────────────────
type History = GameState[]

// ─── Drag state ───────────────────────────────────────────────────────────────
interface DragState {
  cards: Card[]
  sourceType: 'tableau' | 'waste' | 'foundation'
  sourceIndex: number    // col for tableau, suit index for foundation
  cardIndex: number      // index within the column
  startX: number
  startY: number
  currentX: number
  currentY: number
  active: boolean
}

// ─── Selection (click-to-move) ────────────────────────────────────────────────
interface Selection {
  cards: Card[]
  sourceType: 'tableau' | 'waste' | 'foundation'
  sourceIndex: number
  cardIndex: number
}

// ─── Deck creation & shuffle ──────────────────────────────────────────────────
function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: false, id: `${rank}${suit}` })
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function newGame(): GameState {
  const deck = createDeck()
  const tableau: Card[][] = Array.from({ length: 7 }, () => [])
  let idx = 0
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[idx++], faceUp: row === col }
      tableau[col].push(card)
    }
  }
  return {
    tableau,
    foundations: [[], [], [], []],
    stock: deck.slice(idx).map(c => ({ ...c, faceUp: false })),
    waste: [],
    moves: 0,
    time: 0,
    won: false,
  }
}

// ─── Move validation ──────────────────────────────────────────────────────────
function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 'A'
  const top = foundation[foundation.length - 1]
  return top.suit === card.suit && rankVal(card.rank) === rankVal(top.rank) + 1
}

function canPlaceOnTableau(card: Card, column: Card[]): boolean {
  if (column.length === 0) return card.rank === 'K'
  const top = column[column.length - 1]
  if (!top.faceUp) return false
  return isRed(card.suit) !== isRed(top.suit) && rankVal(card.rank) === rankVal(top.rank) - 1
}

// ─── Auto-complete check ──────────────────────────────────────────────────────
function allFaceUp(state: GameState): boolean {
  return state.tableau.every(col => col.every(c => c.faceUp)) && state.stock.length === 0
}

// ─── Apply move helpers ───────────────────────────────────────────────────────
function cloneState(s: GameState): GameState {
  return {
    tableau: s.tableau.map(col => col.map(c => ({ ...c }))),
    foundations: s.foundations.map(f => f.map(c => ({ ...c }))),
    stock: s.stock.map(c => ({ ...c })),
    waste: s.waste.map(c => ({ ...c })),
    moves: s.moves,
    time: s.time,
    won: s.won,
  }
}

function revealTop(col: Card[]): void {
  if (col.length > 0 && !col[col.length - 1].faceUp) {
    col[col.length - 1].faceUp = true
  }
}

function checkWin(state: GameState): boolean {
  return state.foundations.every(f => f.length === 13)
}

// ─── Auto-move to foundation ──────────────────────────────────────────────────
function autoMoveToFoundation(state: GameState): GameState | null {
  // Try waste top
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1]
    const fi = SUITS.indexOf(card.suit)
    if (fi !== -1 && canPlaceOnFoundation(card, state.foundations[fi])) {
      const next = cloneState(state)
      next.waste.pop()
      next.foundations[fi].push({ ...card, faceUp: true })
      next.moves++
      next.won = checkWin(next)
      return next
    }
  }
  // Try tableau tops
  for (let col = 0; col < 7; col++) {
    const colArr = state.tableau[col]
    if (colArr.length === 0) continue
    const card = colArr[colArr.length - 1]
    if (!card.faceUp) continue
    const fi = SUITS.indexOf(card.suit)
    if (fi !== -1 && canPlaceOnFoundation(card, state.foundations[fi])) {
      const next = cloneState(state)
      next.tableau[col].pop()
      revealTop(next.tableau[col])
      next.foundations[fi].push({ ...card, faceUp: true })
      next.moves++
      next.won = checkWin(next)
      return next
    }
  }
  return null
}

// ─── Card visual ──────────────────────────────────────────────────────────────
interface CardViewProps {
  card: Card
  width: number
  selected?: boolean
  validDrop?: boolean
  style?: React.CSSProperties
  onMouseDown?: (e: React.MouseEvent) => void
  onDoubleClick?: (e: React.MouseEvent) => void
  onClick?: (e: React.MouseEvent) => void
  dragging?: boolean
}

function CardView({ card, width, selected, validDrop, style, onMouseDown, onDoubleClick, onClick, dragging }: CardViewProps) {
  const height = width * 1.4
  const color = isRed(card.suit) ? '#dc2626' : '#1a1a1a'
  const rankFontSize = Math.max(9, width * 0.18)
  const suitFontSmall = Math.max(9, width * 0.17)
  const suitFontLarge = Math.max(22, width * 0.42)

  let border = '1px solid #e5e7eb'
  let boxShadow = '0 1px 4px rgba(0,0,0,0.13)'
  if (selected) {
    border = `2px solid #a855f7`
    boxShadow = '0 0 0 3px rgba(168,85,247,0.35), 0 2px 8px rgba(0,0,0,0.2)'
  } else if (validDrop) {
    border = `2px solid #22c55e`
    boxShadow = '0 0 0 3px rgba(34,197,94,0.35), 0 2px 8px rgba(0,0,0,0.2)'
  }

  const baseStyle: React.CSSProperties = {
    width,
    height,
    borderRadius: 6,
    border,
    boxShadow,
    cursor: dragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    transition: dragging ? 'none' : 'box-shadow 0.15s ease',
    ...style,
  }

  if (!card.faceUp) {
    // Card back: beautiful diagonal stripe pattern
    return (
      <div
        style={baseStyle}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
      >
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: 5,
          background: '#1e3a8a',
          backgroundImage: `repeating-linear-gradient(
            45deg,
            #1d4ed8 0px,
            #1d4ed8 2px,
            #1e3a8a 2px,
            #1e3a8a 9px
          )`,
        }} />
        <div style={{
          position: 'absolute', inset: 4,
          borderRadius: 3,
          border: '1.5px solid rgba(255,255,255,0.15)',
          pointerEvents: 'none',
        }} />
      </div>
    )
  }

  return (
    <div
      style={{ ...baseStyle, background: '#ffffff' }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
    >
      {/* Top-left rank + suit */}
      <div style={{
        position: 'absolute', top: 3, left: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        lineHeight: 1,
        color,
      }}>
        <span style={{ fontSize: rankFontSize, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{card.rank}</span>
        <span style={{ fontSize: suitFontSmall, lineHeight: 1.1 }}>{card.suit}</span>
      </div>

      {/* Center large suit */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontSize: suitFontLarge,
        lineHeight: 1,
        pointerEvents: 'none',
      }}>
        {card.suit}
      </div>

      {/* Bottom-right rank + suit (rotated 180°) */}
      <div style={{
        position: 'absolute', bottom: 3, right: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transform: 'rotate(180deg)',
        lineHeight: 1,
        color,
      }}>
        <span style={{ fontSize: rankFontSize, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{card.rank}</span>
        <span style={{ fontSize: suitFontSmall, lineHeight: 1.1 }}>{card.suit}</span>
      </div>
    </div>
  )
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const PIECES = 80
  const colors = ['#a855f7','#ec4899','#f59e0b','#22c55e','#3b82f6','#f43f5e','#06b6d4']
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {Array.from({ length: PIECES }).map((_, i) => {
        const left = `${Math.random() * 100}%`
        const delay = `${Math.random() * 2}s`
        const duration = `${2 + Math.random() * 2}s`
        const color = colors[i % colors.length]
        const size = 6 + Math.random() * 8
        const rotate = Math.random() * 360
        return (
          <div key={i} style={{
            position: 'absolute',
            top: '-20px',
            left,
            width: size,
            height: size * (Math.random() > 0.5 ? 1 : 0.5),
            background: color,
            borderRadius: Math.random() > 0.5 ? '50%' : 0,
            transform: `rotate(${rotate}deg)`,
            animation: `confettiFall ${duration} ${delay} ease-in forwards`,
          }} />
        )
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SolitaireGame({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<GameState>(() => newGame())
  const [history, setHistory] = useState<History>([])
  const [drag, setDrag] = useState<DragState | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [validDropTargets, setValidDropTargets] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // Card sizing
  const [cardWidth, setCardWidth] = useState(72)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth
        setCardWidth(Math.max(44, Math.floor(w / 7.5)))
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const cardHeight = cardWidth * 1.4
  const faceDownPeek = Math.max(12, cardWidth * 0.22)
  const faceUpPeek = Math.max(20, cardWidth * 0.34)

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setState(s => s.won ? s : { ...s, time: s.time + 1 })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = t % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Push to history before any mutation
  const pushHistory = useCallback((s: GameState) => {
    setHistory(h => [...h.slice(-49), cloneState(s)])
  }, [])

  const applyState = useCallback((next: GameState, prevState: GameState) => {
    pushHistory(prevState)
    setState(next)
    setSelection(null)
  }, [pushHistory])

  // Stock click
  const clickStock = () => {
    if (state.won) return
    const prev = state
    const next = cloneState(state)
    if (next.stock.length === 0) {
      // Recycle waste
      next.stock = next.waste.reverse().map(c => ({ ...c, faceUp: false }))
      next.waste = []
    } else {
      const card = next.stock.pop()!
      card.faceUp = true
      next.waste.push(card)
    }
    next.moves++
    applyState(next, prev)
  }

  // Double-click: auto-move to foundation
  const handleDoubleClick = (cards: Card[], sourceType: 'tableau' | 'waste' | 'foundation', sourceIndex: number, cardIndex: number) => {
    if (state.won || cards.length !== 1) return
    const card = cards[0]
    const fi = SUITS.indexOf(card.suit)
    if (fi === -1) return
    if (!canPlaceOnFoundation(card, state.foundations[fi])) return

    const prev = state
    const next = cloneState(state)
    if (sourceType === 'waste') {
      next.waste.pop()
    } else if (sourceType === 'tableau') {
      next.tableau[sourceIndex].splice(cardIndex, 1)
      revealTop(next.tableau[sourceIndex])
    } else if (sourceType === 'foundation') {
      next.foundations[sourceIndex].pop()
    }
    next.foundations[fi].push({ ...card, faceUp: true })
    next.moves++
    next.won = checkWin(next)
    applyState(next, prev)
  }

  // Compute valid drop targets for selection
  const computeValidDrops = useCallback((cards: Card[]): Set<string> => {
    const s = new Set<string>()
    if (cards.length === 0) return s
    const first = cards[0]
    // Foundations (only single card)
    if (cards.length === 1) {
      const fi = SUITS.indexOf(first.suit)
      if (fi !== -1 && canPlaceOnFoundation(first, stateRef.current.foundations[fi])) {
        s.add(`foundation-${fi}`)
      }
    }
    // Tableau
    for (let col = 0; col < 7; col++) {
      if (canPlaceOnTableau(first, stateRef.current.tableau[col])) {
        s.add(`tableau-${col}`)
      }
    }
    return s
  }, [])

  // Click-to-move: click card to select, click target to move
  const handleCardClick = (
    cards: Card[],
    sourceType: 'tableau' | 'waste' | 'foundation',
    sourceIndex: number,
    cardIndex: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    if (state.won) return

    // If clicking selected card's source → deselect
    if (selection &&
        selection.sourceType === sourceType &&
        selection.sourceIndex === sourceIndex &&
        selection.cardIndex === cardIndex) {
      setSelection(null)
      setValidDropTargets(new Set())
      return
    }

    // If a selection exists, try to move it here
    if (selection) {
      if (sourceType === 'waste') { setSelection(null); setValidDropTargets(new Set()); return }
      const moved = tryMove(selection.cards, selection.sourceType, selection.sourceIndex, selection.cardIndex, sourceType as 'tableau' | 'foundation', sourceIndex)
      if (moved) return
    }

    // Select this card if face-up
    if (cards.length > 0 && cards[0].faceUp) {
      setSelection({ cards, sourceType, sourceIndex, cardIndex })
      setValidDropTargets(computeValidDrops(cards))
    }
  }

  const handleTargetClick = (targetType: 'tableau' | 'foundation', targetIndex: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selection || state.won) return
    tryMove(selection.cards, selection.sourceType, selection.sourceIndex, selection.cardIndex, targetType, targetIndex)
  }

  const tryMove = (
    cards: Card[],
    sourceType: 'tableau' | 'waste' | 'foundation',
    sourceIndex: number,
    cardIndex: number,
    targetType: 'tableau' | 'foundation',
    targetIndex: number
  ): boolean => {
    const s = stateRef.current
    const first = cards[0]

    if (targetType === 'foundation') {
      if (cards.length !== 1) {
        setSelection(null); setValidDropTargets(new Set()); return false
      }
      const fi = targetIndex
      if (!canPlaceOnFoundation(first, s.foundations[fi])) {
        setSelection(null); setValidDropTargets(new Set()); return false
      }
      const prev = s
      const next = cloneState(s)
      removeCards(next, sourceType, sourceIndex, cardIndex)
      next.foundations[fi].push({ ...first, faceUp: true })
      next.moves++
      next.won = checkWin(next)
      applyState(next, prev)
      return true
    }

    if (targetType === 'tableau') {
      const col = targetIndex
      // Don't move to same column
      if (sourceType === 'tableau' && sourceIndex === col) {
        setSelection(null); setValidDropTargets(new Set()); return false
      }
      if (!canPlaceOnTableau(first, s.tableau[col])) {
        setSelection(null); setValidDropTargets(new Set()); return false
      }
      const prev = s
      const next = cloneState(s)
      removeCards(next, sourceType, sourceIndex, cardIndex)
      for (const c of cards) {
        next.tableau[col].push({ ...c, faceUp: true })
      }
      next.moves++
      next.won = checkWin(next)
      applyState(next, prev)
      return true
    }

    setSelection(null)
    setValidDropTargets(new Set())
    return false
  }

  const removeCards = (next: GameState, sourceType: string, sourceIndex: number, cardIndex: number) => {
    if (sourceType === 'waste') {
      next.waste.pop()
    } else if (sourceType === 'tableau') {
      next.tableau[sourceIndex].splice(cardIndex)
      revealTop(next.tableau[sourceIndex])
    } else if (sourceType === 'foundation') {
      next.foundations[sourceIndex].pop()
    }
  }

  // ─── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleMouseDown = (
    cards: Card[],
    sourceType: 'tableau' | 'waste' | 'foundation',
    sourceIndex: number,
    cardIndex: number,
    e: React.MouseEvent
  ) => {
    if (e.button !== 0) return
    if (!cards[0]?.faceUp) return
    e.preventDefault()
    setDrag({
      cards,
      sourceType,
      sourceIndex,
      cardIndex,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      active: false,
    })
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setDrag(d => {
        if (!d) return d
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        const active = d.active || Math.abs(dx) > 4 || Math.abs(dy) > 4
        if (active && !d.active) {
          // Clear selection when drag starts
          setSelection(null)
          setValidDropTargets(computeValidDrops(d.cards))
        }
        return { ...d, currentX: e.clientX, currentY: e.clientY, active: active || d.active }
      })
    }

    const onMouseUp = (e: MouseEvent) => {
      if (!drag) return
      if (drag.active) {
        // Find drop target under cursor
        const els = document.elementsFromPoint(e.clientX, e.clientY)
        let dropped = false
        for (const el of els) {
          const target = (el as HTMLElement).dataset?.dropTarget
          if (!target) continue
          const [type, indexStr] = target.split('-')
          const index = parseInt(indexStr)
          dropped = tryMove(drag.cards, drag.sourceType, drag.sourceIndex, drag.cardIndex, type as 'tableau' | 'foundation', index)
          if (dropped) break
        }
        if (!dropped) {
          setSelection(null)
          setValidDropTargets(new Set())
        }
      }
      setDrag(null)
      setValidDropTargets(new Set())
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [drag, computeValidDrops]) // eslint-disable-line react-hooks/exhaustive-deps

  const undo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setState(prev)
    setSelection(null)
    setValidDropTargets(new Set())
  }

  const newGameAction = () => {
    setState(newGame())
    setHistory([])
    setSelection(null)
    setDrag(null)
    setValidDropTargets(new Set())
  }

  // Auto-complete
  const runAutoComplete = () => {
    let s = cloneState(state)
    const history: GameState[] = [cloneState(state)]
    let moved = true
    while (moved && !s.won) {
      moved = false
      const next = autoMoveToFoundation(s)
      if (next) {
        s = next
        history.push(cloneState(s))
        moved = true
      }
    }
    if (history.length > 1) {
      setHistory(h => [...h, ...history.slice(0, -1)])
      setState(s)
      setSelection(null)
    }
  }

  const canAutoComplete = allFaceUp(state) && !state.won

  // Clicked background → deselect
  const handleBgClick = () => {
    setSelection(null)
    setValidDropTargets(new Set())
  }

  // ─── Render helpers ───────────────────────────────────────────────────────────
  const isSelected = (sourceType: string, sourceIndex: number, cardIndex: number) => {
    if (!selection) return false
    return selection.sourceType === sourceType && selection.sourceIndex === sourceIndex && selection.cardIndex === cardIndex
  }

  const isDragSource = (sourceType: string, sourceIndex: number, cardIndex: number) => {
    if (!drag || !drag.active) return false
    return drag.sourceType === sourceType && drag.sourceIndex === sourceIndex && drag.cardIndex === cardIndex
  }

  const getDropKey = (type: string, index: number) => `${type}-${index}`

  const foundationSuits: Suit[] = ['♠', '♥', '♦', '♣']

  const gap = Math.max(4, cardWidth * 0.07)
  const totalWidth = cardWidth * 7 + gap * 6

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 8px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
      }}
      onClick={handleBgClick}
    >
      {/* Confetti */}
      {state.won && <Confetti />}

      {/* Win overlay */}
      {state.won && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: '32px 48px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <div style={{ color: ACCENT, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Vous avez gagné !</div>
            <div style={{ color: MUTED, marginBottom: 4 }}>{state.moves} coups · {formatTime(state.time)}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
              <button
                onClick={newGameAction}
                style={{
                  background: ACCENT,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Nouvelle partie
              </button>
              <button
                onClick={onBack}
                style={{
                  background: SURFACE2,
                  color: TEXT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: totalWidth + 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ← Retour
          </button>
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>Solitaire</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 8,
            padding: '5px 12px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {state.moves} coups
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 8,
            padding: '5px 12px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {formatTime(state.time)}
          </div>
          <button
            onClick={undo}
            disabled={history.length === 0}
            style={{
              background: history.length === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)',
              color: history.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              cursor: history.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ↩ Annuler
          </button>
          {canAutoComplete && (
            <button
              onClick={runAutoComplete}
              style={{
                background: 'rgba(168,85,247,0.7)',
                color: '#fff',
                border: '1px solid rgba(168,85,247,0.5)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Auto ✓
            </button>
          )}
          <button
            onClick={newGameAction}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Nouvelle partie
          </button>
        </div>
      </div>

      {/* Game board */}
      <div ref={containerRef} style={{ width: '100%', maxWidth: totalWidth + 32 }}>
        {/* Top row: stock + waste + foundations */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap,
          marginBottom: Math.max(10, cardWidth * 0.18),
          flexWrap: 'nowrap',
        }}>
          {/* Stock */}
          <div
            onClick={(e) => { e.stopPropagation(); clickStock() }}
            style={{
              width: cardWidth,
              height: cardHeight,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {state.stock.length > 0 ? (
              <div style={{ position: 'relative' }}>
                {state.stock.length > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    width: cardWidth,
                    height: cardHeight,
                    borderRadius: 6,
                    background: '#1e3a8a',
                    backgroundImage: `repeating-linear-gradient(45deg, #1d4ed8 0px, #1d4ed8 2px, #1e3a8a 2px, #1e3a8a 9px)`,
                    border: '1px solid #e5e7eb',
                  }} />
                )}
                <CardView
                  card={{ suit: '♠', rank: 'A', faceUp: false, id: 'stock' }}
                  width={cardWidth}
                />
              </div>
            ) : (
              <div style={{
                width: cardWidth,
                height: cardHeight,
                borderRadius: 6,
                border: '2px dashed rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: cardWidth * 0.35,
              }}>
                ↺
              </div>
            )}
          </div>

          {/* Waste */}
          <div style={{ width: cardWidth, height: cardHeight, flexShrink: 0, position: 'relative' }}>
            {state.waste.length === 0 ? (
              <div style={{
                width: cardWidth,
                height: cardHeight,
                borderRadius: 6,
                border: '2px dashed rgba(255,255,255,0.2)',
              }} />
            ) : (
              (() => {
                const top = state.waste[state.waste.length - 1]
                const isWasteSelected = selection?.sourceType === 'waste'
                const isDragged = drag?.active && drag.sourceType === 'waste'
                return (
                  <CardView
                    card={top}
                    width={cardWidth}
                    selected={isWasteSelected}
                    style={{ opacity: isDragged ? 0.3 : 1, cursor: 'grab' }}
                    onMouseDown={(e) => handleMouseDown([top], 'waste', 0, 0, e)}
                    onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick([top], 'waste', 0, 0) }}
                    onClick={(e) => handleCardClick([top], 'waste', 0, 0, e)}
                  />
                )
              })()
            )}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1, minWidth: gap }} />

          {/* Foundations */}
          {foundationSuits.map((suit, fi) => {
            const pile = state.foundations[fi]
            const isValidDrop = validDropTargets.has(getDropKey('foundation', fi)) ||
              (drag?.active && (() => {
                if (!drag) return false
                const cards = drag.cards
                if (cards.length !== 1) return false
                return canPlaceOnFoundation(cards[0], pile) && SUITS.indexOf(cards[0].suit) === fi
              })())
            const top = pile[pile.length - 1]
            const isFoundSelected = selection?.sourceType === 'foundation' && selection.sourceIndex === fi

            return (
              <div
                key={suit}
                data-drop-target={`foundation-${fi}`}
                style={{ width: cardWidth, height: cardHeight, flexShrink: 0, position: 'relative' }}
                onClick={(e) => handleTargetClick('foundation', fi, e)}
              >
                {top ? (
                  <CardView
                    card={top}
                    width={cardWidth}
                    selected={isFoundSelected}
                    validDrop={isValidDrop}
                    style={{
                      opacity: isDragSource('foundation', fi, pile.length - 1) ? 0.3 : 1,
                    }}
                    onMouseDown={(e) => handleMouseDown([top], 'foundation', fi, pile.length - 1, e)}
                    onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick([top], 'foundation', fi, pile.length - 1) }}
                    onClick={(e) => handleCardClick([top], 'foundation', fi, pile.length - 1, e)}
                  />
                ) : (
                  <div
                    data-drop-target={`foundation-${fi}`}
                    style={{
                      width: cardWidth,
                      height: cardHeight,
                      borderRadius: 6,
                      border: isValidDrop ? '2px solid #22c55e' : '2px dashed rgba(255,255,255,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isRed(suit) ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.3)',
                      fontSize: cardWidth * 0.45,
                      boxShadow: isValidDrop ? '0 0 0 3px rgba(34,197,94,0.3)' : undefined,
                      transition: 'all 0.15s',
                      background: isValidDrop ? 'rgba(34,197,94,0.08)' : 'transparent',
                    }}
                  >
                    {suit}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Tableau */}
        <div style={{ display: 'flex', gap, alignItems: 'flex-start' }}>
          {state.tableau.map((col, colIdx) => {
            const isDropTarget = validDropTargets.has(getDropKey('tableau', colIdx)) ||
              (drag?.active && drag.sourceType !== 'tableau' || drag?.sourceIndex !== colIdx
                ? drag?.active && (() => {
                    if (!drag) return false
                    return canPlaceOnTableau(drag.cards[0], col)
                  })()
                : false)
            const colHeight = col.length === 0
              ? cardHeight
              : col.slice(0, -1).reduce((acc, c) => acc + (c.faceUp ? faceUpPeek : faceDownPeek), 0) + cardHeight

            return (
              <div
                key={colIdx}
                data-drop-target={`tableau-${colIdx}`}
                style={{
                  width: cardWidth,
                  flexShrink: 0,
                  position: 'relative',
                  height: colHeight,
                  minHeight: cardHeight,
                }}
                onClick={(e) => {
                  if (col.length === 0) handleTargetClick('tableau', colIdx, e)
                  else e.stopPropagation()
                }}
              >
                {/* Empty slot */}
                <div
                  data-drop-target={`tableau-${colIdx}`}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: cardWidth,
                    height: cardHeight,
                    borderRadius: 6,
                    border: isDropTarget ? '2px solid #22c55e' : '2px dashed rgba(255,255,255,0.2)',
                    background: isDropTarget ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                    boxShadow: isDropTarget ? '0 0 0 3px rgba(34,197,94,0.2)' : undefined,
                    transition: 'all 0.15s',
                    pointerEvents: col.length === 0 ? 'auto' : 'none',
                  }}
                />

                {/* Cards */}
                {col.map((card, cardIdx) => {
                  const offsetY = col.slice(0, cardIdx).reduce((acc, c) =>
                    acc + (c.faceUp ? faceUpPeek : faceDownPeek), 0)

                  const isCardSelected = isSelected('tableau', colIdx, cardIdx)
                  const isCardDragged = isDragSource('tableau', colIdx, cardIdx)
                  const faceUpCards = col.slice(cardIdx)
                  const allFaceUpFromHere = faceUpCards.every(c => c.faceUp)

                  // A card is selectable/draggable if it's face-up and all cards above it are face-up
                  const isDraggable = card.faceUp && allFaceUpFromHere

                  const cardsToMove = isDraggable ? col.slice(cardIdx) : [card]

                  const showAsDropTarget = (isDropTarget && cardIdx === col.length - 1) ||
                    (validDropTargets.has(getDropKey('tableau', colIdx)) && cardIdx === col.length - 1)

                  return (
                    <div
                      key={card.id}
                      style={{
                        position: 'absolute',
                        top: offsetY,
                        left: 0,
                        opacity: isCardDragged ? 0.25 : 1,
                        transition: 'top 0.15s ease, opacity 0.1s',
                        zIndex: isCardSelected ? 10 : cardIdx,
                      }}
                    >
                      <CardView
                        card={card}
                        width={cardWidth}
                        selected={isCardSelected}
                        validDrop={showAsDropTarget && !isCardSelected}
                        onMouseDown={isDraggable ? (e) => handleMouseDown(cardsToMove, 'tableau', colIdx, cardIdx, e) : undefined}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          if (cardIdx === col.length - 1) {
                            handleDoubleClick([card], 'tableau', colIdx, cardIdx)
                          }
                        }}
                        onClick={(e) => {
                          if (isDraggable) handleCardClick(cardsToMove, 'tableau', colIdx, cardIdx, e)
                          else e.stopPropagation()
                        }}
                      />
                    </div>
                  )
                })}

                {/* Drop overlay for non-empty columns */}
                {col.length > 0 && isDropTarget && (
                  <div
                    data-drop-target={`tableau-${colIdx}`}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 6,
                      border: '2px solid #22c55e',
                      pointerEvents: 'none',
                      zIndex: 100,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Dragging ghost */}
      {drag && drag.active && (
        <div
          style={{
            position: 'fixed',
            left: drag.currentX - cardWidth / 2,
            top: drag.currentY - cardHeight * 0.15,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.92,
            transform: 'rotate(3deg)',
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.45))',
          }}
        >
          {drag.cards.map((card, i) => (
            <div
              key={card.id}
              style={{
                position: i === 0 ? 'relative' : 'absolute',
                top: i === 0 ? 0 : faceUpPeek * i,
                left: 0,
              }}
            >
              <CardView card={card} width={cardWidth} />
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: 16,
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        textAlign: 'center',
        maxWidth: 480,
      }}>
        Cliquez pour sélectionner · Double-clic pour envoyer à la fondation · Glisser-déposer supporté
      </div>
    </div>
  )
}
