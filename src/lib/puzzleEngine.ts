import type { Square } from 'chess.js';

// Lichess puzzle solutions are UCI strings: four squares back-to-back, plus
// an optional promotion letter -- "e7e8q" promotes to a queen, "e2e4" is a
// plain pawn push. Splitting on fixed offsets rather than a regex since the
// shape is exactly this rigid (no separators, no algebraic disambiguators).
export function parseUciMove(uci: string): { from: Square; to: Square; promotion?: 'q' | 'r' | 'b' | 'n' } {
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length > 4 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined;
  return promotion ? { from, to, promotion } : { from, to };
}
