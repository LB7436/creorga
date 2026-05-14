import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import * as THREE from 'three'
import { ACCENT, ACCENT2, BORDER, MUTED, TEXT } from './theme'

type PlayMode = 'solo' | 'ensemble' | 'individuel' | 'tournoi'
const PLAY_MODE_KEY = 'creorga-guest-play-mode-v1'

interface Piece {
  id: number
  steps: number
  finished: boolean
}

interface PlayerState {
  pieces: Piece[]
  finished: number
}

interface MenschState {
  players: PlayerState[]
  current: number
  die: number
  rolled: boolean
  rolling: boolean
  winner: number | null
  message: string
  lastMove: string | null
}

interface MoveHint {
  index: number
  x: number
  y: number
}

const COLORS = ['#1d9bf0', '#facc15', '#22c55e', '#ef4444'] as const
const COLOR_NAMES = ['Bleu', 'Jaune', 'Vert', 'Rouge']
const SAFE_TRACKS = new Set([0, 8, 13, 21, 26, 34, 39, 47])
const CELL = 0.62

const TRACK: [number, number][] = [
  [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
  [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7],
  [1, 8],
  [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9],
  [7, 10], [7, 11], [7, 12], [7, 13], [7, 14], [7, 15],
  [8, 15], [9, 15], [9, 14], [9, 13], [9, 12], [9, 11], [9, 10],
  [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9],
  [15, 8],
  [15, 7], [14, 7], [13, 7], [12, 7], [11, 7], [10, 7], [9, 6], [9, 5],
  [9, 4], [9, 3], [9, 2], [9, 1], [8, 1],
]

const TRACK_LENGTH = TRACK.length
const FINISH_STEP = TRACK_LENGTH + 5
const START_INDEX = [13, 0, 39, 26]
const BASES: [number, number][][] = [
  [[2, 12], [4, 12], [2, 14], [4, 14]],
  [[2, 2], [4, 2], [2, 4], [4, 4]],
  [[12, 2], [14, 2], [12, 4], [14, 4]],
  [[12, 12], [14, 12], [12, 14], [14, 14]],
]
const HOME_PATHS: [number, number][][] = [
  [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8]],
  [[8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7]],
  [[14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8]],
  [[8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9]],
]
const RULES = [
  'Un 6 est obligatoire pour sortir un pion de la maison.',
  'Apres un 6, le joueur garde la main.',
  'Un pion adverse capture retourne dans sa maison, sauf sur une case protegee.',
  'La colonne finale doit etre atteinte avec le nombre exact.',
  'Le premier joueur qui rentre ses 4 pions gagne la manche.',
]

function createState(players: number): MenschState {
  return {
    players: Array.from({ length: players }, () => ({
      pieces: Array.from({ length: 4 }, (_, id) => ({ id, steps: -1, finished: false })),
      finished: 0,
    })),
    current: 0,
    die: 1,
    rolled: false,
    rolling: false,
    winner: null,
    message: 'Lancez le de. Il faut un 6 pour sortir un pion.',
    lastMove: null,
  }
}

function initialMode(): PlayMode {
  if (typeof window === 'undefined') return 'ensemble'
  const saved = window.localStorage.getItem(PLAY_MODE_KEY)
  return saved === 'solo' || saved === 'ensemble' || saved === 'individuel' || saved === 'tournoi' ? saved : 'ensemble'
}

function saveMode(mode: PlayMode) {
  if (typeof window !== 'undefined') window.localStorage.setItem(PLAY_MODE_KEY, mode)
}

function isBot(mode: PlayMode, playerIndex: number) {
  return mode === 'solo' && playerIndex > 0
}

function modeLabel(mode: PlayMode) {
  if (mode === 'solo') return 'Solo'
  if (mode === 'individuel') return 'Individuel'
  if (mode === 'tournoi') return 'Tournoi'
  return 'Ensemble'
}

function absoluteTrack(playerIndex: number, steps: number) {
  return (START_INDEX[playerIndex] + steps) % TRACK_LENGTH
}

function pieceCell(piece: Piece, playerIndex: number, pieceIndex: number) {
  if (piece.steps < 0) return BASES[playerIndex][pieceIndex]
  if (piece.steps >= TRACK_LENGTH) return HOME_PATHS[playerIndex][Math.min(5, piece.steps - TRACK_LENGTH)]
  return TRACK[absoluteTrack(playerIndex, piece.steps)]
}

function hasOwnPieceAt(state: MenschState, playerIndex: number, targetSteps: number) {
  return state.players[playerIndex].pieces.some((piece) =>
    !piece.finished &&
    piece.steps === targetSteps &&
    piece.steps >= 0
  )
}

function targetTrack(playerIndex: number, targetSteps: number) {
  return targetSteps >= 0 && targetSteps < TRACK_LENGTH ? absoluteTrack(playerIndex, targetSteps) : null
}

function canMove(state: MenschState, piece: Piece, playerIndex: number) {
  if (!state.rolled || state.rolling || state.winner !== null || piece.finished) return false
  if (piece.steps < 0) {
    if (state.die !== 6) return false
    return !hasOwnPieceAt(state, playerIndex, 0)
  }
  const target = piece.steps + state.die
  if (target > FINISH_STEP) return false
  if (hasOwnPieceAt(state, playerIndex, target)) return false
  return true
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1
}

