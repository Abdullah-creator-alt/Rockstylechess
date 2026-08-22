// One-time authoring script: vectorizes a set of 12 hand-sourced piece
// renders (assets/pieces/<variant-id>/{w,b}{k,q,r,b,n,p}<anything>.png,
// RGBA with real alpha transparency) into the SVGs pieceSprites.ts actually
// ships (assets/pieces/<variant-id>/{code}.svg) -- this is how genuinely
// new piece GEOMETRY gets added (a different rendered/sourced chess set per
// variant), as opposed to scripts/recolor-pieces.mjs's hue-shift of the
// classic set's existing shapes.
//
// Uses @neplex/vectorizer (a Node-native binding to the same vtracer engine
// used for the classic set's own PNG -> SVG pass) so this whole pipeline
// stays in the repo's existing Node/TS toolchain -- no Python/Rust install
// needed to reproduce it for a future variant.
//
// Usage (from repo root): node scripts/vectorize-pieces.mjs <variant-id>
// Looks for assets/pieces/<variant-id>/{code}*.png (any suffix after the
// piece code, e.g. wk_gold.png) and writes assets/pieces/<variant-id>/{code}.svg
// alongside them (source PNGs are left in place, harmless extra files).
import { ColorMode, Hierarchical, optimizeSync, OptimizePreset, PathSimplifyMode, vectorizeSync } from '@neplex/vectorizer';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , variantId] = process.argv;
if (!variantId) {
  console.error('Usage: node scripts/vectorize-pieces.mjs <variant-id>');
  process.exit(1);
}

const CODES = ['wk', 'wq', 'wr', 'wb', 'wn', 'wp', 'bk', 'bq', 'br', 'bb', 'bn', 'bp'];
const VARIANT_DIR = join(process.cwd(), 'assets', 'pieces', variantId);

// Tuned against the molten-gold source renders (500x500, alpha-transparent
// background) -- traces the RGBA alpha boundary directly as the silhouette,
// no separate clip-mask pass needed (unlike the classic set's original
// pipeline, whose source renders had no real alpha channel to begin with).
//
// colorPrecision/layerDifference specifically: this went through two rounds
// of tuning, and the two params trade off against EACH OTHER, not just
// against file size:
//   1. vtracer's defaults (6/16) visibly posterized the smooth brushed-metal
//      gradient into 2-3 flat blotches per lobe -- looked cheap next to the
//      source render up close.
//   2. Raising to 8/6 fixed that, but produced ~2400 <path> elements per
//      piece (vs. ~190 for the original classic set's SVGs) -- the source
//      renders here have much richer surface-texture noise than classic's,
//      and vtracer traces that as genuine color detail. That's a real
//      *render-cost* problem (every path is a draw call; up to 32 pieces
//      on screen at once), not just a file-size one -- running this
//      through optimize() below only shrinks bytes (~66%), it does NOT
//      reduce path count at all, so it can't fix render lag by itself.
//   3. 7/12 here is the measured sweet spot: ~1700 paths (-30% vs step 2),
//      confirmed visually indistinguishable from step 2 even at 3x render
//      scale. Pushing further (e.g. 6/16, back near step 1) does cut paths
//      to ~1000-1050, but reintroduces visible banding at close zoom --
//      only worth it if 7/12 turns out not to be enough on real devices.
// Always spot-render+zoom-compare against the source PNG (not just eyeball
// the SVG alone, and not just check file size) before changing these.
const CONFIG = {
  colorMode: ColorMode.Color,
  hierarchical: Hierarchical.Stacked,
  filterSpeckle: 3,
  colorPrecision: 7,
  layerDifference: 12,
  mode: PathSimplifyMode.Spline,
  cornerThreshold: 70,
  lengthThreshold: 3.0,
  maxIterations: 10,
  spliceThreshold: 45,
  pathPrecision: 8,
};

const files = readdirSync(VARIANT_DIR);
for (const code of CODES) {
  const match = files.find((f) => f.startsWith(code) && f.toLowerCase().endsWith('.png'));
  if (!match) {
    throw new Error(`${VARIANT_DIR}: no source PNG found for piece code "${code}" (expected ${code}*.png)`);
  }
  const buf = readFileSync(join(VARIANT_DIR, match));
  const traced = vectorizeSync(buf, CONFIG);
  // Pure byte-size cleanup (precision/whitespace/redundancy) -- does NOT
  // change path count or appearance, only load size, since path count is
  // what actually drives render cost (see the CONFIG comment above).
  const svg = optimizeSync(traced, { preset: OptimizePreset.Default, multipass: true });
  writeFileSync(join(VARIANT_DIR, `${code}.svg`), svg, 'utf8');
  const pathCount = (svg.match(/<path/g) ?? []).length;
  console.log(`${match} -> ${code}.svg (${svg.length} bytes, ${pathCount} paths)`);
}
