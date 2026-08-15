export type MatchOutcome = 'win' | 'loss' | 'draw';

// Mirrors src/lib/matchRewards.ts on the client (used there for the
// result-placeholder.tsx count-up display). This copy is the authoritative
// one -- both persistMatchResult.ts (online matches) and POST
// /me/match-reward (bot/local matches) credit chips using these amounts,
// never a client-supplied number. Keep the two files in sync if these change.
export const MATCH_CHIP_REWARDS: Record<MatchOutcome, number> = {
  win: 475_000,
  loss: 0,
  draw: 50_000,
};
