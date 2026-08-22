// One-time authoring script: recolors the 12 classic piece SVGs
// (assets/pieces/{w,b}{k,q,r,b,n,p}.svg) toward each locked piece-set
// variant's accent color, mirroring src/constants/boardThemes.ts's
// deriveSquares() -- same mixHex blend primitive, same lower-ratio-for-
// white/higher-ratio-for-black split. Developer-run, not part of
// `expo start`/CI, like scripts/curate-puzzles.mjs. Output is committed as
// static SVGs -- ChessBoard/pieceSprites.ts never recolor at runtime.
//
// Usage (from repo root): node scripts/recolor-pieces.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PIECES_DIR = join(process.cwd(), 'assets', 'pieces');
const CODES = ['k', 'q', 'r', 'b', 'n', 'p'];

// Duplicated from src/constants/theme.ts's mixHex -- this is a standalone
// Node script with no TS loader configured in this repo (see the other
// scripts/*.mjs), so it can't import the .ts module directly. Keep this in
// lockstep with theme.ts's implementation if that ever changes.
function mixHex(hexA, hexB, ratio) {
  const a = hexA.replace('#', '');
  const b = hexB.replace('#', '');
  function mixChannel(offset) {
    const av = parseInt(a.substring(offset, offset + 2), 16);
    const bv = parseInt(b.substring(offset, offset + 2), 16);
    return Math.round(av + (bv - av) * ratio)
      .toString(16)
      .padStart(2, '0');
  }
  return `#${mixChannel(0)}${mixChannel(2)}${mixChannel(4)}`.toUpperCase();
}

// Transitional list: only variants without bespoke source art yet (see
// scripts/vectorize-pieces.mjs, and src/constants/pieceSets.ts's per-entry
// comments on which pipeline produced which variant). molten-gold,
// crimson-reaper, and neon-cyan are deliberately NOT here any more --
// molten-gold and crimson-reaper now have real vectorized geometry under
// their own assets/pieces/<id>/ directories and re-running this script must
// never overwrite either; neon-cyan was dropped as a poor thematic fit.
// graphite-tour is the only variant left on this pipeline -- swap it to
// scripts/vectorize-pieces.mjs too once bespoke source renders exist for
// it. Kept in literal sync with src/constants/pieceSets.ts's accentColor
// per variant -- this is a one-time authoring run, not a live import. If
// you tune an accent there, update it here too and rerun before committing.
// Ratios mirror deriveSquares' light/dark split (white set washed less,
// black set washed more) so each piece's baked Hi/Mid/Lo shading spread
// (vtraced into ~120-200 discrete flat fills per file) stays proportionally
// intact rather than compressing toward one flat hue.
const VARIANTS = [{ id: 'graphite-tour', accent: '#5C6069', whiteRatio: 0.15, blackRatio: 0.35 }]; // Colors.chromeDark

const FILL_PATTERN = /fill="(#[0-9A-Fa-f]{6})"/g;
const DEFS_CLOSE = '</defs>';

function recolorFile(sourcePath, accent, ratio) {
  const source = readFileSync(sourcePath, 'utf8');
  const defsEnd = source.indexOf(DEFS_CLOSE);
  if (defsEnd === -1) {
    throw new Error(`${sourcePath}: no </defs> found -- structure assumption broken, check manually`);
  }
  const splitAt = defsEnd + DEFS_CLOSE.length;
  // Untouched: <svg ...><defs>...</defs> -- the clip-path silhouette's
  // fill="#000000" lives here and is a clip mask, not a visible render color.
  const head = source.slice(0, splitAt);
  // Recolored: <g clip-path=...>...visible fills...</g></svg>
  const body = source.slice(splitAt);

  // Precompute old-hex -> new-hex for every distinct fill in the body, then
  // substitute in ONE linear regex pass keyed off that map -- not sequential
  // per-color replacement, which risks a replacement value coincidentally
  // matching a not-yet-processed original hex.
  const distinctHexes = new Set();
  for (const match of body.matchAll(FILL_PATTERN)) distinctHexes.add(match[1].toUpperCase());
  const remap = new Map();
  for (const hex of distinctHexes) remap.set(hex, mixHex(hex, accent, ratio));

  const recoloredBody = body.replace(FILL_PATTERN, (_whole, hex) => `fill="${remap.get(hex.toUpperCase())}"`);
  return head + recoloredBody;
}

for (const variant of VARIANTS) {
  const outDir = join(PIECES_DIR, variant.id);
  mkdirSync(outDir, { recursive: true });
  for (const color of ['w', 'b']) {
    const ratio = color === 'w' ? variant.whiteRatio : variant.blackRatio;
    for (const code of CODES) {
      const filename = `${color}${code}.svg`;
      const recolored = recolorFile(join(PIECES_DIR, filename), variant.accent, ratio);
      writeFileSync(join(outDir, filename), recolored, 'utf8');
    }
  }
  console.log(`Wrote 12 recolored SVGs to assets/pieces/${variant.id}/`);
}
