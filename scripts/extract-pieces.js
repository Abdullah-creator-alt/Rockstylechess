/* eslint-disable no-console */
/**
 * Cuts the 12 chess piece sprites out of a rendered board image.
 *
 *   node scripts/extract-pieces.js assets/reference/Board.jpeg --board 30,305,532,531
 *
 * Writes one RGBA PNG per piece into assets/pieces/ plus the static require()
 * map that ChessBoard imports.
 *
 * The keying, and why each step is there:
 *
 *  - Deleting every pixel near the square colour destroys the pale set, whose
 *    highlights ARE the square colour. So the fill runs inward from the cell
 *    border and only removes background *connected* to the edge; an interior
 *    highlight survives because nothing links it to the outside.
 *
 *  - The square colour is measured from patches at the four corners, not the
 *    whole border ring. A piece is nearly as wide as its cell and touches the
 *    edges, which drags a ring median well off the true value.
 *
 *  - Colour distance alone cannot separate a pale piece from a pale square, so
 *    cells can also use an edge barrier: the fill may not cross a strong
 *    luminance gradient. It costs accuracy on high-contrast cells, so it is one
 *    strategy among several rather than always on.
 *
 *  - Low-contrast cells come out of the fill fragmented, so the mask is closed
 *    (dilate then erode) before the blob step, or a shard would be kept and the
 *    rest of the piece thrown away.
 *
 *  - The blob kept is the one occupying the CENTRE of the cell, not the largest,
 *    which is what discards baked rank/file labels sitting in a corner.
 *
 *  - Candidate cells are ranked by separation measured on the RAW crop. Judging
 *    cells by their own extraction quality is self-defeating: a piece the fill
 *    ate leaves nothing behind and so scores a perfectly clean border.
 *
 *  - Results are gated on gross geometry (tall, centred). A half-eaten piece
 *    otherwise passes every intensity test while looking like a diagonal smear.
 *
 *  - Supersampling happens BEFORE keying. Keying a 66px cell can only produce a
 *    66px mask, so the silhouette comes out stair-stepped; resampling first puts
 *    the decision on smooth data and the alpha edge lands sub-pixel.
 *
 *  - Partly transparent edge pixels are recoloured from the nearest solid piece
 *    pixels. Keeping their literal colour paints square-tone into the outline,
 *    which is exactly what a halo is.
 *
 * Options:
 *   --board x,y,w,h   Playfield bounds in px (the 8x8 grid, no bezel).
 *   --out dir         Output directory. Default: assets/pieces
 *   --tolerance N     Base flood-fill colour tolerance. Default: 45
 *   --supersample N   Resample factor before keying. Default: 4
 *   --sharpen N       Unsharp amount on colour channels. Default: 0.75
 *   --shrink N        Erode the mask by N before rendering. Default: 0
 *   --force k=t:e[:s] Pin a piece's strategy, e.g. wq=45:16:1
 *   --only a,b        Extract only these keys (does not rewrite the map).
 *   --debug           Write every candidate to <out>/debug.
 */

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const ROOT = path.resolve(__dirname, '..');

// Row 0 = rank 8, col 0 = file a. Which squares are light is NOT assumed --
// generated board art often flips the parity.
const START_ROWS = {
  0: ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  1: ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  6: ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  7: ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
};
const PIECE_KEYS = ['bk', 'bq', 'br', 'bb', 'bn', 'bp', 'wk', 'wq', 'wr', 'wb', 'wn', 'wp'];

// A plausible extraction: a decent share of the cell, barely touching the
// border, tall, and centred on the file.
const MIN_COVERAGE = 0.08;
const MAX_COVERAGE = 0.55;
const MAX_BORDER = 0.35;
const MIN_SPAN = 0.55;
const MAX_CENTROID_OFFSET = 0.1;

