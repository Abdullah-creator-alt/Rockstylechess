/**
 * Design tokens for RockStyle Chess.
 *
 * The whole app is a single fixed dark theme (no light mode) — a
 * rock-concert / casino-game aesthetic. Every screen and component should
 * pull colors and fonts from here instead of hardcoding hex values or font
 * names, so the look stays consistent across all ~25-30 screens.
 */

export const Colors = {
  // Accents
  ember: '#FF5A1F',
  emberLight: '#FF9248',
  gold: '#FFC23A',
  cyan: '#2FE6FF',
  crimson: '#E11D2A',

  // Chrome / metal neutrals
  chrome: '#F1F3F7',
  chromeMid: '#A6ACB8',
  chromeDark: '#5C6069',

  // Board surface — near-white light squares against slate dark squares, as in
  // the reference match screenshot (solid tones, not translucent chrome, so the
  // squares don't pick up whatever panel color happens to sit behind the board).
  boardLight: '#EDEFF2',
  boardLightShade: '#DCDFE5',
  boardDark: '#6B6F79',
  boardDarkShade: '#5A5E67',
  boardEdge: '#3A3D44',

  // Sculpted piece tones. Each piece is a gradient body (Hi -> Mid -> Lo,
  // lit from the top-left) plus a rim: gold trim on the black set, cool
  // chrome shading on the white set.
  pieceWhiteHi: '#FFFFFF',
  pieceWhiteMid: '#DEE2E8',
  pieceWhiteLo: '#98A0AC',
  pieceBlackHi: '#5B616C',
  pieceBlackMid: '#2C3037',
  pieceBlackLo: '#101216',

  // Text
  textPrimary: '#F5EFF1',
  textMuted: '#A294A0',

  // Backgrounds
  bgBase: '#0B0709',
  bgPanel: '#17101A',
} as const;

export type ColorToken = keyof typeof Colors;

/**
 * Font family keys map to the exact PostScript names registered by
 * useFonts() in the root layout. Anton only ships one weight; Oswald and
 * Inter can add more weights here as screens need them (e.g. a bold body
 * variant), without changing what callers import.
 */
export const Fonts = {
  display: 'Anton_400Regular',
  heading: 'Oswald_600SemiBold',
  body: 'Inter_400Regular',
} as const;

export type FontToken = keyof typeof Fonts;

/** Shared corner-radius scale so every panel/button/pill rounds consistently. */
export const Radius = {
  sm: 8,
  md: 14,
  lg: 15,
  full: 999,
} as const;

/** Shared spacing scale for padding/gaps across components. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/**
 * Derives an rgba() string from a theme hex color, for translucent
 * backgrounds, borders, and glows. Keeps every component still sourcing
 * its color from this file instead of hand-rolling new rgba literals.
 */
export function withOpacity(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
