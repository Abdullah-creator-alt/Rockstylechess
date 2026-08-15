export type MatchOutcome = 'win' | 'loss' | 'draw';

// Mirrors server/src/db/persistMatchResult.ts's own copy (online matches are
// credited authoritatively there) and server/src/auth.ts's POST
// /me/match-reward (bot/local matches, which never reach the server
// otherwise). These are the same numbers result-placeholder.tsx already
// displayed as a purely decorative animation before this was wired up to a
// real balance. Keep in sync with the server if the amounts change.
export const MATCH_CHIP_REWARDS: Record<MatchOutcome, number> = {
  win: 475_000,
  loss: 0,
  draw: 50_000,
};
