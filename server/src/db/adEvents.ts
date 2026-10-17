import { and, eq, gte, sql } from 'drizzle-orm';

import { AD_EVENT_TTL_MS, AD_PLACEMENTS, ADS_REQUIRE_SSV, type AdPlacement } from '../adRewards.js';
import { db } from './client.js';
import { adEvents } from './schema/index.js';
import { utcDayStart } from './utcDay.js';

// db or a transaction -- the redeem helpers run inside the caller's own
// transaction so a reward and the ad that paid for it commit (or roll back)
// together.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type RedeemOutcome = 'ok' | 'daily-cap-reached' | 'not-verified';

// Per-user, per-placement serialisation: a transaction-scoped advisory lock so
// two concurrent redeem requests can't both pass the cap check (the same
// "count then insert" race that dailyBonus.ts accepts for chips is NOT
// acceptable here, where the cap is the whole point).
async function lockUserPlacement(tx: Tx, userId: string, placement: AdPlacement): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`ad:${userId}:${placement}`}))`);
}

export async function countRedeemedToday(tx: Tx | typeof db, userId: string, placement: AdPlacement, now = new Date()) {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(adEvents)
    .where(and(eq(adEvents.userId, userId), eq(adEvents.placement, placement), gte(adEvents.redeemedAt, utcDayStart(now))));
  return row?.n ?? 0;
}

// Redeems ONE watched ad for `placement`. Call inside the transaction that
// applies the reward. Returns 'ok' only if the player is under the daily cap
// AND (in SSV mode) there is a verified, unredeemed view to spend.
export async function redeemAdReward(tx: Tx, userId: string, placement: AdPlacement, now = new Date()): Promise<RedeemOutcome> {
  await lockUserPlacement(tx, userId, placement);

  if ((await countRedeemedToday(tx, userId, placement, now)) >= AD_PLACEMENTS[placement].dailyCap) {
    return 'daily-cap-reached';
  }

  if (!ADS_REQUIRE_SSV) {
    await tx.insert(adEvents).values({ userId, source: 'client', placement, redeemedAt: now });
    return 'ok';
  }

  // (Dates go in as ISO strings with explicit casts: postgres-js can't bind a
  // raw Date inside a hand-written sql`` fragment, only through drizzle's typed columns.)
  // Oldest unredeemed, still-fresh verified view. SKIP LOCKED so a concurrent
  // redeem for another placement takes a different row instead of waiting.
  const claim = await tx.execute(sql`
    update ad_events set placement = ${placement}, redeemed_at = ${now.toISOString()}::timestamptz
    where id = (
      select id from ad_events
      where user_id = ${userId} and source = 'ssv' and redeemed_at is null
        and created_at > ${new Date(now.getTime() - AD_EVENT_TTL_MS).toISOString()}::timestamptz
      order by created_at asc
      limit 1
      for update skip locked
    )
    returning id
  `);
  return claim.length > 0 ? 'ok' : 'not-verified';
}

// Remaining redemptions today per placement, for the client's button states
// ("Watch ad" vs "Come back tomorrow") -- display only, redeemAdReward() is the
// real enforcement.
export async function getAdStatus(userId: string, now = new Date()) {
  const rows = await db
    .select({ placement: adEvents.placement, n: sql<number>`count(*)::int` })
    .from(adEvents)
    .where(and(eq(adEvents.userId, userId), gte(adEvents.redeemedAt, utcDayStart(now))))
    .groupBy(adEvents.placement);
  const used = new Map(rows.map((r) => [r.placement, r.n]));
  return Object.fromEntries(
    (Object.keys(AD_PLACEMENTS) as AdPlacement[]).map((placement) => [
      placement,
      { dailyCap: AD_PLACEMENTS[placement].dailyCap, remaining: Math.max(0, AD_PLACEMENTS[placement].dailyCap - (used.get(placement) ?? 0)) },
    ]),
  ) as Record<AdPlacement, { dailyCap: number; remaining: number }>;
}

// Called by the SSV callback (GET /ads/ssv) for a signature-verified view.
// Idempotent on Google's transaction id.
export async function recordVerifiedAdView(userId: string, transactionId: string): Promise<boolean> {
  const inserted = await db
    .insert(adEvents)
    .values({ userId, source: 'ssv', transactionId })
    .onConflictDoNothing({ target: adEvents.transactionId })
    .returning({ id: adEvents.id });
  return inserted.length > 0;
}

