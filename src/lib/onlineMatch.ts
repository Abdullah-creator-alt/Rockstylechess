export type VenueTier = 'garage' | 'club' | 'arena' | 'stadium' | 'mainstage' | 'world-tour';

// Mirrors setup.tsx's own Duration type -- the enum, not raw ms, travels
// over the wire (server/src/index.ts's DURATION_MS resolves it), so a client
// can't request an arbitrary duration by sending a made-up ms value.
export type Duration = '3m' | '5m' | '10m';

export interface QueueMatchedPayload {
  matchId: string;
  color: 'w' | 'b';
  opponent: { displayName: string; avatarId: string | null };
  fen: string;
  clocks: { w: number; b: number };
  incrementMs: number;
}

export interface MoveAppliedPayload {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
  fen: string;
  turn: 'w' | 'b';
  isGameOver: boolean;
  clocks: { w: number; b: number };
}

export interface MatchEndedPayload {
  result: { type: 'resignation' | 'forfeit' | 'timeout'; winner: 'w' | 'b' };
}

export interface ChatMessagePayload {
  color: 'w' | 'b';
  displayName: string;
  text: string;
  sentAt: number;
}

export interface RoomCreatedPayload {
  code: string;
}

export interface RoomErrorPayload {
  reason: 'not-found' | 'own-room';
}

export function isVenueTier(value: unknown): value is VenueTier {
  return (
    value === 'garage' ||
    value === 'club' ||
    value === 'arena' ||
    value === 'stadium' ||
    value === 'mainstage' ||
    value === 'world-tour'
  );
}

export function isDuration(value: unknown): value is Duration {
  return value === '3m' || value === '5m' || value === '10m';
}
