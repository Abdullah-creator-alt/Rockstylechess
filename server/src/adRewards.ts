// Authoritative rewarded-ad rules -- placements, daily caps and reward sizes
// live ONLY here; the client (src/lib/ads/types.ts) just names the placements
// and shows whatever the server returns. Same pattern as questCatalog.ts.
//
// Sizing: kept well under one match win (MATCH_CHIP_REWARDS.win = 475) per ad,
// and a day's worth of free-chips ads (3 x 100 = 300) stays under a single win,
// so watching ads never out-earns actually playing. extra-spin and daily-double
// reward the *existing* spin/daily-bonus tables rather than a number here.
export type AdPlacement = 'free-chips' | 'extra-spin' | 'daily-double';

export interface AdPlacementRule {
  dailyCap: number;
  // Only 'free-chips' pays out directly; the others multiply/extend an
  // existing reward inside spin.ts / dailyBonus.ts.
  rewardChips: number;
}

export const AD_PLACEMENTS: Record<AdPlacement, AdPlacementRule> = {
  'free-chips': { dailyCap: 3, rewardChips: 100 },
  'extra-spin': { dailyCap: 1, rewardChips: 0 },
  'daily-double': { dailyCap: 1, rewardChips: 0 },
};

export function isAdPlacement(value: unknown): value is AdPlacement {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(AD_PLACEMENTS, value);
}

// A verified view stays redeemable for this long (SSV callbacks can lag the
// on-device "reward earned" event by a few seconds, never minutes).
export const AD_EVENT_TTL_MS = 10 * 60 * 1000;

// false (default): the test-ID phase -- the client's "ad finished" report is
// trusted, but still capped per user per UTC day. true: a reward is only
// redeemable against a row inserted by Google's signed SSV callback, so a
// modified client can't claim rewards without watching ads. Flip on in the
// server's env once real ad units + the SSV callback URL exist in AdMob.
export const ADS_REQUIRE_SSV = process.env.ADS_REQUIRE_SSV === 'true';
