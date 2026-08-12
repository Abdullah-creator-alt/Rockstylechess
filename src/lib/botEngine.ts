import type { Chess, Square } from 'chess.js';

import { pickHeuristicMove } from './heuristicBot';
import { pickRandomMove } from './randomBot';

/**
 * Five bots (bots.tsx), four engines. 'stockfish-lite' (The Reaper) and
 * 'stockfish-strong' (King Axl) both run through the same StockfishEngine
 * WebView -- see STOCKFISH_PRESETS -- just at different UCI_Elo/movetime.
 */
export type BotDifficulty = 'easy' | 'medium' | 'stockfish-lite' | 'stockfish-strong';

export interface EngineMove {
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface StockfishConfig {
  elo: number;
  movetimeMs: number;
}

export const STOCKFISH_PRESETS: Record<'stockfish-lite' | 'stockfish-strong', StockfishConfig> = {
  'stockfish-lite': { elo: 1600, movetimeMs: 1200 },
  'stockfish-strong': { elo: 2200, movetimeMs: 2000 },
};

export type RequestEngineMove = (fen: string, config: StockfishConfig) => Promise<EngineMove | null>;

/**
 * Single dispatch point the bot-move effect calls into -- callers don't need
 * to know whether a tier is synchronous (easy/medium) or round-trips through
 * a WebView (the two Stockfish tiers), they just await a move.
 */
export async function resolveBotMove(
  chess: Chess,
  difficulty: BotDifficulty,
  requestEngineMove?: RequestEngineMove,
): Promise<EngineMove | null> {
  if (difficulty === 'easy') {
    return pickRandomMove(chess);
  }
  if (difficulty === 'medium') {
    return pickHeuristicMove(chess);
  }
  if (!requestEngineMove) {
    console.log('resolveBotMove: no requestEngineMove provided for Stockfish tier, falling back to random');
    return pickRandomMove(chess);
  }
  return requestEngineMove(chess.fen(), STOCKFISH_PRESETS[difficulty]);
}
