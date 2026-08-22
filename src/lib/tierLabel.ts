// Purely cosmetic -- no "tier"/"season" concept exists anywhere in the
// schema/backend. Maps rating to a flavor label so a player's header
// keeps its stage-name feel without inventing a fake season number.
export function tierLabel(rating: number): string {
  if (rating >= 2200) return 'GRANDMASTER STAGE';
  if (rating >= 1800) return 'MASTER STAGE';
  if (rating >= 1400) return 'CHALLENGER STAGE';
  return 'ROOKIE STAGE';
}
