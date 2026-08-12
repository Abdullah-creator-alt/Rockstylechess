import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyPill, ProgressBar, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const JACKPOT_CHEST_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAUXFgoTaepdAMeCYmtsgPHnX3y-lKR82biJGn5PpfQestixXAmX_nZPJ4ET2gc3rQtfCci_KY1WA3MfVNeeOOJL1G8tY1VHprKvDtwZlpwyzKMT0j7h0o9jxoJAFJqKkUoA56np0GC2N9i09CzAftjO-2EUTyFMCCPCPJ0wzL5uAcC3zVHATk67VeefPbG7-7Ot8Yv30WI-FZ5T8L65cxVbjt1TAKFCqcD9cYoNaPUWmI3AFmgIQNqyT2uVbpIpGMVZ1miBS-5Zlg';

type DayState = 'claimed' | 'current' | 'upcoming';

interface DayReward {
  day: number;
  state: DayState;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}

// Hardcoded "Day 4, streak active" sample state -- no real streak-tracking
// logic yet, per the brief.
const DAYS: DayReward[] = [
  { day: 1, state: 'claimed', icon: 'check-circle', label: '50 Coins' },
  { day: 2, state: 'claimed', icon: 'check-circle', label: '100 Coins' },
  { day: 3, state: 'claimed', icon: 'check-circle', label: '1 Gem' },
  { day: 4, state: 'current', icon: 'diamond-stone', label: '5 Gems' },
  { day: 5, state: 'upcoming', icon: 'poker-chip', label: '200 Coins' },
  { day: 6, state: 'upcoming', icon: 'gift', label: 'Gift Box' },
];

export default function DailyBonusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [claimed, setClaimed] = useState(false);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Daily Rewards</Text>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.streakHeading}>
          <Text style={styles.streakLabel}>Login Streak:</Text>
          <Text style={styles.streakValue}>4 Days</Text>
        </View>

        <View style={styles.grid}>
          {DAYS.map((reward) => (
            <DayCard key={reward.day} reward={reward} claimed={claimed} onClaim={() => setClaimed(true)} />
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
          <ProgressBar progress={4 / 7} />
          <View style={styles.jackpotFooterRow}>
            <Text style={styles.jackpotFooterLabel}>Day 4 Progress</Text>
            <Text style={styles.jackpotFooterDays}>3 Days Left</Text>
          </View>
        </RockCard>

        <Text style={styles.disclaimer}>
          Maintain your streak to increase your luck for the Day 7 jackpot. Miss a day, and the cycle
          resets to Day 1!
        </Text>
      </ScrollView>
    </View>
  );
}

function DayCard({
  reward,
  claimed,
  onClaim,
}: {
  reward: DayReward;
  claimed: boolean;
  onClaim: () => void;
}) {
  const isCurrent = reward.state === 'current';
  const isClaimedToday = isCurrent && claimed;

  return (
    <View
      style={[
        styles.dayCard,
        reward.state === 'claimed' && styles.dayCardClaimed,
        isCurrent && styles.dayCardCurrent,
        reward.state === 'upcoming' && styles.dayCardUpcoming,
      ]}
    >
      {isCurrent ? (
        <View style={styles.todayBadge}>
          <Text style={styles.todayBadgeText}>Today</Text>
        </View>
      ) : null}
      <Text style={[styles.dayLabel, reward.state === 'upcoming' && styles.dayLabelUpcoming]}>
        Day {reward.day}
      </Text>
      <MaterialCommunityIcons
        name={isClaimedToday ? 'check-circle' : reward.icon}
        size={isCurrent ? 30 : 24}
        color={
          reward.state === 'claimed'
            ? Colors.cyan
            : isCurrent
              ? Colors.cyan
              : Colors.chromeMid
        }
      />
      <Text style={[styles.dayReward, reward.state === 'upcoming' && styles.dayRewardUpcoming]}>
        {reward.label}
      </Text>
      {isCurrent ? (
        <Pressable
          style={styles.claimButton}
          disabled={isClaimedToday}
          hitSlop={{ top: 6, bottom: 10, left: 6, right: 6 }}
          onPress={() => {
            console.log('Claim Day 4 reward pressed');
            onClaim();
          }}
        >
          <Text style={styles.claimButtonText}>{isClaimedToday ? 'Claimed' : 'Claim'}</Text>
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
