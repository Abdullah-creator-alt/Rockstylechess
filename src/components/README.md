# components/

Shared, reusable UI building blocks — not full screens.

- `ui/` — design-system primitives every screen pulls from `@/constants/theme`
  instead of hardcoding colors/fonts: `RockButton`, `RockCard`, `CurrencyPill`,
  `PlayerAvatar`, `SectionLabel`, `ProgressBar`, `BottomNav`. Import from
  `@/components/ui`.
- `chess/` — board, pieces, move list, clock (not built yet)
- `layout/` — headers, modal chrome (not built yet — `BottomNav` lives in
  `ui/` since it's a reusable primitive on its own, not page layout)