function chooseBotPiece(state: MenschState) {
  const current = state.current
  const options = state.players[current].pieces
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => canMove(state, piece, current))
  const capture = options.find(({ piece }) => {
    const target = piece.steps < 0 ? 0 : piece.steps + state.die
    const track = targetTrack(current, target)
    return track !== null && !SAFE_TRACKS.has(track) && state.players.some((player, playerIndex) =>
      playerIndex !== current && player.pieces.some((other) =>
        !other.finished &&
        other.steps >= 0 &&
        other.steps < TRACK_LENGTH &&
        absoluteTrack(playerIndex, other.steps) === track
      )
    )
  })
  return capture?.index ?? options.sort((a, b) => b.piece.steps - a.piece.steps)[0]?.index ?? -1
}

function gridToWorld(x: number, y: number) {
  return {
    x: (x - 8) * CELL,
    z: (y - 8) * CELL,
  }
}

export default function MenschGame() {
  const initial = initialMode()
  const [setup, setSetup] = useState(true)
  const [mode, setMode] = useState<PlayMode>(initial)
  const [count, setCount] = useState(initial === 'solo' ? 2 : 4)
  const [state, setState] = useState(() => createState(initial === 'solo' ? 2 : 4))
  const [tournament, setTournament] = useState([0, 0, 0, 0])
  const current = state.players[state.current]
  const movable = useMemo(() => current.pieces.map((piece) => canMove(state, piece, state.current)), [current.pieces, state])
  const botTurn = !setup && isBot(mode, state.current) && state.winner === null
  const moveHints = useMemo(() => {
    if (!state.rolled || state.winner !== null) return []
    const seen = new Set<string>()
    const hints: MoveHint[] = []
    current.pieces.forEach((piece, index) => {
      if (!canMove(state, piece, state.current)) return
      const target = piece.steps < 0 ? 0 : piece.steps + state.die
      const [x, y] = target >= TRACK_LENGTH
        ? HOME_PATHS[state.current][Math.min(5, target - TRACK_LENGTH)]
        : TRACK[absoluteTrack(state.current, target)]
      const key = `${x}-${y}`
      if (seen.has(key)) return
      seen.add(key)
      hints.push({ index, x, y })
    })
    return hints
  }, [current.pieces, state])

  const start = (players = count, nextMode = mode) => {
    const normalizedPlayers = nextMode === 'solo' ? 2 : players
    setCount(normalizedPlayers)
    setMode(nextMode)
    saveMode(nextMode)
    setState(createState(normalizedPlayers))
    setSetup(false)
  }

  const resetRound = () => {
    setState(createState(count))
  }

  const roll = () => {
    if (state.rolled || state.rolling || state.winner !== null || botTurn) return
    const die = rollDie()
    setState((currentState) => ({ ...currentState, rolling: true, message: `Joueur ${currentState.current + 1} lance...` }))
    window.setTimeout(() => {
      setState((currentState) => {
        const next = { ...currentState, die, rolled: true, rolling: false, message: `Joueur ${currentState.current + 1}: ${die}` }
        if (!next.players[next.current].pieces.some((piece) => canMove(next, piece, next.current))) {
          next.rolled = false
          next.current = (next.current + 1) % next.players.length
          next.message = die === 6 ? 'Aucun pion ne peut sortir: case de depart occupee.' : 'Aucun mouvement. Joueur suivant.'
        }
        return next
      })
    }, 380)
  }

  const move = (pieceIndex: number) => {
    if (!state.rolled || state.rolling || state.winner !== null || !movable[pieceIndex]) return
    setState((currentState) => {
      const next: MenschState = JSON.parse(JSON.stringify(currentState))
      const mover = next.current
      const piece = next.players[mover].pieces[pieceIndex]
      const wasBase = piece.steps < 0
      const target = wasBase ? 0 : piece.steps + next.die
      const track = targetTrack(mover, target)
      let captured = false

      piece.steps = target
      piece.finished = target === FINISH_STEP
      if (piece.finished) next.players[mover].finished += 1

      if (track !== null && !SAFE_TRACKS.has(track)) {
        for (let playerIndex = 0; playerIndex < next.players.length; playerIndex += 1) {
          if (playerIndex === mover) continue
          for (const other of next.players[playerIndex].pieces) {
            if (!other.finished && other.steps >= 0 && other.steps < TRACK_LENGTH && absoluteTrack(playerIndex, other.steps) === track) {
              other.steps = -1
              captured = true
            }
          }
        }
      }

      if (next.players[mover].finished === 4) {
        next.winner = mover
        next.message = `${COLOR_NAMES[mover]} gagne la manche.`
        if (mode === 'tournoi') {
          setTournament((scores) => scores.map((score, index) => index === mover ? score + 3 : score).slice(0, next.players.length))
        }
      } else if (next.die === 6 || captured) {
        next.message = captured ? 'Capture! Vous rejouez.' : '6: vous gardez la main.'
      } else {
        next.current = (mover + 1) % next.players.length
        next.message = `Au joueur ${next.current + 1}.`
      }

      next.rolled = false
      next.lastMove = `${mover}-${pieceIndex}-${Date.now()}`
      return next
    })
  }

  useEffect(() => {
    if (!botTurn) return
    const timer = window.setTimeout(() => {
      if (!state.rolled) {
        const die = rollDie()
        setState((currentState) => ({ ...currentState, rolling: true, message: `Joueur ${currentState.current + 1} lance...` }))
        window.setTimeout(() => {
          setState((currentState) => {
            const next = { ...currentState, die, rolled: true, rolling: false, message: `Joueur ${currentState.current + 1}: ${die}` }
            if (!next.players[next.current].pieces.some((piece) => canMove(next, piece, next.current))) {
              next.rolled = false
              next.current = (next.current + 1) % next.players.length
              next.message = die === 6 ? 'Aucun pion ne peut sortir: case de depart occupee.' : 'Aucun mouvement. Joueur suivant.'
            }
            return next
          })
        }, 380)
      } else {
        const index = chooseBotPiece(state)
        if (index >= 0) move(index)
      }
    }, state.rolled ? 720 : 680)
    return () => window.clearTimeout(timer)
  }, [botTurn, state.rolled, state.current, state.die])

  return (
    <div style={menschRootStyle}>
      <style>{responsiveStyle}</style>
      <MenschBoard3D
        state={state}
        movable={movable}
        moveHints={moveHints}
        onMove={move}
        preview={setup}
        botTurn={botTurn}
      />

      {setup ? (
        <SetupOverlay
          count={count}
          mode={mode}
          onChoose={(players, nextMode) => {
            setCount(players)
            setMode(nextMode)
            saveMode(nextMode)
          }}
          onStart={() => start(count, mode)}
        />
      ) : (
        <>
          <div className="mensch-top-hud" style={topHudStyle}>
            <div style={{ ...turnBadgeStyle, borderColor: COLORS[state.current] }}>
              <span style={{ ...colorDotStyle, background: COLORS[state.current] }} />
              <div style={turnCopyStyle}>
                <strong style={turnTitleStyle}>Tour de {COLOR_NAMES[state.current]}{isBot(mode, state.current) ? ' CPU' : ''}</strong>
                <span style={turnMetaStyle}>{modeLabel(mode)} - sortie sur 6 - arrivee exacte</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSetup(true)}
              style={smallGhostStyle}
            >
              Joueurs
            </button>
          </div>

          <div className="mensch-score-hud" style={scoreHudStyle}>
            {state.players.map((player, index) => (
              <div key={index} style={{ ...scoreChipStyle, borderColor: state.current === index ? COLORS[index] : 'rgba(255,255,255,0.14)' }}>
                <span style={{ ...colorDotStyle, background: COLORS[index] }} />
                <strong>{COLOR_NAMES[index]}{isBot(mode, index) ? ' CPU' : ''}</strong>
                <b style={{ color: COLORS[index] }}>{player.finished}/4</b>
              </div>
            ))}
            {mode === 'tournoi' && (
              <div style={tournamentStripStyle}>
                {state.players.map((_, index) => <span key={index}>{COLOR_NAMES[index]} {tournament[index] ?? 0}</span>)}
              </div>
            )}
          </div>

          <div className="mensch-action-dock" style={actionDockStyle}>
            {state.winner !== null ? (
              <button onClick={resetRound} style={primaryButtonStyle}>Manche suivante</button>
            ) : (
              <DiceRollButton
                value={state.die}
                rolling={state.rolling}
                disabled={state.rolled || state.rolling || botTurn}
                onRoll={roll}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <strong style={{ color: TEXT, display: 'block', fontSize: 13 }}>{state.message}</strong>
              <span style={{ color: MUTED, fontSize: 11 }}>
                Appuyez sur le de 3D, puis touchez un pion lumineux quand un mouvement est possible.
              </span>
            </div>
          </div>

          <div style={hiddenActionsStyle} aria-hidden={false}>
            {current.pieces.map((piece, index) => canMove(state, piece, state.current) && (
              <button key={piece.id} aria-label={`Jouer le pion ${index + 1}`} onClick={() => move(index)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DiceRollButton({
  value,
  rolling,
  disabled,
  onRoll,
}: {
  value: number
  rolling: boolean
  disabled: boolean
  onRoll: () => void
}) {
  return (
    <button
      type="button"
      aria-label="Lancer le de 3D"
      onClick={onRoll}
      disabled={disabled}
      className="mensch-dice-button"
      style={{
        ...diceButtonStyle,
        opacity: disabled && !rolling ? 0.54 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <span style={diceGlowStyle} />
      <span
        className="mensch-dice-cube"
        style={{
          ...diceCubeStyle,
          animation: rolling ? 'creorga-mensch-dice-roll 620ms linear infinite' : undefined,
          transform: rolling ? undefined : diceTransforms[value] ?? diceTransforms[1],
        }}
      >
        <DiceFace value={1} transform="translateZ(28px)" />
        <DiceFace value={6} transform="rotateY(180deg) translateZ(28px)" />
        <DiceFace value={2} transform="rotateY(90deg) translateZ(28px)" />
        <DiceFace value={5} transform="rotateY(-90deg) translateZ(28px)" />
        <DiceFace value={3} transform="rotateX(90deg) translateZ(28px)" />
        <DiceFace value={4} transform="rotateX(-90deg) translateZ(28px)" />
      </span>
      <span style={diceLabelStyle}>{rolling ? '...' : value}</span>
    </button>
  )
}

function DiceFace({ value, transform }: { value: number; transform: string }) {
  return (
    <span style={{ ...diceFaceStyle, transform }}>
      {dicePips[value].map(([row, column]) => (
        <span key={`${row}-${column}`} style={{ ...dicePipStyle, gridRow: row, gridColumn: column }} />
      ))}
    </span>
  )
}

function SetupOverlay({
  count,
  mode,
  onChoose,
  onStart,
}: {
  count: number
  mode: PlayMode
  onChoose: (players: number, mode: PlayMode) => void
  onStart: () => void
}) {
  const cards: { label: string; sub: string; players: number; mode: PlayMode }[] = [
    { label: 'Solo', sub: '1 joueur + CPU', players: 2, mode: 'solo' },
    { label: '2 joueurs', sub: 'Face a face', players: 2, mode: 'ensemble' },
    { label: '3 joueurs', sub: 'Table famille', players: 3, mode: 'ensemble' },
    { label: '4 joueurs', sub: 'Parchisi complet', players: 4, mode: 'ensemble' },
  ]

  return (
    <div style={setupOverlayStyle}>
      <div style={setupHeroStyle}>
        <span style={setupKickerStyle}>Regles type Mensch argere dich nicht</span>
        <h1 style={setupTitleStyle}>Petits Chevaux 3D</h1>
        <p style={setupTextStyle}>Choisissez les joueurs au depart, puis jouez sur un vrai plateau 3D plein ecran.</p>
        <div style={playerChoiceGridStyle}>
          {cards.map((card) => {
            const active = count === card.players && mode === card.mode
            return (
              <button
                key={`${card.label}-${card.mode}`}
                onClick={() => onChoose(card.players, card.mode)}
                style={{
                  ...playerChoiceStyle,
                  borderColor: active ? ACCENT2 : 'rgba(255,255,255,0.16)',
                  background: active ? 'rgba(6,182,212,0.18)' : 'rgba(15,23,42,0.5)',
                }}
              >
                <strong>{card.label}</strong>
                <span>{card.sub}</span>
              </button>
            )
          })}
        </div>
        <div style={modeRowStyle}>
          <button
            onClick={() => onChoose(4, 'tournoi')}
            style={{
              ...modeButtonStyle,
              borderColor: mode === 'tournoi' ? '#f59e0b' : 'rgba(255,255,255,0.14)',
              color: mode === 'tournoi' ? '#fff' : MUTED,
            }}
          >
            Tournoi local
          </button>
          <button
            onClick={() => onChoose(count, 'individuel')}
            style={{
              ...modeButtonStyle,
              borderColor: mode === 'individuel' ? '#a855f7' : 'rgba(255,255,255,0.14)',
              color: mode === 'individuel' ? '#fff' : MUTED,
            }}
          >
            Scores individuels
          </button>
        </div>
        <button onClick={onStart} style={startButtonStyle}>Demarrer la partie</button>
        <div style={rulesBoxStyle}>
          <strong>Regles</strong>
          {RULES.map((rule) => <span key={rule}>{rule}</span>)}
        </div>
      </div>
    </div>
  )
}

function MenschBoard3D({
  state,
  movable,
  moveHints,
  onMove,
  preview,
  botTurn,
}: {
  state: MenschState
  movable: boolean[]
  moveHints: MoveHint[]
  onMove: (pieceIndex: number) => void
  preview?: boolean
  botTurn?: boolean
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const boardRef = useRef<THREE.Group | null>(null)
  const targetsRef = useRef<THREE.Object3D[]>([])
  const onMoveRef = useRef(onMove)
  const previewRef = useRef(preview)
  const botTurnRef = useRef(botTurn)

  onMoveRef.current = onMove
  previewRef.current = preview
  botTurnRef.current = botTurn

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#7dd3fc')
    scene.fog = new THREE.Fog('#7dd3fc', 17, 34)

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const ambient = new THREE.HemisphereLight('#f8fafc', '#7c2d12', 1.85)
    scene.add(ambient)
    const key = new THREE.DirectionalLight('#fff7ed', 2.9)
    key.position.set(5.5, 10, 6.5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 32
    key.shadow.camera.left = -9
    key.shadow.camera.right = 9
    key.shadow.camera.top = 9
    key.shadow.camera.bottom = -9
    scene.add(key)

    const fill = new THREE.DirectionalLight('#38bdf8', 1.1)
    fill.position.set(-8, 4, -4)
    scene.add(fill)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.92, metalness: 0.02 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.34
    ground.receiveShadow = true
    scene.add(ground)

    addWorldDecor(scene)

    const resize = () => {
      const rect = host.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      const portrait = camera.aspect < 0.78
      camera.fov = portrait ? 48 : 42
      camera.position.set(portrait ? 0 : 7.5, portrait ? 12.6 : 8.7, portrait ? 15.4 : 10.8)
      camera.lookAt(0, 0.1, 0)
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const handlePointer = (event: PointerEvent) => {
      if (previewRef.current || botTurnRef.current) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(targetsRef.current, true)
      const hit = hits.find((item) => item.object.userData.pieceIndex !== undefined)
      if (hit) onMoveRef.current(hit.object.userData.pieceIndex)
    }
    renderer.domElement.addEventListener('pointerdown', handlePointer)

    const animationStartedAt = performance.now()
    renderer.setAnimationLoop(() => {
      const elapsed = (performance.now() - animationStartedAt) / 1000
      const board = boardRef.current
      if (board) {
        board.rotation.y = previewRef.current ? Math.sin(elapsed * 0.42) * 0.12 : 0
        board.traverse((object) => {
          if (object.userData.bob && object.userData.baseY !== undefined) {
            object.position.y = object.userData.baseY + Math.sin(elapsed * 8.2) * 0.055
          }
          if (object.userData.pulse) {
            const scale = 1 + Math.sin(elapsed * 4.8) * 0.055
            object.scale.setScalar(scale)
          }
        })
      }
      renderer.render(scene, camera)
    })

    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointer)
      renderer.setAnimationLoop(null)
      observer.disconnect()
      if (boardRef.current) disposeObject(boardRef.current)
      scene.traverse((object) => {
        if (object !== boardRef.current) disposeMesh(object)
      })
      renderer.dispose()
      renderer.domElement.remove()
      sceneRef.current = null
      rendererRef.current = null
      cameraRef.current = null
      boardRef.current = null
      targetsRef.current = []
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (boardRef.current) {
      scene.remove(boardRef.current)
      disposeObject(boardRef.current)
    }
    const group = buildBoardScene(state, movable, moveHints)
    group.position.y = preview ? -0.15 : 0
    group.scale.setScalar(preview ? 0.92 : 1)
    scene.add(group)
    boardRef.current = group
    targetsRef.current = []
    group.traverse((object) => {
      if (object.userData.pieceIndex !== undefined) targetsRef.current.push(object)
    })
  }, [state, movable, moveHints, preview])

  return <div ref={hostRef} style={canvasHostStyle} />
}

function buildBoardScene(state: MenschState, movable: boolean[], moveHints: MoveHint[]) {
  const group = new THREE.Group()
  group.rotation.x = -0.08

  const boardMaterial = new THREE.MeshStandardMaterial({ color: '#52146e', roughness: 0.58, metalness: 0.08 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(10.75, 0.42, 10.75), boardMaterial)
  base.position.y = 0
  base.castShadow = true
  base.receiveShadow = true
  group.add(base)

  const bevel = new THREE.Mesh(
    new THREE.BoxGeometry(11.15, 0.18, 11.15),
    new THREE.MeshStandardMaterial({ color: '#a855f7', roughness: 0.5, metalness: 0.12 })
  )
  bevel.position.y = -0.13
  bevel.castShadow = true
  bevel.receiveShadow = true
  group.add(bevel)

  addBaseZones(group)
  addTrackTiles(group)
  addHomeTiles(group)
  addCenter(group)
  addMoveHints(group, moveHints)
  addPieces(group, state, movable)
  return group
}

function addBaseZones(group: THREE.Group) {
  const zones = BASES.map((cells) => ({
    x: cells.reduce((total, [x]) => total + x, 0) / cells.length,
    y: cells.reduce((total, [, y]) => total + y, 0) / cells.length,
  }))
  zones.forEach((zone, index) => {
    const pos = gridToWorld(zone.x, zone.y)
    const mat = new THREE.MeshStandardMaterial({ color: COLORS[index], roughness: 0.54, metalness: 0.08, transparent: true, opacity: 0.88 })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(CELL * 4.25, 0.18, CELL * 4.25), mat)
    mesh.position.set(pos.x, 0.31, pos.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)

    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(CELL * 1.05, CELL * 1.05, 0.035, 52),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.22 })
    )
    glow.position.set(pos.x, 0.43, pos.z)
    glow.castShadow = false
    glow.receiveShadow = true
    group.add(glow)

    BASES[index].forEach(([x, y]) => {
      const nest = gridToWorld(x, y)
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(CELL * 0.29, 0.045, 12, 42),
        new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: COLORS[index], emissiveIntensity: 0.18, roughness: 0.3 })
      )
      ring.rotation.x = Math.PI / 2
      ring.position.set(nest.x, 0.52, nest.z)
      ring.castShadow = true
      group.add(ring)
    })
  })
}

function addTrackTiles(group: THREE.Group) {
  TRACK.forEach(([x, y], index) => {
    const start = START_INDEX.indexOf(index)
    const color = start >= 0 ? COLORS[start] : '#edf6ff'
    const pos = gridToWorld(x, y)
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(CELL * 0.84, 0.16, CELL * 0.84),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.38,
        metalness: 0.04,
        emissive: start >= 0 ? color : '#000000',
        emissiveIntensity: start >= 0 ? 0.12 : 0,
      })
    )
    tile.position.set(pos.x, 0.43, pos.z)
    tile.castShadow = true
    tile.receiveShadow = true
    group.add(tile)
    if (start >= 0) {
      addStartBadge(group, pos, COLORS[start])
    }
  })
}

function addStartBadge(group: THREE.Group, pos: { x: number; z: number }, color: string) {
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(CELL * 0.18, CELL * 0.18, 0.035, 32),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.28, metalness: 0.08 })
  )
  disc.position.set(pos.x, 0.55, pos.z)
  disc.castShadow = true
  group.add(disc)

  const gem = new THREE.Mesh(
    new THREE.CylinderGeometry(CELL * 0.09, CELL * 0.12, 0.05, 5),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, roughness: 0.34, metalness: 0.1 })
  )
  gem.position.set(pos.x, 0.595, pos.z)
  gem.rotation.y = Math.PI / 5
  gem.castShadow = true
  group.add(gem)
}

