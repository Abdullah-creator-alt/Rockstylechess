// Standard point values (the same table chess.com shows). Display-only: it
// scores pieces chess.js already reported as captured / still on the board and
// decides nothing about legality or results. Keys are lowercase piece types
// (chess.js `PieceSymbol`), the king is 0 (it is never captured).
export const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Total value of a list of captured piece types (useChessGame's capturedByWhite/Black). */
export function capturedPoints(pieces: readonly string[]): number {
  let total = 0;
  for (const piece of pieces) total += PIECE_VALUES[piece.toLowerCase()] ?? 0;
  return total;
}

/**
 * Value of everything `color` still has on the board. `board` uses
 * useChessGame's encoding: uppercase = white, lowercase = black, '' = empty.
 */
export function materialPoints(board: readonly (readonly string[])[], color: 'w' | 'b'): number {
  let total = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const isWhite = cell === cell.toUpperCase();
      if (isWhite === (color === 'w')) total += PIECE_VALUES[cell.toLowerCase()] ?? 0;
    }
  }
  return total;
}

/**
 * Net material lead, white minus black (positive = white ahead). Measured on
 * the board, not from captures, so a promotion counts for the promoting side
 * (pawn -> queen is +8), matching chess.com.
 */
export function materialLead(board: readonly (readonly string[])[]): number {
  return materialPoints(board, 'w') - materialPoints(board, 'b');
}
