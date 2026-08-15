import { eq, sql } from 'drizzle-orm';

import { DAILY_BONUS_REWARDS } from '../dailyBonusRewards.js';
import { db } from './client.js';
import { dailyRewardClaims, playerProfiles } from './schema/index.js';

function utcDayDiff(from: Date, to: Date): number {
  const fromMidnight = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toMidnight = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((toMidnight - fromMidnight) / 86_400_000);
}

// Pure, read-only rule shared by the status preview and the actual claim so
// the two can never drift. UTC calendar-day comparison, deliberately not
// user-local-timezone-aware -- a mobile game's daily bonus doesn't need
// compliance-grade precision.
export function resolveDailyBonusClaim(
  lastClaimedAt: Date | null,
  currentStreak: number,
  now: Date,
): { canClaimToday: boolean; day: number; projectedStreak: number } {
  if (!lastClaimedAt) {
    return { canClaimToday: true, day: 1, projectedStreak: 1 };
  }
  const diff = utcDayDiff(lastClaimedAt, now);
  if (diff === 0) {
    return { canClaimToday: false, day: ((currentStreak - 1) % 7) + 1, projectedStreak: currentStreak };
  }
  // Exactly 1 day later continues the streak; any bigger gap resets it.
  const projectedStreak = diff === 1 ? currentStreak + 1 : 1;
  return { canClaimToday: true, day: ((projectedStreak - 1) % 7) + 1, projectedStreak };
}

export async function getDailyBonusStatus(userId: string) {
  const [existing] = await db.select().from(dailyRewardClaims).where(eq(dailyRewardClaims.userId, userId)).limit(1);
  const currentStreak = existing?.currentStreak ?? 0;
  const lastClaimedAt = existing?.lastClaimedAt ?? null;
  const { canClaimToday, day } = resolveDailyBonusClaim(lastClaimedAt, currentStreak, new Date());
  return { currentStreak, canClaimToday, nextClaimDay: day };
}

// No row lock here (no SELECT ... FOR UPDATE) -- a tiny double-claim window
// exists on near-simultaneous requests from the same user. Accepted, same
// tradeoff already made on POST /me/match-reward (chips/gems aren't
// redeemable for anything real anywhere in the app). The client disables its
// claim button for the in-flight request as the practical mitigation.
export async function claimDailyBonus(userId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(dailyRewardClaims)
      .where(eq(dailyRewardClaims.userId, userId))
      .limit(1);
    const currentStreak = existing?.currentStreak ?? 0;
    const lastClaimedAt = existing?.lastClaimedAt ?? null;
    const now = new Date();
    const { canClaimToday, day, projectedStreak } = resolveDailyBonusClaim(lastClaimedAt, currentStreak, now);

    if (!canClaimToday) {
      return { alreadyClaimed: true as const, day, streak: currentStreak };
    }

    const reward = DAILY_BONUS_REWARDS[day - 1];

    if (existing) {
      await tx
        .update(dailyRewardClaims)
        .set({ currentStreak: projectedStreak, lastClaimedAt: now })
        .where(eq(dailyRewardClaims.userId, userId));
    } else {
      await tx.insert(dailyRewardClaims).values({ userId, currentStreak: projectedStreak, lastClaimedAt: now });
    }

    const [profile] = await tx
      .update(playerProfiles)
      .set({
        chips: sql`${playerProfiles.chips} + ${reward.chips}`,
        gems: sql`${playerProfiles.gems} + ${reward.gems}`,
        updatedAt: now,
      })
      .where(eq(playerProfiles.userId, userId))
      .returning({ chips: playerProfiles.chips, gems: playerProfiles.gems });

    return {
      alreadyClaimed: false as const,
      day,
      streak: projectedStreak,
      chipsGranted: reward.chips,
      gemsGranted: reward.gems,
      chips: profile.chips,
      gems: profile.gems,
    };
  });
}