function addHomeTiles(group: THREE.Group) {
  HOME_PATHS.forEach((cells, playerIndex) => {
    cells.forEach(([x, y], index) => {
      const pos = gridToWorld(x, y)
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(CELL * 0.84, 0.18, CELL * 0.84),
        new THREE.MeshStandardMaterial({ color: COLORS[playerIndex], roughness: 0.42, metalness: 0.06, emissive: COLORS[playerIndex], emissiveIntensity: 0.08 + index * 0.01 })
      )
      tile.position.set(pos.x, 0.46, pos.z)
      tile.castShadow = true
      tile.receiveShadow = true
      group.add(tile)
    })
  })
}

function addCenter(group: THREE.Group) {
  const triangles = [
    { color: COLORS[0], points: [[-0.94, -0.94], [0, 0], [-0.94, 0.94]] },
    { color: COLORS[1], points: [[-0.94, -0.94], [0.94, -0.94], [0, 0]] },
    { color: COLORS[2], points: [[0.94, -0.94], [0.94, 0.94], [0, 0]] },
    { color: COLORS[3], points: [[-0.94, 0.94], [0.94, 0.94], [0, 0]] },
  ]
  triangles.forEach((tri) => {
    const shape = new THREE.Shape()
    shape.moveTo(tri.points[0][0], tri.points[0][1])
    shape.lineTo(tri.points[1][0], tri.points[1][1])
    shape.lineTo(tri.points[2][0], tri.points[2][1])
    shape.closePath()
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({ color: tri.color, roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide })
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0.58
    mesh.castShadow = true
    group.add(mesh)
  })
}

