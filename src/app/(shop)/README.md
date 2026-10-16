# (shop) route group

Economy and customization destinations reachable from Home — spending the chips/gems
won during play, not part of the `(play)` match flow itself.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/shop` to the URL/deep-link path.

- `shop.tsx` — the Rock Shop, built from the `rock_shop_pro_stage_animated` Stitch
  mockup (chosen over the `rock_shop_gear_gold` variant — see chat history for why).
- `forge.tsx` — board/piece/avatar customization. The Avatars tab is split into
  three **classes** (`AvatarClassTabs`: Garage Band free, Main Stage gems-or-chips,
  Hall of Fame gems-only + a rating gate); tapping an unowned premium avatar opens
  `UnlockModal` (Hall of Fame hides the chips button and shows the rating
  requirement). The server is the real enforcement (see `server/README.md`). No Stitch source; built from our
  own design system (RockCard, PlayerAvatar, locked-tile pattern from Pick-Rockstar).
