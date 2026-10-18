import { ECONOMY } from '@/lib/economy.generated';

export interface DailyBonusReward {
  day: number; // 1-7
  chips: number;
  gems: number;
  label: string;
}

// Mirrors server/src/dailyBonusRewards.ts (the authoritative copy --
// POST /me/daily-bonus/claim grants these amounts server-side, never a
// client-supplied number). Used here purely for daily-bonus.tsx's day-card
// labels. Both read economy.config.json, so they cannot drift.
export const DAILY_BONUS_REWARDS: DailyBonusReward[] = ECONOMY.dailyBonus.map((d) => ({ ...d }));