function addMoveHints(group: THREE.Group, moveHints: MoveHint[]) {
  moveHints.forEach((hint) => {
    const pos = gridToWorld(hint.x, hint.y)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(CELL * 0.35, 0.035, 12, 52),
      new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.25 })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.set(pos.x, 0.75, pos.z)
    ring.userData.pieceIndex = hint.index
    ring.userData.pulse = true
    group.add(ring)
  })
}

function addPieces(group: THREE.Group, state: MenschState, movable: boolean[]) {
  const occupancy = new Map<string, number>()
  state.players.forEach((player, playerIndex) => {
    player.pieces.forEach((piece, pieceIndex) => {
      const [x, y] = pieceCell(piece, playerIndex, pieceIndex)
      const key = `${x}-${y}`
      occupancy.set(key, (occupancy.get(key) ?? 0) + 1)
    })
  })

  state.players.forEach((player, playerIndex) => {
    player.pieces.forEach((piece, pieceIndex) => {
      const [x, y] = pieceCell(piece, playerIndex, pieceIndex)
      const key = `${x}-${y}`
      const pos = gridToWorld(x, y)
      const crowded = (occupancy.get(key) ?? 0) > 1
      const stack = player.pieces
        .map((candidate, index) => ({ index, key: `${pieceCell(candidate, playerIndex, index)[0]}-${pieceCell(candidate, playerIndex, index)[1]}` }))
        .filter((entry) => entry.key === key)
        .findIndex((entry) => entry.index === pieceIndex)
      const offsets = [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]]
      const [ox, oz] = crowded ? offsets[stack % offsets.length] : [0, 0]
      const active = state.current === playerIndex && movable[pieceIndex] && state.rolled && state.winner === null
      const pulseFromHome = active && piece.steps < 0 && state.die === 6
      const pawn = makePawn(COLORS[playerIndex], active)
      pawn.position.set(pos.x + ox, 0.66, pos.z + oz)
      pawn.userData.baseY = pawn.position.y
      pawn.userData.bob = pulseFromHome
      if (active) markClickable(pawn, pieceIndex)
      group.add(pawn)
    })
  })
}

