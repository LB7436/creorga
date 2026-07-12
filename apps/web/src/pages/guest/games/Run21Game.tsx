import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

export default function Run21Game({ onBack }: GameProps) {
  const initial = useMemo(() => createRun21Deck(), [])
  const [deck, setDeck] = useState(initial.slice(1))
  const [current, setCurrent] = useState<Card | null>(initial[0])
  const [columns, setColumns] = useState<Card[][]>([[], [], [], [], []])
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState('Placez les cartes sans dépasser 21. Une colonne à 21 pile est validée (+25) et se vide.')
  const [gameOver, setGameOver] = useState(false)
  const [isNewRecord, setIsNewRecord] = useState(false)

  const { best, submit } = useGameScore('run21')
  const submittedRef = useRef(false)

  const sums = columns.map((column) => column.reduce((sum, card) => sum + card.value, 0))
  const locked = current ? sums.every((sum) => sum + current.value > 21) : true

  // Fin de partie : plus de carte a placer OU aucune colonne ne peut prendre la
  // carte courante. Une seule soumission par partie (submittedRef, rearme au reset).
  const finish = (finalScore: number) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setGameOver(true)
    setIsNewRecord(submit(Math.max(0, Math.min(1_000_000, finalScore))))
  }

  const place = (index: number) => {
    if (!current || gameOver) return
    if (sums[index] + current.value > 21) {
      setMessage('Colonne trop haute (> 21).')
      return
    }
    const nextSum = sums[index] + current.value
    const cleared = nextSum === 21
    // Coeur du jeu : une colonne a 21 pile rapporte +25 ET se vide (reutilisable),
    // sinon les 5 colonnes se remplissent et bloquent la partie en quelques coups.
    const nextColumns = columns.map((column, colIndex) =>
      colIndex === index ? (cleared ? [] : [...column, current]) : column,
    )
    const nextScore = score + current.value + (cleared ? 25 : 0)
    const nextCurrent = deck[0] ?? null

    setColumns(nextColumns)
    setScore(nextScore)
    setCurrent(nextCurrent)
    setDeck((list) => list.slice(1))
    setMessage(cleared ? 'Run 21 parfait ! +25, colonne vidée.' : 'Carte posée.')

    if (!nextCurrent) {
      finish(nextScore) // pioche epuisee
    } else {
      const nextSums = nextColumns.map((c) => c.reduce((s, card) => s + card.value, 0))
      if (nextSums.every((s) => s + nextCurrent.value > 21)) finish(nextScore) // plus aucun placement
    }
  }

  const reset = () => {
    const next = createRun21Deck()
    setDeck(next.slice(1))
    setCurrent(next[0])
    setColumns([[], [], [], [], []])
    setScore(0)
    setGameOver(false)
    setIsNewRecord(false)
    submittedRef.current = false
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
          { label: 'Record', value: best, color: '#22c55e' },
          { label: 'Pioche', value: deck.length, color: ACCENT2 },
        ],
        message: locked && !gameOver ? 'Plus aucun placement possible.' : message,
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
      {gameOver && (
        <GameOverModal
          score={score}
          best={best}
          isNewRecord={isNewRecord}
          onReplay={reset}
          onBack={onBack}
        />
      )}
    </Game3DShell>
  )
}
