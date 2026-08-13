export type VenueTier = 'garage' | 'club' | 'arena' | 'stadium' | 'mainstage' | 'world-tour';

export interface QueuedPlayer {
  socketId: string;
  guestId: string;
  userId: string | null;
  displayName: string;
}

// One FIFO queue per venue tier -- players are only ever paired within the
// same tier they queued for, mirroring the client's buy-in ladder (setup.tsx).
const queues = new Map<VenueTier, QueuedPlayer[]>();

function queueFor(tier: VenueTier): QueuedPlayer[] {
  let queue = queues.get(tier);
  if (!queue) {
    queue = [];
    queues.set(tier, queue);
  }
  return queue;
}

/**
 * Adds a player to the tier's queue and immediately pairs them with the
 * next waiting player in that same tier, if there is one. Returns the
 * opponent when a pair forms, or null if the player is now waiting.
 *
 * If this guestId already has an entry waiting in this tier's queue --
 * most commonly because a network blip triggered a Socket.IO reconnect (a
 * new socket.id) while still waiting to be matched -- that entry is
 * updated in place (same queue position, fresh socketId) rather than
 * adding a duplicate. Without this, the stale socket.id would sit in the
 * queue and, if it got paired off, the server's
 * `io.to(staleSocketId).emit(...)` would silently reach nobody, leaving
 * the other player matched against someone who never shows up. The
 * client re-emits queue:join on every reconnect (see matchmaking.tsx) to
 * make this path actually run.
 */
export function joinQueue(tier: VenueTier, player: QueuedPlayer): QueuedPlayer | null {
  const queue = queueFor(tier);

  const staleIndex = queue.findIndex((p) => p.guestId === player.guestId);
  if (staleIndex !== -1) {
    queue[staleIndex] = player;
    return null; // still waiting, just refreshed
  }

  const opponent = queue.shift();
  if (opponent) return opponent;
  queue.push(player);
  return null;
}

export function leaveQueue(socketId: string): void {
  for (const queue of queues.values()) {
    const index = queue.findIndex((p) => p.socketId === socketId);
    if (index !== -1) queue.splice(index, 1);
  }
}
