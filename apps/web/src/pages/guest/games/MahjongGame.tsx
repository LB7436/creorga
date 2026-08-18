import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

export default function MahjongGame({ onBack }: GameProps) {
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
    setMessage('Plateau mélangé.')
  }

  return (
    <>
    <Game3DShell
      title="Mémo Bambou"
      subtitle="Memory chronométré, tuiles face cachée"
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
