import { useState, useCallback, useEffect, useRef } from 'react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types ────────────────────────────────────────────────────────────────────

type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'
type Color = 'w' | 'b'
type Piece = { type: PieceType; color: Color } | null
type Board = Piece[][]

interface Move {
  from: [number, number]
  to: [number, number]
  piece: Piece
  captured?: Piece
  promotion?: PieceType
  castling?: 'K' | 'Q' // kingside / queenside
  enPassant?: boolean
}

interface CastlingRights {
  wK: boolean; wQ: boolean; bK: boolean; bQ: boolean
}

interface BoardSnapshot {
  board: Board
  turn: Color
  lastMove: Move | null
  castling: CastlingRights
  captured: { w: Piece[]; b: Piece[] }
}

// ─── Unicode pieces ───────────────────────────────────────────────────────────

const UNICODE: Record<Color, Record<PieceType, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
}

// ─── Piece values ─────────────────────────────────────────────────────────────

const PIECE_VALUE: Record<PieceType, number> = {
  P: 100, N: 310, B: 330, R: 500, Q: 900, K: 20000,
}

// ─── Position tables (from black's perspective, flip for white) ───────────────

const PST: Record<PieceType, number[][]> = {
  P: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  R: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0],
  ],
  Q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20],
  ],
}

// ─── Board initialization ─────────────────────────────────────────────────────

function initBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null))
  const order: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: order[c], color: 'b' }
    b[1][c] = { type: 'P', color: 'b' }
    b[6][c] = { type: 'P', color: 'w' }
    b[7][c] = { type: order[c], color: 'w' }
  }
  return b
}

function initCastling(): CastlingRights {
  return { wK: true, wQ: true, bK: true, bQ: true }
}

// ─── Board helpers ────────────────────────────────────────────────────────────

function cloneBoard(board: Board): Board {
  return board.map(row => [...row])
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8
}

function opponent(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

// ─── Raw move generation (no check validation) ────────────────────────────────

function getRawMoves(
  board: Board,
  row: number,
  col: number,
  castling: CastlingRights,
  lastMove: Move | null,
): Move[] {
  const piece = board[row][col]
  if (!piece) return []
  const moves: Move[] = []
  const { type, color } = piece

  const push = (r: number, c: number, extra?: Partial<Move>) => {
    moves.push({ from: [row, col], to: [r, c], piece, captured: board[r][c], ...extra })
  }

  const slide = (dirs: [number, number][]) => {
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc
      while (inBounds(r, c)) {
        if (board[r][c]) {
          if (board[r][c]!.color !== color) push(r, c)
          break
        }
        push(r, c)
        r += dr; c += dc
      }
    }
  }

  switch (type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1
      const startRow = color === 'w' ? 6 : 1
      const promRow = color === 'w' ? 0 : 7
      // forward
      if (inBounds(row + dir, col) && !board[row + dir][col]) {
        const toRow = row + dir
        if (toRow === promRow) {
          push(toRow, col, { promotion: 'Q', captured: undefined })
        } else {
          push(toRow, col, { captured: undefined })
          // double push
          if (row === startRow && !board[row + 2 * dir][col]) {
            push(row + 2 * dir, col, { captured: undefined })
          }
        }
      }
      // captures
      for (const dc of [-1, 1]) {
        const r = row + dir, c = col + dc
        if (!inBounds(r, c)) continue
        if (board[r][c] && board[r][c]!.color !== color) {
          if (r === promRow) {
            push(r, c, { promotion: 'Q' })
          } else {
            push(r, c)
          }
        }
        // en passant
        if (
          lastMove &&
          lastMove.piece?.type === 'P' &&
          lastMove.piece.color !== color &&
          lastMove.to[0] === row &&
          lastMove.to[1] === c &&
          Math.abs(lastMove.from[0] - lastMove.to[0]) === 2
        ) {
          moves.push({
            from: [row, col], to: [r, c],
            piece, captured: board[row][c],
            enPassant: true,
          })
        }
      }
      break
    }
    case 'N': {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const r = row + dr, c = col + dc
        if (inBounds(r, c) && board[r][c]?.color !== color) push(r, c)
      }
      break
    }
    case 'B': slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break
    case 'R': slide([[-1,0],[1,0],[0,-1],[0,1]]); break
    case 'Q': slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break
    case 'K': {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const r = row + dr, c = col + dc
        if (inBounds(r, c) && board[r][c]?.color !== color) push(r, c)
      }
      // castling
      const rank = color === 'w' ? 7 : 0
      if (row === rank && col === 4) {
        // kingside
        const kRight = color === 'w' ? castling.wK : castling.bK
        if (kRight && !board[rank][5] && !board[rank][6]) {
          moves.push({ from: [row, col], to: [rank, 6], piece, castling: 'K' })
        }
        // queenside
        const qRight = color === 'w' ? castling.wQ : castling.bQ
        if (qRight && !board[rank][3] && !board[rank][2] && !board[rank][1]) {
          moves.push({ from: [row, col], to: [rank, 2], piece, castling: 'Q' })
        }
      }
      break
    }
  }
  return moves
}

