# RockStyle Chess server

Realtime multiplayer backend: Express + Socket.IO + `chess.js` (the same
library the client uses, so move legality matches exactly), plus PostgreSQL
via Drizzle ORM for everything that outlives a single match (accounts,
elo/history, progression, social, economy). Live match state itself (the
in-progress `Chess` instance, the matchmaking queue) stays in process
memory -- no database, no Redis for that part. See
`/home/abdullah/.claude/plans/is-this-bot-good-greedy-toucan.md` (or the
repo's plan history) for the reasoning behind that: a single instance is
simpler and has fewer failure modes than a horizontally-scaled Socket.IO +
Redis-adapter setup, and isn't needed until real load actually demands it.
Swapping in `@socket.io/redis-adapter` later, once you run 2+ instances, is
an isolated change, not a rewrite.

## Database

PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) (`drizzle-orm` +
`drizzle-kit`, driver: `postgres`). Chosen over Prisma specifically because
it has no generated query-engine binary to download/link -- this drive's
exFAT filesystem already caused enough native-binary/symlink friction
elsewhere (see `bin-links=false` below) that a pure-TypeScript ORM avoids
repeating it. Schema lives in `src/db/schema/*.ts`, one file per domain
(`users`, `matches`, `economy`, `progression`, `social`), barrel-exported
from `schema/index.ts`.

**Auth is self-hosted here**, not Supabase (superseding the old
`(auth)/README.md` placeholder) -- bcrypt-hashed passwords in `users`,
JWT sessions issued by `POST /auth/signup` / `POST /auth/login`, verified
by `authMiddleware.ts` for both REST (`requireAuth`) and Socket.IO
connections (`socketAuth`, via `socket.handshake.auth.token`). A socket
with no/invalid token is still allowed to connect and play as a guest
(`src/lib/playerId.ts`'s persisted UUID on the client side) -- it just
never gets a trusted `socket.data.userId`, and match persistence below
requires *both* seats to have one.

**Match persistence is fire-and-forget**, per the project's async-vs-realtime
split: `db/persistMatchResult.ts` runs *after* the Socket.IO broadcast that
actually ends a match for both players, wrapped so a DB failure only logs
(`console.error`) and never blocks or crashes gameplay -- verified by
pointing `DATABASE_URL` at an unreachable host mid-match and confirming
checkmate still resolved normally client-side. (Every async Express route
handler is wrapped in `asyncHandler.ts` for the same reason on the REST
side -- an uncaught rejection there would otherwise crash the whole process,
taking every in-progress match down with it, not just that one request.)
Guest-involving matches (either seat missing a `userId`) simply aren't
persisted -- gameplay is identical, there's just nothing to save.

Migrations: schema changes go into `src/db/schema/*.ts`, then:

```bash
npx drizzle-kit generate   # writes a reviewable .sql file into drizzle/ (commit it)
npx drizzle-kit migrate    # applies pending migrations to $DATABASE_URL
```

(This drive's `bin-links=false` means `drizzle-kit` has no `.bin/` shim --
invoke it as `node node_modules/drizzle-kit/bin.cjs <command>` if `npx`
doesn't resolve it.)

Local dev has no Postgres/Docker installed by default on this machine; the
simplest path is provisioning one Postgres instance on Railway and pointing
both local dev and production at the same `DATABASE_URL` for now (see
`.env.example`) -- split a dedicated dev database later by provisioning a
second Railway Postgres and swapping the env var.

## Protocol

Client -> Server:
- `queue:join { guestId, displayName, venueTier }`
- `queue:leave`
- `move:make { matchId, from, to, promotion? }`
- `match:resign { matchId }`
- `match:rejoin { matchId, guestId }`
- `match:chat:send { matchId, text }`

Server -> Client:
- `queue:matched { matchId, color, opponent: { displayName }, fen }`
- `move:applied { from, to, promotion, fen, turn, isGameOver }`
- `move:rejected { reason }`
- `match:opponentDisconnected { color }`
- `match:opponentReconnected { color }`
- `match:ended { result }` -- resignation/forfeit only; checkmate/stalemate/
  draw are derived independently by both clients from the move itself
  (`move:applied`'s `isGameOver`), same as how the bot/local modes already
  detect game-over locally via chess.js.
- `match:chat:message { color, displayName, text, sentAt }`

In-match chat (`chat.ts`) is scoped to the two seated players -- `match:chat:send`
is only accepted from a socket that `colorOf` resolves as one of the match's
own seats, mirroring the same guestId-based trust check `move:make`/
`match:resign` already use. Messages are sanitized (trimmed, capped at 200
chars) and rate-limited per socket (8 messages / 10s sliding window), then
broadcast to the whole match room. Deliberately **not persisted** to
Postgres -- like the live match state itself, it's ephemeral realtime data,
not part of the async-vs-realtime split described above.

Every move is re-validated server-side via `chess.js` before being
broadcast -- this is the anti-cheat boundary. The client also validates
locally (for instant UI feedback), but the server never trusts that alone.

## Running locally

```bash
cd server
npm install
npm run dev        # tsx watch src/index.ts, listens on :4000 by default
```

Point the Expo app at it via `EXPO_PUBLIC_SERVER_URL=http://<your-lan-ip>:4000`
(see the root `.env`/`app.config` notes) when testing on a physical device
over Expo Go -- `localhost` from the phone's perspective is the phone itself,
not your dev machine.

This directory is on the same exFAT-formatted drive as the rest of the repo,
which doesn't support the symlinks `npm` normally creates for package
`bin/` entries -- hence `server/.npmrc`'s `bin-links=false`, same fix as the
repo root.

## Deploying to Railway

Railway supports deploying from a subdirectory of a monorepo:

1. New Railway project, pointed at this git repo.
2. Add a Railway Postgres plugin to the project; it provisions `DATABASE_URL`
   as a service variable automatically. Add `JWT_SECRET` yourself (a long
   random string).
3. Set the service's **root directory** to `server/`.
4. Build command: `npm run build` (compiles `src/` -> `dist/` via `tsc`).
5. Start command: `npm start` (runs `dist/index.js`).
6. Railway injects `PORT` automatically -- the server already reads
   `process.env.PORT`.
7. Run `npx drizzle-kit migrate` once against the Railway `DATABASE_URL`
   (from a local shell with that URL exported, or a Railway one-off run) to
   create the tables before the first real request hits `/auth/signup`.
8. Copy the generated public URL (`https://<app>.up.railway.app`) into the
   client's `EXPO_PUBLIC_SERVER_URL`, using `wss://` for the Socket.IO
   client (Railway terminates TLS at the edge).
