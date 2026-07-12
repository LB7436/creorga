import { useState, useCallback, useEffect, useRef } from 'react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'
import { useGameScore } from './useGameScore'
import {
  UNICODE,
  initBoard,
  initCastling,
  computeCaptured,
  getLegalMoves,
  isInCheck,
  applyMove,
  updateCastling,
  getBestMove,
  type Board,
  type Piece,
  type Color,
  type Move,
  type CastlingRights,
  type BoardSnapshot,
} from './chessEngine'
import { useGameShell } from './lib/GameShell'

// ─── Layout constants ─────────────────────────────────────────────────────────

const CONTAINER_HPAD = 8 // padding horizontal du container (px) — réduit pour agrandir les cases tactiles
const MIN_CELL = 32      // garde-fou : taille minimale d'une case (px)

// Profondeur de recherche minimax selon la difficulté choisie au lancement.
// facile = coups rapides et faibles, difficile = recherche plus profonde.
const DEPTH_BY_DIFFICULTY: Record<string, number> = { facile: 1, moyen: 2, difficile: 3 }

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChessGame({ onBack }: { onBack?: () => void }) {
  const { submit } = useGameScore('chess')
  const { difficulty } = useGameShell()
  const aiDepth = DEPTH_BY_DIFFICULTY[difficulty] ?? 3
  const [wins, setWins] = useState(0)
  const [board, setBoard] = useState<Board>(initBoard())
  const [castling, setCastling] = useState<CastlingRights>(initCastling())
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [legalMoves, setLegalMoves] = useState<Move[]>([])
  const [turn, setTurn] = useState<Color>('w')
  const [lastMove, setLastMove] = useState<Move | null>(null)
  const [status, setStatus] = useState<'playing' | 'check' | 'checkmate' | 'stalemate'>('playing')
  const [thinking, setThinking] = useState(false)
  const [history, setHistory] = useState<BoardSnapshot[]>([])
  const [cellSize, setCellSize] = useState(64)
  const boardRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const winSubmittedRef = useRef(false)
  // IA dans un Web Worker : workerRef = l'instance, pendingRef = le contexte du coup
  // joueur en attente de réponse (sa présence = un calcul IA est en cours ; le vider
  // invalide un résultat périmé après « nouvelle partie »).
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<{ board: Board; castling: CastlingRights } | null>(null)
  // Ref synchrone : le handler de clic (mémoïsé) lit la profondeur courante sans
  // se recréer quand la difficulté change.
  const aiDepthRef = useRef(aiDepth); aiDepthRef.current = aiDepth

  const captured = computeCaptured(board)

  // Responsive sizing
  useEffect(() => {
    const update = () => {
      const w = containerRef.current?.clientWidth ?? window.innerWidth
      // Réservé = padding horizontal du container (2×) + padding du plateau (2×8)
      const available = Math.min(w - CONTAINER_HPAD * 2 - 16, 560)
      setCellSize(Math.max(MIN_CELL, Math.floor(available / 8)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Victoire du joueur = mat infligé au CPU : status 'checkmate' pendant que turn === 'b'.
  // score = victoires cumulées de la session vs CPU. Flag ref obligatoire : l'effet se
  // re-déclenche quand `wins` change (et au double-run StrictMode) — on ne soumet qu'une fois.
  useEffect(() => {
    if (status === 'checkmate' && turn === 'b' && !winSubmittedRef.current) {
      winSubmittedRef.current = true
      const total = wins + 1
      setWins(total)
      submit(total)
    }
  }, [status, turn, wins, submit])

  const checkGameStatus = useCallback((b: Board, c: Color, cast: CastlingRights, lm: Move | null) => {
    const moves = getLegalMoves(b, c, cast, lm)
    if (moves.length === 0) {
      if (isInCheck(b, c)) setStatus('checkmate')
      else setStatus('stalemate')
    } else if (isInCheck(b, c)) {
      setStatus('check')
    } else {
      setStatus('playing')
    }
  }, [])

  // Crée le worker une fois. Sa réponse (meilleur coup des Noirs) est appliquée ici :
  // le calcul minimax tourne hors du thread principal -> l'UI reste fluide.
  useEffect(() => {
    let worker: Worker | null = null
    try {
      worker = new Worker(new URL('./chess.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent<Move | null>) => {
        const aiMove = e.data
        const ctx = pendingRef.current
        pendingRef.current = null
        setThinking(false)
        if (!ctx) return // partie relancée pendant le calcul -> résultat périmé, ignoré
        if (aiMove) {
          const afterAI = applyMove(ctx.board, aiMove)
          const aiCastling = updateCastling(ctx.castling, aiMove)
          setBoard(afterAI)
          setLastMove(aiMove)
          setCastling(aiCastling)
          setTurn('w')
          checkGameStatus(afterAI, 'w', aiCastling, aiMove)
        }
        // aiMove null = Noirs sans coup légal (mat/pat déjà positionné) -> on garde turn 'b'
        // pour que le modal affiche « Victoire » et non « Défaite ».
      }
      workerRef.current = worker
    } catch {
      workerRef.current = null // fallback synchrone géré au moment du coup
    }
    return () => {
      if (worker) worker.terminate()
      workerRef.current = null
    }
  }, [checkGameStatus])

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (turn !== 'w' || thinking || status === 'checkmate' || status === 'stalemate') return

    const piece = board[row][col]

    if (selected) {
      const mv = legalMoves.find(m => m.to[0] === row && m.to[1] === col)
      if (mv) {
        // save snapshot
        setHistory(h => [...h, { board, turn, lastMove, castling, captured: computeCaptured(board) }])

        const newBoard = applyMove(board, mv)
        const newCastling = updateCastling(castling, mv)
        setBoard(newBoard)
        setLastMove(mv)
        setCastling(newCastling)
        setSelected(null)
        setLegalMoves([])
        setTurn('b')
        checkGameStatus(newBoard, 'b', newCastling, mv)

        // Coup de l'IA : délégué au Web Worker pour ne PAS geler l'UI pendant le minimax.
        setThinking(true)
        pendingRef.current = { board: newBoard, castling: newCastling }
        const worker = workerRef.current
        if (worker) {
          worker.postMessage({ board: newBoard, castling: newCastling, lastMove: mv, depth: aiDepthRef.current })
        } else {
          // Fallback synchrone si le worker n'a pas pu démarrer (gèle brièvement mais joue).
          const aiMove = getBestMove(newBoard, newCastling, mv, aiDepthRef.current)
          pendingRef.current = null
          if (aiMove) {
            const afterAI = applyMove(newBoard, aiMove)
            const aiCastling = updateCastling(newCastling, aiMove)
            setBoard(afterAI)
            setLastMove(aiMove)
            setCastling(aiCastling)
            setTurn('w')
            checkGameStatus(afterAI, 'w', aiCastling, aiMove)
          }
          setThinking(false)
        }
        return
      }
      // deselect or select another piece
      if (piece?.color === 'w') {
        setSelected([row, col])
        const moves = getLegalMoves(board, 'w', castling, lastMove)
        setLegalMoves(moves.filter(m => m.from[0] === row && m.from[1] === col))
        return
      }
      setSelected(null)
      setLegalMoves([])
      return
    }

    if (piece?.color === 'w') {
      setSelected([row, col])
      const moves = getLegalMoves(board, 'w', castling, lastMove)
      setLegalMoves(moves.filter(m => m.from[0] === row && m.from[1] === col))
    }
  }, [board, castling, legalMoves, lastMove, selected, status, thinking, turn, checkGameStatus])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return // un snapshot est stocké par tour complet (joueur + CPU)
    const snap = history[history.length - 1]
    setBoard(snap.board)
    setTurn(snap.turn)
    setLastMove(snap.lastMove)
    setCastling(snap.castling)
    setHistory(h => h.slice(0, -1))
    setSelected(null)
    setLegalMoves([])
    checkGameStatus(snap.board, snap.turn, snap.castling, snap.lastMove)
  }, [history, checkGameStatus])

  const handleNewGame = useCallback(() => {
    pendingRef.current = null // invalide un éventuel calcul IA en cours
    winSubmittedRef.current = false
    setBoard(initBoard())
    setCastling(initCastling())
    setSelected(null)
    setLegalMoves([])
    setTurn('w')
    setLastMove(null)
    setStatus('playing')
    setThinking(false)
    setHistory([])
  }, [])

  // Find king positions for check highlight
  const findKing = (color: Color): [number, number] | null => {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (board[r][c]?.type === 'K' && board[r][c]?.color === color) return [r, c]
    return null
  }

  const checkedKing = (status === 'check' || status === 'checkmate') ? findKing(turn) : null

  const legalDests = new Set(legalMoves.map(m => `${m.to[0]},${m.to[1]}`))
  const legalCaptures = new Set(
    legalMoves
      .filter(m => m.captured || m.enPassant)
      .map(m => `${m.to[0]},${m.to[1]}`)
  )

  const boardSize = cellSize * 8
  const fontSize = Math.round(cellSize * 0.72)

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        background: SURFACE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: `20px ${CONTAINER_HPAD}px`,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: boardSize + 48,
        display: 'flex',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
      }}>
        <button
          onClick={onBack}
          style={{
            background: SURFACE2,
            border: `1px solid ${BORDER}`,
            color: TEXT,
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ← Retour
        </button>
        <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0, flex: 1 }}>
          ♟ Échecs
        </h1>
        <span style={{
          fontSize: 11, color: MUTED, fontWeight: 700, padding: '4px 9px',
          borderRadius: 999, background: SURFACE2, border: `1px solid ${BORDER}`, whiteSpace: 'nowrap',
        }}>
          IA · {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
        <button
          onClick={handleUndo}
          disabled={history.length === 0 || thinking}
          style={{
            background: SURFACE2,
            border: `1px solid ${BORDER}`,
            color: history.length === 0 || thinking ? MUTED : TEXT,
            padding: '8px 14px',
            borderRadius: 8,
            cursor: history.length === 0 || thinking ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ↩ Annuler
        </button>
      </div>

      {/* Status bar */}
      <div style={{
        width: '100%',
        maxWidth: boardSize + 48,
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {thinking ? (
          <div style={{
            background: SURFACE2,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '10px 18px',
            color: MUTED,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
            CPU réfléchit…
          </div>
        ) : status === 'check' ? (
          <div style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 10,
            padding: '10px 18px',
            color: '#f87171',
            fontSize: 14,
            fontWeight: 700,
          }}>
            ⚠ Échec au roi !
          </div>
        ) : (
          <div style={{
            background: SURFACE2,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '10px 18px',
            color: turn === 'w' ? TEXT : MUTED,
            fontSize: 14,
            fontWeight: 600,
          }}>
            {turn === 'w' ? '⬜ Votre tour (Blancs)' : '⬛ Tour des Noirs'}
          </div>
        )}
      </div>

      {/* Captured black pieces (captured by white) */}
      <CapturedRow pieces={captured.b} label="Capturés par vous" />

      {/* Board */}
      <div style={{
        position: 'relative',
        padding: 8,
        background: '#8b6914',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}>
        {/* Rank labels left */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 8,
          width: 8,
          height: boardSize,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {[8,7,6,5,4,3,2,1].map(n => (
            <div key={n} style={{
              height: cellSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f5deb3',
              fontSize: Math.max(9, cellSize * 0.18),
              fontWeight: 700,
              userSelect: 'none',
            }}>{n}</div>
          ))}
        </div>
        {/* File labels bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 8,
          width: boardSize,
          height: 8,
          display: 'flex',
        }}>
          {['a','b','c','d','e','f','g','h'].map(f => (
            <div key={f} style={{
              width: cellSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f5deb3',
              fontSize: Math.max(9, cellSize * 0.18),
              fontWeight: 700,
              userSelect: 'none',
            }}>{f}</div>
          ))}
        </div>

        <div
          ref={boardRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(8, ${cellSize}px)`,
            gridTemplateRows: `repeat(8, ${cellSize}px)`,
            width: boardSize,
            height: boardSize,
            touchAction: 'manipulation',
          }}
        >
          {Array.from({ length: 64 }).map((_, idx) => {
            const row = Math.floor(idx / 8)
            const col = idx % 8
            const isLight = (row + col) % 2 === 0
            const piece = board[row][col]
            const isSelected = selected?.[0] === row && selected?.[1] === col
            const key = `${row},${col}`
            const isLegalDest = legalDests.has(key)
            const isLegalCapture = legalCaptures.has(key)
            const isLastMoveFrom = lastMove?.from[0] === row && lastMove?.from[1] === col
            const isLastMoveTo = lastMove?.to[0] === row && lastMove?.to[1] === col
            const isCheck = checkedKing?.[0] === row && checkedKing?.[1] === col

            const bg = isLight ? '#f0d9b5' : '#b58863'

            return (
              <div
                key={idx}
                onClick={() => handleSquareClick(row, col)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: bg,
                  position: 'relative',
                  cursor: (piece?.color === 'w' && turn === 'w' && !thinking) || isLegalDest
                    ? 'pointer'
                    : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                }}
              >
                {/* Last move highlight */}
                {(isLastMoveFrom || isLastMoveTo) && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(205,210,106,0.4)',
                    pointerEvents: 'none',
                  }} />
                )}
                {/* Selected highlight */}
                {isSelected && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(127,201,127,0.7)',
                    pointerEvents: 'none',
                  }} />
                )}
                {/* Check highlight */}
                {isCheck && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at center, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0.2) 70%, transparent 100%)',
                    pointerEvents: 'none',
                  }} />
                )}
                {/* Legal move hints */}
                {isLegalDest && !isLegalCapture && (
                  <div style={{
                    position: 'absolute',
                    width: cellSize * 0.3,
                    height: cellSize * 0.3,
                    borderRadius: '50%',
                    background: 'rgba(127,201,127,0.55)',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }} />
                )}
                {isLegalCapture && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 0,
                    border: `${Math.max(3, cellSize * 0.1)}px solid rgba(127,201,127,0.65)`,
                    pointerEvents: 'none',
                    zIndex: 2,
                    boxSizing: 'border-box',
                  }} />
                )}
                {/* Piece */}
                {piece && (
                  <span
                    style={{
                      fontSize,
                      lineHeight: 1,
                      color: piece.color === 'w' ? '#fffff0' : '#1a1a1a',
                      textShadow: piece.color === 'w'
                        ? '1px 1px 2px rgba(0,0,0,0.8)'
                        : '0 1px 1px rgba(255,255,255,0.2)',
                      position: 'relative',
                      zIndex: 3,
                      transition: 'transform 0.1s ease',
                      display: 'block',
                    }}
                    onMouseEnter={e => {
                      if (piece.color === 'w' && turn === 'w')
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                    }}
                  >
                    {UNICODE[piece.color][piece.type]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Captured white pieces (captured by black) */}
      <CapturedRow pieces={captured.w} label="Capturés par CPU" />

      {/* Game over modal */}
      {(status === 'checkmate' || status === 'stalemate') && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: SURFACE2,
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            padding: '40px 48px',
            textAlign: 'center',
            boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
            maxWidth: 360,
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>
              {status === 'checkmate'
                ? (turn === 'b' ? '🏆' : '💀')
                : '🤝'}
            </div>
            <h2 style={{ color: TEXT, fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>
              {status === 'checkmate'
                ? (turn === 'b' ? 'Victoire !' : 'Défaite')
                : 'Match nul'}
            </h2>
            <p style={{ color: MUTED, fontSize: 16, margin: '0 0 28px' }}>
              {status === 'checkmate'
                ? (turn === 'b' ? 'Vous avez mis le CPU en échec et mat !' : 'Le CPU vous a mis en échec et mat.')
                : 'Pat — aucun mouvement légal possible.'}
            </p>
            <button
              onClick={handleNewGame}
              style={{
                background: ACCENT,
                color: '#fff',
                border: 'none',
                padding: '14px 32px',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              Nouvelle partie
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function CapturedRow({ pieces, label }: { pieces: Piece[]; label: string }) {
  if (pieces.length === 0) return (
    <div style={{
      width: '100%',
      maxWidth: 560,
      height: 32,
      marginTop: 8,
    }} />
  )
  return (
    <div style={{
      width: '100%',
      maxWidth: 560,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 0',
      marginTop: 4,
    }}>
      <span style={{ color: MUTED, fontSize: 11, minWidth: 120, fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {pieces.map((p, i) => p && (
          <span key={i} style={{
            fontSize: 18,
            color: p.color === 'w' ? '#fffff0' : '#1a1a1a',
            textShadow: p.color === 'w' ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
            filter: p.color === 'b' ? 'drop-shadow(0 1px 1px rgba(255,255,255,0.3))' : undefined,
          }}>
            {UNICODE[p.color][p.type]}
          </span>
        ))}
      </div>
    </div>
  )
}
