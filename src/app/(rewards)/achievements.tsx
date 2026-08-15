import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyPill, ProgressBar, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const BACKSTAGE_LOUNGE_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA8A7xjnP7lnpMEQHUkcpAMgYyoKFq4khkoHkNyfV7hdfpu333ZJUA23Mn0pvM7ztJUoETOtYGO8xPp6S-b4246-oru7EgVOjdWG2R7lcrLOCqDSulcZDGZ30dr6M3lwxFAxtYISfumAD5XSLA8TUI4sa8X_XFCA412pX0k8KYc19gbJdle6AddZg-z_w5q83DuVQvhSVb_IkvFZXHi5VcV0XdxpYHe1Ha1E9TepvZRd_cluMzqG0wnrFFoLyfdbGwED2O8XKPgzjE';

interface Badge {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  reward: string;
  unlocked: boolean;
  variant?: 'chrome' | 'gold';
}

const BADGES: Badge[] = [
  { id: 'blitz-king', icon: 'speedometer', title: 'Blitz King', reward: '+50 XP', unlocked: true, variant: 'chrome' },
  { id: 'first-blood', icon: 'medal', title: 'First Blood', reward: '100 Gems', unlocked: true, variant: 'gold' },
  { id: 'checkmate', icon: 'flag-checkered', title: 'Checkmate', reward: '+25 XP', unlocked: true, variant: 'chrome' },
  { id: 'grandmaster', icon: 'lock', title: 'Grandmaster', reward: '500 Gems', unlocked: false },
  { id: 'iron-wall', icon: 'lock', title: 'Iron Wall', reward: '+150 XP', unlocked: false },
  { id: 'tactician', icon: 'lock', title: 'Tactician', reward: '200 Gems', unlocked: false },
  { id: 'sharp-eye', icon: 'lock', title: 'Sharp Eye', reward: '+50 XP', unlocked: false },
  { id: 'vengeance', icon: 'lock', title: 'Vengeance', reward: '300 Gems', unlocked: false },
  { id: 'crowd-favorite', icon: 'lock', title: 'Crowd Favorite', reward: '+500 XP', unlocked: false },
];

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gems } = usePlayerProfile();

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: BACKSTAGE_LOUNGE_URI }}
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
        <Text style={styles.headerTitle}>Hall of Fame</Text>
        <CurrencyPill type="gems" value={gems} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Hall of Fame</Text>
        <Text style={styles.pageSubtitle}>7 / 24 Badges Collected</Text>

        <View style={styles.grid}>
          {BADGES.map((badge) => (
            <Pressable
              key={badge.id}
              style={styles.badgeSlot}
              onPress={() =>
                console.log(badge.unlocked ? `${badge.title} viewed` : `${badge.title} is locked`)
              }
            >
              <View
                style={[
                  styles.badgeTile,
                  badge.unlocked
                    ? badge.variant === 'gold'
                      ? styles.badgeTileGold
                      : styles.badgeTileChrome
                    : styles.badgeTileLocked,
                ]}
              >
                {badge.unlocked ? (
                  <LinearGradient
                    pointerEvents="none"
                    colors={
                      badge.variant === 'gold'
                        ? [Colors.gold, Colors.emberLight, Colors.ember]
                        : [Colors.chrome, Colors.chromeMid, Colors.chromeDark]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                ) : null}
                <MaterialCommunityIcons
                  name={badge.icon}
                  size={badge.unlocked ? 36 : 32}
                  color={badge.unlocked ? Colors.bgBase : Colors.chromeMid}
                />
                {badge.unlocked ? (
                  <View style={styles.checkBadge}>
                    <MaterialCommunityIcons name="check" size={12} color={Colors.bgBase} />
                  </View>
                ) : null}
              </View>
              <Text style={[styles.badgeTitle, !badge.unlocked && styles.badgeTitleLocked]}>{badge.title}</Text>
              <Text style={[styles.badgeReward, !badge.unlocked && styles.badgeRewardLocked]}>{badge.reward}</Text>
            </Pressable>
          ))}
        </View>

        <RockCard glowColor={Colors.gold} style={styles.featuredCard}>
          <View style={styles.featuredRow}>
            <View style={styles.featuredIconCircle}>
              <MaterialCommunityIcons name="trophy" size={48} color={Colors.bgBase} />
            </View>
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredTitle}>Legend of the Arena</Text>
              <Text style={styles.featuredBody}>
                Win 10 consecutive matches on the main stage to unlock the ultimate performer title
                and 1,000 Diamonds.
              </Text>
              <ProgressBar progress={0.6} />
              <Text style={styles.featuredProgress}>Progress: 6 / 10</Text>
            </View>
          </View>
        </RockCard>
      </ScrollView>
    </View>
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
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  pageTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.cyan,
  },
  pageSubtitle: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.lg,
  },
  badgeSlot: {
    width: '31%',
    alignItems: 'center',
    gap: 6,
  },
  badgeTile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeTileChrome: {
    boxShadow: `0px 4px 14px ${withOpacity(Colors.bgBase, 0.5)}`,
  },
  badgeTileGold: {
    boxShadow: `0px 0px 16px ${withOpacity(Colors.gold, 0.4)}`,
  },
  badgeTileLocked: {
    backgroundColor: withOpacity(Colors.bgPanel, 0.7),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.3),
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.bgBase,
  },
  badgeTitle: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  badgeTitleLocked: {
    color: Colors.textMuted,
  },
  badgeReward: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.gold,
  },
  badgeRewardLocked: {
    color: Colors.textMuted,
    opacity: 0.6,
  },
  featuredCard: {
    marginTop: Spacing.xl,
  },
  featuredRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    alignItems: 'center',
  },
  featuredIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    boxShadow: `0px 0px 24px ${withOpacity(Colors.gold, 0.4)}`,
  },
  featuredInfo: {
    flex: 1,
    gap: Spacing.sm,
  },
  featuredTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  featuredBody: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  featuredProgress: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
