import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

type Snapshot = { melds: Tile[][]; rack: Tile[] }

export default function RummikubGame({ onBack }: GameProps) {
  const initial = useMemo(() => makeRummiTiles(), [])
  const [pool, setPool] = useState(initial.slice(28))
  const [rack, setRack] = useState(sortTiles(initial.slice(0, 14)))
  const [cpuRack, setCpuRack] = useState(initial.slice(14, 28))
  const [selected, setSelected] = useState<string[]>([])
  const [melds, setMelds] = useState<Tile[][]>([]) // table PARTAGÉE (joueur + CPU)
  const [opened, setOpened] = useState(false)
  // Table partagée : les combinaisons n'ont pas de propriétaire, donc le score du
  // joueur = cumul des points qu'il a réussi à MELDER depuis son chevalet.
  const [playerScore, setPlayerScore] = useState(0)
  const [dirty, setDirty] = useState(false) // manipulation en cours, non validée
  const [message, setMessage] = useState('Table PARTAGÉE : réarrangez toute combinaison (la vôtre ou celle du CPU). Sélectionnez des tuiles, « Nouvelle combi. » ou « + ici », puis « Valider le tour ».')
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<'player' | 'cpu' | null>(null)
  const cpuTurnTimeout = useRef<number>()

  const { best, submit } = useGameScore('rummikub')
  const [isNewRecord, setIsNewRecord] = useState(false)

  const selectedTiles = useMemo(
    () => [...rack, ...melds.flat()].filter((tile) => selected.includes(tile.id)),
    [rack, melds, selected],
  )
  const selectedValue = selectedTiles.reduce((sum, tile) => sum + tile.number, 0)

  // Refs synchrones : cpuTurn/endGame s'exécutent dans un setTimeout, ils DOIVENT
  // lire l'état courant et non la closure du rendu où ils ont été planifiés (sinon
  // le CPU repioche la tuile que le joueur vient de prendre -> tuile dupliquée, et
  // endGame calcule le score sur un rack/melds périmés).
  const poolRef = useRef(pool); poolRef.current = pool
  const rackRef = useRef(rack); rackRef.current = rack
  const cpuRackRef = useRef(cpuRack); cpuRackRef.current = cpuRack
  const meldsRef = useRef(melds); meldsRef.current = melds
  const playerScoreRef = useRef(playerScore); playerScoreRef.current = playerScore
  const gameOverRef = useRef(gameOver); gameOverRef.current = gameOver
  const openedRef = useRef(opened); openedRef.current = opened
  // Snapshot du début de tour (table + chevalet) pour « Annuler ». Sa présence =
  // le joueur a manipulé la table sans encore valider (source de vérité de `dirty`).
  const snapshotRef = useRef<Snapshot | null>(null)

  // Écrit table + chevalet dans l'état ET les refs en une fois (les mutations de
  // table doivent rester cohérentes pour le CPU planifié en setTimeout).
  const commitLocal = (nextMelds: Tile[][], nextRack: Tile[]) => {
    meldsRef.current = nextMelds
    rackRef.current = nextRack
    setMelds(nextMelds)
    setRack(nextRack)
  }

  const startDirty = () => {
    if (!snapshotRef.current) {
      snapshotRef.current = { melds: meldsRef.current, rack: rackRef.current }
      setDirty(true)
    }
  }

  const endGame = (who: 'player' | 'cpu', finalScore: number, finalRack: Tile[]) => {
    if (gameOverRef.current) return
    gameOverRef.current = true
    setGameOver(true)
    setWinner(who)
    // Table partagée : score = points meldés depuis le chevalet (+50 si victoire)
    // − valeur des tuiles encore en main. Valeurs POST-coup passées en paramètre.
    const s = finalScore + (who === 'player' ? 50 : 0) - finalRack.reduce((sum, t) => sum + t.number, 0)
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
    let nextMelds = [...meldsRef.current]
    const meld = findRummiMeld(nextRack)
    if (meld) {
      nextRack = nextRack.filter((t) => !meld.includes(t))
      nextMelds = [...nextMelds, sortTiles(meld)]
      setMessage('Le CPU pose une combinaison sur la table.')
    } else {
      setMessage('Le CPU pioche une tuile.')
    }
    // IA « exploite la table PARTAGÉE » : le CPU prolonge N'IMPORTE QUELLE combinaison
    // de la table (la sienne ou celle du joueur) avec ses tuiles, tant qu'il en trouve.
    let extended = true
    while (extended) {
      extended = false
      for (let i = 0; i < nextMelds.length && !extended; i++) {
        for (const t of nextRack) {
          const combined = sortTiles([...nextMelds[i], t])
          if (isRummiMeld(combined)) {
            nextMelds = nextMelds.map((m, j) => (j === i ? combined : m))
            nextRack = nextRack.filter((x) => x.id !== t.id)
            extended = true
            break
          }
        }
      }
    }
    meldsRef.current = nextMelds
    setMelds(nextMelds)
    cpuRackRef.current = nextRack
    setCpuRack(nextRack)
    if (nextRack.length === 0) endGame('cpu', playerScoreRef.current, rackRef.current)
  }

  const scheduleCpu = () => {
    window.clearTimeout(cpuTurnTimeout.current)
    cpuTurnTimeout.current = window.setTimeout(cpuTurn, 800)
  }

  const toggleSelect = (id: string) =>
    setSelected((items) => (items.includes(id) ? items.filter((x) => x !== id) : [...items, id]))

  // Retire les tuiles sélectionnées de leurs sources (chevalet + toute combinaison)
  // et renvoie les objets Tile extraits + les nouveaux chevalet/table.
  const pullSelected = () => {
    const ids = new Set(selected)
    const pulled = [...rackRef.current, ...meldsRef.current.flat()].filter((t) => ids.has(t.id))
    const nextRack = rackRef.current.filter((t) => !ids.has(t.id))
    const strippedMelds = meldsRef.current.map((m) => m.filter((t) => !ids.has(t.id)))
    return { pulled, nextRack, strippedMelds }
  }

  // Forme une nouvelle combinaison à partir de la sélection (scinde une combinaison
  // existante si les tuiles en proviennent). Validité vérifiée à « Valider le tour ».
  const newMeld = () => {
    if (!selected.length) return
    startDirty()
    const { pulled, nextRack, strippedMelds } = pullSelected()
    const nextMelds = [...strippedMelds.filter((m) => m.length > 0), sortTiles(pulled)]
    commitLocal(nextMelds, nextRack)
    setSelected([])
    setMessage('Nouvelle combinaison créée. Ajustez la table puis « Valider le tour ».')
  }

  // Ajoute la sélection à une combinaison existante (prolonge/complète). Peut vider
  // la combinaison source (elle disparaît alors de la table).
  const addSelectedToMeld = (meldIndex: number) => {
    if (!selected.length) return
    startDirty()
    const { pulled, nextRack, strippedMelds } = pullSelected()
    const withTarget = strippedMelds.map((m, i) => (i === meldIndex ? sortTiles([...m, ...pulled]) : m))
    const nextMelds = withTarget.filter((m) => m.length > 0)
    commitLocal(nextMelds, nextRack)
    setSelected([])
    setMessage('Tuiles déplacées vers cette combinaison.')
  }

  const annuler = () => {
    const snap = snapshotRef.current
    if (!snap) return
    commitLocal(snap.melds, snap.rack)
    snapshotRef.current = null
    setDirty(false)
    setSelected([])
    setMessage('Manipulation annulée : table restaurée.')
  }

  // Valide le tour : toute combinaison de la table doit être valide (min 3, groupe
  // ou suite), au moins une tuile jouée depuis le chevalet, et — si pas encore
  // ouvert — la 1re pose depuis le chevalet doit valoir >= 30.
  const valider = () => {
    if (!snapshotRef.current) {
      setMessage('Rien à valider. Sélectionnez des tuiles pour poser/manipuler, ou piochez.')
      return
    }
    const badIdx = melds.findIndex((m) => !isRummiMeld(m))
    if (badIdx !== -1) {
      setMessage(`Combinaison ${badIdx + 1} invalide (min 3 tuiles, groupe ou suite).`)
      return
    }
    const snap = snapshotRef.current
    const currentIds = new Set(rack.map((t) => t.id))
    const playedFromRack = snap.rack.filter((t) => !currentIds.has(t.id))
    if (playedFromRack.length === 0) {
      setMessage('Jouez au moins une tuile de votre chevalet (ou « Annuler » puis piochez).')
      return
    }
    const gained = playedFromRack.reduce((s, t) => s + t.number, 0)
    if (!opened) {
      if (gained < 30) {
        setMessage(`Première pose : ${gained}/30 pts depuis le chevalet.`)
        return
      }
      setOpened(true)
      openedRef.current = true
    }
    // Cumule les points meldés depuis le chevalet ce tour (score = productivité).
    const nextScore = playerScoreRef.current + gained
    playerScoreRef.current = nextScore
    setPlayerScore(nextScore)
    snapshotRef.current = null
    setDirty(false)
    setSelected([])
    setMessage('Tour validé !')
    if (rack.length === 0) { endGame('player', nextScore, rack); return }
    scheduleCpu()
  }

  const draw = () => {
    if (snapshotRef.current) {
      setMessage('Validez ou annulez votre manipulation avant de piocher.')
      return
    }
    if (!poolRef.current.length) return
    const nextRack = sortTiles([...rack, poolRef.current[0]])
    const nextPool = poolRef.current.slice(1)
    rackRef.current = nextRack
    poolRef.current = nextPool
    setRack(nextRack)
    setPool(nextPool)
    setSelected([])
    setMessage('Tuile piochée.')
    scheduleCpu()
  }

  useEffect(() => () => window.clearTimeout(cpuTurnTimeout.current), [])

  const restart = () => {
    const fresh = makeRummiTiles()
    commitLocal([], sortTiles(fresh.slice(0, 14)))
    setCpuRack(fresh.slice(14, 28))
    setPool(fresh.slice(28))
    setSelected([])
    setOpened(false)
    openedRef.current = false
    setPlayerScore(0)
    playerScoreRef.current = 0
    snapshotRef.current = null
    setDirty(false)
    setGameOver(false)
    setWinner(null)
    setIsNewRecord(false)
    setMessage('Nouvelle partie contre le CPU.')
  }

  return (
    <>
    <Game3DShell
      title="Rummi Kub 3D"
      subtitle="Vs CPU — table PARTAGÉE, manipulation libre"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Score', value: playerScore, color: '#f59e0b' },
          { label: 'Chevalet', value: rack.length, color: ACCENT2 },
          { label: 'CPU', value: `${cpuRack.length} tuiles`, color: '#ef4444' },
          { label: 'Pose', value: opened ? selectedValue : `${selectedValue}/30`, color: ACCENT },
        ],
        message,
        children: (
          <>
            <ActionButton onClick={newMeld} disabled={!selected.length}>Nouvelle combi.</ActionButton>
            <ActionButton onClick={valider} tone="secondary" disabled={!dirty}>Valider le tour</ActionButton>
            {dirty && <button onClick={annuler} style={ghostButtonStyle}>Annuler</button>}
            <button onClick={draw} style={ghostButtonStyle}>Piocher</button>
          </>
        ),
      })}
    >
      <Stage tone="bamboo">
        <div style={rummiBoardStyle}>
          <div style={rummiMeldsStyle}>
            {melds.length ? melds.map((meld, index) => {
              const ok = isRummiMeld(meld)
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: 4, borderRadius: 8,
                    outline: ok ? 'none' : '2px dashed #ef4444', outlineOffset: 2,
                  }}
                >
                  <div style={rummiMeldRowStyle}>
                    {meld.map((tile) => (
                      <RummiTile
                        key={tile.id}
                        tile={tile}
                        small
                        selected={selected.includes(tile.id)}
                        onClick={() => toggleSelect(tile.id)}
                      />
                    ))}
                  </div>
                  {selected.length > 0 && (
                    <button
                      onClick={() => addSelectedToMeld(index)}
                      title="Ajouter les tuiles sélectionnées à cette combinaison"
                      style={{ ...ghostButtonStyle, padding: '4px 8px', minHeight: 32, fontSize: 11 }}
                    >
                      + ici
                    </button>
                  )}
                  {!ok && <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700 }}>invalide</span>}
                </div>
              )
            }) : <span style={{ color: MUTED }}>Table libre — posez une première combinaison (30 pts).</span>}
          </div>
          <div style={rummiRackStyle}>
            {rack.map((tile) => (
              <RummiTile
                key={tile.id}
                tile={tile}
                selected={selected.includes(tile.id)}
                onClick={() => toggleSelect(tile.id)}
              />
            ))}
          </div>
        </div>
      </Stage>
    </Game3DShell>
    {gameOver && (
      <GameOverModal
        score={Math.max(0, playerScore + (winner === 'player' ? 50 : 0) - rack.reduce((sum, t) => sum + t.number, 0))}
        best={best}
        isNewRecord={isNewRecord}
        onReplay={restart}
        onBack={onBack}
      />
    )}
    </>
  )
}