function makePawn(color: string, active: boolean) {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.34,
    metalness: 0.16,
    emissive: color,
    emissiveIntensity: active ? 0.22 : 0.05,
  })
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.32, metalness: 0.1 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.15, 36), mat)
  base.position.y = 0
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.42, 36), mat)
  body.position.y = 0.25
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 18), mat)
  head.position.y = 0.54
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 8), white)
  shine.position.set(-0.055, 0.61, 0.08)
  group.add(base, body, head, shine)
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true
      object.receiveShadow = true
    }
  })
  if (active) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.035, 12, 48),
      new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: color, emissiveIntensity: 0.55 })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = -0.03
    group.add(ring)
  }
  return group
}

function markClickable(group: THREE.Object3D, pieceIndex: number) {
  group.traverse((object) => {
    object.userData.pieceIndex = pieceIndex
  })
}

function addWorldDecor(scene: THREE.Scene) {
  const props = [
    { x: -7.2, z: -5.7, color: '#22c55e', scale: 1.1 },
    { x: 7.4, z: -4.5, color: '#f97316', scale: 0.92 },
    { x: -7.6, z: 5.6, color: '#a855f7', scale: 0.75 },
    { x: 7.2, z: 5.3, color: '#facc15', scale: 0.9 },
  ]
  props.forEach((prop) => {
    const disk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7 * prop.scale, 0.7 * prop.scale, 0.16, 42),
      new THREE.MeshStandardMaterial({ color: prop.color, roughness: 0.48, metalness: 0.05 })
    )
    disk.position.set(prop.x, -0.18, prop.z)
    disk.castShadow = true
    disk.receiveShadow = true
    scene.add(disk)
  })

  for (let index = 0; index < 5; index += 1) {
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 7.8, 18),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.42, transparent: true, opacity: 0.48 })
    )
    column.position.set(-5 + index * 2.5, 3.2, -8.2)
    scene.add(column)
  }
}

