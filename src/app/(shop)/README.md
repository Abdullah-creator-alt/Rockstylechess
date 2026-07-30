# (shop) route group

Economy and customization destinations reachable from Home — spending the chips/gems
won during play, not part of the `(play)` match flow itself.

The parentheses make this a *route group* — Expo Router uses the folder to organize
files without adding `/shop` to the URL/deep-link path.

- `shop.tsx` — the Rock Shop, built from the `rock_shop_pro_stage_animated` Stitch
  mockup (chosen over the `rock_shop_gear_gold` variant — see chat history for why).
- `forge.tsx` — board/piece/avatar customization. No Stitch source; built from our
  own design system (RockCard, PlayerAvatar, locked-tile pattern from Pick-Rockstar).
