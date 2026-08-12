import type { Chess, PieceSymbol } from 'chess.js';

import type { EngineMove } from './botEngine';

// Medium tier (Valkyrie Riff, Old School Roy, Metal Head): negamax with
// alpha-beta pruning over chess.js's own move()/undo(), no external engine.
//
// chess.js's move generation is not cheap (~ms per call, not microseconds --
// it's a naive JS implementation, not bitboards), and this runs synchronously
// on React Native's single JS thread, which also owns touch/gesture handling.
// Depth 3 was measured to genuinely freeze the app for many seconds -- tens
// of thousands of chess.js calls blocking everything, including input, which
// then queues up and fires all at once the moment it unblocks. Depth 2 plus
// a hard wall-clock deadline (below) keeps this to a bounded, brief pause
// instead.
export const HEURISTIC_SEARCH_DEPTH = 2;
// Hard safety net regardless of position complexity or depth -- once hit,
// remaining nodes fall back to an instant static eval instead of recursing
// further, so worst case is bounded no matter how many legal moves a given
// position has.
const SEARCH_TIME_BUDGET_MS = 300;

const MATE_SCORE = 100000;
const TIE_TOLERANCE_CP = 20;

const PIECE_VALUES: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Michniewski's public-domain "simplified evaluation function" piece-square
// tables, row 0 = rank 8 down to row 7 = rank 1, matching chess.js's own
// board() row order. Written for White; mirrored per-piece for Black below.
const PST: Record<PieceSymbol, number[][]> = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  r: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  k: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

function evaluateWhitePerspective(chess: Chess): number {
  const board = chess.board();
  let score = 0;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const cell = board[row][col];
      if (!cell) continue;
      const isWhite = cell.color === 'w';
      const pstRow = isWhite ? row : 7 - row;
      const value = PIECE_VALUES[cell.type] + PST[cell.type][pstRow][col];
      score += isWhite ? value : -value;
    }
  }
  return score;
}

// Negamax convention: positive is good for the side to move.
function evaluate(chess: Chess): number {
  const whiteScore = evaluateWhitePerspective(chess);
  return chess.turn() === 'w' ? whiteScore : -whiteScore;
}

function orderedMoves(chess: Chess) {
  return chess.moves({ verbose: true }).sort((a, b) => Number(b.isCapture()) - Number(a.isCapture()));
}

interface SearchState {
  deadline: number;
  nodeCount: number;
  aborted: boolean;
}

// Checking every node would cost more than it saves (Date.now() isn't free
// at that frequency); checking too rarely risks overshooting the budget by a
// visible amount. Every 32 nodes is a reasonable middle ground.
const DEADLINE_CHECK_INTERVAL = 32;

function negamax(chess: Chess, depth: number, alpha: number, beta: number, state: SearchState): number {
  state.nodeCount += 1;
  if (!state.aborted && state.nodeCount % DEADLINE_CHECK_INTERVAL === 0 && Date.now() > state.deadline) {
    state.aborted = true;
  }
  // Leaf check comes first and skips move generation entirely -- the
  // previous version generated moves at every leaf too, just to check for
  // checkmate, which alone accounted for roughly half the total search cost
  // for no benefit (a checkmate discovered only at the deepest ply is
  // already an acceptable miss for a "medium" bot). Once aborted, every
  // remaining node also takes this fast path so the search unwinds quickly
  // instead of completing its full depth.
  if (depth === 0 || state.aborted) return evaluate(chess);

  const moves = orderedMoves(chess);
  if (moves.length === 0) {
    return chess.isCheckmate() ? -MATE_SCORE : 0;
  }
  if (chess.isDraw()) return 0;

  let best = -Infinity;
  for (const move of moves) {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    const score = -negamax(chess, depth - 1, -beta, -alpha, state);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta || state.aborted) break;
  }
  return best;
}

export function pickHeuristicMove(chess: Chess, depth = HEURISTIC_SEARCH_DEPTH): EngineMove | null {
  const moves = orderedMoves(chess);
  if (moves.length === 0) return null;
  // Forced move -- searching it would just burn the time budget for nothing.
  if (moves.length === 1) {
    const only = moves[0];
    return { from: only.from, to: only.to, promotion: (only.promotion as EngineMove['promotion']) ?? 'q' };
  }

  const state: SearchState = { deadline: Date.now() + SEARCH_TIME_BUDGET_MS, nodeCount: 0, aborted: false };
  let alpha = -Infinity;
  const beta = Infinity;
  let bestScore = -Infinity;
  const scored: { move: (typeof moves)[number]; score: number }[] = [];

  for (const move of moves) {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    const score = -negamax(chess, depth - 1, -beta, -alpha, state);
    chess.undo();
    scored.push({ move, score });
    if (score > bestScore) bestScore = score;
    if (score > alpha) alpha = score;
  }

  // Randomize among near-tied top moves so medium doesn't always play the
  // exact same reply in a given position.
  const tied = scored.filter((s) => bestScore - s.score <= TIE_TOLERANCE_CP);
  const chosen = tied[Math.floor(Math.random() * tied.length)];
  return { from: chosen.move.from, to: chosen.move.to, promotion: (chosen.move.promotion as EngineMove['promotion']) ?? 'q' };
}
