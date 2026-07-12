import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

export default function SpotErrorGame({ onBack }: GameProps) {
  const TOTAL = differences.length
  const [found, setFound] = useState<string[]>([])
  const [misses, setMisses] = useState(0)
  const [message, setMessage] = useState(`Reperez les ${TOTAL} erreurs dans la scene de droite.`)
  const [gameOver, setGameOver] = useState(false)
  const [isNewRecord, setIsNewRecord] = useState(false)

  const { best, submit } = useGameScore('erreur11')
  const submittedRef = useRef(false)

  // Score higher-is-better : bonus par erreur trouvee, malus par clic rate (precision).
  const scoreFor = (nbFound: number, nbMiss: number) => Math.max(0, 100 + nbFound * 20 - nbMiss * 15)
  const score = scoreFor(found.length, misses)

  const mark = (e: MouseEvent<HTMLButtonElement>, id: string, label: string) => {
    e.stopPropagation() // ne compte pas comme un clic rate
    if (found.includes(id) || gameOver) return
    const next = [...found, id]
    setFound(next)
    if (next.length === TOTAL) {
      setMessage(`Parfait, les ${TOTAL} erreurs sont trouvees !`)
      if (!submittedRef.current) {
        submittedRef.current = true
        setGameOver(true)
        setIsNewRecord(submit(Math.min(1_000_000, scoreFor(TOTAL, misses))))
      }
    } else {
      setMessage(`Trouve: ${label}. (${next.length}/${TOTAL})`)
    }
  }

  // Clic hors d'une erreur = rate (malus de score).
  const onMiss = () => {
    if (gameOver) return
    setMisses((m) => m + 1)
    setMessage('Rate ! Cherchez mieux.')
  }

  const reset = () => {
    setFound([])
    setMisses(0)
    setGameOver(false)
    setIsNewRecord(false)
    submittedRef.current = false
    setMessage('Nouvelle observation.')
  }

  return (
    <Game3DShell
      title="Erreur 11 Terrasse"
      subtitle="Trouver les differences, decor arbre et tour"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Trouvees', value: `${found.length}/${TOTAL}`, color: '#22c55e' },
          { label: 'Rates', value: misses, color: '#ef4444' },
          { label: 'Record', value: best, color: '#f59e0b' },
        ],
        message,
        children: <button onClick={reset} style={ghostButtonStyle}>Recommencer</button>,
      })}
    >
      <Stage tone="terrace">
        <div style={spotWrapperStyle}>
          <BistroScene variant="left" />
          <div style={{ position: 'relative' }} onClick={onMiss}>
            <BistroScene variant="right" />
            {differences.map((diff) => (
              <button
                key={diff.id}
                onClick={(e) => mark(e, diff.id, diff.label)}
                title={diff.label}
                style={{
                  position: 'absolute',
                  left: `${diff.x}%`,
                  top: `${diff.y}%`,
                  width: 30,
                  height: 30,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 999,
                  border: found.includes(diff.id) ? '2px solid #22c55e' : '2px solid transparent',
                  background: found.includes(diff.id) ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                }}
              />
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
