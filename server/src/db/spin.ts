import { desc, eq, sql } from 'drizzle-orm';

import { db } from './client.js';
import { playerProfiles, spinPrizes, userSpinLog } from './schema/index.js';
import { utcDayDiff } from './utcDay.js';

export async function getSpinStatus(userId: string) {
  const [latest] = await db
    .select({ spunAt: userSpinLog.spunAt })
    .from(userSpinLog)
    .where(eq(userSpinLog.userId, userId))
    .orderBy(desc(userSpinLog.spunAt))
    .limit(1);
  const canSpin = !latest || utcDayDiff(latest.spunAt, new Date()) !== 0;
  return { canSpin };
}

function pickWeighted<T extends { weight: number }>(rows: T[]): T {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  let roll = Math.random() * total;
  for (const row of rows) {
    roll -= row.weight;
    if (roll < 0) return row;
  }
  return rows[rows.length - 1]; // float-rounding fallback
}

// No row lock (see dailyBonus.ts's claimDailyBonus for the same accepted
// tradeoff on the double-request race window).
export async function performSpin(userId: string) {
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select({ spunAt: userSpinLog.spunAt })
      .from(userSpinLog)
      .where(eq(userSpinLog.userId, userId))
      .orderBy(desc(userSpinLog.spunAt))
      .limit(1);
    const now = new Date();
    if (latest && utcDayDiff(latest.spunAt, now) === 0) {
      return { alreadySpun: true as const };
    }

    const prizes = await tx.select().from(spinPrizes);
    if (prizes.length === 0) {
      // Loud failure (surfaces as a 500 via asyncHandler) rather than a
      // silent no-op -- confirms `npm run seed:spin` hasn't been run yet.
      throw new Error('spin-prizes-not-seeded');
    }
    const prize = pickWeighted(prizes);

    await tx.insert(userSpinLog).values({ userId, prizeId: prize.id, spunAt: now });

    const increment =
      prize.rewardType === 'chips'
        ? { chips: sql`${playerProfiles.chips} + ${prize.rewardAmount}` }
        : prize.rewardType === 'gems'
          ? { gems: sql`${playerProfiles.gems} + ${prize.rewardAmount}` }
          : { xp: sql`${playerProfiles.xp} + ${prize.rewardAmount}` }; // defensive: no seed row uses 'xp' today

    const [profile] = await tx
      .update(playerProfiles)
      .set({ ...increment, updatedAt: now })
      .where(eq(playerProfiles.userId, userId))
      .returning({ chips: playerProfiles.chips, gems: playerProfiles.gems });

    return { alreadySpun: false as const, prize, chips: profile.chips, gems: profile.gems };
  });
}
