import type { Chess, Square } from 'chess.js';

// Extracted from useChessGame.ts's buildSnapshot -- the pure, instance-based
// transform from a chess.js Chess to ChessBoard's board: string[][] prop
// shape (uppercase = white, lowercase = black, '' = empty). Shared by live
// play (buildSnapshot) and the replay hook (useMatchReplay), which builds a
// fresh Chess per ply from a stored FEN rather than mutating one instance.
export function boardGridFromChess(chess: Chess): string[][] {
  return chess.board().map((row) => row.map((cell) => (cell ? (cell.color === 'w' ? cell.type.toUpperCase() : cell.type) : '')));
}

// Same extraction for the in-check king square, scanning the same board()
// rows buildSnapshot already had in hand rather than calling chess.board()
// twice.
export function checkSquareFromChess(chess: Chess): Square | null {
  if (!chess.inCheck()) return null;
  const turn = chess.turn();
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === turn) return cell.square;
    }
  }
  return null;
}
