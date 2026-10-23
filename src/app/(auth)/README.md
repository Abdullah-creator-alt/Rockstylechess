# (auth) route group

Screens a player sees before reaching the main app: sign up, sign in, and
onboarding. Backed by **better-auth** on the companion `server/`
(`server/src/betterAuth.ts`, mounted at `/api/auth/*`), called through
`src/lib/authClient.ts`'s `signUpWithEmail` / `signInWithEmail`. The returned
session token is stored by `src/lib/authStorage.ts` and sent as a bearer token
on REST calls and in the socket handshake.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/auth` to the URL/deep-link path.

- `sign-in.tsx` — the auth-flow root: unauthenticated entry lands here. Sign-in
  form, a "Join the Stage" link that `replace`s to `sign-up.tsx`, and a
  **Continue as Guest** button (latches `lib/guestMode.ts` and drops into
  `/home` with the persisted guest identity). Successful sign-in goes straight
  to `/home`. The sign-in ↔ sign-up links use `router.replace` (swap in place),
  not `push` — pushing each other stacked history and looped.
  **"Forgot Password?" is not wired** (it only `console.log`s; the server has no
  password-reset flow yet — see `ROADMAP.md`).
- `sign-up.tsx` — built from the `sign_up_pro_stage_production_ready` Stitch mockup.
  Requires accepting the Privacy Policy / Terms (`src/constants/legal.ts`), calls
  `signUpWithEmail`, stores the session token (`src/lib/authStorage.ts`), then
  continues to `pick-rockstar.tsx`.
- `pick-rockstar.tsx` — stage name + avatar persona selection (class tabs; only free Garage Band avatars are selectable here, Main Stage / Hall of Fame show a "unlocks in The Forge" teaser). Calls
  `PATCH /me/profile` with the choice, then continues to `welcome-reward.tsx`.
- `welcome-reward.tsx` — end of the onboarding sequence, hands off to `/home`.

Root entry routing (`src/app/index.tsx`): `/home` if a stored session token
exists **or** the player previously chose Continue as Guest
(`lib/guestMode.ts`); otherwise `sign-in.tsx`. A stored token the server later
rejects is cleared by `usePlayerProfile` (401 → drop token, next launch shows
the gate). Logging out or deleting the account (Settings → Control Core /
Account Security) clears the token, the guest latch, and the socket's trusted
identity, returning the player to `sign-in.tsx`.
