// In-match chat: sanitization + rate limiting. Kept separate from index.ts's
// socket wiring, same modularity as match.ts/matchmaking.ts.
//
// Deliberately NOT persisted to Postgres -- like the live match state
// itself (the in-memory chess.js instance), chat is ephemeral realtime
// state that belongs entirely in Socket.IO, not the database (see
// server/README.md's async-DB-vs-realtime-state split).
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 200;

export function sanitizeChatText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, MAX_MESSAGE_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

const timestampsBySocket = new Map<string, number[]>();

/** Simple sliding-window rate limit per socket -- true if this message is allowed. */
export function allowChatMessage(socketId: string): boolean {
  const now = Date.now();
  const timestamps = (timestampsBySocket.get(socketId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX_MESSAGES) {
    timestampsBySocket.set(socketId, timestamps);
    return false;
  }
  timestamps.push(now);
  timestampsBySocket.set(socketId, timestamps);
  return true;
}

export function clearChatRateLimit(socketId: string): void {
  timestampsBySocket.delete(socketId);
}