function parseArgs(argv) {
  const o = {
    // shrink defaults off: decontaminating the full blend ring removes the
    // fringe without eroding geometry, which is the better trade -- shrinking
    // far enough to cut past that ring shaves thin details like coronet spikes.
    out: 'assets/pieces', tolerance: 45, supersample: 4, sharpen: 0.75, shrink: 0,
    bleed: 0, debug: false, board: null, keepLabels: false, skip: [], only: null, force: {},
  };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--debug') o.debug = true;
    else if (a === '--keep-labels') o.keepLabels = true;
    else if (a === '--board') o.board = argv[(i += 1)].split(',').map(Number);
    else if (a === '--out') o.out = argv[(i += 1)];
    else if (a === '--tolerance') o.tolerance = Number(argv[(i += 1)]);
    else if (a === '--supersample') o.supersample = Math.max(1, Number(argv[(i += 1)]));
    else if (a === '--sharpen') o.sharpen = Number(argv[(i += 1)]);
    else if (a === '--shrink') o.shrink = Math.max(0, Number(argv[(i += 1)]));
    else if (a === '--bleed') o.bleed = Number(argv[(i += 1)]);
    else if (a === '--skip') o.skip = argv[(i += 1)].split(',').map((s) => s.trim());
    else if (a === '--only') o.only = argv[(i += 1)].split(',').map((s) => s.trim());
    else if (a === '--force') {
      for (const part of argv[(i += 1)].split(',')) {
        const [key, spec] = part.split('=');
        const [t, e, s] = spec.split(':');
        o.force[key.trim()] = {
          tolerance: Number(t),
          edge: e === 'off' ? Infinity : Number(e),
          scale: s === undefined ? null : Math.max(1, Number(s)),
        };
      }
    } else rest.push(a);
  }
  o.image = rest[0];
  return o;
}

const reader = (img) => {
  const { width, height, data } = img.bitmap;
  return {
    width, height,
    at: (x, y) => { const i = (y * width + x) * 4; return [data[i], data[i + 1], data[i + 2]]; },
    lum: (x, y) => { const i = (y * width + x) * 4; return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; },
  };
};
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
const median = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

function blurPlane(src, w, h, radius) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let sum = 0, n = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          sum += src[ny * w + nx]; n += 1;
        }
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

/** Shrinks the mask by `radius`, pulling the silhouette inside its blend ring. */
function erodeMask(mask, w, h, radius) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let keep = 1;
      for (let dy = -radius; dy <= radius && keep; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx, ny = y + dy;
          // Outside the crop counts as solid, so a piece that legitimately runs
          // off the edge of its cell doesn't get shaved along that edge.
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (!mask[ny * w + nx]) { keep = 0; break; }
        }
      }
      out[y * w + x] = keep;
    }
  }
  return out;
}

function closeMask(mask, w, h, radius) {
  const morph = (src, want) => {
    const dst = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let hit = 0;
        for (let dy = -radius; dy <= radius && !hit; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            const nx = x + dx, ny = y + dy;
            // Outside the crop counts as background, so erosion doesn't chew in
            // where a piece legitimately touches an edge.
            const v = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : src[ny * w + nx];
            if (v === want) { hit = 1; break; }
          }
        }
        dst[y * w + x] = want === 1 ? hit : hit ? 0 : 1;
      }
    }
    return dst;
  };
  return morph(morph(mask, 1), 0);
}

/** Labels components and returns the one covering the middle of the cell. */
function centralBlob(mask, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const sizes = [];
  for (let start = 0; start < w * h; start += 1) {
    if (!mask[start] || label[start] !== -1) continue;
    const id = sizes.length;
    let size = 0;
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const idx = stack.pop();
      size += 1;
      const x = idx % w, y = (idx - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (!mask[n] || label[n] !== -1) continue;
        label[n] = id; stack.push(n);
      }
    }
    sizes.push(size);
  }
  const central = new Array(sizes.length).fill(0);
  for (let y = Math.round(h * 0.2); y < Math.round(h * 0.8); y += 1) {
    for (let x = Math.round(w * 0.2); x < Math.round(w * 0.8); x += 1) {
      const id = label[y * w + x];
      if (id >= 0) central[id] += 1;
    }
  }
  let keepId = -1, best = -1;
  central.forEach((score, id) => {
    if (score > best || (score === best && sizes[id] > (sizes[keepId] ?? 0))) { best = score; keepId = id; }
  });
  return { label, keepId };
}

