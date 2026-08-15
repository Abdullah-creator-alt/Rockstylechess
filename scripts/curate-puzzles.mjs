// Curates a small, offline puzzle catalog from the Lichess puzzle database
// (database.lichess.org, CC0) for src/lib/puzzleCatalog.ts. One-time,
// developer-run step -- not part of `expo start`/CI.
//
// Usage (from repo root):
//   curl -L -o /tmp/lichess_db_puzzle.csv.zst https://database.lichess.org/lichess_db_puzzle.csv.zst
//   unzstd /tmp/lichess_db_puzzle.csv.zst
//   node scripts/curate-puzzles.mjs /tmp/lichess_db_puzzle.csv src/lib/puzzleCatalog.ts
//
// Lichess convention (see database.lichess.org/#puzzles): FEN is the
// position BEFORE the opponent's setup move; Moves[0] is that forced setup
// move, Moves[1], Moves[3], ... are the solver's moves, Moves[2], Moves[4],
// ... (if present) are scripted opponent replies in between. This script
// doesn't need to understand that alternation -- it just keeps `moves` as
// the full raw array so useChessGame.ts owns all of that logic in one place.

import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const [, , inputCsvPath, outputTsPath] = process.argv;
if (!inputCsvPath || !outputTsPath) {
  console.error('Usage: node scripts/curate-puzzles.mjs <input.csv> <output.ts>');
  process.exit(1);
}

// 4..8 raw moves -> exactly 2-4 solver moves per the alternation above --
// long enough to be a real puzzle, short enough for a mobile screen.
const MIN_MOVES = 4;
const MAX_MOVES = 8;
const MIN_NB_PLAYS = 200;
const MIN_POPULARITY = 50;
const BAND_SIZE = 200;
const BAND_START = 800;
const BAND_END = 2600; // exclusive upper bound; last band is 2400-2599
const PER_BAND = 28;

function parseCsvLine(line) {
  // Lichess's puzzle CSV fields (FEN, Moves, Themes, OpeningTags) use spaces
  // and underscores internally, never commas -- a plain split is safe here
  // (confirmed against the actual header + sample rows below).
  return line.split(',');
}

// Inserts `entry` into `bandArray` (kept sorted descending by nbPlays,
// capped at PER_BAND) in O(PER_BAND) time/space -- with ~6M input rows,
// collecting every qualifying candidate before sorting/slicing exhausted
// Node's default heap, so each band only ever holds its current top-N.
function insertIntoBand(bandArray, entry) {
  if (bandArray.length < PER_BAND) {
    bandArray.push(entry);
    bandArray.sort((a, b) => b.nbPlays - a.nbPlays || a.id.localeCompare(b.id));
    return;
  }
  const weakest = bandArray[bandArray.length - 1];
  if (entry.nbPlays <= weakest.nbPlays) return;
  bandArray[bandArray.length - 1] = entry;
  bandArray.sort((a, b) => b.nbPlays - a.nbPlays || a.id.localeCompare(b.id));
}

async function main() {
  const rl = createInterface({ input: createReadStream(inputCsvPath), crlfDelay: Infinity });

  let header = null;
  let col = {};
  /** @type {Map<number, Array<{id:string, fen:string, moves:string[], rating:number, themes:string[], nbPlays:number}>>} */
  const bands = new Map();
  let totalSeen = 0;
  let totalKept = 0;

  for await (const line of rl) {
    if (!header) {
      header = parseCsvLine(line);
      col = Object.fromEntries(header.map((name, i) => [name, i]));
      for (const required of ['PuzzleId', 'FEN', 'Moves', 'Rating', 'Popularity', 'NbPlays', 'Themes']) {
        if (!(required in col)) throw new Error(`Missing expected column "${required}" in CSV header`);
      }
      continue;
    }
    if (!line) continue;
    totalSeen += 1;

    const fields = parseCsvLine(line);
    const moves = fields[col.Moves].split(' ');
    if (moves.length < MIN_MOVES || moves.length > MAX_MOVES) continue;

    const rating = Number(fields[col.Rating]);
    const popularity = Number(fields[col.Popularity]);
    const nbPlays = Number(fields[col.NbPlays]);
    if (!Number.isFinite(rating) || rating < BAND_START || rating >= BAND_END) continue;
    if (nbPlays < MIN_NB_PLAYS || popularity < MIN_POPULARITY) continue;

    const bandIndex = Math.floor((rating - BAND_START) / BAND_SIZE);
    const entry = {
      id: fields[col.PuzzleId],
      fen: fields[col.FEN],
      moves,
      rating,
      themes: fields[col.Themes] ? fields[col.Themes].split(' ') : [],
      nbPlays,
    };
    if (!bands.has(bandIndex)) bands.set(bandIndex, []);
    insertIntoBand(bands.get(bandIndex), entry);
    totalKept += 1;
  }

  console.error(`Scanned ${totalSeen} rows, ${totalKept} passed length/quality filters.`);

  const curated = [];
  for (let bandIndex = 0; bandIndex < (BAND_END - BAND_START) / BAND_SIZE; bandIndex += 1) {
    const picked = bands.get(bandIndex) ?? [];
    const low = BAND_START + bandIndex * BAND_SIZE;
    console.error(`  ${low}-${low + BAND_SIZE - 1}: took ${picked.length}`);
    curated.push(...picked);
  }

  console.error(`Curated ${curated.length} puzzles total.`);

  const body = curated
    .map(
      (p) =>
        `  { id: ${JSON.stringify(p.id)}, fen: ${JSON.stringify(p.fen)}, moves: ${JSON.stringify(p.moves)}, rating: ${p.rating}, themes: ${JSON.stringify(p.themes)} },`,
    )
    .join('\n');

  const output = `// AUTO-GENERATED by scripts/curate-puzzles.mjs from the Lichess puzzle
// database (database.lichess.org, CC0-licensed) -- do not hand-edit.
// Regenerate with: node scripts/curate-puzzles.mjs <lichess_db_puzzle.csv> src/lib/puzzleCatalog.ts

export interface PuzzleEntry {
  id: string;
  /** Position BEFORE the opponent's forced setup move (Lichess convention). */
  fen: string;
  /**
   * Full raw UCI move list from Lichess. moves[0] is the opponent's forced
   * setup move (auto-play it); moves[1], moves[3], ... are the solver's
   * moves; moves[2], moves[4], ... (if present) are scripted opponent
   * replies in between. See useChessGame.ts's puzzle mode for how this is
   * consumed.
   */
  moves: string[];
  rating: number;
  themes: string[];
}

export const PUZZLES: PuzzleEntry[] = [
${body}
];
`;

  writeFileSync(outputTsPath, output);
  console.error(`Wrote ${outputTsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
