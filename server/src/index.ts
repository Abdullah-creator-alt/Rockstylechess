import './env.js';

import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';

import { eq } from 'drizzle-orm';

import { allowedWebOrigins } from './allowedOrigins.js';
import { authRouter } from './auth.js';
import { socketAuth } from './authMiddleware.js';
import { auth } from './betterAuth.js';
import { allowChatMessage, clearChatRateLimit, sanitizeChatText } from './chat.js';
import { db } from './db/client.js';
import { persistMatchResult } from './db/persistMatchResult.js';
import { playerProfiles } from './db/schema/index.js';
import { cancelRoomBySocketId, createRoom, joinRoom } from './gameRoom.js';
import {
  allMatches,
  applyMove,
  colorOf,
  createMatch,
  endMatch,
  getMatch,
  liveClockRemaining,
  opponentColor,
  type MatchState,
  type PieceColor,
} from './match.js';
import { isDuration, joinQueue, leaveQueue, type Duration, type QueuedPlayer, type VenueTier } from './matchmaking.js';

const PORT = Number(process.env.PORT) || 4000;
// How long a disconnected player's match stays alive waiting for them to
// reconnect before it's forfeited to the opponent -- mobile networks flap
// between WiFi/cellular/background often enough that an instant forfeit
// would be needlessly punishing.
const RECONNECT_GRACE_MS = 60_000;

const VENUE_TIERS: VenueTier[] = ['garage', 'club', 'arena', 'stadium', 'mainstage', 'world-tour'];
function isVenueTier(value: unknown): value is VenueTier {
  return typeof value === 'string' && (VENUE_TIERS as string[]).includes(value);
}

// The enum, not raw ms, arrives over the wire -- resolved to a real ms value
// only here, server-side, so a client can't request an arbitrary duration.
const DURATION_MS: Record<Duration, number> = {
  '3m': 3 * 60_000,
  '5m': 5 * 60_000,
  '10m': 10 * 60_000,
};
function resolveDuration(value: unknown): Duration {
  return isDuration(value) ? value : '5m';
}

// Guests (userId null) and signed-in players who haven't picked an avatar
// yet both resolve to null here -- getAvatarEmoji() on the client already
// treats null as "show the default avatar", so this doesn't need its own
// fallback string server-side.
async function getAvatarId(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const [row] = await db
    .select({ avatarId: playerProfiles.avatarId })
    .from(playerProfiles)
    .where(eq(playerProfiles.userId, userId));
  return row?.avatarId ?? null;
}

const app = express();
app.use(cors({ origin: allowedWebOrigins, credentials: true }));
// Mounted before express.json() -- better-auth's Express handler hangs if
// body parsing runs first (it reads the raw request body itself).
app.all('/api/auth/*', toNodeHandler(auth));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(authRouter);

// Last-resort net for anything asyncHandler forwards (auth.ts) -- turns an
// unhandled request-time failure (e.g. the DB being unreachable) into a 500
// for that one request instead of an uncaught exception that crashes the
// whole process, taking every in-progress Socket.IO match down with it.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled request error', err);
  if (!res.headersSent) res.status(500).json({ error: 'internal-error' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: allowedWebOrigins } });
io.use(socketAuth);

// socket.id -> guestId, so a disconnect/rejoin (which gets a fresh socket.id)
// can still be matched back to whichever match its previous guestId was in.
const guestIdBySocket = new Map<string, string>();

// Fires when a side's clock deadline elapses without them moving -- mirrors
// the disconnect/forfeit callback below exactly (broadcast match:ended,
// persist, endMatch), just for a different trigger. match.ts can't own this
// itself: it has no Socket.IO `io` access, so index.ts (which does) is
// responsible for arming/clearing/rescheduling match.clock.deadlineTimer at
// every point the active side changes (see notifyMatched below and
// move:make's handler further down).
function fireTimeout(match: MatchState, flaggedColor: PieceColor): void {
  const winner = opponentColor(flaggedColor);
  io.to(match.id).emit('match:ended', { result: { type: 'timeout', winner } });
  persistMatchResult(match, 'timeout', winner).catch((err) => console.error('match persistence failed', err));
  endMatch(match.id);
}