function disposeObject(object: THREE.Object3D) {
  object.traverse(disposeMesh)
}

function disposeMesh(object: THREE.Object3D) {
  if (!(object instanceof THREE.Mesh)) return
  object.geometry.dispose()
  const material = object.material
  if (Array.isArray(material)) material.forEach((item) => item.dispose())
  else material.dispose()
}

const menschRootStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  position: 'relative',
  overflow: 'hidden',
  background: '#020617',
  color: TEXT,
}

const canvasHostStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
}

const topHudStyle: CSSProperties = {
  position: 'absolute',
  left: 16,
  top: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  zIndex: 5,
}

const turnBadgeStyle: CSSProperties = {
  minWidth: 260,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 16,
  border: '1px solid',
  background: 'rgba(15,23,42,0.6)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 16px 30px rgba(0,0,0,0.24)',
}

const turnCopyStyle: CSSProperties = {
  minWidth: 0,
  display: 'grid',
  gap: 2,
}

const turnTitleStyle: CSSProperties = {
  display: 'block',
  color: TEXT,
  fontSize: 15,
  lineHeight: 1.1,
}

const turnMetaStyle: CSSProperties = {
  display: 'block',
  color: MUTED,
  fontSize: 11,
  lineHeight: 1.25,
}

const colorDotStyle: CSSProperties = {
  width: 11,
  height: 11,
  borderRadius: 999,
  display: 'inline-block',
  boxShadow: '0 0 14px currentColor',
  flex: '0 0 auto',
}

