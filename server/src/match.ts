import { Chess } from 'chess.js';
import { randomUUID } from 'node:crypto';

import type { QueuedPlayer } from './matchmaking.js';

export type PieceColor = 'w' | 'b';

export interface MatchPlayer {
  socketId: string;
  guestId: string;
  // Server-verified identity (from a JWT checked in authMiddleware.ts's
  // socketAuth), never trusted from client-supplied data directly. Null for
  // guest/anonymous play. persistMatchResult only records a match to
  // Postgres when BOTH seats have this set.
  userId: string | null;
  displayName: string;
}

export interface MatchState {
  id: string;
  chess: Chess;
  players: Record<PieceColor, MatchPlayer>;
  createdAt: Date;
  // Set while a player is disconnected and within the reconnect grace
  // window -- cleared on rejoin, and on expiry the match is forfeited to
  // the other side. See index.ts's RECONNECT_GRACE_MS.
  forfeitTimers: Partial<Record<PieceColor, NodeJS.Timeout>>;
  // Cumulative ms since createdAt, one entry per ply, appended in applyMove.
  // Deliberately just timing -- everything else about a move (san, from,
  // to, piece, captured, promotion, flags, before/after FEN) is already
  // 100% reconstructable from the pgn column persistMatchResult writes at
  // match end (chess.loadPgn(pgn) + chess.history({verbose: true})), so
  // storing it again here would just be duplicated storage for no benefit.
  // A future replay feature zips this array with that history by index.
  moveElapsedMs: number[];
}

export interface MoveInput {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

// Checkmate/stalemate/draw are deliberately NOT surfaced here as a broadcast
// event -- both clients independently derive them from the move they just
// applied to their own chess.js instance (same as the existing bot/local
// modes already do), symmetric with how a normal move already updates the
// board. This type only covers endings that happen *without* a move.
export type MatchEndResult =
  | { type: 'resignation'; winner: PieceColor }
  | { type: 'forfeit'; winner: PieceColor };

const matches = new Map<string, MatchState>();

export function createMatch(playerA: QueuedPlayer, playerB: QueuedPlayer): MatchState {
  // Coin flip for colors -- neither queued player picked a side.
  const [white, black] = Math.random() < 0.5 ? [playerA, playerB] : [playerB, playerA];
  const match: MatchState = {
    id: randomUUID(),
    chess: new Chess(),
    players: {
      w: { socketId: white.socketId, guestId: white.guestId, userId: white.userId, displayName: white.displayName },
      b: { socketId: black.socketId, guestId: black.guestId, userId: black.userId, displayName: black.displayName },
    },
    createdAt: new Date(),
    forfeitTimers: {},
    moveElapsedMs: [],
  };
  matches.set(match.id, match);
  return match;
}

export function getMatch(matchId: string): MatchState | undefined {
  return matches.get(matchId);
}

export function allMatches(): IterableIterator<MatchState> {
  return matches.values();
}

export function endMatch(matchId: string): void {
  const match = matches.get(matchId);
  if (match) {
    for (const timer of Object.values(match.forfeitTimers)) clearTimeout(timer);
  }
  matches.delete(matchId);
}

export function colorOf(match: MatchState, guestId: string): PieceColor | null {
  if (match.players.w.guestId === guestId) return 'w';
  if (match.players.b.guestId === guestId) return 'b';
  return null;
}

export function opponentColor(color: PieceColor): PieceColor {
  return color === 'w' ? 'b' : 'w';
}

/** Applies a move if legal and it's that color's turn. Returns the updated
 * Chess instance, or null if the move was rejected. */
export function applyMove(match: MatchState, color: PieceColor, move: MoveInput): Chess | null {
  if (match.chess.turn() !== color) return null;
  try {
    match.chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
  } catch {
    return null;
  }
  match.moveElapsedMs.push(Date.now() - match.createdAt.getTime());
  return match.chess;
}
