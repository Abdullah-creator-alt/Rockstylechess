import type { Chess, Color } from 'chess.js';

// FIDE Article 6.9: when a player's flag falls, it's a loss ONLY if the
// opponent could still checkmate by any legal sequence -- otherwise the game
// is a draw. In practice that means a bare king, K+N, or K+B on the side that
// still has time cannot win on the flag. Everything else (a pawn/rook/queen
// still on the board, the bishop pair, two knights -- which CAN mate even if
// it can't be forced, matching lichess's own rule) keeps the win.
//
// Deliberately mirrored verbatim in server/src/chessEndgame.ts -- the client
// (src/) and server (server/) are separate npm projects and can't share an
// import. Keep the two copies in sync.
export function canDeliverMate(chess: Chess, color: Color): boolean {
  let knights = 0;
  let bishops = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color) continue;
      if (cell.type === 'p' || cell.type === 'r' || cell.type === 'q') return true;
      if (cell.type === 'n') knights += 1;
      if (cell.type === 'b') bishops += 1;
    }
  }
  if (bishops >= 2) return true;
  if (knights >= 2) return true;
  if (bishops >= 1 && knights >= 1) return true;
  return false;
}