// ─── Apply move ───────────────────────────────────────────────────────────────

function applyMove(board: Board, move: Move): Board {
  const b = cloneBoard(board)
  const [fr, fc] = move.from
  const [tr, tc] = move.to

  if (move.enPassant) {
    const captureRow = move.piece!.color === 'w' ? tr + 1 : tr - 1
    b[captureRow][tc] = null
  }

  b[tr][tc] = move.promotion ? { type: move.promotion, color: move.piece!.color } : b[fr][fc]
  b[fr][fc] = null

  if (move.castling) {
    const rank = tr
    if (move.castling === 'K') {
      b[rank][5] = b[rank][7]
      b[rank][7] = null
    } else {
      b[rank][3] = b[rank][0]
      b[rank][0] = null
    }
  }

  return b
}

// ─── Update castling rights ───────────────────────────────────────────────────

function updateCastling(castling: CastlingRights, move: Move): CastlingRights {
  const c = { ...castling }
  const [fr, fc] = move.from
  if (move.piece?.type === 'K') {
    if (move.piece.color === 'w') { c.wK = false; c.wQ = false }
    else { c.bK = false; c.bQ = false }
  }
  if (move.piece?.type === 'R') {
    if (fr === 7 && fc === 7) c.wK = false
    if (fr === 7 && fc === 0) c.wQ = false
    if (fr === 0 && fc === 7) c.bK = false
    if (fr === 0 && fc === 0) c.bQ = false
  }
  // if rook captured
  const [tr, tc] = move.to
  if (tr === 7 && tc === 7) c.wK = false
  if (tr === 7 && tc === 0) c.wQ = false
  if (tr === 0 && tc === 7) c.bK = false
  if (tr === 0 && tc === 0) c.bQ = false
  return c
}

// ─── Check detection ──────────────────────────────────────────────────────────

function isInCheck(board: Board, color: Color): boolean {
  // find king
  let kr = -1, kc = -1
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p?.type === 'K' && p.color === color) { kr = r; kc = c }
    }
  }
  if (kr === -1) return true // king captured (shouldn't happen in legal play)
  const opp = opponent(color)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color !== opp) continue
      const raw = getRawMoves(board, r, c, initCastling(), null)
      if (raw.some(m => m.to[0] === kr && m.to[1] === kc)) return true
    }
  }
  return false
}

// ─── Legal moves ──────────────────────────────────────────────────────────────

function getLegalMoves(
  board: Board,
  color: Color,
  castling: CastlingRights,
  lastMove: Move | null,
): Move[] {
  const legal: Move[] = []
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color !== color) continue
      const raw = getRawMoves(board, r, c, castling, lastMove)
      for (const mv of raw) {
        // for castling, check intermediate squares not in check
        if (mv.castling) {
          if (isInCheck(board, color)) continue
          const passCol = mv.castling === 'K' ? 5 : 3
          const passBoard = cloneBoard(board)
          passBoard[mv.from[0]][passCol] = passBoard[mv.from[0]][mv.from[1]]
          passBoard[mv.from[0]][mv.from[1]] = null
          if (isInCheck(passBoard, color)) continue
        }
        const next = applyMove(board, mv)
        if (!isInCheck(next, color)) legal.push(mv)
      }
    }
  }
  return legal
}

// ─── Board evaluation ─────────────────────────────────────────────────────────

function evaluateBoard(board: Board): number {
  let score = 0
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (!p) continue
      const val = PIECE_VALUE[p.type]
      // PST: white uses flipped rows
      const pstRow = p.color === 'w' ? 7 - r : r
      const pst = PST[p.type][pstRow][c]
      if (p.color === 'w') score += val + pst
      else score -= val + pst
    }
  }
  return score
}

// ─── Minimax with Alpha-Beta ──────────────────────────────────────────────────