// Joins both sockets to the match's Socket.IO room and tells each color's
// socket who they're playing -- the one piece of "a pair just formed"
// logic shared by both pairing paths (tier queue and room code), so it
// isn't duplicated between queue:join and room:join below. Also arms
// White's clock deadline -- White's clock is already running from move 1,
// standard chess-clock convention -- since createMatch itself can't (no io
// access, see fireTimeout's comment).
function notifyMatched(match: MatchState): void {
  io.sockets.sockets.get(match.players.w.socketId)?.join(match.id);
  io.sockets.sockets.get(match.players.b.socketId)?.join(match.id);

  match.clock.deadlineTimer = setTimeout(() => fireTimeout(match, 'w'), match.clock.remainingMs.w);

  for (const color of ['w', 'b'] as PieceColor[]) {
    const me = match.players[color];
    const opp = match.players[opponentColor(color)];
    io.to(me.socketId).emit('queue:matched', {
      matchId: match.id,
      color,
      opponent: { displayName: opp.displayName, avatarId: opp.avatarId },
      fen: match.chess.fen(),
      clocks: match.clock.remainingMs,
      incrementMs: match.clock.incrementMs,
    });
  }
}

io.on('connection', (socket: Socket) => {
  socket.on(
    'queue:join',
    async (payload: { guestId?: string; displayName?: string; venueTier?: string; duration?: string }) => {
      if (!payload?.guestId || !isVenueTier(payload.venueTier)) return;
      guestIdBySocket.set(socket.id, payload.guestId);

      const userId = (socket.data.userId as string | undefined) ?? null;
      const player: QueuedPlayer = {
        socketId: socket.id,
        guestId: payload.guestId,
        userId,
        displayName: payload.displayName || 'PLAYER',
        avatarId: await getAvatarId(userId),
        duration: resolveDuration(payload.duration),
      };
      const opponent = joinQueue(payload.venueTier, player);
      if (!opponent) return; // now waiting in queue

      // The waiting player's duration wins -- see QueuedPlayer.duration's comment.
      notifyMatched(createMatch(opponent, player, DURATION_MS[opponent.duration]));
    },
  );

  socket.on('queue:leave', () => {
    leaveQueue(socket.id);
  });

  socket.on('room:create', async (payload: { guestId?: string; displayName?: string; duration?: string }) => {
    if (!payload?.guestId) return;
    guestIdBySocket.set(socket.id, payload.guestId);

    const userId = (socket.data.userId as string | undefined) ?? null;
    const player: QueuedPlayer = {
      socketId: socket.id,
      guestId: payload.guestId,
      userId,
      displayName: payload.displayName || 'PLAYER',
      avatarId: await getAvatarId(userId),
      duration: resolveDuration(payload.duration),
    };
    socket.emit('room:created', { code: createRoom(player) });
  });

  socket.on('room:join', async (payload: { guestId?: string; displayName?: string; code?: string }) => {
    if (!payload?.guestId || !payload?.code) return;
    guestIdBySocket.set(socket.id, payload.guestId);

    const userId = (socket.data.userId as string | undefined) ?? null;
    const player: QueuedPlayer = {
      socketId: socket.id,
      guestId: payload.guestId,
      userId,
      displayName: payload.displayName || 'PLAYER',
      avatarId: await getAvatarId(userId),
      // The joiner's own duration is irrelevant -- the room creator's
      // (result.opponent below) is what createMatch actually uses, since
      // they're the one who set the room up in the first place.
      duration: '5m',
    };
    const result = joinRoom(payload.code, player);
    if (result.status !== 'ok') {
      socket.emit('room:error', { reason: result.status });
      return;
    }

    notifyMatched(createMatch(result.opponent, player, DURATION_MS[result.opponent.duration]));
  });

  socket.on('room:cancel', () => {
    cancelRoomBySocketId(socket.id);
  });

  socket.on('move:make', (payload: { matchId?: string; from?: string; to?: string; promotion?: 'q' | 'r' | 'b' | 'n' }) => {
    const guestId = guestIdBySocket.get(socket.id);
    const match = payload?.matchId ? getMatch(payload.matchId) : undefined;
    if (!match || !guestId || !payload?.from || !payload?.to) return;
    const color = colorOf(match, guestId);
    if (!color) return;

    const chess = applyMove(match, color, { from: payload.from, to: payload.to, promotion: payload.promotion });
    if (!chess) {
      socket.emit('move:rejected', { reason: 'illegal-move' });
      return;
    }

    // applyMove already deducted the mover's elapsed time (+ increment) into
    // match.clock -- clear their now-stale deadline (they just moved, it no
    // longer applies) and arm one for whoever's turn it is now. Clearing
    // before anything else that could yield is what makes "a move lands
    // right as the old timer would have fired" safe: Node's single-threaded
    // event loop means whichever callback actually got invoked first wins
    // outright, no mutex needed.
    if (match.clock.deadlineTimer) clearTimeout(match.clock.deadlineTimer);
    const nextColor = chess.turn();
    match.clock.deadlineTimer = setTimeout(() => fireTimeout(match, nextColor), match.clock.remainingMs[nextColor]);

    io.to(match.id).emit('move:applied', {
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion ?? 'q',
      fen: chess.fen(),
      turn: chess.turn(),
      isGameOver: chess.isGameOver(),
      clocks: match.clock.remainingMs,
    });

    if (chess.isGameOver()) {
      let resultType: 'checkmate' | 'stalemate' | 'draw';
      let winnerColor: PieceColor | null = null;
      if (chess.isCheckmate()) {
        resultType = 'checkmate';
        winnerColor = opponentColor(chess.turn());
      } else if (chess.isStalemate()) {
        resultType = 'stalemate';
      } else {
        resultType = 'draw';
      }
      // Fire-and-forget -- persistence never gates or delays the realtime
      // flow above, which has already completed by this point.
      persistMatchResult(match, resultType, winnerColor).catch((err) =>
        console.error('match persistence failed', err),
      );
      endMatch(match.id);
    }
  });

  socket.on('match:resign', (payload: { matchId?: string }) => {
    const guestId = guestIdBySocket.get(socket.id);
    const match = payload?.matchId ? getMatch(payload.matchId) : undefined;
    if (!match || !guestId) return;
    const color = colorOf(match, guestId);
    if (!color) return;

    io.to(match.id).emit('match:ended', { result: { type: 'resignation', winner: opponentColor(color) } });
    persistMatchResult(match, 'resignation', opponentColor(color)).catch((err) =>
      console.error('match persistence failed', err),
    );
    endMatch(match.id);
  });

  socket.on('match:chat:send', (payload: { matchId?: string; text?: string }) => {
    const guestId = guestIdBySocket.get(socket.id);
    const match = payload?.matchId ? getMatch(payload.matchId) : undefined;
    if (!match || !guestId) return;
    const color = colorOf(match, guestId);
    if (!color) return; // only the two seated players can chat in their own match

    const text = sanitizeChatText(payload.text);
    if (!text || !allowChatMessage(socket.id)) return;

    io.to(match.id).emit('match:chat:message', {
      color,
      displayName: match.players[color].displayName,
      text,
      sentAt: Date.now(),
    });
  });

  socket.on('match:rejoin', (payload: { matchId?: string; guestId?: string }) => {
    const match = payload?.matchId ? getMatch(payload.matchId) : undefined;
    if (!match || !payload?.guestId) return;
    const color = colorOf(match, payload.guestId);
    if (!color) return;

    guestIdBySocket.set(socket.id, payload.guestId);
    match.players[color].socketId = socket.id;
    socket.join(match.id);

    const timer = match.forfeitTimers[color];
    if (timer) {
      clearTimeout(timer);
      delete match.forfeitTimers[color];
      io.to(match.id).emit('match:opponentReconnected', { color });
    }

    socket.emit('queue:matched', {
      matchId: match.id,
      color,
      opponent: {
        displayName: match.players[opponentColor(color)].displayName,
        avatarId: match.players[opponentColor(color)].avatarId,
      },
      fen: match.chess.fen(),
      // A live snapshot, not the possibly-stale anchor -- the clock kept
      // running the whole time this player was disconnected.
      clocks: liveClockRemaining(match),
      incrementMs: match.clock.incrementMs,
    });
  });

  socket.on('disconnect', () => {
    leaveQueue(socket.id);
    cancelRoomBySocketId(socket.id);
    clearChatRateLimit(socket.id);
    const guestId = guestIdBySocket.get(socket.id);
    guestIdBySocket.delete(socket.id);
    if (!guestId) return;

    // Find any live match this guest's now-dead socket was seated in and
    // start the forfeit clock -- the match itself stays alive so a rejoin
    // within the grace window can pick it back up (see match:rejoin above).
    for (const match of allMatches()) {
      const color = colorOf(match, guestId);
      if (!color || match.players[color].socketId !== socket.id) continue;

      io.to(match.id).emit('match:opponentDisconnected', { color });
      match.forfeitTimers[color] = setTimeout(() => {
        io.to(match.id).emit('match:ended', { result: { type: 'forfeit', winner: opponentColor(color) } });
        persistMatchResult(match, 'forfeit', opponentColor(color)).catch((err) =>
          console.error('match persistence failed', err),
        );
        endMatch(match.id);
      }, RECONNECT_GRACE_MS);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`RockStyle Chess server listening on :${PORT}`);
});
