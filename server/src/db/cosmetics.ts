import { and, eq, gte, sql } from 'drizzle-orm';

import { db } from './client.js';
import { cosmeticItems, playerProfiles, userCosmetics } from './schema/index.js';

export type PurchaseCurrency = 'gems' | 'chips';

export type PurchaseCosmeticResult =
  | { status: 'not-found' }
  | { status: 'already-owned' }
  | { status: 'insufficient-funds'; currency: PurchaseCurrency; price: number; balance: number }
  | { status: 'ok'; currency: PurchaseCurrency; price: number; gems: number; chips: number };

function priceFor(item: { gemPrice: number; metadata: unknown }, currency: PurchaseCurrency): number {
  if (currency === 'gems') return item.gemPrice;
  const chipPrice = (item.metadata as { chipPrice?: number } | null)?.chipPrice;
  return chipPrice ?? 0;
}

// Unlike spin.ts/dailyBonus.ts's accepted no-row-lock grant race (a
// double-grant there is harmless since chips/gems aren't spendable
// elsewhere), this is a genuine spend and can't tolerate that tradeoff.
export async function purchaseCosmetic(
  userId: string,
  itemId: string,
  currency: PurchaseCurrency,
): Promise<PurchaseCosmeticResult> {
  const [item] = await db.select().from(cosmeticItems).where(eq(cosmeticItems.id, itemId)).limit(1);
  if (!item) return { status: 'not-found' };
  const price = priceFor(item, currency);

  try {
    return await db.transaction(async (tx) => {
      // Insert first, ON CONFLICT DO NOTHING: the (userId, itemId) primary
      // key is the real dedupe guard against a concurrent double-purchase
      // (including two requests for the same item in different
      // currencies), not a prior SELECT.
      const insertedRows = await tx
        .insert(userCosmetics)
        .values({ userId, itemId })
        .onConflictDoNothing()
        .returning({ userId: userCosmetics.userId });
      if (insertedRows.length === 0) {
        return { status: 'already-owned' as const };
      }

      const balanceColumn = currency === 'gems' ? playerProfiles.gems : playerProfiles.chips;
      const [debited] = await tx
        .update(playerProfiles)
        .set({
          ...(currency === 'gems'
            ? { gems: sql`${playerProfiles.gems} - ${price}` }
            : { chips: sql`${playerProfiles.chips} - ${price}` }),
          updatedAt: new Date(),
        })
        .where(and(eq(playerProfiles.userId, userId), gte(balanceColumn, price)))
        .returning({ gems: playerProfiles.gems, chips: playerProfiles.chips });

      if (!debited) {
        // Must throw, not `return` -- a plain return here would COMMIT the
        // transaction (Drizzle only rolls back on a thrown error), granting
        // the item for free while reporting failure. Caught just below.
        throw new Error('insufficient-funds');
      }

      return { status: 'ok' as const, currency, price, gems: debited.gems, chips: debited.chips };
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient-funds') {
      const [current] = await db
        .select({ gems: playerProfiles.gems, chips: playerProfiles.chips })
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, userId))
        .limit(1);
      const balance = currency === 'gems' ? (current?.gems ?? 0) : (current?.chips ?? 0);
      return { status: 'insufficient-funds', currency, price, balance };
    }
    throw error;
  }
}