function quiescence(
  board: Board,
  alpha: number,
  beta: number,
  maximizing: boolean,
  castling: CastlingRights,
  depth: number,
): number {
  const stand = evaluateBoard(board)
  if (depth <= 0) return stand
  if (maximizing) {
    if (stand >= beta) return beta
    alpha = Math.max(alpha, stand)
  } else {
    if (stand <= alpha) return alpha
    beta = Math.min(beta, stand)
  }

  const color: Color = maximizing ? 'w' : 'b'
  const moves = getLegalMoves(board, color, castling, null)
  const captures = moves.filter(m => m.captured || m.enPassant)

  if (maximizing) {
    let best = stand
    for (const mv of captures) {
      const next = applyMove(board, mv)
      const nextCast = updateCastling(castling, mv)
      const val = quiescence(next, alpha, beta, false, nextCast, depth - 1)
      best = Math.max(best, val)
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
    return best
  } else {
    let best = stand
    for (const mv of captures) {
      const next = applyMove(board, mv)
      const nextCast = updateCastling(castling, mv)
      const val = quiescence(next, alpha, beta, true, nextCast, depth - 1)
      best = Math.min(best, val)
      beta = Math.min(beta, best)
      if (alpha >= beta) break
    }
    return best
  }
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  castling: CastlingRights,
  lastMove: Move | null,
): number {
  if (depth === 0) {
    return quiescence(board, alpha, beta, maximizing, castling, 2)
  }

  const color: Color = maximizing ? 'w' : 'b'
  const moves = getLegalMoves(board, color, castling, lastMove)

  if (moves.length === 0) {
    if (isInCheck(board, color)) return maximizing ? -100000 : 100000
    return 0 // stalemate
  }

  // Move ordering: captures first
  moves.sort((a, b) => {
    const av = a.captured ? PIECE_VALUE[a.captured.type] : 0
    const bv = b.captured ? PIECE_VALUE[b.captured.type] : 0
    return bv - av
  })

  if (maximizing) {
    let best = -Infinity
    for (const mv of moves) {
      const next = applyMove(board, mv)
      const nextCast = updateCastling(castling, mv)
      const val = minimax(next, depth - 1, alpha, beta, false, nextCast, mv)
      best = Math.max(best, val)
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
    return best
  } else {
    let best = Infinity
    for (const mv of moves) {
      const next = applyMove(board, mv)
      const nextCast = updateCastling(castling, mv)
      const val = minimax(next, depth - 1, alpha, beta, true, nextCast, mv)
      best = Math.min(best, val)
      beta = Math.min(beta, best)
      if (alpha >= beta) break
    }
    return best
  }
}

function getBestMove(
  board: Board,
  castling: CastlingRights,
  lastMove: Move | null,
): Move | null {
  const moves = getLegalMoves(board, 'b', castling, lastMove)
  if (moves.length === 0) return null

  // Move ordering
  moves.sort((a, b) => {
    const av = a.captured ? PIECE_VALUE[a.captured.type] : 0
    const bv = b.captured ? PIECE_VALUE[b.captured.type] : 0
    return bv - av
  })

  let best = Infinity
  let bestMove = moves[0]

  for (const mv of moves) {
    const next = applyMove(board, mv)
    const nextCast = updateCastling(castling, mv)
    const val = minimax(next, 3, -Infinity, Infinity, true, nextCast, mv)
    if (val < best) {
      best = val
      bestMove = mv
    }
  }
  return bestMove
}

// ─── Captured pieces display ──────────────────────────────────────────────────

function computeCaptured(board: Board): { w: Piece[]; b: Piece[] } {
  const init = initBoard()
  const counts: Record<string, number> = {}
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = init[r][c]
      if (p) counts[`${p.color}${p.type}`] = (counts[`${p.color}${p.type}`] || 0) + 1
    }
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p) counts[`${p.color}${p.type}`] = (counts[`${p.color}${p.type}`] || 0) - 1
    }

  const captured: { w: Piece[]; b: Piece[] } = { w: [], b: [] }
  const types: PieceType[] = ['Q', 'R', 'B', 'N', 'P']
  for (const color of ['w', 'b'] as Color[]) {
    for (const type of types) {
      const n = counts[`${color}${type}`] || 0
      for (let i = 0; i < n; i++) captured[color].push({ type, color })
    }
  }
  return captured
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChessGame({ onBack }: { onBack: () => void }) {
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

  const captured = computeCaptured(board)

  // Responsive sizing
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth
        const available = Math.min(w - 48, 560)
        setCellSize(Math.floor(available / 8))
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

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

        // AI move
        setThinking(true)
        setTimeout(() => {
          const aiMove = getBestMove(newBoard, newCastling, mv)
          if (aiMove) {
            const afterAI = applyMove(newBoard, aiMove)
            const aiCastling = updateCastling(newCastling, aiMove)
            setBoard(afterAI)
            setLastMove(aiMove)
            setCastling(aiCastling)
            setTurn('w')
            checkGameStatus(afterAI, 'w', aiCastling, aiMove)
          } else {
            setTurn('w')
          }
          setThinking(false)
        }, 50)
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
    if (history.length < 2) return // need at least player move + AI response
    const snap = history[history.length - 2]
    setBoard(snap.board)
    setTurn(snap.turn)
    setLastMove(snap.lastMove)
    setCastling(snap.castling)
    setHistory(h => h.slice(0, -2))
    setSelected(null)
    setLegalMoves([])
    setStatus('playing')
  }, [history])

  const handleNewGame = useCallback(() => {
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
        padding: '24px 16px',
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
        <button
          onClick={handleUndo}
          disabled={history.length < 2 || thinking}
          style={{
            background: SURFACE2,
            border: `1px solid ${BORDER}`,
            color: history.length < 2 || thinking ? MUTED : TEXT,
            padding: '8px 14px',
            borderRadius: 8,
            cursor: history.length < 2 || thinking ? 'not-allowed' : 'pointer',
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

            let bg = isLight ? '#f0d9b5' : '#b58863'

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
