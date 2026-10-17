import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import { pauseMenuMusicForAd, resumeMenuMusicAfterAd } from '../backgroundMusic';
import { resolveAdUnitId } from './adsConfig';
import type { InterstitialPlacement, RewardedResult } from './types';

// The ONLY file that imports react-native-google-mobile-ads (index.web.ts is
// its web stub with the same exports -- Metro picks it for the web platform so
// the native module never enters the web bundle, same trick as
// src/hooks/useShopIAP.web.ts).
//
// Ads must never break or block the app: every SDK call is wrapped, `show*`
// resolves (never rejects) and returns "nothing shown" when no ad is loaded,
// and nothing here is awaited by the splash/font gate.

export type { InterstitialPlacement, RewardedPlacement, RewardedResult } from './types';

const RETRY_DELAY_MS = 30_000;
const MAX_LOAD_RETRIES = 5;

let sdkStarted = false;
let startPromise: Promise<void> | null = null;
let privacyOptionsRequired = false;

// ---------------------------------------------------------------- start-up --

async function startSdk(): Promise<void> {
  // requestInfoUpdate + show the UMP consent form if the player is in a region
  // that needs one (EEA/UK). A failure here must not stop ads: the UMP SDK
  // falls back to the previous session's consent status.
  try {
    await AdsConsent.gatherConsent();
  } catch (err) {
    console.warn('[ads] consent gathering failed', err);
  }

  const info = await AdsConsent.getConsentInfo();
  privacyOptionsRequired =
    info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  if (!info.canRequestAds) return; // consent not given/required yet -- no ad requests

  await mobileAds().setRequestConfiguration({
    // General audience (not child-directed), conservative content rating.
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
  await mobileAds().initialize();
  sdkStarted = true;
  loadInterstitial();
  loadRewarded();
}

// Idempotent: safe to call from the root layout on every mount.
export function initAds(): Promise<void> {
  if (!startPromise) {
    startPromise = startSdk().catch((err) => {
      console.warn('[ads] init failed', err);
      startPromise = null; // allow a later retry (e.g. after the privacy form)
    });
  }
  return startPromise;
}

export function isPrivacyOptionsRequired(): boolean {
  return privacyOptionsRequired;
}

// Re-opens the UMP privacy-options form (Settings -> Privacy & Ad Choices). If
// the player changes their mind and ads were not allowed before, start the SDK.
export async function openPrivacyOptions(): Promise<void> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
    if (!sdkStarted) {
      startPromise = null;
      await initAds();
    }
  } catch (err) {
    console.warn('[ads] privacy options form failed', err);
  }
}

// ------------------------------------------------------------ interstitial --

let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;
let interstitialLoading = false;
let interstitialRetries = 0;

function loadInterstitial(): void {
  if (!sdkStarted || interstitialLoading || interstitialLoaded) return;
  interstitialLoading = true;
  const ad = InterstitialAd.createForAdRequest(resolveAdUnitId('interstitial', TestIds.INTERSTITIAL));
  const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitial = ad;
    interstitialLoaded = true;
    interstitialLoading = false;
    interstitialRetries = 0;
    offLoaded();
    offError();
  });
  const offError = ad.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoading = false;
    offLoaded();
    offError();
    if (interstitialRetries < MAX_LOAD_RETRIES) {
      interstitialRetries += 1;
      setTimeout(loadInterstitial, RETRY_DELAY_MS);
    }
  });
  ad.load();
}

// Resolves true once a shown interstitial has been closed, false immediately if
// nothing was loaded (the caller then just carries on -- an ad never makes the
// player wait). `placement` is only accepted from the InterstitialPlacement
// whitelist in types.ts.
export function showInterstitial(_placement: InterstitialPlacement): Promise<boolean> {
  if (!sdkStarted || !interstitialLoaded || !interstitial) return Promise.resolve(false);
  const ad = interstitial;
  interstitial = null;
  interstitialLoaded = false;
  return new Promise<boolean>((resolve) => {
    const offs: (() => void)[] = [];
    let settled = false;
    const finish = (shown: boolean) => {
      if (settled) return;
      settled = true;
      offs.forEach((off) => off());
      resumeMenuMusicAfterAd();
      loadInterstitial();
      resolve(shown);
    };
    offs.push(ad.addAdEventListener(AdEventType.OPENED, pauseMenuMusicForAd));
    offs.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(true)));
    offs.push(ad.addAdEventListener(AdEventType.ERROR, () => finish(false)));
    ad.show().catch(() => finish(false));
  });
}

// ---------------------------------------------------------------- rewarded --

// One preloaded rewarded ad shared by every rewarded placement. It is created
// for a specific user because AdMob's server-side-verification options
// (userId) can only be set when the ad is *created*, not when it is shown; a
// different signed-in user (or sign-out) therefore throws the old one away.
let rewarded: RewardedAd | null = null;
let rewardedUserId: string | null = null;
let rewardedLoaded = false;
let rewardedLoading = false;
let rewardedRetries = 0;

const readyListeners = new Set<() => void>();
export function subscribeRewardedReady(listener: () => void): () => void {
  readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}
export function isRewardedReady(): boolean {
  return rewardedLoaded;
}
function setRewardedLoaded(value: boolean): void {
  if (rewardedLoaded === value) return;
  rewardedLoaded = value;
  readyListeners.forEach((l) => l());
}

function loadRewarded(): void {
  if (!sdkStarted || !rewardedUserId || rewardedLoading || rewardedLoaded) return;
  rewardedLoading = true;
  const forUser = rewardedUserId;
  const ad = RewardedAd.createForAdRequest(resolveAdUnitId('rewarded', TestIds.REWARDED), {
    serverSideVerificationOptions: { userId: forUser },
  });
  const offLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    offLoaded();
    offError();
    rewardedLoading = false;
    if (forUser !== rewardedUserId) return loadRewarded(); // user changed mid-load
    rewarded = ad;
    rewardedRetries = 0;
    setRewardedLoaded(true);
  });
  const offError = ad.addAdEventListener(AdEventType.ERROR, () => {
    offLoaded();
    offError();
    rewardedLoading = false;
    if (rewardedRetries < MAX_LOAD_RETRIES) {
      rewardedRetries += 1;
      setTimeout(loadRewarded, RETRY_DELAY_MS);
    }
  });
  ad.load();
}

// Call with the signed-in user's id (or null for a guest / signed-out player).
export function prepareRewarded(userId: string | null): void {
  if (userId === rewardedUserId) {
    loadRewarded();
    return;
  }
  rewardedUserId = userId;
  rewarded = null;
  setRewardedLoaded(false);
  loadRewarded();
}

export function showRewarded(): Promise<RewardedResult> {
  if (!sdkStarted || !rewardedLoaded || !rewarded) return Promise.resolve('unavailable');
  const ad = rewarded;
  rewarded = null;
  setRewardedLoaded(false);
  return new Promise<RewardedResult>((resolve) => {
    const offs: (() => void)[] = [];
    let settled = false;
    let earned = false;
    const finish = (result: RewardedResult) => {
      if (settled) return;
      settled = true;
      offs.forEach((off) => off());
      resumeMenuMusicAfterAd();
      loadRewarded();
      resolve(result);
    };
    offs.push(ad.addAdEventListener(AdEventType.OPENED, pauseMenuMusicForAd));
    offs.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => (earned = true)));
    offs.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? 'earned' : 'dismissed')));
    offs.push(ad.addAdEventListener(AdEventType.ERROR, () => finish('unavailable')));
    ad.show().catch(() => finish('unavailable'));
  });
}
