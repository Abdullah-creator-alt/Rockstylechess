// Bot/local matches never reach the server, so unlike online matches
// (backed by matches.pgn/moveElapsedMs, see server/src/db/schema/matches.ts)
// they have nothing persisted to replay from. This is a single-slot,
// in-memory-only, explicitly-cleared store bridging match.tsx's game-over
// moment to the Replay button on result-placeholder.tsx and the replay
// screen itself -- not persisted, not a cache in front of storage (unlike
// playerId.ts/authStorage.ts), just held until the player explicitly goes
// back to the menu.
export interface LocalMatchReplay {
  pgn: string;
  moveElapsedMs: number[];
  mode: 'bot' | 'local';
  opponentLabel: string;
  outcome: 'win' | 'loss' | 'draw';
  resultType: 'checkmate' | 'stalemate' | 'draw' | 'resignation';
  playedAt: string;
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
