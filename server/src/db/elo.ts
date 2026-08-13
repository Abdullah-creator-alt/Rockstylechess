// Standard Elo update, K=32 -- a common, unremarkable default (large enough
// that ratings move meaningfully after a handful of games, small enough
// they don't swing wildly on one result).
const K_FACTOR = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function updatedRating(rating: number, expected: number, actualScore: number): number {
  return Math.round(rating + K_FACTOR * (actualScore - expected));
}
