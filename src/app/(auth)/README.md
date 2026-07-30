# (auth) route group

Screens a player sees before reaching the main app: welcome screen, login, sign up,
password reset, onboarding. Backed by Supabase Auth once that's wired up.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/auth` to the URL/deep-link path. Add screens here as plain
files (e.g. `login.tsx`), and a `_layout.tsx` (likely a `Stack`) once there's more
than one screen to sequence.

- `sign-up.tsx` — built from the `sign_up_pro_stage_production_ready` Stitch mockup.
