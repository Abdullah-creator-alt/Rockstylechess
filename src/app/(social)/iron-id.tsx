import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomNav, CurrencyPill, PlayerAvatar, ProgressBar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const BACKSTAGE_LOUNGE_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD439I-QFr8-qTT8-QPmNzZpNNmZLCcLEDDqFs2uLqslx2WSk7M4wrMO5KIzyX3LYwCPaQsbmUcPiZJRz2OwrhUJnj1Y0uoOLz1O25pHFNzWkmOjNqx6kY6qPRSW0oTU5XnzIUrtdDQarrNV6s9IiIyOBpLU-i2AuKdIdMPnl-PE8QLWXrDTi3IQK5OFcHF0LRK05KyXSD2RLuh3NLTA571f3XvaTayEglZIPe7BoqHPHZ5FGKrrzPdM1Ze2QATqwgSsMbtAKotbto';

interface SocialLink {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
  route: '/bands' | '/friends' | '/messages' | '/front-row';
}

const SOCIAL_LINKS: SocialLink[] = [
  { id: 'bands', label: 'Bands', icon: 'guitar-electric', accent: Colors.emberLight, route: '/bands' },
  { id: 'friends', label: 'Friends', icon: 'account-multiple', accent: Colors.cyan, route: '/friends' },
  { id: 'messages', label: 'Messages', icon: 'chat-outline', accent: Colors.cyan, route: '/messages' },
  { id: 'front-row', label: 'Spectate', icon: 'eye-outline', accent: Colors.crimson, route: '/front-row' },
];

interface TrophyItem {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
  label: string;
}

const TROPHIES: TrophyItem[] = [
  { id: 'masters-open', icon: 'trophy', accent: Colors.cyan, label: "MASTERS OPEN '24" },
  { id: 'iron-knight', icon: 'shield-sword', accent: Colors.emberLight, label: 'IRON KNIGHT' },
  { id: 'stage-boss', icon: 'crown', accent: Colors.gold, label: 'THE STAGE BOSS' },
];

interface MatchHistoryItem {
  id: string;
  outcome: 'W' | 'L';
  opponent: string;
  meta: string;
  delta: string;
  ratingAfter: string;
}

const MATCH_HISTORY: MatchHistoryItem[] = [
  { id: 'm1', outcome: 'W', opponent: 'VS. GM_SPECTRE', meta: '10 mins ago • Ranked Blitz', delta: '+12', ratingAfter: '2,842' },
  { id: 'm2', outcome: 'L', opponent: 'VS. QUEEN_OFF_PAWN', meta: '2 hours ago • Ranked Blitz', delta: '-8', ratingAfter: '2,830' },
  { id: 'm3', outcome: 'W', opponent: 'VS. ROOKIE_KILLER', meta: '5 hours ago • Tournament Round 2', delta: '+15', ratingAfter: '2,838' },
];

