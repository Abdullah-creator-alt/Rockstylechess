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
  Roadie Rick=easy (1-ply heuristic), Valkyrie Riff/Old School Roy=medium
  (heuristic minimax, iteratively deepened up to 3-ply), Metal Head=
  stockfish-basic (~1600 Elo), The Reaper=stockfish-lite (~2000 Elo), King
  Axl=stockfish-strong (~2800 Elo) — forwarded to `/match`
  as a route param.
- `tournaments.tsx` — built from `tournaments_pro_stage_animated`.
- `puzzles.tsx` — puzzle gallery, grouped by rating band into the same buckets
  `scripts/curate-puzzles.mjs` curated (`src/lib/puzzleCatalog.ts`, ~250 puzzles
  sourced from the Lichess CC0 puzzle database). Each entry forwards its `id` to
  `/puzzle-match` as `puzzleId`.
- `puzzle-match.tsx` — single-player puzzle solving, a dedicated screen rather
  than a `match.tsx` mode (no opponent identity/Resign/Draw/Chat concepts apply,
  and puzzle completion never reaches `match.tsx`'s `handleGameOver`/
  `result-placeholder.tsx` routing). Uses `useChessGame`'s `mode: 'puzzle'`,
  which auto-plays the puzzle's setup move, validates each solver move against
  the expected solution, and auto-plays any scripted opponent replies in
  between. Client-only — no server persistence of puzzle attempts yet.
