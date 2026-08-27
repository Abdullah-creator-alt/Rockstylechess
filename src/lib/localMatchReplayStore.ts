// Bot/local matches never reach the server, so unlike online matches
// (backed by matches.pgn/moveElapsedMs, see server/src/db/schema/matches.ts)
// they have nothing persisted to replay from. This is a single-slot,
// in-memory-only, explicitly-cleared store bridging match.tsx's game-over
// moment to the Replay/Analyze Game buttons on result-placeholder.tsx and
// the replay screen itself -- not persisted, not a cache in front of
// storage (unlike playerId.ts/authStorage.ts), just held until the player
// explicitly goes back to the menu.
//
// Online matches are captured here too, for this one moment only -- there's
// no server-known matches.id available client-side yet at game-over time
// (persistMatchResult.ts runs fire-and-forget afterward and never reports
// the new row's id back to either client), so the immediate post-match
// Analyze Game entry point uses this same client-side snapshot instead of
// the id-based /me/matches/:matchId/replay lookup. That server-backed path
// (reached later via Iron ID's match history) is unaffected and always
// correct -- this is only for "right after this match ended". Known
// tradeoff: if the player reconnected mid-game after a disconnect, this
// client-side pgn only reflects moves since reconnecting (rejoin resends a
// FEN, not the move history), so this immediate capture could rarely be
// missing early moves in that specific scenario.
export interface LocalMatchReplay {
  pgn: string;
  moveElapsedMs: number[];
  mode: 'bot' | 'local' | 'online';
  opponentLabel: string;
  outcome: 'win' | 'loss' | 'draw';
  resultType: 'checkmate' | 'stalemate' | 'draw' | 'resignation' | 'timeout';
  playedAt: string;
  // Which side the human played -- only meaningful for mode: 'bot'/'online'
  // (local pass-and-play has no single "the player", both sides are human
  // on the same device). Lets the replay/analysis screen say "You" instead
  // of a color.
  playerColor: 'w' | 'b';
}

let pending: LocalMatchReplay | null = null;

export function setPendingLocalReplay(data: LocalMatchReplay): void {
  pending = data;
}

export function getPendingLocalReplay(): LocalMatchReplay | null {
  return pending;
}

export function clearPendingLocalReplay(): void {
  pending = null;
}
