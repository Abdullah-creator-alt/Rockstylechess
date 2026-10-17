import { useEffect, useSyncExternalStore } from 'react';

import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { isRewardedReady, prepareRewarded, showRewarded, subscribeRewardedReady, type RewardedResult } from '@/lib/ads';

interface UseRewardedAdResult {
  // A signed-in player with a loaded ad -- the button can say "Watch ad".
  ready: boolean;
  // Guests have no account to credit, so rewarded ads are account-only.
  canEarn: boolean;
  // Resolves when the ad is closed. 'earned' means the player watched enough;
  // the CALLER must then redeem it with the server (the client's word is only
  // a hint, the server decides -- see server/src/db/adEvents.ts).
  show: () => Promise<RewardedResult>;
}

// Keeps one rewarded ad preloaded for the signed-in user while a screen that
// offers a rewarded placement is mounted.
export function useRewardedAd(): UseRewardedAdResult {
  const { status, profile } = usePlayerProfile();
  const userId = status === 'ready' ? (profile?.userId ?? null) : null;

  useEffect(() => {
    prepareRewarded(userId);
  }, [userId]);

  const ready = useSyncExternalStore(subscribeRewardedReady, isRewardedReady, () => false);

  return { ready: ready && userId !== null, canEarn: userId !== null, show: showRewarded };
}
