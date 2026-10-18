import { ECONOMY } from './economy.generated.js';

// Authoritative real-money pack catalog -- the client's shop.tsx display data
// (id/amount/badge/bonus copy) is display-only and must never be trusted for
// price or reward amount; this is the only source of truth the server credits
// against, matched to the Android product IDs created in Play Console ->
// Monetization -> Products -> In-app products (IDs must match EXACTLY).
//
// 'stadium-vault' (shop.tsx's free "Claim" pack) is deliberately absent --
// it's not a real-money product.
//
// bonusCosmeticId is null for every pack today: shop.tsx's "bonus-pack"
// previously advertised a bundled "Electric Legend" piece skin, but no such
// cosmetic exists in the pieceSets.ts/cosmeticItems catalog (no art asset
// behind it) -- rather than invent a fake cosmeticItems.id, the bonus claim
// was removed from the pack's display copy and this stays null until a real
// cosmetic is created, at which point set this to that cosmeticItems.id.
export interface IapPack {
  id: string;
  androidProductId: string;
  currency: 'chips' | 'gems';
  amount: number;
  priceUsdCents: number;
  bonusCosmeticId: string | null;
}

// Amounts, prices and product ids live in economy.config.json. Rule enforced by
// scripts/check-economy.mjs: no chip pack gives more chips per dollar than the
// gem packs give chip-equivalent (gems x 40), so chips are never the cheap way
// to buy what gems buy.
export const IAP_CATALOG: IapPack[] = [
  ...ECONOMY.iap.chipPacks.map((p) => ({ ...p, currency: 'chips' as const, bonusCosmeticId: null })),
  ...ECONOMY.iap.gemPacks.map((p) => ({ ...p, currency: 'gems' as const, bonusCosmeticId: null })),
];

const BY_ID = new Map(IAP_CATALOG.map((pack) => [pack.id, pack]));
const BY_ANDROID_PRODUCT_ID = new Map(IAP_CATALOG.map((pack) => [pack.androidProductId, pack]));

export function getPackById(packId: string): IapPack | undefined {
  return BY_ID.get(packId);
}

export function getPackByAndroidProductId(androidProductId: string): IapPack | undefined {
  return BY_ANDROID_PRODUCT_ID.get(androidProductId);
}

// One-time, NON-consumable purchases that unlock an account feature instead of
// granting currency. Kept apart from IAP_CATALOG so nothing that iterates the
// currency packs can mistake one for a pack. Must be created in Play Console
// as a one-time product with the exact id below. Mirrored (display-only) by
// src/constants/iapProducts.ts.
export interface EntitlementProduct {
  id: string;
  androidProductId: string;
  entitlement: 'adsRemoved';
  priceUsdCents: number;
}

export const ENTITLEMENT_PRODUCTS: EntitlementProduct[] = [
  { ...ECONOMY.iap.removeAds, entitlement: 'adsRemoved' },
];

export function getEntitlementProductById(id: string): EntitlementProduct | undefined {
  return ENTITLEMENT_PRODUCTS.find((p) => p.id === id);
}
