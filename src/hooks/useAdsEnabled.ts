import { usePlayerProfile } from '@/hooks/usePlayerProfile';

// Whether interstitials may be shown to this player. Fails CLOSED while the
// profile is loading or errored, so a player who bought Remove Ads never sees
// a flash of ads at launch or after a flaky network call; guests (no account,
// so nothing to have bought) are always eligible.
export function useAdsEnabled(): boolean {
  const { status, profile } = usePlayerProfile();
  if (status === 'guest') return true;
  if (status === 'ready') return !profile?.adsRemoved;
  return false;
}
