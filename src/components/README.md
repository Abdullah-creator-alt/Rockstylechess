# components/

Shared, reusable UI building blocks — not full screens.

- `ui/` — design-system primitives every screen pulls from `@/constants/theme`
  instead of hardcoding colors/fonts: `RockButton`, `RockCard`, `CurrencyPill`,
  `PlayerAvatar`, `SectionLabel`, `ProgressBar`, `BottomNav`, `ChessBoard`.
  Import from `@/components/ui`.
- `layout/` — headers, modal chrome (not built yet — `BottomNav` lives in
  `ui/` since it's a reusable primitive on its own, not page layout)
- `StockfishEngine.tsx` — headless, no themed visual surface, so it lives
  directly in `components/` rather than `ui/`. Hosts the Stockfish WASM
  engine (see `src/lib/stockfishProtocol.ts`) inside a hidden WebView for
  the two Stockfish-tier bots. Mounted by `(play)/match.tsx`.

## ChessBoard

Lives in `ui/` rather than a `chess/` folder — it's a self-contained primitive
used by both Match (interactive) and Front Row (static spectate). Omit
`onSquarePress` and it renders read-only.

Three things about it are easy to break:

- **Squares are laid out at an integer pixel size, not `flex: 1`.** Eight flex
  children of a fractional width round independently, so squares end up a pixel
  off their neighbours and the file boundaries drift down the board. The grid is
  floored to a whole number and sized to 8× that; leftover pixels go to the
  frame. The playfield sits in its own exactly-sized box so the drag ghost shares
  its coordinate space.
- **Piece art is vector, not raster.** `pieceSprites.ts` requires
  `assets/pieces/*.svg` (12 files, one per piece/color). An earlier raster
  pipeline (`scripts/extract-pieces.js`, cutting sprites from a photographed
  reference board) is what `assets/reference/README.md` documents and is no
  longer what's live — a first vector attempt off that same reference was
  rejected as too soft, but a second pass off cleaner source renders,
  autotraced with `vtracer` and corrected against `DESIGN.md`'s
  `pieceWhite*`/`pieceBlack*` tones, is what's actually in `assets/pieces/`
  now. `pieceSprites.ts` is hand-edited, not generated — safe to touch
  directly.
- **Square colours come from `BoardSquares` per rank**, not one flat pair. Both
  are measured off the reference; see the theme.

Pieces get their contact shadow from `ChessBoard`, not from the sprite — the
extractor can only strip baked shadows from the pale set, so drawing one shadow
for all twelve is what keeps the lighting uniform. It's two stacked ellipses (a
wide faint pool plus a tighter core) with the piece raised a few percent, which
is what reads as height; a single flat ellipse looks like a decal.
