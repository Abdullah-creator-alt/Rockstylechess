import { and, eq, gte, sql } from 'drizzle-orm';

import { ANALYSIS_COST } from '../analysisCost.js';
import { db } from './client.js';
import { playerProfiles } from './schema/index.js';

export type ChargeCurrency = 'chips' | 'gems';

export type ChargeResult =
  | { status: 'ok'; currency: ChargeCurrency; price: number; chips: number; gems: number }
  | { status: 'insufficient-funds'; currency: ChargeCurrency; price: number; balance: number };

// Mirrors purchaseCosmetic's (cosmetics.ts) race-safe technique -- the
// conditional UPDATE ... WHERE balance >= price is itself the atomic guard
// against overspend, no separate SELECT-then-UPDATE race window. No
// transaction wrapper needed here (unlike purchaseCosmetic), since there's
// no second row (an "ownership"/idempotency insert) to keep atomic with
// the decrement -- Game Analysis charges every time it's used, it doesn't
// grant a persistent unlock record.
export async function chargeForAnalysis(userId: string, currency: ChargeCurrency): Promise<ChargeResult> {
  const price = ANALYSIS_COST[currency];
  const balanceColumn = currency === 'gems' ? playerProfiles.gems : playerProfiles.chips;

  const [debited] = await db
    .update(playerProfiles)
    .set({
      ...(currency === 'gems' ? { gems: sql`${playerProfiles.gems} - ${price}` } : { chips: sql`${playerProfiles.chips} - ${price}` }),
      updatedAt: new Date(),
    })
    .where(and(eq(playerProfiles.userId, userId), gte(balanceColumn, price)))
    .returning({ chips: playerProfiles.chips, gems: playerProfiles.gems });

  if (!debited) {
    const [current] = await db
      .select({ chips: playerProfiles.chips, gems: playerProfiles.gems })
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, userId))
      .limit(1);
    const balance = currency === 'gems' ? (current?.gems ?? 0) : (current?.chips ?? 0);
    return { status: 'insufficient-funds', currency, price, balance };
  }

  return { status: 'ok', currency, price, chips: debited.chips, gems: debited.gems };
}
