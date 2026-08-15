import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyPill, ProgressBar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { claimDailyBonus, getDailyBonusStatus, type DailyBonusStatus } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';
import { DAILY_BONUS_REWARDS, type DailyBonusReward } from '@/lib/dailyBonusRewards';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const JACKPOT_CHEST_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAUXFgoTaepdAMeCYmtsgPHnX3y-lKR82biJGn5PpfQestixXAmX_nZPJ4ET2gc3rQtfCci_KY1WA3MfVNeeOOJL1G8tY1VHprKvDtwZlpwyzKMT0j7h0o9jxoJAFJqKkUoA56np0GC2N9i09CzAftjO-2EUTyFMCCPCPJ0wzL5uAcC3zVHATk67VeefPbG7-7Ot8Yv30WI-FZ5T8L65cxVbjt1TAKFCqcD9cYoNaPUWmI3AFmgIQNqyT2uVbpIpGMVZ1miBS-5Zlg';

type DayState = 'claimed' | 'current' | 'upcoming';

function dayState(day: number, cycleDay: number): DayState {
  if (day < cycleDay) return 'claimed';
  if (day === cycleDay) return 'current';
  return 'upcoming';
}

// Icon reflects what the day actually pays out -- a mixed chips+gems day
// (Gift Box) gets a gift icon, a pure-gems day gets the gem icon, everything
// else (including the old mock's always-diamond-stone "current day" icon,
// which was wrong whenever the current day's reward was chips) gets chips.
function rewardIcon(reward: DailyBonusReward): keyof typeof MaterialCommunityIcons.glyphMap {
  if (reward.chips > 0 && reward.gems > 0) return 'gift';
  if (reward.gems > 0) return 'diamond-stone';
  return 'poker-chip';
}

