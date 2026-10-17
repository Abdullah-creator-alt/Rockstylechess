# (rewards) route group

The daily-engagement layer: things a player checks in on regularly that aren't part
of a live match or the shop. Grouped together since they're all reachable from
Home's engagement section and share the same "claim something, watch a number go up"
shape, distinct from `(play)`'s match flow and `(shop)`'s spending screens.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/rewards` to the URL/deep-link path.

- `daily-bonus.tsx` — 7-day streak, built from `daily_bonus_pro_stage_animated`.
  When today's bonus is claimable a "Watch ad · claim x2" `RewardedAdButton` sits under
  the day grid (the server doubles the reward inside the claim transaction).
- `spin.tsx` — the real spinning prize wheel (`react-native-svg` segments +
  Reanimated rotation), built from `spin_the_45_pro_stage_animated`. After the free
  daily spin is used, a "Watch ad · 1 extra spin" `RewardedAdButton` appears under the
  main button (one extra per day, enforced server-side).
- `quests.tsx` — Daily/Weekly battle quests, built from `quests_pro_stage_animated`.
- `achievements.tsx` — Hall of Fame badge grid, built from `achievements_pro_stage_animated`.
- `collections.tsx` — (avatars are shown per class via `AvatarClassTabs`; owned = free Garage Band + `ownedCosmeticIds`) real inventory of owned boards/piece sets/avatars
  (originally built from `collections_pro_stage_animated`'s collectible-card
  concept, since replaced with the actual cosmetics system: `BOARD_THEMES`/
  `PIECE_SETS`/`AVATARS` filtered by `usePlayerProfile()`'s
  `ownedCosmeticIds`, tap-to-equip via `updateProfile`). Purchasing locked
  items still lives on `(shop)/forge.tsx` — this screen only shows what's
  already owned.
