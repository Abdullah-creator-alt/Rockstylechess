import { recordInterstitialShown, shouldShowInterstitial } from './adFrequency';
import { showInterstitial } from './index';
import type { InterstitialPlacement } from './types';

// The one entry point screens use for interstitials. Always resolves, never
// throws: the caller navigates afterwards whether or not an ad was shown.
//   adsEnabled -- from useAdsEnabled() (false for a player who bought Remove Ads
//                 and while the profile is still loading)
export async function maybeShowInterstitial(
  placement: InterstitialPlacement,
  adsEnabled: boolean,
): Promise<boolean> {
  try {
    if (!adsEnabled) return false;
    if (!(await shouldShowInterstitial(placement))) return false;
    const shown = await showInterstitial(placement);
    if (shown) await recordInterstitialShown();
    return shown;
  } catch (err) {
    console.warn('[ads] interstitial failed', err);
    return false;
  }
}
