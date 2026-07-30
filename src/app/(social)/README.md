# (social) route group

Everything about other players: rankings, identity, clubs, friends, messaging, and
spectating a live match. Grouped together since they're all reachable from each other
(mostly via Iron ID's social row) rather than from a single Home tile, distinct from
`(play)`'s own-match flow and `(rewards)`'s solo engagement loops.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/social` to the URL/deep-link path.

- `world-rankings.tsx` — Global/Friends/Venue/Country leaderboard with a podium and a
  pinned "you" row, built from `world_rankings_pro_stage_animated`. Real `BottomNav`
  destination for the "Ranks" tab.
- `iron-id.tsx` — the player's own profile: rating, stats, trophy case, match history,
  built from `iron_id_pro_stage_animated`. Real `BottomNav` destination for the
  "Profile" tab. Hosts the entry points into Bands/Friends/Messages/Front Row.
- `bands.tsx` — clubs hub (my band, browse/join, global top 5), built from
  `bands_pro_stage_animated`.
- `friends.tsx` — friends list with online/offline/in-game status and
  Challenge/Watch/Chat actions, built from `friends_pro_stage_animated`.
- `messages.tsx` — conversation list + chat view (one screen, two internal states),
  built from `messages_pro_stage_animated`.
- `front-row.tsx` — live spectate screen. Reuses the shared `ChessBoard` component
  (`src/components/ui/ChessBoard.tsx`, extracted out of `(play)/match.tsx`) for the
  board instead of the source's throwaway decorative grid, built from
  `front_row_pro_stage_animated`.
