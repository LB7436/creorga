import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACCENT, ACCENT2, ActionButton, BORDER, BistroScene, Card, CardBack, CardSuit, Game3DShell, GameOverModal, GameProps, MUTED, MiniCard, RummiTile, SURFACE2, Stage, StatPill, TEXT, Tile, adjacent, awningStyle, bistroPanelStyle, cardArcadeLayoutStyle, cardPoints, cardRanks, cardSuits, chairShapeStyle, createMahjongTiles, createRun21Deck, createTriCards, currentCardSlotStyle, differences, distantDecorStyle, drawCards, findMeld, findRummiMeld, floorStyle, flowerShapeStyle, foundationStyle, gameSide, ghostButtonStyle, hintStyle, isRamiMeld, isRummiMeld, lampShapeStyle, mahjongFaces, mahjongGlyphStyle, mahjongGridStyle, mahjongTileStyle, makeDeck, makeRummiTiles, meldPreviewStyle, menuBoardStyle, ramiHandStyle, ramiTableStyle, rummiBoardStyle, rummiMeldRowStyle, rummiMeldsStyle, rummiRackStyle, rummiTileStyle, runColumnStyle, runColumnsStyle, sceneTowerStyle, sceneTreeStyle, shuffle, sortHand, sortTiles, spotWrapperStyle, stageBackground, stageContentStyle, stageSetPieceStyle, stageStyle, tableSceneShapeStyle, tileFace, triLayoutStyle, triTowersStyle, useGameScore } from './originalsShared'

export default function SpotErrorGame({ onBack }: GameProps) {
  const [found, setFound] = useState<string[]>([])
  const [message, setMessage] = useState('Reperez les 11 erreurs dans la scene de droite.')
  const mark = (id: string, label: string) => {
    if (found.includes(id)) return
    const next = [...found, id]
    setFound(next)
    setMessage(next.length === differences.length ? 'Parfait, les 11 erreurs sont trouvees.' : `Trouve: ${label}.`)
  }

  return (
    <Game3DShell
      title="Erreur 11 Terrasse"
      subtitle="Trouver les differences, decor arbre et tour"
      onBack={onBack}
      side={gameSide({
        stats: [
          { label: 'Trouvees', value: `${found.length}/11`, color: '#22c55e' },
          { label: 'Restantes', value: 11 - found.length, color: '#f59e0b' },
        ],
        message,
        children: <button onClick={() => { setFound([]); setMessage('Nouvelle observation.') }} style={ghostButtonStyle}>Recommencer</button>,
      })}
    >
      <Stage tone="terrace">
        <div style={spotWrapperStyle}>
          <BistroScene variant="left" />
          <div style={{ position: 'relative' }}>
            <BistroScene variant="right" />
            {differences.map((diff) => (
              <button
                key={diff.id}
                onClick={() => mark(diff.id, diff.label)}
                title={diff.label}
                style={{
                  position: 'absolute',
                  left: `${diff.x}%`,
                  top: `${diff.y}%`,
                  width: 26,
                  height: 26,
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
    </Game3DShell>
  )
}
