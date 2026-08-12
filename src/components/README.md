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
- **Piece art is generated, not hand-drawn.** `pieceSprites.ts` is written by
  `scripts/extract-pieces.js` — don't edit it. See `assets/reference/README.md`
  for how to regenerate and how to pick a replacement reference image. A vector
  set was tried and rejected: with a good source, the render's own pixels win.
- **Square colours come from `BoardSquares` per rank**, not one flat pair. Both
  are measured off the reference; see the theme.

Pieces get their contact shadow from `ChessBoard`, not from the sprite — the
extractor can only strip baked shadows from the pale set, so drawing one shadow
for all twelve is what keeps the lighting uniform. It's two stacked ellipses (a
wide faint pool plus a tighter core) with the piece raised a few percent, which
is what reads as height; a single flat ellipse looks like a decal.
