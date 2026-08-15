export type SpinRewardType = 'chips' | 'gems' | 'xp';

export interface SpinPrizeSeed {
  id: string;
  label: string;
  rewardType: SpinRewardType;
  rewardAmount: number;
  weight: number;
}

// Mirrors src/lib/spinPrizes.ts on the client (used there for the wheel's
// segment order/colors -- the spin_prizes table has no sort-order column, so
// segment order is this array's index, not anything read from the DB).
// This copy doubles as the seed source for db/seedSpinPrizes.ts and is the
// authoritative reward table -- POST /me/spin picks weighted-random from the
// live DB rows (tunable without a redeploy), never a client-supplied prize.
//
// Amounts are scaled to sit sensibly against the rest of the economy (a
// 10,000,000 starting balance, 475,000 for a match win) -- the original mock
// wheel's "500 CHIPS"-style labels were ~1000x too small. The two "VIP DAY"
// segments from the mock are dropped (reward_type has no 'vip' value and
// wiring real VIP time is out of scope for this pass) and replaced with
// chips prizes. Keep the two files in sync if these change.
export const SPIN_PRIZE_SEED: SpinPrizeSeed[] = [
  { id: 'chips-500k', label: '500K CHIPS', rewardType: 'chips', rewardAmount: 500_000, weight: 25 },
  { id: 'gems-10', label: '10 GEMS', rewardType: 'gems', rewardAmount: 10, weight: 15 },
  { id: 'chips-400k', label: '400K CHIPS', rewardType: 'chips', rewardAmount: 400_000, weight: 20 },
  { id: 'chips-1m', label: '1M CHIPS', rewardType: 'chips', rewardAmount: 1_000_000, weight: 10 },
  { id: 'gems-5', label: '5 GEMS', rewardType: 'gems', rewardAmount: 5, weight: 20 },
  { id: 'chips-800k', label: '800K CHIPS', rewardType: 'chips', rewardAmount: 800_000, weight: 8 },
  { id: 'jackpot-gems-50', label: 'JACKPOT', rewardType: 'gems', rewardAmount: 50, weight: 2 },
  { id: 'chips-250k', label: '250K CHIPS', rewardType: 'chips', rewardAmount: 250_000, weight: 30 },
];
