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
  const [message, setMessage] = useState('Creez une combinaison (3+). Apres ouverture, cliquez une combinaison de la table pour y ajouter vos tuiles.')
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<'player' | 'cpu' | null>(null)
  const cpuTurnTimeout = useRef<number>()

  const { best, submit } = useGameScore('rummikub')
  const [isNewRecord, setIsNewRecord] = useState(false)

  const selectedTiles = rack.filter((tile) => selected.includes(tile.id))
  const selectedValue = selectedTiles.reduce((sum, tile) => sum + tile.number, 0)
  const valid = isRummiMeld(selectedTiles) && (opened || selectedValue >= 30)

  // Refs synchrones : cpuTurn/endGame s'exécutent dans un setTimeout, ils DOIVENT
  // lire l'état courant et non la closure du rendu où ils ont été planifiés (sinon
  // le CPU repioche la tuile que le joueur vient de prendre -> tuile dupliquée, et
  // endGame calcule le score sur un rack/melds périmés).
  const poolRef = useRef(pool); poolRef.current = pool
  const rackRef = useRef(rack); rackRef.current = rack
  const cpuRackRef = useRef(cpuRack); cpuRackRef.current = cpuRack
  const meldsRef = useRef(melds); meldsRef.current = melds
  const gameOverRef = useRef(gameOver); gameOverRef.current = gameOver

  const endGame = (who: 'player' | 'cpu', finalMelds: Tile[][], finalRack: Tile[]) => {
    if (gameOverRef.current) return
    gameOverRef.current = true
    setGameOver(true)
    setWinner(who)
    // Score joueur = valeur de SES melds (+50 s'il gagne) − valeur de son rack restant,
    // calculé sur les valeurs POST-coup passées en paramètre.
    const s = finalMelds.reduce((sum, m) => sum + m.reduce((a, t) => a + t.number, 0), 0)
      + (who === 'player' ? 50 : 0)
      - finalRack.reduce((sum, t) => sum + t.number, 0)
    setIsNewRecord(submit(Math.max(0, s)))
  }

  const cpuTurn = () => {
    if (gameOverRef.current) return
    let nextRack = [...cpuRackRef.current]
    let nextPool = poolRef.current
    if (nextPool.length > 0) {
      nextRack = [...nextRack, nextPool[0]]
      nextPool = nextPool.slice(1)
      poolRef.current = nextPool
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
    cpuRackRef.current = nextRack
    setCpuRack(nextRack)
    if (nextRack.length === 0) endGame('cpu', meldsRef.current, rackRef.current)
  }

  const scheduleCpu = () => {
    window.clearTimeout(cpuTurnTimeout.current)
    cpuTurnTimeout.current = window.setTimeout(cpuTurn, 800)
  }

  const place = () => {
    if (!valid) {
      setMessage(opened ? 'Suite ou groupe invalide.' : 'La premiere pose doit atteindre 30 points.')
      return
    }
    const nextRack = rack.filter((tile) => !selected.includes(tile.id))
    const nextMelds = [...melds, selectedTiles]
    meldsRef.current = nextMelds
    rackRef.current = nextRack
    setMelds(nextMelds)
    setRack(nextRack)
    setSelected([])
    setOpened(true)
    setMessage('Combinaison posee sur la table.')
    if (nextRack.length === 0) { endGame('player', nextMelds, nextRack); return }
    scheduleCpu()
  }
  // Manipulation de table : ajouter les tuiles sélectionnées à une combinaison déjà
  // posée (prolonger une suite, compléter un groupe). Autorisé après l'ouverture.
  const addToMeld = (meldIndex: number) => {
    if (!selected.length) return
    if (!opened) { setMessage('Ouvrez d abord (pose a 30 pts) avant de manipuler la table.'); return }
    const combined = sortTiles([...melds[meldIndex], ...selectedTiles])
    if (!isRummiMeld(combined)) { setMessage('Ces tuiles ne completent pas cette combinaison.'); return }
    const nextRack = rack.filter((tile) => !selected.includes(tile.id))
    const nextMelds = melds.map((m, i) => (i === meldIndex ? combined : m))
    meldsRef.current = nextMelds
    rackRef.current = nextRack
    setMelds(nextMelds)
    setRack(nextRack)
    setSelected([])
    setMessage('Tuiles ajoutees a la combinaison !')
    if (nextRack.length === 0) { endGame('player', nextMelds, nextRack); return }
    scheduleCpu()
  }
  const draw = () => {
    if (!poolRef.current.length) return
    const nextRack = sortTiles([...rack, poolRef.current[0]])
    const nextPool = poolRef.current.slice(1)
    rackRef.current = nextRack
    poolRef.current = nextPool
    setRack(nextRack)
    setPool(nextPool)
    setMessage('Tuile piochee.')
    scheduleCpu()
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
              <div
                key={index}
                onClick={() => { if (selected.length) addToMeld(index) }}
                title={selected.length ? 'Ajouter les tuiles selectionnees a cette combinaison' : undefined}
                style={{ cursor: selected.length ? 'pointer' : 'default', outline: selected.length ? `2px dashed ${ACCENT}88` : 'none', borderRadius: 8 }}
              >
                <div style={{ ...rummiMeldRowStyle, pointerEvents: selected.length ? 'none' : 'auto' }}>
                  {meld.map((tile) => <RummiTile key={tile.id} tile={tile} small />)}
                </div>
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
