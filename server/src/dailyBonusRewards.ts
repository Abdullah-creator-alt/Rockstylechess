import { ECONOMY } from './economy.generated.js';

export interface DailyBonusReward {
  day: number; // 1-7
  chips: number;
  gems: number;
  label: string;
}

// Mirrors src/lib/dailyBonusRewards.ts on the client (used there for the
// daily-bonus.tsx day-card labels/count-up display). This copy is the
// authoritative one -- claimDailyBonus (db/dailyBonus.ts) grants these
// amounts, never a client-supplied number. A whole week (790 chips + 28 gems)
// stays about four online wins, so logging in never out-earns playing. The
// numbers live in economy.config.json.
export const DAILY_BONUS_REWARDS: DailyBonusReward[] = ECONOMY.dailyBonus.map((d) => ({ ...d }));