export default function IronIdScreen() {
  const router = useRouter();

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
        colors={[withOpacity(Colors.bgBase, 0.6), Colors.bgBase]}
        style={styles.backgroundImage}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Iron ID</Text>
        <View style={styles.headerRight}>
          <CurrencyPill type="gems" value={1_400} />
          <Pressable
            style={styles.settingsButton}
            onPress={() => {
              console.log('Settings entry point pressed');
              router.push('/control-core');
            }}
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHero}>
          {/* The source's rotating conic-gradient ring isn't representable
              with LinearGradient -- reusing PlayerAvatar's existing fire-ring
              approximation (already our established solution to this exact
              CSS trick) instead of building a second bespoke ring. */}
          <PlayerAvatar emoji="🤘" size="large" level={74} />
          <Text style={styles.profileName}>AXL_CHESS</Text>
          <View style={styles.profileSubRow}>
            <MaterialCommunityIcons name="medal" size={16} color={Colors.cyan} />
            <Text style={styles.profileSubtitle}>GRANDMASTER STAGE • SEASON 4</Text>
          </View>
        </View>

        <View style={styles.socialRow}>
          {SOCIAL_LINKS.map((link) => (
            <Pressable
              key={link.id}
              style={styles.socialCard}
              onPress={() => {
                console.log(`${link.label} entry point pressed`);
                router.push(link.route);
              }}
            >
              <RockCard glowColor={link.accent}>
                <View style={styles.socialPressable}>
                  <MaterialCommunityIcons name={link.icon} size={24} color={link.accent} />
                  <Text style={styles.socialLabel}>{link.label}</Text>
                </View>
              </RockCard>
            </Pressable>
          ))}
        </View>

        <View style={styles.statsGrid}>
          <RockCard style={styles.ratingCard}>
            <View style={styles.ratingInner}>
              <Text style={styles.statLabelMuted}>GLOBAL RATING</Text>
              <View style={styles.ratingValueRow}>
                <Text style={styles.ratingValue}>2,842</Text>
                <Text style={styles.ratingDelta}>+14</Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="trending-up"
              size={100}
              color={withOpacity(Colors.cyan, 0.1)}
              style={styles.ratingBgIcon}
            />
          </RockCard>

          <View style={styles.statsRowSmall}>
            <RockCard style={styles.statCardSmall}>
              <Text style={styles.statLabelMuted}>WIN RATE</Text>
              <Text style={[styles.statValueSmall, { color: Colors.emberLight }]}>68.4%</Text>
              <ProgressBar progress={0.684} height={4} />
            </RockCard>
            <RockCard style={styles.statCardSmall}>
              <Text style={styles.statLabelMuted}>WIN STREAK</Text>
              <Text style={[styles.statValueSmall, { color: Colors.emberLight }]}>12</Text>
              <View style={styles.streakRow}>
                <MaterialCommunityIcons name="fire" size={16} color={Colors.emberLight} />
                <MaterialCommunityIcons name="fire" size={16} color={Colors.emberLight} />
                <MaterialCommunityIcons name="fire" size={16} color={Colors.emberLight} />
              </View>
            </RockCard>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Trophy Case</Text>
          <Text style={styles.viewAll} onPress={() => console.log('View all trophies pressed')}>
            VIEW ALL
          </Text>
        </View>
        <View style={styles.trophyGrid}>
          {TROPHIES.map((trophy) => (
            <View key={trophy.id} style={styles.trophySlot}>
              <View style={[styles.trophyIconCircle, { boxShadow: `0px 0px 15px ${withOpacity(trophy.accent, 0.25)}` }]}>
                <MaterialCommunityIcons name={trophy.icon} size={32} color={trophy.accent} />
              </View>
              <Text style={styles.trophyLabel}>{trophy.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, styles.matchHistoryTitle]}>Match History</Text>
        <View style={styles.matchList}>
          {MATCH_HISTORY.map((match) => (
            <RockCard key={match.id} style={styles.matchCard}>
              <View style={styles.matchRow}>
                <View
                  style={[
                    styles.matchOutcomeBox,
                    match.outcome === 'W' ? styles.matchOutcomeWin : styles.matchOutcomeLoss,
                  ]}
                >
                  <Text style={[styles.matchOutcomeText, { color: match.outcome === 'W' ? Colors.cyan : Colors.crimson }]}>
                    {match.outcome}
                  </Text>
                </View>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchOpponent}>{match.opponent}</Text>
                  <Text style={styles.matchMeta}>{match.meta}</Text>
                </View>
                <View style={styles.matchDeltaCol}>
                  <Text style={[styles.matchDelta, { color: match.outcome === 'W' ? Colors.cyan : Colors.crimson }]}>
                    {match.delta}
                  </Text>
                  <Text style={styles.matchRatingAfter}>{match.ratingAfter}</Text>
                </View>
              </View>
            </RockCard>
          ))}
        </View>

        <View style={styles.showAllButtonWrap}>
          <RockButton label="Show All Matches" variant="primary" onPress={() => console.log('Show all matches pressed')} />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.navWrap}>
        <BottomNav
          activeTab="profile"
          onTabPress={(tab) => {
            if (tab === 'home') router.push('/home');
            else if (tab === 'ranks') router.push('/world-rankings');
            else console.log('tab pressed', tab);
          }}
        />
      </View>
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
    opacity: 0.25,
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
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.cyan,
    textTransform: 'uppercase',
    textShadowColor: withOpacity(Colors.cyan, 0.5),
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgPanel, 0.85),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 120,
    gap: Spacing.xl,
  },
  profileHero: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  profileName: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.cyan,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  profileSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileSubtitle: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  socialCard: {
    flex: 1,
  },
  socialPressable: {
    alignItems: 'center',
    gap: 6,
  },
  socialLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  statsGrid: {
    gap: Spacing.md,
  },
  ratingCard: {
    overflow: 'hidden',
  },
  ratingInner: {
    gap: Spacing.sm,
  },
  ratingBgIcon: {
    position: 'absolute',
    right: -16,
    top: -16,
  },
  statLabelMuted: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  ratingValue: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.cyan,
  },
  ratingDelta: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.cyan,
  },
  statsRowSmall: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCardSmall: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statValueSmall: {
    fontFamily: Fonts.display,
    fontSize: 22,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  matchHistoryTitle: {
    marginTop: -Spacing.md,
  },
  viewAll: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  trophyGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  trophySlot: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: withOpacity(Colors.bgPanel, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.2),
  },
  trophyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.4),
  },
  trophyLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  matchList: {
    gap: Spacing.sm,
  },
  matchCard: {},
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  matchOutcomeBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  matchOutcomeWin: {
    backgroundColor: withOpacity(Colors.cyan, 0.12),
    borderColor: withOpacity(Colors.cyan, 0.3),
  },
  matchOutcomeLoss: {
    backgroundColor: withOpacity(Colors.crimson, 0.12),
    borderColor: withOpacity(Colors.crimson, 0.3),
  },
  matchOutcomeText: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  matchInfo: {
    flex: 1,
  },
  matchOpponent: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  matchMeta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  matchDeltaCol: {
    alignItems: 'flex-end',
  },
  matchDelta: {
    fontFamily: Fonts.display,
    fontSize: 16,
  },
  matchRatingAfter: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  showAllButtonWrap: {
    marginTop: -Spacing.sm,
  },
  bottomSpacer: {
    height: 20,
  },
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
