import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

export default function RamiGame({ onBack }: GameProps) {
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

  // Refs synchrones : cpuTurn/endGame tournent dans un setTimeout et doivent lire
  // l'état COURANT, pas la closure du rendu de planification (sinon le CPU repioche
  // la carte que le joueur vient de prendre -> carte dupliquée ; et endGame calcule
  // le score sur un hand/score périmés -> le meld gagnant est soustrait au lieu d'ajouté).
  const deckRef = useRef(deck); deckRef.current = deck
  const handRef = useRef(hand); handRef.current = hand
  const cpuHandRef = useRef(cpuHand); cpuHandRef.current = cpuHand
  const scoreRef = useRef(score); scoreRef.current = score
  const gameOverRef = useRef(gameOver); gameOverRef.current = gameOver

  const endGame = (who: 'player' | 'cpu', finalScoreVal: number, finalHand: Card[]) => {
    if (gameOverRef.current) return
    gameOverRef.current = true
    setGameOver(true)
    setWinner(who)
    const s = finalScoreVal + (who === 'player' ? 50 : 0) - finalHand.reduce((sum, c) => sum + cardPoints(c), 0)
    setIsNewRecord(submit(Math.max(0, s)))
  }

  const cpuTurn = () => {
    if (gameOverRef.current) return
    let nextHand = [...cpuHandRef.current]
    let nextDeck = deckRef.current
    if (nextDeck.length > 0) {
      nextHand = [...nextHand, nextDeck[0]]
      nextDeck = nextDeck.slice(1)
      deckRef.current = nextDeck
      setDeck(nextDeck)
    }
    const meldFound = findMeld(nextHand)
    if (meldFound) {
      const meldValue = meldFound.reduce((s, c) => s + cardPoints(c), 0)
      nextHand = nextHand.filter((c) => !meldFound.includes(c))
      setCpuScore((s) => s + meldValue)
      setMessage(`Le CPU pose une combinaison (${meldValue} pts).`)
    } else {
      const discardIdx = nextHand.reduce((maxI, c, i, arr) => cardPoints(c) > cardPoints(arr[maxI]) ? i : maxI, 0)
      setCpuDiscard(nextHand[discardIdx])
      nextHand = nextHand.filter((_, i) => i !== discardIdx)
      setMessage('Le CPU pioche et defausse.')
    }
    cpuHandRef.current = nextHand
    setCpuHand(nextHand)
    if (nextHand.length === 0) endGame('cpu', scoreRef.current, handRef.current)
  }

  const scheduleCpu = () => {
    window.clearTimeout(cpuTurnTimeout.current)
    cpuTurnTimeout.current = window.setTimeout(cpuTurn, 800)
  }

  const toggle = (id: string) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const meld = () => {
    if (!valid) {
      setMessage(mode === 'sortie40' && !opened ? 'Pour la sortie 40, la premiere pose doit valoir 40 points.' : 'Combinaison non valide.')
      return
    }
    const nextHand = hand.filter((card) => !selected.includes(card.id))
    const nextScore = score + value
    handRef.current = nextHand
    scoreRef.current = nextScore
    setHand(nextHand)
    setScore(nextScore)
    setOpened(true)
    setSelected([])
    setMessage(`Combinaison posee: ${value} pts.`)
    if (nextHand.length === 0) { endGame('player', nextScore, nextHand); return }
    scheduleCpu()
  }
  const draw = () => {
    if (!deckRef.current.length) return
    const nextHand = sortHand([...hand, deckRef.current[0]])
    const nextDeck = deckRef.current.slice(1)
    handRef.current = nextHand
    deckRef.current = nextDeck
    setHand(nextHand)
    setDeck(nextDeck)
    setMessage('Carte piochee.')
    scheduleCpu()
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
