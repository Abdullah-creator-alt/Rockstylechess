import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, CurrencyPill, PlayerAvatar, ProgressBar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { getAvatarEmoji } from '@/constants/avatars';
import { getMyMatches, getMyProfile, type MatchHistoryEntry, type PlayerProfile } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';
import { formatRelativeTime } from '@/lib/time';

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

// No achievements backend exists yet (same deliberately-deferred pattern as
// the rest of the app's social/rewards features) -- left as flavor.
const TROPHIES: TrophyItem[] = [
  { id: 'masters-open', icon: 'trophy', accent: Colors.cyan, label: "MASTERS OPEN '24" },
  { id: 'iron-knight', icon: 'shield-sword', accent: Colors.emberLight, label: 'IRON KNIGHT' },
  { id: 'stage-boss', icon: 'crown', accent: Colors.gold, label: 'THE STAGE BOSS' },
];

const RESULT_LABEL: Record<MatchHistoryEntry['resultType'], string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  draw: 'Draw',
  resignation: 'Resignation',
  forfeit: 'Forfeit',
};

// Purely cosmetic -- no "tier"/"season" concept exists anywhere in the
// schema/backend. Maps rating to a flavor label so the profile header
// keeps its stage-name feel without inventing a fake season number.
function tierLabel(rating: number): string {
  if (rating >= 2200) return 'GRANDMASTER STAGE';
  if (rating >= 1800) return 'MASTER STAGE';
  if (rating >= 1400) return 'CHALLENGER STAGE';
  return 'ROOKIE STAGE';
}

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

type Status = 'loading' | 'ready' | 'error' | 'guest';

export default function IronIdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [matchesExpanded, setMatchesExpanded] = useState(false);

  const load = useCallback(async (matchLimit: number) => {
    const token = await getAuthToken();
    if (!token) {
      setStatus('guest');
      return;
    }
    setStatus('loading');
    try {
      const [{ profile: fetchedProfile }, { matches: fetchedMatches }] = await Promise.all([
        getMyProfile(token),
        getMyMatches(token, matchLimit),
      ]);
      setProfile(fetchedProfile);
      setMatches(fetchedMatches);
      setStatus('ready');
    } catch (error) {
      console.log('Failed to load profile', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load(10);
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load(matchesExpanded ? 50 : 10);
    setRefreshing(false);
  }

  async function handleShowAllMatches() {
    setMatchesExpanded(true);
    await load(50);
  }

  const games = profile ? profile.wins + profile.losses + profile.draws : 0;
  const winRate = games > 0 ? `${((profile!.wins / games) * 100).toFixed(1)}%` : '—';
  const latestDelta = matches.length > 0 ? matches[0].ratingDelta : null;

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

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.headerTitle}>Iron ID</Text>
        <View style={styles.headerRight}>
          <CurrencyPill type="gems" value={profile?.gems ?? 0} />
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

      {status === 'guest' ? (
        <View style={styles.guestWrap}>
          <Text style={styles.guestText}>Sign in to see your stats.</Text>
          <RockButton label="Sign In" variant="primary" onPress={() => router.push('/sign-in')} />
        </View>
      ) : status === 'loading' && !profile ? (
        <ActivityIndicator color={Colors.cyan} style={styles.loadingSpinner} />
      ) : status === 'error' && !profile ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Couldn't load your profile.</Text>
          <RockButton label="Retry" variant="primary" onPress={() => load(matchesExpanded ? 50 : 10)} />
        </View>
      ) : profile ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.cyan} />}
        >
          <View style={styles.profileHero}>
            {/* The source's rotating conic-gradient ring isn't representable
                with LinearGradient -- reusing PlayerAvatar's existing fire-ring
                approximation (already our established solution to this exact
                CSS trick) instead of building a second bespoke ring. */}
            <PlayerAvatar emoji={getAvatarEmoji(profile.avatarId)} size="large" level={profile.level} />
            <Text style={styles.profileName}>{profile.displayName ?? 'Player'}</Text>
            <View style={styles.profileSubRow}>
              <MaterialCommunityIcons name="medal" size={16} color={Colors.cyan} />
              <Text style={styles.profileSubtitle}>{tierLabel(profile.rating)}</Text>
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
                  <Text style={styles.ratingValue}>{profile.rating}</Text>
                  {latestDelta !== null ? <Text style={styles.ratingDelta}>{formatDelta(latestDelta)}</Text> : null}
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
                <Text style={[styles.statValueSmall, { color: Colors.emberLight }]}>{winRate}</Text>
                <ProgressBar progress={games > 0 ? profile.wins / games : 0} height={4} />
              </RockCard>
              <RockCard style={styles.statCardSmall}>
                <Text style={styles.statLabelMuted}>WIN STREAK</Text>
                <Text style={[styles.statValueSmall, { color: Colors.emberLight }]}>{profile.winStreak}</Text>
                <View style={styles.streakRow}>
                  {Array.from({ length: Math.min(profile.winStreak, 3) }).map((_, i) => (
                    <MaterialCommunityIcons key={i} name="fire" size={16} color={Colors.emberLight} />
                  ))}
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
          {matches.length === 0 ? (
            <Text style={styles.emptyText}>No matches played yet.</Text>
          ) : (
            <View style={styles.matchList}>
              {matches.map((match) => (
                <RockCard key={match.matchId} style={styles.matchCard}>
                  <View style={styles.matchRow}>
                    <View
                      style={[
                        styles.matchOutcomeBox,
                        match.outcome === 'win'
                          ? styles.matchOutcomeWin
                          : match.outcome === 'loss'
                            ? styles.matchOutcomeLoss
                            : styles.matchOutcomeDraw,
                      ]}
                    >
                      <Text
                        style={[
                          styles.matchOutcomeText,
                          {
                            color:
                              match.outcome === 'win' ? Colors.cyan : match.outcome === 'loss' ? Colors.crimson : Colors.gold,
                          },
                        ]}
                      >
                        {match.outcome === 'win' ? 'W' : match.outcome === 'loss' ? 'L' : 'D'}
                      </Text>
                    </View>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchOpponent}>VS. {match.opponentDisplayName.toUpperCase()}</Text>
                      <Text style={styles.matchMeta}>
                        {formatRelativeTime(match.playedAt)} • {RESULT_LABEL[match.resultType]}
                      </Text>
                    </View>
                    <View style={styles.matchDeltaCol}>
                      <Text
                        style={[
                          styles.matchDelta,
                          { color: match.outcome === 'win' ? Colors.cyan : match.outcome === 'loss' ? Colors.crimson : Colors.gold },
                        ]}
                      >
                        {formatDelta(match.ratingDelta)}
                      </Text>
                      <Text style={styles.matchRatingAfter}>{match.ratingAfter}</Text>
                    </View>
                  </View>
                </RockCard>
              ))}
            </View>
          )}

          {!matchesExpanded && matches.length >= 10 ? (
            <View style={styles.showAllButtonWrap}>
              <RockButton label="Show All Matches" variant="primary" onPress={handleShowAllMatches} />
            </View>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : null}

      <View style={styles.navWrap}>
        <BottomNav
          activeTab="profile"
          onTabPress={(tab) => {
            if (tab === 'home') router.push('/home');
            else if (tab === 'ranks') router.push('/world-rankings');
            else if (tab === 'shop') router.push('/shop');
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
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
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
  matchOutcomeDraw: {
    backgroundColor: withOpacity(Colors.gold, 0.12),
    borderColor: withOpacity(Colors.gold, 0.3),
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