export default function DailyBonusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status: profileStatus, gems, refresh } = usePlayerProfile();
  const [bonusStatus, setBonusStatus] = useState<DailyBonusStatus | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (profileStatus !== 'ready') return;
    let cancelled = false;
    (async () => {
      const token = await getAuthToken();
      if (!token) return;
      try {
        const status = await getDailyBonusStatus(token);
        if (!cancelled) setBonusStatus(status);
      } catch (error) {
        console.log('Failed to load daily bonus status', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileStatus]);

  async function handleClaim() {
    if (!bonusStatus?.canClaimToday || claiming) return;
    setClaiming(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const result = await claimDailyBonus(token);
      setBonusStatus({ currentStreak: result.streak, canClaimToday: false, nextClaimDay: result.day });
      refresh();
    } catch (error) {
      console.log('Failed to claim daily bonus', error);
    } finally {
      setClaiming(false);
    }
  }

  const cycleDay = bonusStatus?.nextClaimDay ?? 1;
  const canClaimToday = bonusStatus?.canClaimToday ?? false;
  const streak = bonusStatus?.currentStreak ?? 0;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Daily Rewards</Text>
        <CurrencyPill type="gems" value={gems} />
      </View>

      {profileStatus === 'guest' ? (
        <View style={styles.guestWrap}>
          <Text style={styles.guestText}>Sign in to claim daily rewards.</Text>
          <RockButton label="Sign In" variant="primary" onPress={() => router.push('/sign-in')} />
        </View>
      ) : !bonusStatus ? (
        <ActivityIndicator color={Colors.cyan} style={styles.loadingSpinner} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.streakHeading}>
            <Text style={styles.streakLabel}>Login Streak:</Text>
            <Text style={styles.streakValue}>{streak} Days</Text>
          </View>

          <View style={styles.grid}>
            {DAILY_BONUS_REWARDS.slice(0, 6).map((reward) => (
              <DayCard
                key={reward.day}
                day={reward.day}
                label={reward.label}
                icon={rewardIcon(reward)}
                state={dayState(reward.day, cycleDay)}
                claimedToday={reward.day === cycleDay && !canClaimToday}
                onClaim={handleClaim}
              />
            ))}
          </View>

          <RockCard glowColor={Colors.emberLight} style={styles.jackpotCard}>
            <Text style={styles.jackpotLabel}>Day 7 — Grand Jackpot</Text>
            <Image
              source={{ uri: JACKPOT_CHEST_URI }}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={300}
              style={styles.jackpotImage}
            />
            <Text style={styles.jackpotTitle}>Mystery Loot Drop</Text>
            <Text style={styles.jackpotBody}>
              Unlock exclusive avatars, rare board themes, and huge gem bundles.
            </Text>
            <ProgressBar progress={Math.min(cycleDay, 7) / 7} />
            <View style={styles.jackpotFooterRow}>
              <Text style={styles.jackpotFooterLabel}>Day {Math.min(cycleDay, 7)} Progress</Text>
              <Text style={styles.jackpotFooterDays}>
                {cycleDay >= 7 ? 'Today!' : `${7 - cycleDay} Days Left`}
              </Text>
            </View>
            {cycleDay === 7 ? (
              <Pressable
                style={[styles.claimButton, styles.jackpotClaimButton]}
                disabled={!canClaimToday}
                hitSlop={{ top: 6, bottom: 10, left: 6, right: 6 }}
                onPress={handleClaim}
              >
                <Text style={styles.claimButtonText}>{canClaimToday ? 'Claim Jackpot' : 'Claimed'}</Text>
              </Pressable>
            ) : null}
          </RockCard>

          <Text style={styles.disclaimer}>
            Maintain your streak to increase your luck for the Day 7 jackpot. Miss a day, and the cycle
            resets to Day 1!
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

function DayCard({
  day,
  label,
  icon,
  state,
  claimedToday,
  onClaim,
}: {
  day: number;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  state: DayState;
  claimedToday: boolean;
  onClaim: () => void;
}) {
  const isCurrent = state === 'current';

  return (
    <View
      style={[
        styles.dayCard,
        state === 'claimed' && styles.dayCardClaimed,
        isCurrent && styles.dayCardCurrent,
        state === 'upcoming' && styles.dayCardUpcoming,
      ]}
    >
      {isCurrent ? (
        <View style={styles.todayBadge}>
          <Text style={styles.todayBadgeText}>Today</Text>
        </View>
      ) : null}
      <Text style={[styles.dayLabel, state === 'upcoming' && styles.dayLabelUpcoming]}>Day {day}</Text>
      <MaterialCommunityIcons
        name={state === 'claimed' || claimedToday ? 'check-circle' : icon}
        size={isCurrent ? 30 : 24}
        color={state === 'claimed' ? Colors.cyan : isCurrent ? Colors.cyan : Colors.chromeMid}
      />
      <Text style={[styles.dayReward, state === 'upcoming' && styles.dayRewardUpcoming]}>{label}</Text>
      {isCurrent ? (
        <Pressable
          style={styles.claimButton}
          disabled={claimedToday}
          hitSlop={{ top: 6, bottom: 10, left: 6, right: 6 }}
          onPress={onClaim}
        >
          <Text style={styles.claimButtonText}>{claimedToday ? 'Claimed' : 'Claim'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgPanel, 0.8),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  guestWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  guestText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  loadingSpinner: {
    marginTop: Spacing.xl * 2,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
    alignItems: 'center',
  },
  streakHeading: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  streakLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakValue: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.emberLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  dayCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: withOpacity(Colors.chrome, 0.08),
    backgroundColor: withOpacity(Colors.bgPanel, 0.6),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: Spacing.sm,
  },
  dayCardClaimed: {
    opacity: 0.6,
  },
  dayCardCurrent: {
    borderWidth: 2,
    borderColor: Colors.cyan,
    backgroundColor: withOpacity(Colors.bgPanel, 0.95),
    boxShadow: `0px 0px 20px ${withOpacity(Colors.cyan, 0.3)}`,
    position: 'relative',
    justifyContent: 'space-between',
  },
  dayCardUpcoming: {
    backgroundColor: withOpacity(Colors.bgPanel, 0.35),
  },
  todayBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.cyan,
    borderTopRightRadius: Radius.lg,
    borderBottomLeftRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    color: Colors.bgBase,
    textTransform: 'uppercase',
  },
  dayLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  dayLabelUpcoming: {
    opacity: 0.5,
  },
  dayReward: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  dayRewardUpcoming: {
    color: Colors.textMuted,
    opacity: 0.5,
  },
  claimButton: {
    width: '100%',
    paddingVertical: 5,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.gold,
  },
  claimButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.bgBase,
    textTransform: 'uppercase',
  },
  jackpotCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  jackpotLabel: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.emberLight,
    textTransform: 'uppercase',
  },
  jackpotImage: {
    width: 180,
    height: 180,
    marginVertical: Spacing.md,
  },
  jackpotTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  jackpotBody: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  jackpotFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.sm,
  },
  jackpotFooterLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  jackpotFooterDays: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.emberLight,
    textTransform: 'uppercase',
    fontStyle: 'italic',
  },
  jackpotClaimButton: {
    width: '100%',
    maxWidth: 220,
    marginTop: Spacing.lg,
  },
  disclaimer: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    opacity: 0.7,
    maxWidth: 320,
  },
});
