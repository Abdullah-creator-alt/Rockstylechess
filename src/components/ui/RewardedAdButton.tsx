import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { RockButton, type RockButtonVariant } from '@/components/ui/RockButton';
import { Colors } from '@/constants/theme';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { redeemWithRetry } from '@/lib/ads/redeemWithRetry';

interface RewardedAdButtonProps {
  /** Idle label, e.g. "Watch ad · +100 chips". */
  label: string;
  /**
   * Redeems the reward with the server once the ad was watched. Must throw on
   * failure (the api.ts helpers do); 'ad-not-verified' is retried for you.
   */
  onEarned: () => Promise<void>;
  /** Redemptions left today for this placement; null = still loading. */
  remaining: number | null;
  variant?: RockButtonVariant;
  style?: StyleProp<ViewStyle>;
}

const ERROR_COPY: Record<string, string> = {
  'ad-daily-cap-reached': "You've used all of today's ad rewards. Come back tomorrow!",
  'ad-not-verified': "We couldn't confirm that the ad finished. Please try again.",
};

// A button that offers one rewarded-ad reward. All the ad plumbing (preload,
// guest handling, daily cap label, error copy) lives here so the screens that
// host it (shop vault, spin, daily bonus) only describe WHAT is rewarded.
// Built on RockButton, so it keeps the shared gradient/gloss/glow treatment and
// adds no layout dimensions of its own.
export function RewardedAdButton({ label, onEarned, remaining, variant = 'gold', style }: RewardedAdButtonProps) {
  const router = useRouter();
  const { ready, canEarn, show } = useRewardedAd();
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    if (busy) return;
    if (!canEarn) {
      router.push('/sign-in');
      return;
    }
    setBusy(true);
    try {
      const result = await show();
      if (result === 'unavailable') {
        Alert.alert('No ad available', 'Please try again in a moment.');
        return;
      }
      if (result !== 'earned') return; // closed early -- no reward, no message
      await redeemWithRetry(onEarned);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      Alert.alert('Reward not granted', ERROR_COPY[message] ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const capped = canEarn && remaining === 0;
  const text = !canEarn ? 'Sign in to earn' : capped ? 'Come back tomorrow' : !ready ? 'Loading ad…' : label;

  return (
    <RockButton
      label={text}
      loadingLabel="Working…"
      icon={<AppIcon name="play_circle" size={18} color={Colors.bgBase} />}
      variant={variant}
      loading={busy}
      disabled={canEarn && (capped || !ready || remaining === null)}
      onPress={handlePress}
      style={style}
    />
  );
}
