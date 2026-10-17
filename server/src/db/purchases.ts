import { eq, sql } from 'drizzle-orm';

import type { EntitlementProduct, IapPack } from '../iapCatalog.js';
import { db } from './client.js';
import { playerProfiles, purchases, userCosmetics } from './schema/index.js';

export type CreditPurchaseResult =
  | { status: 'ok'; chips: number; gems: number }
  | { status: 'already-processed'; chips: number; gems: number };

// providerTransactionId is the Play purchase token. The `purchases` table's
// existing unique() constraint on that column is the real idempotency guard
// (insert-with-conflict-guard, same idiom as cosmetics.ts's purchaseCosmetic
// -- not a prior SELECT) against a retried client call re-submitting the
// same already-credited purchase.
export async function creditVerifiedPurchase(
  userId: string,
  pack: IapPack,
  providerTransactionId: string,
): Promise<CreditPurchaseResult> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(purchases)
      .values({
        userId,
        packId: pack.id,
        currencyGranted: pack.currency,
        amountGranted: pack.amount,
        priceUsdCents: pack.priceUsdCents,
        provider: 'google_play',
        providerTransactionId,
        status: 'completed',
      })
      .onConflictDoNothing({ target: purchases.providerTransactionId })
      .returning({ id: purchases.id });

    if (inserted.length === 0) {
      const [current] = await tx
        .select({ chips: playerProfiles.chips, gems: playerProfiles.gems })
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, userId))
        .limit(1);
      return { status: 'already-processed', chips: current?.chips ?? 0, gems: current?.gems ?? 0 };
    }

    const [updated] = await tx
      .update(playerProfiles)
      .set({
        ...(pack.currency === 'gems'
          ? { gems: sql`${playerProfiles.gems} + ${pack.amount}` }
          : { chips: sql`${playerProfiles.chips} + ${pack.amount}` }),
        updatedAt: new Date(),
      })
      .where(eq(playerProfiles.userId, userId))
      .returning({ chips: playerProfiles.chips, gems: playerProfiles.gems });

    if (pack.bonusCosmeticId) {
      await tx.insert(userCosmetics).values({ userId, itemId: pack.bonusCosmeticId }).onConflictDoNothing();
    }

    return { status: 'ok', chips: updated.chips, gems: updated.gems };
  });
}

export type GrantEntitlementResult = { status: 'ok' | 'already-processed' } | { status: 'token-owned-by-other-user' };

// Records a verified Remove Ads purchase and flips player_profiles.ads_removed.
// Same insert-with-conflict-guard idempotency as creditVerifiedPurchase. A
// replay by the SAME user is fine (and re-asserts the flag, which is what makes
// "Restore purchase" work); a Play purchase token already recorded against a
// DIFFERENT account must never unlock this one.
export async function grantEntitlement(
  userId: string,
  product: EntitlementProduct,
  providerTransactionId: string,
): Promise<GrantEntitlementResult> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(purchases)
      .values({
        userId,
        packId: product.id,
        entitlement: product.entitlement,
        priceUsdCents: product.priceUsdCents,
        provider: 'google_play',
        providerTransactionId,
        status: 'completed',
      })
      .onConflictDoNothing({ target: purchases.providerTransactionId })
      .returning({ id: purchases.id });

    if (inserted.length === 0) {
      const [existing] = await tx
        .select({ userId: purchases.userId })
        .from(purchases)
        .where(eq(purchases.providerTransactionId, providerTransactionId))
        .limit(1);
      if (existing?.userId !== userId) return { status: 'token-owned-by-other-user' };
    }

    await tx
      .update(playerProfiles)
      .set({ adsRemoved: true, updatedAt: new Date() })
      .where(eq(playerProfiles.userId, userId));

    return { status: inserted.length === 0 ? 'already-processed' : 'ok' };
  });
}
