# (play) route group

Everything that happens once a player taps a "play" entry point on Home: choosing a
venue, matchmaking, the live match itself, and the game-mode galleries (bots,
tournaments). Grouped together since they're all reachable from Home's bento grid
and form one connected flow, distinct from `(auth)`'s onboarding sequence.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/play` to the URL/deep-link path.

- `setup.tsx` — venue ladder + venue detail hero, built from the deferred venue-ladder
  concept plus the existing Home hero-card pattern. Entry point for "Play Now"/"Iron
  Duel".
- `matchmaking.tsx` — searching-for-opponent screen, auto-advances to `match.tsx`.
- `match.tsx` — the chess board itself, built from `the_match_pro_stage_production_ready`.
  Reads `mode`/`difficulty` route params and passes them into `useChessGame`;
  mounts `StockfishEngine` when `difficulty` is one of the two Stockfish tiers.
- `result-placeholder.tsx` — stub destination for Resign until the real Win/Loss
  screen is built.
- `bots.tsx` — AI opponent gallery, built from `bots_pro_stage_animated`. Each
  bot has a fixed `difficulty` (`src/lib/botEngine.ts`'s `BotDifficulty`):
  Roadie Rick=easy (random), Valkyrie Riff/Old School Roy/Metal Head=medium
  (heuristic minimax), The Reaper=stockfish-lite (~1600 Elo), King Axl=
  stockfish-strong (~2200 Elo) — forwarded to `/match` as a route param.
- `tournaments.tsx` — built from `tournaments_pro_stage_animated`.
