import { ECONOMY } from '@/lib/economy.generated';

// Maps shop.tsx's pack ids to the Android product IDs created in Play
// Console -> Monetization -> Products -> In-app products. Mirrors (id-only,
// not price/amount) server/src/iapCatalog.ts, which is the actual source of
// truth the server credits against -- this side just needs to know which
// SKU to ask the store for. Keep both lists in sync by hand when either
// changes -- now both are generated from economy.config.json, so they cannot
// drift. SKU ids no longer embed an amount (chips_starter, not chips_starter_1000):
// the Play products must be created with exactly these ids.
export const IAP_PRODUCT_IDS: Record<string, string> = Object.fromEntries(
  [...ECONOMY.iap.chipPacks, ...ECONOMY.iap.gemPacks].map((p) => [p.id, p.androidProductId]),
);

export const ALL_IAP_ANDROID_PRODUCT_IDS = Object.values(IAP_PRODUCT_IDS);

export function androidProductIdForPack(packId: string): string | undefined {
  return IAP_PRODUCT_IDS[packId];
}

export function packIdForAndroidProductId(androidProductId: string): string | undefined {
  return Object.keys(IAP_PRODUCT_IDS).find((packId) => IAP_PRODUCT_IDS[packId] === androidProductId);
}

// One-time, NON-consumable "Remove Ads" -- kept out of IAP_PRODUCT_IDS above on
// purpose so nothing that lists/fetches the chip & gem packs (or finishes their
// transactions as consumable) can pick it up by accident. Mirrors
// server/src/iapCatalog.ts's ENTITLEMENT_PRODUCTS (display-only on this side).
export const REMOVE_ADS_PACK_ID = ECONOMY.iap.removeAds.id;
export const REMOVE_ADS_ANDROID_PRODUCT_ID = ECONOMY.iap.removeAds.androidProductId;
