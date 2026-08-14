export type VenueTier = 'garage' | 'club' | 'arena' | 'stadium' | 'mainstage' | 'world-tour';

export interface QueueMatchedPayload {
  matchId: string;
  color: 'w' | 'b';
  opponent: { displayName: string };
  fen: string;
}

export interface MoveAppliedPayload {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
  fen: string;
  turn: 'w' | 'b';
  isGameOver: boolean;
}

export interface MatchEndedPayload {
  result: { type: 'resignation' | 'forfeit'; winner: 'w' | 'b' };
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
