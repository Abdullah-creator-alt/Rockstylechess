import { Chess } from 'chess.js';

import type { EvalResult } from '@/components/StockfishEngine';

export type MoveQuality = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export const MOVE_QUALITY_LABEL: Record<MoveQuality, string> = {
  best: 'Best',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

// Standard logistic centipawn -> win% mapping (the same shape widely used
// for this purpose, e.g. by Lichess) -- a well-known approximation, not
// something derived from this app's own data.
function winPercentForWhite(whiteRelativeCp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * whiteRelativeCp)) - 1);
}

// UCI scores are always relative to the side to move -- this normalizes to
// a single White-relative scale so positions with alternating turns can be
// compared directly. Mate scores map to a large magnitude that still varies
// with distance-to-mate (so "mate in 1" and "mate in 8" aren't identical),
// capped well short of the sigmoid's saturation point.
function toWhiteRelativeCp(sideToMove: 'w' | 'b', cp: number | null, mate: number | null): number {
  const sideRelative = mate !== null ? Math.sign(mate) * (9000 + Math.max(0, 1000 - Math.abs(mate) * 50)) : (cp ?? 0);
  return sideToMove === 'w' ? sideRelative : -sideRelative;
}

// Tunable thresholds, not authoritative -- approximate, commonly-cited
// ranges for win-probability-loss-based move classification.
const THRESHOLDS: [number, MoveQuality][] = [
  [2, 'best'],
  [5, 'good'],
  [10, 'inaccuracy'],
  [20, 'mistake'],
  [Infinity, 'blunder'],
];

function classify(wpLossPercent: number): MoveQuality {
  const match = THRESHOLDS.find(([max]) => wpLossPercent <= max);
  return match ? match[1] : 'blunder';
}

export interface PositionEval {
  whiteRelativeCp: number;
  whiteWinPercent: number;
}

export interface MoveAnalysisEntry {
  ply: number;
  color: 'w' | 'b';
  san: string;
  quality: MoveQuality;
  wpLossPercent: number;
  /** The engine's suggested move (in SAN, ready to display) from the position before this one -- only meaningful when quality !== 'best'. */
  bestMoveSan: string | null;
}

export interface GameAnalysisSummary {
  counts: Record<MoveQuality, number>;
  /** Average(100 - wpLossPercent) over that side's own moves -- an approximation, not any specific site's proprietary formula. */
  accuracy: number;
}

export interface GameAnalysisResult {
  /** Length k+1 -- index 0 is the starting position. */
  positions: PositionEval[];
  /** Length k -- one entry per ply. */
  moves: MoveAnalysisEntry[];
  summary: Record<'w' | 'b', GameAnalysisSummary>;
}

function emptyQualityCounts(): Record<MoveQuality, number> {
  return { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
}

// One evaluate() call per position (k+1 total for a k-ply game), not per
// move -- position N's eval already serves as both "the actual result of
// move N" and "the baseline before move N+1", so evaluating the whole
// position sequence once and comparing adjacent entries produces the exact
// same result as evaluating each move's before/after pair separately, at
// half the engine calls.
export async function analyzeGame(
  pgn: string,
  evaluate: (fen: string, movetimeMs: number) => Promise<EvalResult>,
  movetimeMs: number,
  onProgress?: (done: number, total: number) => void,
  isCancelled?: () => boolean,
): Promise<GameAnalysisResult | null> {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (error) {
    console.log('analyzeGame: failed to parse stored pgn', error);
    return null;
  }
  const history = chess.history({ verbose: true });
  if (history.length === 0) return null;

  const fens = [history[0].before, ...history.map((entry) => entry.after)];
  const positions: PositionEval[] = [];
  const bestMoveSanAt: (string | null)[] = [];

  for (let i = 0; i < fens.length; i += 1) {
    if (isCancelled?.()) return null;
    const posChess = new Chess(fens[i]);
    const fenTurn = posChess.turn();

    let whiteRelativeCp: number;
    let bestMoveSan: string | null = null;
    if (posChess.isCheckmate()) {
      // Terminal position, no legal moves -- the engine would return no
      // score at all here (nothing to search), which the cp-defaults-to-0
      // fallback below would wrongly read as a neutral/drawn position
      // instead of "the side to move just got checkmated". Stalemate/draw
      // terminal positions don't need this special case -- an engine
      // finding no moves there really is a 0cp/50-50 position, which the
      // fallback already handles correctly.
      whiteRelativeCp = fenTurn === 'w' ? -9999 : 9999;
    } else {
      const result = await evaluate(fens[i], movetimeMs);
      whiteRelativeCp = toWhiteRelativeCp(fenTurn, result.cp, result.mate);
      if (result.bestMove) {
        try {
          const move = posChess.move({ from: result.bestMove.from, to: result.bestMove.to, promotion: result.bestMove.promotion ?? 'q' });
          bestMoveSan = move.san;
          posChess.undo();
        } catch (error) {
          console.log('analyzeGame: engine suggested an unparseable best move', error);
        }
      }
    }
    positions.push({ whiteRelativeCp, whiteWinPercent: winPercentForWhite(whiteRelativeCp) });
    bestMoveSanAt.push(bestMoveSan);
    onProgress?.(i + 1, fens.length);
  }

  const moves: MoveAnalysisEntry[] = history.map((entry, i) => {
    const before = positions[i];
    const after = positions[i + 1];
    const moverIsWhite = entry.color === 'w';
    const wpBefore = moverIsWhite ? before.whiteWinPercent : 100 - before.whiteWinPercent;
    const wpAfter = moverIsWhite ? after.whiteWinPercent : 100 - after.whiteWinPercent;
    const wpLossPercent = Math.max(0, wpBefore - wpAfter);
    const quality = classify(wpLossPercent);
    return {
      ply: i + 1,
      color: entry.color,
      san: entry.san,
      quality,
      wpLossPercent,
      bestMoveSan: quality === 'best' ? null : bestMoveSanAt[i],
    };
  });

  const summary: Record<'w' | 'b', GameAnalysisSummary> = {
    w: { counts: emptyQualityCounts(), accuracy: 100 },
    b: { counts: emptyQualityCounts(), accuracy: 100 },
  };
  for (const color of ['w', 'b'] as const) {
    const own = moves.filter((m) => m.color === color);
    if (own.length === 0) continue;
    for (const m of own) summary[color].counts[m.quality] += 1;
    const avgLoss = own.reduce((sum, m) => sum + m.wpLossPercent, 0) / own.length;
    summary[color].accuracy = Math.max(0, Math.min(100, 100 - avgLoss));
  }

  return { positions, moves, summary };
}