const scoreHudStyle: CSSProperties = {
  position: 'absolute',
  top: 14,
  right: 16,
  zIndex: 5,
  display: 'grid',
  gap: 7,
  width: 220,
}

const scoreChipStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 12,
  border: '1px solid',
  background: 'rgba(15,23,42,0.55)',
  backdropFilter: 'blur(10px)',
  fontSize: 12,
}

const tournamentStripStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  color: MUTED,
  fontSize: 10,
  padding: 8,
  borderRadius: 10,
  background: 'rgba(15,23,42,0.42)',
}

const actionDockStyle: CSSProperties = {
  position: 'absolute',
  left: 16,
  bottom: 'max(76px, env(safe-area-inset-bottom))',
  width: 'min(620px, calc(100% - 116px))',
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  alignItems: 'center',
  gap: 12,
  zIndex: 5,
  padding: 10,
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(15,23,42,0.62)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 20px 44px rgba(0,0,0,0.34)',
}

const primaryButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 13,
  padding: '13px 16px',
  background: `linear-gradient(145deg, ${ACCENT}, #7c3aed)`,
  color: '#fff',
  fontWeight: 950,
  boxShadow: `0 14px 26px ${ACCENT}33`,
  cursor: 'pointer',
}

const diceButtonStyle: CSSProperties = {
  position: 'relative',
  width: 78,
  height: 74,
  border: 'none',
  borderRadius: 18,
  display: 'grid',
  placeItems: 'center',
  color: '#0f172a',
  background: 'radial-gradient(circle at 35% 20%, #ffffff, #dbeafe 58%, #93c5fd)',
  boxShadow: '0 18px 36px rgba(2,6,23,0.38), inset 0 2px 0 rgba(255,255,255,0.8)',
  perspective: 340,
  transformStyle: 'preserve-3d',
  overflow: 'visible',
}

const diceGlowStyle: CSSProperties = {
  position: 'absolute',
  inset: -8,
  borderRadius: 24,
  background: 'radial-gradient(circle, rgba(56,189,248,0.38), rgba(139,92,246,0.08) 62%, transparent 70%)',
  filter: 'blur(2px)',
}

const diceCubeStyle: CSSProperties = {
  position: 'relative',
  width: 56,
  height: 56,
  transformStyle: 'preserve-3d',
  transition: 'transform 260ms cubic-bezier(.2,.8,.2,1)',
}

const diceFaceStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  gridTemplateRows: 'repeat(3, 1fr)',
  gridTemplateColumns: 'repeat(3, 1fr)',
  alignItems: 'center',
  justifyItems: 'center',
  padding: 9,
  borderRadius: 13,
  background: 'linear-gradient(145deg, #ffffff, #dbeafe)',
  border: '1px solid rgba(15,23,42,0.12)',
  boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.92), inset 0 -5px 10px rgba(37,99,235,0.18)',
  backfaceVisibility: 'hidden',
}

const dicePipStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: '#0f172a',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
}

