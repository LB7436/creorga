import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

export default function TriTowersGame({ onBack }: GameProps) {
  const init = useMemo(createTriCards, [])
  const [open, setOpen] = useState(init.open)
  const [stock, setStock] = useState(init.stock)
  const [foundation, setFoundation] = useState(init.foundation)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [message, setMessage] = useState('Montez ou descendez d un rang pour vider les tours.')
  const [gameOver, setGameOver] = useState(false)
  const [isNewRecord, setIsNewRecord] = useState(false)

  const { best, submit } = useGameScore('tritowers')
  const submittedRef = useRef(false)

  // Fin de partie : victoire (tours vidées) ou blocage (aucune carte jouable et
  // stock épuisé). Une seule soumission par partie.
  const finish = (finalScore: number) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setGameOver(true)
    setIsNewRecord(submit(Math.max(0, Math.min(1_000_000, finalScore))))
  }

  const play = (card: Card) => {
    if (gameOver) return
    if (!adjacent(card, foundation)) {
      setMessage('Il faut une carte adjacente (±1 rang).')
      return
    }
    const nextOpen = open.filter((item) => item.id !== card.id)
    const nextCombo = combo + 1
    // Combo : enchaîner sans tirer fait grimper le bonus (mécanique Tri-Peaks).
    const nextScore = score + 10 + nextCombo * 5
    setFoundation(card)
    setOpen(nextOpen)
    setCombo(nextCombo)
    setScore(nextScore)

    if (nextOpen.length === 0) {
      setMessage('Tours nettoyees ! Bonus +200.')
      finish(nextScore + 200) // victoire : bonus de nettoyage complet
      return
    }
    setMessage(`Combo x${nextCombo} !`)
    // Blocage : plus de carte adjacente à la nouvelle base ET stock vide.
    if (!stock.length && !nextOpen.some((c) => adjacent(c, card))) finish(nextScore)
  }

  const draw = () => {
    if (!stock.length || gameOver) return
    const nextFoundation = stock[0]
    const nextStock = stock.slice(1)
    setFoundation(nextFoundation)
    setStock(nextStock)
    setCombo(0) // tirer casse le combo
    setMessage('Nouvelle carte de base.')
    if (!nextStock.length && !open.some((c) => adjacent(c, nextFoundation))) finish(score)
  }

  const reset = () => {
    const next = createTriCards()
    setOpen(next.open)
    setStock(next.stock)
    setFoundation(next.foundation)
    setScore(0)
    setCombo(0)
    setGameOver(false)
    setIsNewRecord(false)
    submittedRef.current = false
    setMessage('Nouvelle donne Tri-Tours.')
  }

  return (
    <Game3DShell
      title="Tri-Tours Neon"
      subtitle="Solitaire arcade reinventee, rythme Megatouch sans copie"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Score', value: score, color: '#f59e0b' },
          { label: 'Record', value: best, color: '#22c55e' },
          { label: 'Stock', value: stock.length, color: ACCENT2 },
        ],
        message,
        children: (
          <div style={{ display: 'flex', gap: 8 }}>
            <ActionButton onClick={draw} disabled={!stock.length || gameOver}>Tirer</ActionButton>
            <button onClick={reset} style={ghostButtonStyle}>Nouvelle donne</button>
          </div>
        ),
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
