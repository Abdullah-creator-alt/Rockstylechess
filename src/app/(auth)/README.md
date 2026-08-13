# (auth) route group

Screens a player sees before reaching the main app: sign up, sign in, and
onboarding. Backed by a self-hosted account system on the companion
`server/` (bcrypt + JWT, see `server/src/auth.ts`) — not Supabase, which an
earlier version of this note planned for before that server existed.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/auth` to the URL/deep-link path.

- `sign-up.tsx` — built from the `sign_up_pro_stage_production_ready` Stitch mockup.
  Calls `POST /auth/signup`, stores the returned JWT (`src/lib/authStorage.ts`), then
  continues to `pick-rockstar.tsx`.
- `sign-in.tsx` — mirrors `sign-up.tsx` minus the confirm-password field, for
  returning players. Calls `POST /auth/login`, then goes straight to `/home`.
- `pick-rockstar.tsx` — stage name + avatar persona selection. Calls
  `PATCH /me/profile` with the choice, then continues to `welcome-reward.tsx`.
- `welcome-reward.tsx` — end of the onboarding sequence, hands off to `/home`.

Root entry routing (`src/app/index.tsx`) checks for a stored session token and
sends the player to `/home` directly if one exists, or here if not. Logging out
(Settings → Control Core) clears the token and the socket's trusted identity,
returning the player to `sign-up.tsx`.
