// Moteur d'échecs PUR (aucune dépendance React/DOM) — partagé par ChessGame.tsx
// (validation des coups, rendu) et chess.worker.ts (recherche IA hors du thread UI).

// ─── Types ────────────────────────────────────────────────────────────────────

export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'
export type Color = 'w' | 'b'
export type Piece = { type: PieceType; color: Color } | null
export type Board = Piece[][]

export interface Move {
  from: [number, number]
  to: [number, number]
  piece: Piece
  captured?: Piece
  promotion?: PieceType
  castling?: 'K' | 'Q' // kingside / queenside
  enPassant?: boolean
}

export interface CastlingRights {
  wK: boolean; wQ: boolean; bK: boolean; bQ: boolean
}

export interface BoardSnapshot {
  board: Board
  turn: Color
  lastMove: Move | null
  castling: CastlingRights
}

// ─── Unicode pieces ───────────────────────────────────────────────────────────

export const UNICODE: Record<Color, Record<PieceType, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
}

// ─── Piece values ─────────────────────────────────────────────────────────────

export const PIECE_VALUE: Record<PieceType, number> = {
  P: 100, N: 310, B: 330, R: 500, Q: 900, K: 20000,
}

// ─── Position tables (from black's perspective, flip for white) ───────────────

export const PST: Record<PieceType, number[][]> = {
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

export function initBoard(): Board {
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

export function initCastling(): CastlingRights {
  return { wK: true, wQ: true, bK: true, bQ: true }
}

// ─── Board helpers ────────────────────────────────────────────────────────────

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row])
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8
}

export function opponent(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

// ─── Raw move generation (no check validation) ────────────────────────────────

export function getRawMoves(
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

export function applyMove(board: Board, move: Move): Board {
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

export function updateCastling(castling: CastlingRights, move: Move): CastlingRights {
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

export function isInCheck(board: Board, color: Color): boolean {
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

export function getLegalMoves(
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

export function evaluateBoard(board: Board): number {
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

export function quiescence(
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

export function minimax(
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

export function getBestMove(
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

export function computeCaptured(board: Board): { w: Piece[]; b: Piece[] } {
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