const diceLabelStyle: CSSProperties = {
  position: 'absolute',
  right: -5,
  bottom: -8,
  minWidth: 28,
  height: 28,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 999,
  background: 'linear-gradient(145deg, #0f172a, #334155)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.22)',
  fontWeight: 950,
  fontSize: 13,
}

const diceTransforms: Record<number, string> = {
  1: 'rotateX(-16deg) rotateY(18deg)',
  2: 'rotateX(-16deg) rotateY(-72deg)',
  3: 'rotateX(-106deg) rotateY(16deg)',
  4: 'rotateX(74deg) rotateY(16deg)',
  5: 'rotateX(-16deg) rotateY(108deg)',
  6: 'rotateX(-16deg) rotateY(198deg)',
}

const dicePips: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
}

const smallGhostStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 13,
  padding: '10px 12px',
  background: 'rgba(15,23,42,0.52)',
  color: TEXT,
  fontWeight: 850,
  backdropFilter: 'blur(10px)',
  cursor: 'pointer',
}

const setupOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  zIndex: 6,
  padding: 18,
  background: 'linear-gradient(90deg, rgba(2,6,23,0.76), rgba(2,6,23,0.18) 62%, rgba(2,6,23,0.58))',
}

const setupHeroStyle: CSSProperties = {
  width: 'min(520px, 100%)',
  display: 'grid',
  gap: 14,
  padding: 18,
  borderRadius: 22,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(15,23,42,0.68)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 28px 70px rgba(0,0,0,0.42)',
}

const setupKickerStyle: CSSProperties = {
  color: ACCENT2,
  fontWeight: 900,
  fontSize: 12,
}

const setupTitleStyle: CSSProperties = {
  margin: 0,
  color: TEXT,
  fontSize: 42,
  lineHeight: 1,
  letterSpacing: 0,
}

const setupTextStyle: CSSProperties = {
  margin: 0,
  color: MUTED,
  fontSize: 13,
  lineHeight: 1.5,
}

const playerChoiceGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 9,
}

const playerChoiceStyle: CSSProperties = {
  minHeight: 86,
  borderRadius: 16,
  border: '1px solid',
  padding: 12,
  color: TEXT,
  display: 'grid',
  gap: 4,
  textAlign: 'left',
  cursor: 'pointer',
}

const modeRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 9,
}

const modeButtonStyle: CSSProperties = {
  borderRadius: 13,
  border: '1px solid',
  background: 'rgba(15,23,42,0.55)',
  padding: '10px 12px',
  fontWeight: 850,
  cursor: 'pointer',
}

const startButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 16,
  padding: '15px 18px',
  background: 'linear-gradient(145deg, #06b6d4, #8b5cf6)',
  color: '#fff',
  fontWeight: 950,
  boxShadow: '0 18px 32px rgba(6,182,212,0.24)',
  cursor: 'pointer',
}

const rulesBoxStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
  padding: '10px 12px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.13)',
  background: 'rgba(2,6,23,0.34)',
  color: MUTED,
  fontSize: 11,
  lineHeight: 1.3,
}

const hiddenActionsStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  left: -10000,
  top: 'auto',
}

const responsiveStyle = `
  @keyframes creorga-mensch-dice-roll {
    0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
    33% { transform: rotateX(180deg) rotateY(120deg) rotateZ(20deg); }
    66% { transform: rotateX(330deg) rotateY(250deg) rotateZ(-18deg); }
    100% { transform: rotateX(540deg) rotateY(360deg) rotateZ(0deg); }
  }
  .mensch-dice-button:not(:disabled):active .mensch-dice-cube {
    transform: rotateX(-28deg) rotateY(42deg) translateY(2px) !important;
  }
  @media (max-width: 760px) {
    .creorga-game3d-body {
      grid-template-columns: 1fr !important;
    }
  }
  @media (max-width: 680px) {
    .mensch-top-hud {
      left: 10px !important;
      top: 10px !important;
      max-width: calc(100% - 150px) !important;
      gap: 6px !important;
    }
    .mensch-top-hud > div:first-child {
      min-width: 0 !important;
      padding: 8px 9px !important;
      font-size: 12px !important;
      overflow: hidden !important;
    }
    .mensch-top-hud strong,
    .mensch-top-hud span {
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 100% !important;
      display: block !important;
    }
    .mensch-top-hud button {
      display: none !important;
    }
    .mensch-score-hud {
      top: 10px !important;
      right: 10px !important;
      width: 132px !important;
      gap: 5px !important;
    }
    .mensch-score-hud > div {
      padding: 6px 7px !important;
      font-size: 11px !important;
      border-radius: 10px !important;
    }
    .mensch-action-dock {
      left: 12px !important;
      bottom: max(76px, env(safe-area-inset-bottom)) !important;
      width: calc(100% - 104px) !important;
      grid-template-columns: auto minmax(0, 1fr) !important;
      gap: 9px !important;
      padding: 8px !important;
      border-radius: 16px !important;
    }
    .mensch-action-dock strong {
      font-size: 12px !important;
      line-height: 1.2 !important;
    }
    .mensch-action-dock span {
      font-size: 10px !important;
      line-height: 1.25 !important;
    }
    .mensch-dice-button {
      width: 64px !important;
      height: 62px !important;
    }
  }
`
