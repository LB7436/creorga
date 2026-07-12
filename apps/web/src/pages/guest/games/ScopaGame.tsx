import { useMemo, useState } from 'react'
import {
  ActionButton,
  CardBack,
  Game3DShell,
  PlayerBadge,
  StatPill,
  ghostButtonStyle,
} from './arcade3d'
import { ACCENT, ACCENT2, BORDER, MUTED, SURFACE2, TEXT } from './theme'
import {
  SCOPA_TARGET_SCORE,
  SUIT_LABELS,
  SUIT_SYMBOLS,
  getValidCaptures,
  initScopaGame,
  playScopaCard,
  scopaWinner,
  startScopaRound,
  type ScopaCard,
} from './scopaRules'
import { useGameScore } from './useGameScore'

type Setup = 'setup' | 'play'

function playerName(index: number) {
  return `Joueur ${index + 1}`
}

function ScopaImageCard({
  card,
  selected,
  muted,
  onClick,
  small,
}: {
  card: ScopaCard
  selected?: boolean
  muted?: boolean
  onClick?: () => void
  small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      title={`${card.value} ${SUIT_LABELS[card.suit]}`}
      style={{
        width: small ? 58 : 78,
        height: small ? 86 : 116,
        borderRadius: 9,
        border: `2px solid ${selected ? ACCENT2 : 'rgba(255,255,255,0.16)'}`,
        background: '#f8fafc',
        padding: 0,
        overflow: 'hidden',
        boxShadow: selected
          ? '0 18px 24px rgba(6,182,212,0.28), 0 0 0 4px rgba(6,182,212,0.16)'
          : '0 18px 24px rgba(0,0,0,0.32)',
        opacity: muted ? 0.42 : 1,
        cursor: onClick ? 'pointer' : 'default',
        transform: selected ? 'translateY(-10px) rotateX(8deg)' : 'rotateX(8deg)',
        transition: 'transform 160ms ease, opacity 160ms ease, border-color 160ms ease',
        transformStyle: 'preserve-3d',
      }}
    >
      <img
        src={`/cards/scopa/${card.value}_${card.suit}.jpg`}
        alt={`${card.value} ${SUIT_LABELS[card.suit]}`}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </button>
  )
}