/** Separation measured on the RAW crop -- centre tone vs corner tone. */
function cellSeparation(cell) {
  const { width: w, height: h } = cell.bitmap;
  const px = reader(cell);
  const patch = Math.max(3, Math.round(Math.min(w, h) * 0.14));
  const corners = [];
  for (const [x0, y0] of [[0, 0], [w - patch, 0], [0, h - patch], [w - patch, h - patch]]) {
    for (let dy = 0; dy < patch; dy += 1) for (let dx = 0; dx < patch; dx += 1) corners.push(px.lum(x0 + dx, y0 + dy));
  }
  const centre = [];
  for (let y = Math.round(h * 0.25); y < Math.round(h * 0.75); y += 1) {
    for (let x = Math.round(w * 0.25); x < Math.round(w * 0.75); x += 1) centre.push(px.lum(x, y));
  }
  return Math.abs(median(centre) - median(corners));
}

function keyCell(cell, tolerance, edgeThreshold, labelBoxes, scale, sharpen, shrink) {
  const { width: w, height: h } = cell.bitmap;
  const px = reader(cell);

  const patch = Math.max(3, Math.round(Math.min(w, h) * 0.14));
  const s = [[], [], []];
  for (const [x0, y0] of [[0, 0], [w - patch, 0], [0, h - patch], [w - patch, h - patch]]) {
    for (let dy = 0; dy < patch; dy += 1) {
      for (let dx = 0; dx < patch; dx += 1) {
        const c = px.at(x0 + dx, y0 + dy);
        s[0].push(c[0]); s[1].push(c[1]); s[2].push(c[2]);
      }
    }
  }
  const bg = [median(s[0]), median(s[1]), median(s[2])];
  const bgLum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];

  const lumPlane = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) lumPlane[y * w + x] = px.lum(x, y);
  const smooth = blurPlane(lumPlane, w, h, scale);
  const step = scale;
  const gradient = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const xa = smooth[y * w + Math.max(0, x - step)], xb = smooth[y * w + Math.min(w - 1, x + step)];
      const ya = smooth[Math.max(0, y - step) * w + x], yb = smooth[Math.min(h - 1, y + step) * w + x];
      gradient[y * w + x] = Math.abs(xb - xa) + Math.abs(yb - ya);
    }
  }

  // Near the border the barrier is suspended: the seam between two squares is
  // itself a strong edge and would stop the fill before it ever got started.
  const margin = Math.max(2, Math.round(Math.min(w, h) * 0.08));
  const inMargin = (x, y) => x < margin || y < margin || x >= w - margin || y >= h - margin;

  const isBg = new Uint8Array(w * h);
  const queue = [];
  const seed = (x, y) => {
    const i = y * w + x;
    if (isBg[i] || dist(px.at(x, y), bg) > tolerance) return;
    isBg[i] = 1; queue.push(i);
  };
  const consider = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (isBg[i] || dist(px.at(x, y), bg) > tolerance) return;
    if (gradient[i] > edgeThreshold && !inMargin(x, y)) return;
    isBg[i] = 1; queue.push(i);
  };
  for (let x = 0; x < w; x += 1) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y += 1) { seed(0, y); seed(w - 1, y); }
  while (queue.length) {
    const i = queue.pop();
    const x = i % w, y = (i - x) / w;
    consider(x + 1, y); consider(x - 1, y); consider(x, y + 1); consider(x, y - 1);
  }

  let mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) mask[i] = isBg[i] ? 0 : 1;

  // Baked coordinate text sits in known corners. Cleared before closing, since
  // closing would otherwise weld a nearby label onto the piece.
  for (const [fx0, fy0, fx1, fy1] of labelBoxes) {
    for (let y = Math.floor(fy0 * h); y < Math.min(Math.ceil(fy1 * h), h); y += 1) {
      for (let x = Math.floor(fx0 * w); x < Math.min(Math.ceil(fx1 * w), w); x += 1) mask[y * w + x] = 0;
    }
  }

  // Strip the baked contact shadow off pale pieces only. A white piece has
  // nothing legitimately darker than its square, so anything darker is shadow.
  // The mirror rule would shear the gold crowns off the dark set, which are far
  // brighter than the square they stand on.
  let sum = 0, n = 0;
  for (let i = 0; i < w * h; i += 1) if (mask[i]) { sum += lumPlane[i]; n += 1; }
  const pieceLum = n ? sum / n : bgLum;
  if (pieceLum - bgLum > 25) {
    for (let i = 0; i < w * h; i += 1) if (mask[i] && lumPlane[i] < bgLum - 10) mask[i] = 0;
  }

  mask = closeMask(mask, w, h, scale);

  // Tighten the cut. The outermost ring of the silhouette is always partly
  // square-coloured -- it is where the render blended piece into board -- so
  // pulling the boundary a hair inside removes that contaminated ring outright.
  // At 4x supersampling a shrink of 1 costs a quarter of a source pixel, which
  // is invisible, while the fringe it removes is not.
  if (shrink > 0) mask = erodeMask(mask, w, h, shrink);

  const { label, keepId } = centralBlob(mask, w, h);

  const sprite = new Jimp(w, h, 0x00000000);
  const out = sprite.bitmap.data;
  const inPiece = (x, y) => x >= 0 && y >= 0 && x < w && y < h && label[y * w + x] === keepId;

  // The alpha ramp is ONE supersampled pixel wide, not `scale` wide. A ramp as
  // wide as the supersample factor is a third of a source pixel of genuine
  // antialiasing smeared over three, which is what made the borders look soft
  // and badly cut. Colour sampling still reaches further, since it needs to find
  // solid piece pixels to copy from.
  const feather = 1;
  const sampleRadius = Math.max(2, scale);
  let count = 0, lumSum = 0, borderKept = 0, borderTotal = 0, minY = h, maxY = -1, sumX = 0;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x, i = idx * 4;
      const onBorder = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      if (onBorder) borderTotal += 1;
      const c = px.at(x, y);
      let alpha = 0;

      if (inPiece(x, y)) {
        alpha = 1; count += 1; lumSum += lumPlane[idx];
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        sumX += x;
      } else {
        let touches = false;
        for (let dy = -feather; dy <= feather && !touches; dy += 1) {
          for (let dx = -feather; dx <= feather; dx += 1) if (inPiece(x + dx, y + dy)) { touches = true; break; }
        }
        if (touches) alpha = Math.min(1, dist(c, bg) / Math.max(tolerance, 1));
      }

      if (alpha > 0) { out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; }
      out[i + 3] = Math.round(alpha * 255);
      if (onBorder && alpha > 0.5) borderKept += 1;
    }
  }

  // Decontaminate the whole blend ring, not just the translucent rim.
  //
  // Where the render met piece and board it wrote blended pixels, and that band
  // is roughly a source pixel wide -- which at 4x supersampling is four pixels,
  // most of them FULLY OPAQUE. Recolouring only the semi-transparent rim
  // therefore left a pale halo baked into the silhouette of any piece cut from a
  // light square once it was drawn on a dark one.
  //
  // So: everything within `contamination` of the boundary takes its colour from
  // the piece's interior instead. Geometry is untouched -- eroding the mask far
  // enough to cut past the blend ring would have shaved the queen's coronet
  // spikes, which are only a couple of source pixels wide to begin with.
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) solid[i] = label[i] === keepId ? 1 : 0;
  const contamination = Math.max(1, scale);
  const interior = erodeMask(solid, w, h, contamination);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x, i = idx * 4;
      if (out[i + 3] === 0 || interior[idx]) continue;

      // Widen the search until interior pixels are found: thin details such as
      // coronet spikes may have almost no interior of their own.
      let r = 0, g = 0, b = 0, k = 0;
      for (let radius = contamination; radius <= contamination * 3 && k === 0; radius += contamination) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || !interior[ny * w + nx]) continue;
            const c = px.at(nx, ny);
            r += c[0]; g += c[1]; b += c[2]; k += 1;
          }
        }
      }
      if (!k) continue;
      out[i] = Math.round(r / k); out[i + 1] = Math.round(g / k); out[i + 2] = Math.round(b / k);
    }
  }

  // Unsharp on colour only -- sharpening alpha would undo the antialiasing that
  // supersampling exists to produce.
  if (sharpen > 0) {
    const radius = Math.max(1, Math.round(scale / 2));
    const planes = [0, 1, 2].map((ch) => {
      const p = new Float32Array(w * h);
      for (let i = 0; i < w * h; i += 1) p[i] = out[i * 4 + ch];
      return blurPlane(p, w, h, radius);
    });
    for (let i = 0; i < w * h; i += 1) {
      const o = i * 4;
      if (out[o + 3] === 0) continue;
      for (let ch = 0; ch < 3; ch += 1) {
        const v = out[o + ch] + sharpen * (out[o + ch] - planes[ch][i]);
        out[o + ch] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
  }

  return {
    sprite,
    coverage: count / (w * h),
    borderOccupancy: borderTotal ? borderKept / borderTotal : 1,
    contrast: Math.abs((count ? lumSum / count : bgLum) - bgLum),
    verticalSpan: maxY >= minY ? (maxY - minY + 1) / h : 0,
    centroidOffset: count ? Math.abs(sumX / count - (w - 1) / 2) / w : 1,
  };
}

function strategies(base) {
  const tols = [...new Set([1, 0.7, 0.45, 0.28, 0.16, 0.08].map((f) => Math.max(2, Math.round(base * f))))];
  const edges = [Infinity, 46, 34, 24, 16];
  const out = [];
  for (const edge of edges) for (const tolerance of tols) out.push({ tolerance, edge });
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.image || !opts.board) {
    console.error('Usage: node scripts/extract-pieces.js <image> --board x,y,w,h');
    process.exit(1);
  }
  const img = await Jimp.read(path.resolve(ROOT, opts.image));
  const [bx, by, bw, bh] = opts.board;
  const cellW = bw / 8, cellH = bh / 8;
  console.log(`Loaded ${opts.image} (${img.bitmap.width}x${img.bitmap.height})`);
  console.log(`Playfield x=${bx} y=${by} w=${bw} h=${bh}; cell ${cellW.toFixed(1)}x${cellH.toFixed(1)}px`);

  const candidates = {};
  for (const [rowKey, pieces] of Object.entries(START_ROWS)) {
    const row = Number(rowKey);
    pieces.forEach((piece, col) => {
      const key = (piece === piece.toUpperCase() ? 'w' : 'b') + piece.toLowerCase();
      const x = Math.round(bx + col * cellW), y = Math.round(by + row * cellH);
      const w = Math.round(cellW), h = Math.round(cellH);
      if (x < 0 || y < 0 || x + w > img.bitmap.width || y + h > img.bitmap.height) return;
      (candidates[key] ??= []).push({ row, col, x, y, w, h });
    });
  }

  const outDir = path.resolve(ROOT, opts.out);
  fs.mkdirSync(outDir, { recursive: true });
  const debugDir = path.join(outDir, 'debug');
  if (opts.debug) fs.mkdirSync(debugDir, { recursive: true });

  const written = [], missing = [], skipped = [];
  const grid = strategies(opts.tolerance);

  for (const key of PIECE_KEYS) {
    if (opts.skip.includes(key) || (opts.only && !opts.only.includes(key))) { skipped.push(key); continue; }
    const cells = candidates[key] ?? [];
    if (!cells.length) { missing.push(key); continue; }

    const forced = opts.force[key];
    const pieceScale = forced?.scale ?? opts.supersample;
    const ranked = cells.map((cell) => {
      const raw = img.clone().crop(cell.x, cell.y, cell.w, cell.h);
      const separation = cellSeparation(raw);
      const crop = pieceScale > 1
        ? raw.clone().resize(cell.w * pieceScale, cell.h * pieceScale, Jimp.RESIZE_BICUBIC)
        : raw;
      return { cell, crop, separation };
    }).sort((a, b) => b.separation - a.separation);

    let best = null, fallback = null;
    for (const { cell, crop, separation } of ranked) {
      const labelBoxes = [];
      if (!opts.keepLabels) {
        if (cell.col === 0) labelBoxes.push([0, 0, 0.3, 0.3]);
        if (cell.row === 7) labelBoxes.push([0.72, 0.72, 1, 1]);
      }
      const list = forced ? [{ tolerance: forced.tolerance, edge: forced.edge }] : grid;

      for (const { tolerance, edge } of list) {
        const keyed = keyCell(crop, tolerance, edge, labelBoxes, pieceScale, opts.sharpen, opts.shrink);
        const edgeName = edge === Infinity ? 'off' : String(edge);
        if (opts.debug) {
          await keyed.sprite.writeAsync(path.join(debugDir, `${key}-r${cell.row}c${cell.col}-t${tolerance}-e${edgeName}.png`));
        }
        const ok = keyed.coverage >= MIN_COVERAGE && keyed.coverage <= MAX_COVERAGE
          && keyed.borderOccupancy <= MAX_BORDER
          && keyed.verticalSpan >= MIN_SPAN && keyed.centroidOffset <= MAX_CENTROID_OFFSET;
        const entry = { ...keyed, cell, tolerance, edge: edgeName, separation };
        const better = !best || keyed.borderOccupancy < best.borderOccupancy - 0.02
          || (Math.abs(keyed.borderOccupancy - best.borderOccupancy) <= 0.02 && tolerance > best.tolerance);
        if ((ok || forced) && better) best = entry;
        if (!fallback || keyed.borderOccupancy < fallback.borderOccupancy) fallback = entry;
      }
      if (best) break;
    }

    const chosen = best ?? { ...fallback, failed: true };
    const target = Math.round(cellW * opts.supersample);
    if (chosen.sprite.bitmap.width !== target) chosen.sprite.resize(target, target, Jimp.RESIZE_BICUBIC);
    await chosen.sprite.writeAsync(path.join(outDir, `${key}.png`));
    written.push({
      key, cell: chosen.cell, tolerance: chosen.tolerance, edge: chosen.edge,
      failed: Boolean(chosen.failed), separation: chosen.separation.toFixed(0),
      coverage: (chosen.coverage * 100).toFixed(1), border: (chosen.borderOccupancy * 100).toFixed(1),
      span: (chosen.verticalSpan * 100).toFixed(0),
    });
  }

  console.log('\nWrote sprites:');
  for (const r of written) {
    const flag = r.failed ? '  <-- nothing passed; inspect with --debug'
      : Number(r.separation) < 25 ? '  <-- same-tone square, low separation' : '';
    console.log(`  ${r.key}.png  r${r.cell.row}c${r.cell.col}  sep=${r.separation.padStart(3)}` +
      `  tol=${String(r.tolerance).padStart(2)} edge=${r.edge.padStart(3)}` +
      `  fill=${r.coverage.padStart(5)}%  border=${r.border.padStart(5)}%  span=${r.span.padStart(3)}%${flag}`);
  }
  if (missing.length) console.log(`\nNot in image: ${missing.join(', ')}`);
  if (skipped.length) console.log(`\nSkipped: ${skipped.join(', ')}`);

  const isDefaultOut = outDir === path.resolve(ROOT, 'assets/pieces');
  if (written.length && isDefaultOut && !opts.only) {
    const lines = written.map((r) => `  ${r.key}: require('../../../assets/pieces/${r.key}.png'),`);
    fs.writeFileSync(path.join(ROOT, 'src/components/ui/pieceSprites.ts'), `/**
 * GENERATED by scripts/extract-pieces.js -- do not edit by hand.
 * Run: node scripts/extract-pieces.js assets/reference/Board.jpeg --board 30,305,532,531
 */
import type { ImageSourcePropType } from 'react-native';

export const PIECE_SPRITES: Partial<Record<string, ImageSourcePropType>> = {
${lines.join('\n')}
};
`);
    console.log('\nRegenerated src/components/ui/pieceSprites.ts');
  } else if (written.length) {
    console.log(`\nSkipped regenerating pieceSprites.ts (${opts.only ? '--only is partial' : 'custom --out'})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
