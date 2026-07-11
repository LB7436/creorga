import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

export default function RummikubGame({ onBack }: GameProps) {
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
