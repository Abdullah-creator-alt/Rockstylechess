// Ad unit IDs + frequency rules. Deliberately free of any import from
// react-native-google-mobile-ads so it is safe to import on web too.
//
// Unit IDs: in development, or whenever the EXPO_PUBLIC_ADMOB_* env var is
// unset, the caller's `testId` (the library's own TestIds) is used -- so until
// a real AdMob account exists every build serves Google's labelled "Test Ad"
// creatives. Swapping to real units later is only setting the two env vars
// (and the real *app* id in app.json's react-native-google-mobile-ads plugin
// entry); no code change.
export type AdUnitKind = 'interstitial' | 'rewarded';

export function resolveAdUnitId(kind: AdUnitKind, testId: string): string {
  if (__DEV__) return testId;
  const fromEnv =
    kind === 'interstitial'
      ? process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID
      : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID;
  return fromEnv && fromEnv.length > 0 ? fromEnv : testId;
}

// Interstitial pacing. The goal is "occasional, at a natural pause, never
// annoying" -- a player who just finished a game sees at most one ad every few
// games, and never in their first couple of games.
export const INTERSTITIAL_RULES = {
  // Minimum time between two interstitials, across both placements.
  minGapMs: 4 * 60 * 1000,
  // Result screen: show after every Nth completed match...
  matchesBetween: 3,
  // ...but never before the player has finished this many matches in total.
  matchesBeforeFirst: 2,
  // Puzzles: show after every Nth solved puzzle.
  puzzlesBetween: 5,
} as const;
