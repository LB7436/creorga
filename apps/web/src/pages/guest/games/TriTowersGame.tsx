import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

export default function TriTowersGame({ onBack }: GameProps) {
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
