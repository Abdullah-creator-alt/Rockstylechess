/**
 * Board theme catalog for the chessboard's square colors + frame glow accent.
 *
 * Deliberately scoped to squares/glow only -- the frame/bezel/rivets stay
 * fixed chrome (the board's "hardware," not a skin) and gameplay-semantic
 * tints (last-move gold, selected cyan, check crimson) stay fixed too, since
 * those are functional UI signals used app-wide. Piece skins are a separate,
 * unbuilt concern (the current pieces are photographic sprites, not
 * recolorable art). See ChessBoard.tsx and (shop)/forge.tsx for consumers.
 *
 * Ids/names/locked/gemPrice mirror forge.tsx's original BOARD_OPTIONS mock.
 * `server/src/boardThemes.ts` mirrors the id/locked subset for server-side
 * equip validation -- keep the two in sync if themes are added/removed/
 * re-priced.
 */
import { BoardSquares, Colors, mixHex } from './theme';

export interface BoardTheme {
  id: string;
  name: string;
  locked: boolean;
  gemPrice?: number;
  chipPrice?: number;
  /** 8-element per-rank arrays, rank 8 (top) -> rank 1 (bottom). */
  squares: { light: readonly string[]; dark: readonly string[] };
  /** Accent for ChessBoard's GlowRing halo around the frame. */
  glowColor: string;
}

function deriveSquares(
  lightAccent: string,
  lightRatio: number,
  darkAccent: string,
  darkRatio: number,
): { light: readonly string[]; dark: readonly string[] } {
  return {
    light: BoardSquares.light.map((hex) => mixHex(hex, lightAccent, lightRatio)),
    dark: BoardSquares.dark.map((hex) => mixHex(hex, darkAccent, darkRatio)),
  };
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'classic-chrome',
    name: 'Classic Chrome',
    locked: false,
    // References the measured default directly (not a copy) so this entry
    // stays byte-for-byte identical to the board's original look.
    squares: BoardSquares,
    glowColor: Colors.cyan,
  },
  {
    id: 'crimson-stage',
    name: 'Crimson Stage',
    locked: false,
    squares: deriveSquares(Colors.crimson, 0.15, Colors.crimson, 0.35),
    glowColor: Colors.crimson,
  },
  {
    id: 'cyan-storm',
    name: 'Cyan Storm',
    locked: false,
    squares: deriveSquares(Colors.cyan, 0.15, Colors.cyan, 0.35),
    glowColor: Colors.cyan,
  },
  {
    id: 'gold-rush',
    name: 'Gold Rush',
    locked: true,
    gemPrice: 200,
    chipPrice: 4_000_000,
    squares: deriveSquares(Colors.gold, 0.15, Colors.gold, 0.35),
    glowColor: Colors.gold,
  },
  {
    id: 'obsidian-void',
    name: 'Obsidian Void',
    locked: true,
    gemPrice: 350,
    chipPrice: 7_000_000,
    squares: deriveSquares(Colors.chromeMid, 0.25, Colors.bgBase, 0.5),
    glowColor: Colors.chromeMid,
  },
];

export function getBoardTheme(id: string | null | undefined): BoardTheme {
  return BOARD_THEMES.find((theme) => theme.id === id) ?? BOARD_THEMES[0];
}
