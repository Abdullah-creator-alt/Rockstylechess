import './env.js';

import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';

import { allowedWebOrigins } from './allowedOrigins.js';
import { authRouter } from './auth.js';
import { socketAuth } from './authMiddleware.js';
import { auth } from './betterAuth.js';
import { allowChatMessage, clearChatRateLimit, sanitizeChatText } from './chat.js';
import { persistMatchResult } from './db/persistMatchResult.js';
import { cancelRoomBySocketId, createRoom, joinRoom } from './gameRoom.js';
import {
  allMatches,
  applyMove,
  colorOf,
  createMatch,
  endMatch,
  getMatch,
  opponentColor,
  type MatchState,
  type PieceColor,
} from './match.js';
import { joinQueue, leaveQueue, type QueuedPlayer, type VenueTier } from './matchmaking.js';

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

// Joins both sockets to the match's Socket.IO room and tells each color's
// socket who they're playing -- the one piece of "a pair just formed"
// logic shared by both pairing paths (tier queue and room code), so it
// isn't duplicated between queue:join and room:join below.
function notifyMatched(match: MatchState): void {
  io.sockets.sockets.get(match.players.w.socketId)?.join(match.id);
  io.sockets.sockets.get(match.players.b.socketId)?.join(match.id);

  for (const color of ['w', 'b'] as PieceColor[]) {
    const me = match.players[color];
    const opp = match.players[opponentColor(color)];
    io.to(me.socketId).emit('queue:matched', {
      matchId: match.id,
      color,
      opponent: { displayName: opp.displayName },
      fen: match.chess.fen(),
    });
  }
}

io.on('connection', (socket: Socket) => {
  socket.on('queue:join', (payload: { guestId?: string; displayName?: string; venueTier?: string }) => {
    if (!payload?.guestId || !isVenueTier(payload.venueTier)) return;
    guestIdBySocket.set(socket.id, payload.guestId);

    const player: QueuedPlayer = {
      socketId: socket.id,
      guestId: payload.guestId,
      userId: (socket.data.userId as string | undefined) ?? null,
      displayName: payload.displayName || 'PLAYER',
    };
    const opponent = joinQueue(payload.venueTier, player);
    if (!opponent) return; // now waiting in queue

    notifyMatched(createMatch(opponent, player));
  });

  socket.on('queue:leave', () => {
    leaveQueue(socket.id);
  });

  socket.on('room:create', (payload: { guestId?: string; displayName?: string }) => {
    if (!payload?.guestId) return;
    guestIdBySocket.set(socket.id, payload.guestId);

    const player: QueuedPlayer = {
      socketId: socket.id,
      guestId: payload.guestId,
      userId: (socket.data.userId as string | undefined) ?? null,
      displayName: payload.displayName || 'PLAYER',
    };
    socket.emit('room:created', { code: createRoom(player) });
  });

  socket.on('room:join', (payload: { guestId?: string; displayName?: string; code?: string }) => {
    if (!payload?.guestId || !payload?.code) return;
    guestIdBySocket.set(socket.id, payload.guestId);

    const player: QueuedPlayer = {
      socketId: socket.id,
      guestId: payload.guestId,
      userId: (socket.data.userId as string | undefined) ?? null,
      displayName: payload.displayName || 'PLAYER',
    };
    const result = joinRoom(payload.code, player);
    if (result.status !== 'ok') {
      socket.emit('room:error', { reason: result.status });
      return;
    }

    notifyMatched(createMatch(result.opponent, player));
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

    io.to(match.id).emit('move:applied', {
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion ?? 'q',
      fen: chess.fen(),
      turn: chess.turn(),
      isGameOver: chess.isGameOver(),
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
      opponent: { displayName: match.players[opponentColor(color)].displayName },
      fen: match.chess.fen(),
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
