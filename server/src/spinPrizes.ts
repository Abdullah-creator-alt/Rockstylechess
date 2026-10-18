import { ECONOMY } from './economy.generated.js';

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
// Amounts and weights live in economy.config.json (expected value about 151
// chips + 1.1 gems per spin, so a spin is a nice bonus, never a salary). The
// two "VIP DAY" segments from the mock are dropped (reward_type has no 'vip'
// value). Row ids keep their historical "-500k"/"-1m" suffixes (they are
// internal keys that other rows reference); only amounts/labels move.
export const SPIN_PRIZE_SEED: SpinPrizeSeed[] = ECONOMY.spin.map((p) => ({ ...p }));
