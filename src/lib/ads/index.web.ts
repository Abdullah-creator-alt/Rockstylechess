import type { InterstitialPlacement, RewardedResult } from './types';

// Web stub -- AdMob has no web SDK and react-native-google-mobile-ads cannot
// be bundled for web. Metro resolves this file instead of index.ts on the web
// platform, so the native module never enters the web bundle. Keep the
// exports identical to index.ts.

export type { InterstitialPlacement, RewardedPlacement, RewardedResult } from './types';

export async function initAds(): Promise<void> {}
export function isPrivacyOptionsRequired(): boolean {
  return false;
}
export async function openPrivacyOptions(): Promise<void> {}
export function showInterstitial(_placement: InterstitialPlacement): Promise<boolean> {
  return Promise.resolve(false);
}
export function subscribeRewardedReady(_listener: () => void): () => void {
  return () => {};
}
export function isRewardedReady(): boolean {
  return false;
}
export function prepareRewarded(_userId: string | null): void {}
export function showRewarded(): Promise<RewardedResult> {
  return Promise.resolve('unavailable');
}
