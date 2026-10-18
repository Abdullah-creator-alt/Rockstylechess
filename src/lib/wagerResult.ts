import { getSocket } from '@/lib/socket';
import type { WagerSettledPayload } from '@/lib/onlineMatch';

// Holds the server's wager settlement for each match so the result screen can
// read it whether it arrived before or after navigation (the server settles in a
// few tens of ms, right as the game ends, while match.tsx waits 900 ms before it
// replaces itself with the result screen -- usually first, but never guaranteed).
// One module-level listener on the shared socket, attached on first use.
const results = new Map<string, WagerSettledPayload>();
const listeners = new Set<(payload: WagerSettledPayload) => void>();
let attached = false;

export function ensureWagerListener(): void {
  if (attached) return;
  attached = true;
  getSocket().on('wager:settled', (payload: WagerSettledPayload) => {
    results.set(payload.matchId, payload);
    listeners.forEach((listener) => listener(payload));
  });
}

export function getWagerResult(matchId: string): WagerSettledPayload | undefined {
  return results.get(matchId);
}

export function subscribeWagerResult(listener: (payload: WagerSettledPayload) => void): () => void {
  ensureWagerListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
