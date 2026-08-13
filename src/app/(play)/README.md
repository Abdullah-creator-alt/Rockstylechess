# (play) route group

Everything that happens once a player taps a "play" entry point on Home: choosing a
venue, matchmaking, the live match itself, and the game-mode galleries (bots,
tournaments). Grouped together since they're all reachable from Home's bento grid
and form one connected flow, distinct from `(auth)`'s onboarding sequence.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/play` to the URL/deep-link path.

- `setup.tsx` — venue ladder + venue detail hero, built from the deferred venue-ladder
  concept plus the existing Home hero-card pattern. Entry point for "Play Now"/"Iron
  Duel"; the selected venue's id is forwarded to `matchmaking.tsx` as `venueTier`.
- `matchmaking.tsx` — joins the companion `server/`'s real matchmaking queue over
  Socket.IO (`queue:join` with the venue tier, `queue:matched` to advance) — no
  longer simulated. Re-joins on every socket `connect` (including automatic
  reconnects) so a network blip while still queued doesn't strand the player.
  Leaving the screen emits `queue:leave`.
- `match.tsx` — the chess board itself, built from `the_match_pro_stage_production_ready`.
  Reads `mode`/`difficulty` route params (bot matches) or `mode=online` +
  `matchId`/`color`/`fen`/`opponentName` (real multiplayer, passed by
  `matchmaking.tsx` once the server pairs an opponent) and passes them into
  `useChessGame`, which routes online moves through `src/lib/socket.ts` instead
  of applying them locally. Mounts `StockfishEngine` when `difficulty` is one of
  the two Stockfish tiers.
- `result-placeholder.tsx` — stub destination for Resign until the real Win/Loss
  screen is built.
- `bots.tsx` — AI opponent gallery, built from `bots_pro_stage_animated`. Each
  bot has a fixed `difficulty` (`src/lib/botEngine.ts`'s `BotDifficulty`):
  Roadie Rick=easy (random), Valkyrie Riff/Old School Roy/Metal Head=medium
  (heuristic minimax), The Reaper=stockfish-lite (~1600 Elo), King Axl=
  stockfish-strong (~2200 Elo) — forwarded to `/match` as a route param.
- `tournaments.tsx` — built from `tournaments_pro_stage_animated`.
