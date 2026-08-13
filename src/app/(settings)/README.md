# (settings) route group

System/account screens: app settings, notifications, account security, and support.
Grouped together since they're all reachable from Control Core or Iron ID rather than
from a single Home tile, distinct from `(social)`'s other-player screens.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/settings` to the URL/deep-link path.

- `control-core.tsx` — audio toggles, game settings rows, account ID, logout, built
  from `control_core_pro_stage_animated`. Real entry point: a gear icon on Iron ID's
  header. Logout clears the stored JWT (`src/lib/authStorage.ts`) and the socket's
  trusted identity (`src/lib/socket.ts`'s `clearSocketAuth`), then returns to
  `sign-up.tsx`.
- `backstage-alerts.tsx` — notification feed with claim/view actions, built from
  `backstage_alerts_pro_stage_animated`. Reached from Control Core's Notifications row.
- `account-security.tsx` — linked accounts (Google/Facebook/Apple) + delete-account
  danger zone, built from `account_security_pro_stage_animated`. Reached from Control
  Core's Account row. Delete Account calls the real `DELETE /me` on the server
  (`src/lib/api.ts`), then clears local auth state the same way logout does. A
  guest (never signed in) has nothing server-side to delete, so it just navigates
  back.
- `roadie-support.tsx` — FAQ/Technical/Billing/Report support categories + contact
  action, built from `roadie_support_pro_stage_animated`. Reached from Control Core's
  Game section ("Help & Support" row).