export default function ScopaGame({ onBack }: { onBack?: () => void }) {
  const { submit } = useGameScore('scoopa')
  const [setup, setSetup] = useState<Setup>('setup')
  const [players, setPlayers] = useState(2)
  const [state, setState] = useState(() => initScopaGame(2))
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [selectedCaptureKey, setSelectedCaptureKey] = useState('')
  const [message, setMessage] = useState('Choisissez une carte. Les captures obligatoires sont proposees automatiquement.')

  const currentHand = state.hands[state.currentPlayerIndex] ?? []
  const selected = selectedCard !== null ? currentHand[selectedCard] : null
  const captureOptions = useMemo(() => selected ? getValidCaptures(selected, state.table) : [], [selected, state.table])
  const chosenCapture = captureOptions.find((combo) => combo.join('-') === selectedCaptureKey) ?? captureOptions[0] ?? []
  const roundScores = state.roundScoreDetails ?? []
  const winner = state.phase === 'gameEnd' ? scopaWinner(state) : null

  const start = (count = players) => {
    setPlayers(count)
    setState(initScopaGame(count))
    setSelectedCard(null)
    setSelectedCaptureKey('')
    setMessage('Partie lancee. Passez la tablette au joueur indique.')
    setSetup('play')
  }

  const play = () => {
    if (selectedCard === null) return
    const next = playScopaCard(state, state.currentPlayerIndex, selectedCard, chosenCapture)
    if (!next) {
      setMessage('Ce coup n est pas valide.')
      return
    }
    const madeScopa = chosenCapture.length > 0 && next.table.length === 0
    // Fin de partie: score du vainqueur (meilleur score de table). Transition unique par partie,
    // playScopaCard refusant tout coup hors phase 'playing'.
    if (next.phase === 'gameEnd') submit(Math.max(...next.scores))
    setState(next)
    setSelectedCard(null)
    setSelectedCaptureKey('')
    setMessage(madeScopa ? 'Scopa! La table est nettoyee.' : `Au tour de ${playerName(next.currentPlayerIndex)}.`)
  }

  const continueRound = () => {
    if (state.phase === 'gameEnd') {
      start(players)
      return
    }
    setState(startScopaRound(state))
    setSelectedCard(null)
    setSelectedCaptureKey('')
    setMessage('Nouvelle manche.')
  }

  const side = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatPill label="Cible" value={SCOPA_TARGET_SCORE} />
        <StatPill label="Pioche" value={state.deck.length} color={ACCENT2} />
      </div>
      {state.scores.map((score, index) => (
        <PlayerBadge key={index} index={index} active={state.currentPlayerIndex === index && state.phase === 'playing'} label={playerName(index)} score={score} />
      ))}
      <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.45 }}>{message}</div>
      {state.phase !== 'playing' && (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ color: TEXT, fontWeight: 900, marginBottom: 8 }}>
            {state.phase === 'gameEnd' ? (winner === null ? 'Egalite' : `${playerName(winner)} gagne`) : 'Fin de manche'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: MUTED }}>
            {roundScores.map((detail, index) => (
              <div key={`${detail.category}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{detail.category}</span>
                <strong style={{ color: detail.playerIndex === null ? MUTED : ACCENT2 }}>
                  {detail.playerIndex === null ? '-' : `${playerName(detail.playerIndex)} +${detail.points}`}
                </strong>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <ActionButton onClick={continueRound}>{state.phase === 'gameEnd' ? 'Nouvelle partie' : 'Manche suivante'}</ActionButton>
          </div>
        </div>
      )}
      <button onClick={() => setSetup('setup')} style={ghostButtonStyle}>Reglages</button>
    </div>
  )

  if (setup === 'setup') {
    return (
      <Game3DShell title="Scoopa 3D" subtitle="Scopa italienne, 2 a 4 joueurs en pass-and-play" onBack={onBack}>
        <div style={setupStyle}>
          <div style={setupPanelStyle}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
              {(['denari', 'coppe', 'bastoni', 'spade'] as ScopaCard['suit'][]).map((suit, index) => (
                <img
                  key={suit}
                  src={`/cards/scopa/7_${suit}.jpg`}
                  alt={SUIT_LABELS[suit]}
                  style={{
                    width: 48,
                    height: 72,
                    objectFit: 'cover',
                    borderRadius: 7,
                    border: '1px solid rgba(255,255,255,0.16)',
                    transform: `rotate(${(index - 1.5) * 5}deg) translateY(${index % 2 ? 2 : -2}px)`,
                    boxShadow: '0 12px 18px rgba(0,0,0,0.28)',
                  }}
                />
              ))}
            </div>
            <h2 style={{ margin: 0, color: TEXT, fontSize: 26 }}>Scoopa 3D</h2>
            <p style={{ margin: 0, color: MUTED, fontSize: 13, lineHeight: 1.5 }}>
              Jeu de cartes italien repris depuis VibeResto: 40 cartes, captures par somme, Denari, Settebello, Primiera et points de Scopa.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => setPlayers(count)}
                  style={{
                    ...ghostButtonStyle,
                    color: players === count ? '#fff' : MUTED,
                    borderColor: players === count ? ACCENT : BORDER,
                    background: players === count ? `${ACCENT}33` : 'rgba(255,255,255,0.04)',
                  }}
                >
                  {count} joueurs
                </button>
              ))}
            </div>
            <ActionButton onClick={() => start(players)}>Demarrer</ActionButton>
          </div>
        </div>
      </Game3DShell>
    )
  }

  return (
    <Game3DShell title="Scoopa 3D" subtitle="Table de cartes 3D, multijoueur local" onBack={onBack} side={side}>
      <div style={tableSceneStyle}>
        <div style={opponentsStyle}>
          {state.hands.map((hand, index) => index !== state.currentPlayerIndex && (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: state.phase === 'playing' ? 1 : 0.55 }}>
              <span style={{ color: MUTED, fontSize: 11 }}>{playerName(index)}</span>
              {hand.map((card) => <CardBack key={card.id} small />)}
            </div>
          ))}
        </div>

        <div style={boardStyle}>
          <div style={deckStyle}>
            <CardBack />
            <span style={{ color: MUTED, fontSize: 11 }}>{state.deck.length}</span>
          </div>
          <div style={tableCardsStyle}>
            {state.table.map((card, index) => {
              const highlighted = chosenCapture.includes(index)
              return (
                <ScopaImageCard
                  key={card.id}
                  card={card}
                  selected={highlighted}
                  muted={captureOptions.length > 0 && !highlighted}
                />
              )
            })}
          </div>
        </div>

        <div style={handStyle}>
          <div style={{ color: TEXT, fontSize: 13, fontWeight: 900, marginBottom: 8 }}>{playerName(state.currentPlayerIndex)}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {currentHand.map((card, index) => (
              <ScopaImageCard
                key={card.id}
                card={card}
                selected={selectedCard === index}
                onClick={() => {
                  setSelectedCard(index)
                  const first = getValidCaptures(card, state.table)[0]
                  setSelectedCaptureKey(first ? first.join('-') : '')
                }}
              />
            ))}
          </div>
          {selected && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {captureOptions.length ? captureOptions.map((combo) => (
                <button
                  key={combo.join('-')}
                  onClick={() => setSelectedCaptureKey(combo.join('-'))}
                  style={{
                    ...ghostButtonStyle,
                    borderColor: sameKey(selectedCaptureKey, combo) ? ACCENT2 : BORDER,
                    color: sameKey(selectedCaptureKey, combo) ? '#fff' : MUTED,
                  }}
                >
                  Prendre {combo.map((i) => `${state.table[i].value} ${SUIT_LABELS[state.table[i].suit][0]}`).join(' + ')}
                </button>
              )) : (
                <span style={{ color: MUTED, fontSize: 12 }}>Aucune capture: la carte ira sur la table.</span>
              )}
              <ActionButton onClick={play}>Jouer</ActionButton>
            </div>
          )}
        </div>
      </div>
    </Game3DShell>
  )
}

function sameKey(key: string, combo: number[]) {
  return key === combo.join('-') || (!key && combo.length === 0)
}

const setupStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
}

const setupPanelStyle: React.CSSProperties = {
  width: 'min(420px, 100%)',
  padding: 18,
  borderRadius: 12,
  border: `1px solid ${BORDER}`,
  background: SURFACE2,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  textAlign: 'center',
}

const tableSceneStyle: React.CSSProperties = {
  height: '100%',
  padding: 12,
  display: 'grid',
  gridTemplateRows: '78px minmax(240px, 1fr) minmax(120px, auto)',
  gap: 8,
  background: 'radial-gradient(circle at 50% 45%, rgba(20,184,166,0.18), transparent 38%), radial-gradient(circle at 8% 92%, rgba(245,158,11,0.12), transparent 19%), radial-gradient(circle at 92% 90%, rgba(168,85,247,0.12), transparent 18%)',
  overflow: 'auto',
}

const opponentsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  gap: 12,
}

const boardStyle: React.CSSProperties = {
  width: 'min(900px, 100%)',
  justifySelf: 'center',
  alignSelf: 'center',
  minHeight: 0,
  maxHeight: 'min(48vh, 350px)',
  borderRadius: 24,
  border: '1px solid rgba(45,212,191,0.2)',
  background: 'radial-gradient(circle at 50% 45%, rgba(20,184,166,0.2), transparent 36%), linear-gradient(145deg, rgba(6,78,59,0.92), rgba(15,23,42,0.94))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -22px 38px rgba(0,0,0,0.28), 0 30px 70px rgba(0,0,0,0.46)',
  transform: 'rotateX(8deg)',
  transformStyle: 'preserve-3d',
  display: 'grid',
  gridTemplateColumns: '92px minmax(0, 1fr)',
  gap: 16,
  padding: 18,
  position: 'relative',
  overflow: 'hidden',
}

const deckStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

const tableCardsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: 12,
  minHeight: 176,
  position: 'relative',
  zIndex: 2,
}

const handStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '2px 8px 8px',
  position: 'relative',
  zIndex: 3,
}
