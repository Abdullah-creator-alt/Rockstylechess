# RockStyle Chess

A mobile chess app built with Expo Router (SDK 54) + React Native, styled as a
"rockstar arena" experience. Chess itself, the five-tier bot ladder, and real
online multiplayer (with accounts, Elo, and match history) are fully wired up
end-to-end. Most of the surrounding meta-game — shop, social, daily
rewards — is still UI rendering mock data over Stitch-generated designs,
being wired up incrementally on top of the database schema that already
exists for it.

## Features

**Real / working**
- **Chess engine** — `chess.js` drives all legality, check/checkmate/
  stalemate/draw detection; the app only renders and dispatches moves.
- **Five-tier bot ladder** (`src/lib/botEngine.ts`) — a random-move easy bot,
  a from-scratch negamax/alpha-beta heuristic bot for medium (time-budgeted
  to stay responsive on React Native's single JS thread), and two Stockfish
  18 WASM tiers (lite ~1600 Elo / strong ~2200 Elo) run inside a hidden
  `react-native-webview` (`src/components/StockfishEngine.tsx`).
- **Local pass-and-play** and **bot matches**, fully client-side, no server
  required.
- **Real online multiplayer** — matchmaking by venue tier, live move sync,
  resign/forfeit, and reconnection within a grace window, via a companion
  Socket.IO server (`server/`). Every move is re-validated server-side with
  `chess.js` again before being broadcast — the client's own check is only
  for instant UI feedback, never trusted alone.
- **Self-hosted accounts** — email/password sign-up and sign-in, bcrypt +
  JWT sessions, wired end-to-end from the `(auth)` screens through the
  server.
- **Persistence** — PostgreSQL (via Drizzle ORM) stores accounts, player
  profiles, Elo ratings, and match history. Elo (K=32) and win/loss/streak
  stats update automatically after every online match between two
  authenticated players. Persistence writes happen *after* the realtime
  broadcast, fire-and-forget — a database hiccup degrades to "this result
  didn't save," never to blocked or broken gameplay.
- **Safe-area-aware layout** across every screen (notch/status bar, gesture
  bar, bottom nav all accounted for).

**UI-only / mock (not backed by real data yet)**
- Shop (chip/gem packs, VIP), Forge (cosmetics), Rewards (daily bonus,
  quests, achievements, spin wheel, collections), and Social (friends,
  bands, messages, world rankings, front-row spectate) all render hardcoded
  arrays today. Their Postgres tables already exist — see
  [Database](#database) — but no endpoints or screen wiring consume them
  yet; this is deliberately scoped as follow-up work, not an oversight.

## Tech stack

**Client**
- Expo SDK 54, Expo Router (file-based routing + route groups), React 19,
  React Native 0.81
- `chess.js` — chess rules engine
- `react-native-reanimated` / `react-native-gesture-handler` — board
  animation and drag/tap interaction
- `react-native-webview` — hosts the Stockfish WASM build for the two
  hard-mode bots
- `socket.io-client`, `expo-secure-store` (JWT), `@react-native-async-storage/async-storage`
  (persisted guest id for unauthenticated play)

**Server** (`server/` — a separate Node.js project with its own
`package.json`, deployed independently)
- Express + Socket.IO — realtime match and matchmaking layer
- PostgreSQL + Drizzle ORM (`drizzle-kit` for migrations)
- `bcryptjs` + `jsonwebtoken` — auth

## Project structure

```
src/
  app/                    Expo Router screens, grouped by feature
    (auth)/               sign-up, sign-in, onboarding
    (play)/                venue select, matchmaking, live match, bot & tournament galleries
    (rewards)/             daily bonus, quests, achievements, spin, collections     [mock]
    (settings)/             control core (incl. logout), notifications, account, support
    (shop)/                  chip/gem shop, cosmetics forge                          [mock]
    (social)/                 rankings, own profile, bands, friends, messages, spectate [mock]
    (tabs)/                    main lobby shell
    (modals)/                   reserved, currently empty
    index.tsx                    entry route: routes to /home or /sign-up based on stored session
  components/
    ui/                    design-system primitives (RockButton, RockCard, ChessBoard, ...)
    StockfishEngine.tsx    headless WebView-hosted Stockfish bridge
  hooks/useChessGame.ts    chess.js wrapper + bot/online move orchestration
  lib/                     bot engines, Stockfish protocol, socket client, auth/session storage
  constants/theme.ts       colors, fonts, spacing tokens
server/
  src/
    index.ts               Express + Socket.IO entry point
    match.ts / matchmaking.ts   in-memory live match & queue state
    auth.ts / authMiddleware.ts REST + Socket.IO JWT auth
    db/                     Drizzle client, schema (users/matches/economy/progression/social), Elo, match persistence
  drizzle/                  generated SQL migrations (committed)
```

Most directories have their own `README.md` with more detail on individual
files and design decisions (why a file exists, what Stitch mockup it came
from, what's still a stub) — check those first when working in a given
area. `server/README.md` in particular documents the full Socket.IO
protocol and the auth/persistence design.

## Setup

### Client

```bash
npm install
cp .env.example .env      # set EXPO_PUBLIC_SERVER_URL, see below
npx expo start
```

Open in Expo Go, or a dev build. `chess.js`, the bot ladder, and local
pass-and-play all work with no server running at all. Online multiplayer
and accounts need the server below; `EXPO_PUBLIC_SERVER_URL` should point
at it — your machine's LAN IP + port when developing against a physical
device (Expo Go can't resolve `localhost` to your dev machine), or the
deployed server's `wss://` URL otherwise.

### Server (multiplayer + database)

```bash
cd server
npm install
cp .env.example .env      # set DATABASE_URL + JWT_SECRET
npx drizzle-kit generate  # only needed after changing schema
npx drizzle-kit migrate   # apply pending migrations
npm run dev                # tsx watch src/index.ts, listens on :4000
```

Requires a reachable PostgreSQL instance (`DATABASE_URL`). See
`server/README.md` for the full protocol reference, why Drizzle over Prisma,
why auth is self-hosted rather than a third-party provider, and Railway
deployment steps.

## Architecture

- **Client chess state** — `useChessGame` (`src/hooks/useChessGame.ts`)
  wraps a single `chess.js` instance in React state. It never implements
  chess rules itself — it asks chess.js and mirrors the answer into a
  render-friendly snapshot. Its `mode` selects between `'bot'`, `'local'`,
  and `'online'`; online mode routes moves through the shared Socket.IO
  connection (`src/lib/socket.ts`) instead of applying them directly, and
  reconciles incoming opponent moves from the server.
- **Bots** — `src/lib/botEngine.ts` dispatches by difficulty to
  `randomBot.ts` (easy), `heuristicBot.ts` (medium — negamax with alpha-beta
  pruning and a hard wall-clock deadline so a complex position can't freeze
  the UI thread), or the Stockfish WebView bridge (`StockfishEngine.tsx` +
  `stockfishProtocol.ts`) for the two hard tiers.
- **Multiplayer server** — a single Socket.IO instance holds the
  matchmaking queue and live match state (`chess.js` instances) in process
  memory. Deliberately not Redis-backed: one instance is simpler and has
  fewer failure modes than a horizontally-scaled Socket.IO + Redis-adapter
  setup, and isn't needed until real load demands it (see
  `server/README.md`). Every move is authoritatively re-validated
  server-side before being broadcast to both players.
- **Auth** — self-hosted, not a third-party provider: bcrypt-hashed
  passwords and JWT sessions (`server/src/auth.ts`,
  `server/src/authMiddleware.ts`). Sockets carry the JWT in the connection
  handshake; a missing or invalid token doesn't reject the connection, it
  just means that seat plays as an anonymous guest (`src/lib/playerId.ts`'s
  persisted device UUID) — guest play works identically, it's just never
  persisted.
- **Persistence** — match results are written to Postgres *after* the
  realtime broadcast that actually ends the match, fire-and-forget, and
  only when both seats are authenticated accounts
  (`server/src/db/persistMatchResult.ts`). A DB failure is logged
  (`console.error`) and never blocks or crashes gameplay; every async
  Express route handler is similarly wrapped (`server/src/asyncHandler.ts`)
  so a database outage can't take the whole process down.

## Scripts

| Command | Where | What |
|---|---|---|
| `npx expo start` | root | Start the Expo dev server |
| `npm run lint` | root | ESLint |
| `npm run dev` | `server/` | Run the multiplayer server with hot reload |
| `npm run build` then `npm start` | `server/` | Compile and run the server for production |
| `npx drizzle-kit generate` | `server/` | Generate a SQL migration from schema changes |
| `npx drizzle-kit migrate` | `server/` | Apply pending migrations to `DATABASE_URL` |
