import type { Chess } from 'chess.js';

import type { EngineMove } from './botEngine';

// Extracted verbatim from useChessGame.ts's original inline bot logic --
// picks a uniformly random legal move. Still the 'easy' tier (Roadie Rick).
export function pickRandomMove(chess: Chess): EngineMove | null {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  return { from: randomMove.from, to: randomMove.to, promotion: 'q' };
}
