// Web Worker : exécute la recherche minimax de l'IA HORS du thread principal, pour
// que l'interface ne gèle plus pendant que le CPU « réfléchit ».
import { getBestMove } from './chessEngine'
import type { Board, CastlingRights, Move } from './chessEngine'

// `self` typé comme Worker : postMessage à 1 argument + onmessage, sans conflit
// entre les libs DOM et WebWorker du projet.
const ctx = self as unknown as Worker

interface AiRequest {
  board: Board
  castling: CastlingRights
  lastMove: Move | null
  depth: number
}

ctx.onmessage = (e: MessageEvent<AiRequest>) => {
  const { board, castling, lastMove, depth } = e.data
  const move = getBestMove(board, castling, lastMove, depth)
  ctx.postMessage(move)
}

export {}
