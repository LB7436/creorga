import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

export default function Run21Game({ onBack }: GameProps) {
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
