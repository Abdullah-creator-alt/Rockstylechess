import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyPill, ProgressBar, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const FORGE_BACKGROUND_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAD29GW5HaLnJJMpVAFiDYO0n97AJZu2jr_jwgz-lzjuq4-qSGAWtK-ieChyRlsl5uPYvX_Hb2X2dsti0GgmkTnUVakYQqdlkbsGJcPWCWGzADOjgz9VxqbFKpO1jtytLgQyEw24MOvN0UUfdZq1UeTN1wOjy8jN0DVXG8n9JfHxrruJbJaTV8y_SXy4kxUG_R02NkePI39A6QokmX3RUBdUXs0e-xXHrofSIGjX9lUNmKjSxy4Ift-4u0LJL3vlX2ibl879lp9Qys';

interface Quest {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  claimed?: boolean;
}

const DAILY_QUESTS: Quest[] = [
  {
    id: 'blitz-wins',
    icon: 'timer-outline',
    accent: Colors.emberLight,
    title: 'Win 3 Blitz Games',
    description: 'Master the speed under the spotlights.',
    progress: 2,
    target: 3,
    reward: 500,
  },
  {
    id: 'captures',
    icon: 'sword-cross',
    accent: Colors.cyan,
    title: 'Capture 20 Pieces',
    description: 'No survivors on the board tonight.',
    progress: 12,
    target: 20,
    reward: 350,
  },
  {
    id: 'perfect-opening',
    icon: 'check-circle',
    accent: Colors.cyan,
    title: 'Perfect Opening',
    description: 'Play the Sicilian Defense once.',
    progress: 1,
    target: 1,
    reward: 0,
    claimed: true,
  },
  {
    id: 'enter-tournament',
    icon: 'trophy-outline',
    accent: Colors.gold,
    title: 'Enter 1 Tournament',
    description: 'The main stage awaits your presence.',
    progress: 0,
    target: 1,
    reward: 1000,
  },
];

type QuestTab = 'daily' | 'weekly';

export default function QuestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gems } = usePlayerProfile();
  const [activeTab, setActiveTab] = useState<QuestTab>('daily');

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: FORGE_BACKGROUND_URI }}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={styles.backgroundImage}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(Colors.bgBase, 0.5), Colors.bgBase]}
        style={styles.backgroundImage}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Battle Quests</Text>
        <CurrencyPill type="gems" value={gems} />
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, activeTab === 'daily' && styles.tabButtonActive]}
          onPress={() => setActiveTab('daily')}
        >
          <Text style={[styles.tabLabel, activeTab === 'daily' && styles.tabLabelActive]}>Daily</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'weekly' && styles.tabButtonActive]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabLabel, activeTab === 'weekly' && styles.tabLabelActive]}>Weekly</Text>
        </Pressable>
      </View>

      {activeTab === 'daily' ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {DAILY_QUESTS.map((quest) => (
            <QuestRow key={quest.id} quest={quest} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.weeklyLock}>
          <MaterialCommunityIcons name="lock" size={56} color={Colors.textMuted} />
          <Text style={styles.weeklyLockTitle}>Weekly Challenges</Text>
          <Text style={styles.weeklyLockBody}>
            Unlock higher tiers of rewards by reaching Level 10. The rock gods demand a stronger
            performance.
          </Text>
        </View>
      )}
    </View>
  );
}

function QuestRow({ quest }: { quest: Quest }) {
  const isComplete = quest.progress >= quest.target;

  return (
    <RockCard style={styles.questCard}>
      <View style={styles.questTopRow}>
        <View style={styles.questLeft}>
          <View style={[styles.questIconCircle, { borderColor: withOpacity(quest.accent, 0.4) }]}>
            <MaterialCommunityIcons name={quest.icon} size={26} color={quest.accent} />
          </View>
          <View style={styles.questTextCol}>
            <Text style={[styles.questTitle, quest.claimed && styles.questTitleClaimed]}>{quest.title}</Text>
            <Text style={styles.questDescription}>{quest.description}</Text>
          </View>
        </View>

        {quest.claimed ? (
          <Pressable style={styles.claimedButton} disabled hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.claimedButtonText}>Claimed</Text>
          </Pressable>
        ) : (
          <View style={styles.questRewardCol}>
            <Text style={styles.questRewardValue}>{quest.reward} Chips</Text>
            <Text style={styles.questRewardLabel}>Reward</Text>
          </View>
        )}
      </View>

      {!quest.claimed ? (
        <View style={styles.questProgressRow}>
          <Text style={styles.questProgressLabel}>Progress</Text>
          <Text style={styles.questProgressValue}>
            {quest.progress} / {quest.target}
          </Text>
        </View>
      ) : null}
      <ProgressBar progress={isComplete ? 1 : quest.progress / quest.target} />
    </RockCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: withOpacity(Colors.bgPanel, 0.7),
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.3),
    gap: 4,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: Colors.cyan,
    boxShadow: `0px 0px 15px ${withOpacity(Colors.cyan, 0.4)}`,
  },
  tabLabel: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: Colors.bgBase,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 60,
    gap: Spacing.md,
  },
  questCard: {
    gap: Spacing.md,
  },
  questTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  questLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  questIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
  },
  questTextCol: {
    flex: 1,
  },
  questTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  questTitleClaimed: {
    color: Colors.cyan,
    textDecorationLine: 'line-through',
  },
  questDescription: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  questRewardCol: {
    alignItems: 'flex-end',
  },
  questRewardValue: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.emberLight,
  },
  questRewardLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  claimedButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cyan,
  },
  claimedButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.bgBase,
    textTransform: 'uppercase',
  },
  questProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  questProgressLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questProgressValue: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.cyan,
  },
  weeklyLock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  weeklyLockTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  weeklyLockBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
