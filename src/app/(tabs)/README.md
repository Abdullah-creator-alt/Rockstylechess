# (tabs) route group

The main app shell a signed-in player lives in: Play/Lobby, Puzzles, Leaderboard,
Profile — whatever ends up on the bottom tab bar.

Add a `_layout.tsx` here with a real `Tabs` navigator once there's more than one
real tab screen — for now navigation between tabs is just our `BottomNav` UI
component (cosmetic, `console.log`s on press) since the other tabs don't exist
yet.

- `home.tsx` — the Lobby. Named `home` (not `index`) because the root
  `src/app/index.tsx` already owns the `/` route as the onboarding entry
  redirect; both can't claim `/`.
