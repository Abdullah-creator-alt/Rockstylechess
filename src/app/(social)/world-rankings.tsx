import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, CurrencyPill, PlayerAvatar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { getAvatarEmoji } from '@/constants/avatars';
import { getLeaderboard, getMyProfile, getMyRank, type LeaderboardEntry, type PlayerProfile } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';

type FilterTab = 'global' | 'friends' | 'venue' | 'country';
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'friends', label: 'Friends' },
  { key: 'venue', label: 'Venue' },
  { key: 'country', label: 'Country' },
];

// Rank position -- not per-player data -- drives the podium's visual design,
// same purely-presentational role these had with the old mock data.
const PODIUM_ACCENT: Record<1 | 2 | 3, string> = { 1: Colors.gold, 2: Colors.chromeMid, 3: Colors.emberLight };
const PODIUM_HEIGHT: Record<1 | 2 | 3, number> = { 1: 96, 2: 64, 3: 48 };

function formatRecord(entry: LeaderboardEntry): string {
  if (entry.wins + entry.losses + entry.draws === 0) return 'No games yet';
  return `${entry.wins}W ${entry.losses}L ${entry.draws}D`;
}

type LoadStatus = 'loading' | 'ready' | 'error';
type MineStatus = 'loading' | 'ready' | 'error' | 'guest';

export default function WorldRankingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('global');
  const [refreshing, setRefreshing] = useState(false);

  const [listStatus, setListStatus] = useState<LoadStatus>('loading');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const [mineStatus, setMineStatus] = useState<MineStatus>('loading');
  const [myProfile, setMyProfile] = useState<PlayerProfile | null>(null);
  const [myRank, setMyRank] = useState<{ rank: number; totalPlayers: number } | null>(null);

  const loadList = useCallback(async () => {
    setListStatus('loading');
    try {
      const { leaderboard } = await getLeaderboard(20);
      setEntries(leaderboard);
      setListStatus('ready');
    } catch (error) {
      console.log('Failed to load leaderboard', error);
      setListStatus('error');
    }
  }, []);

  const loadMine = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      setMineStatus('guest');
      return;
    }
    setMineStatus('loading');
    try {
      const [{ profile }, rank] = await Promise.all([getMyProfile(token), getMyRank(token)]);
      setMyProfile(profile);
      setMyRank(rank);
      setMineStatus('ready');
    } catch (error) {
      console.log('Failed to load own rank', error);
      setMineStatus('error');
    }
  }, []);

  useEffect(() => {
    loadList();
    loadMine();
  }, [loadList, loadMine]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadList(), loadMine()]);
    setRefreshing(false);
  }

  const podium = entries.slice(0, 3);
  // Visual order is 2nd-1st-3rd (1st in the middle, tallest) -- entries
  // itself stays rank-ordered (1st, 2nd, 3rd) since the ranked list below
  // reuses the same array by index.
  const podiumVisualOrder = [podium[1], podium[0], podium[2]];
  const rankedList = entries.slice(3);
  const percentile = myRank ? Math.max(1, Math.ceil((myRank.rank / myRank.totalPlayers) * 100)) : null;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerLeft}>
          <PlayerAvatar emoji="🤘" size="small" />
          <Text style={styles.headerTitle}>World Rankings</Text>
        </View>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      <View style={styles.filterBar}>
        {FILTER_TABS.map((tab) => {
          const active = activeFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeFilter !== 'global' ? (
        <View style={styles.comingSoonWrap}>
          <Text style={styles.comingSoonText}>COMING SOON</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.cyan} />}
        >
          {listStatus === 'loading' ? (
            <ActivityIndicator color={Colors.cyan} style={styles.loadingSpinner} />
          ) : listStatus === 'error' ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>Couldn't load the leaderboard.</Text>
              <RockButton label="Retry" variant="primary" onPress={loadList} />
            </View>
          ) : (
            <>
              {podium.length > 0 ? (
                <View style={styles.podiumRow}>
                  {podiumVisualOrder.map((entry, index) => {
                    if (!entry) return null;
                    const rank = (index === 1 ? 1 : index === 0 ? 2 : 3) as 1 | 2 | 3;
                    const accent = PODIUM_ACCENT[rank];
                    return (
                      <View key={entry.userId} style={[styles.podiumCol, rank === 1 && styles.podiumColFirst]}>
                        <PlayerAvatar emoji={getAvatarEmoji(entry.avatarId)} size={rank === 1 ? 'medium' : 'small'} />
                        <LinearGradient
                          colors={[accent, Colors.bgBase]}
                          style={[
                            styles.pedestal,
                            {
                              height: PODIUM_HEIGHT[rank],
                              boxShadow: rank === 1 ? `0px 0px 24px ${withOpacity(Colors.gold, 0.4)}` : undefined,
                            },
                          ]}
                        >
                          <Text style={[styles.pedestalRank, { color: rank === 1 ? Colors.bgBase : Colors.textPrimary }]}>
                            {rank}
                          </Text>
                        </LinearGradient>
                        <Text style={[styles.podiumName, { color: accent }]} numberOfLines={1}>
                          {entry.displayName ?? 'Anonymous'}
                        </Text>
                        <Text style={styles.podiumRating}>{entry.rating}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {rankedList.length > 0 ? (
                <View style={styles.list}>
                  {rankedList.map((entry, index) => (
                    <RockCard key={entry.userId} style={styles.rowCard}>
                      <View style={styles.rowInner}>
                        <Text style={styles.rowRank}>{index + 4}</Text>
                        <PlayerAvatar emoji={getAvatarEmoji(entry.avatarId)} size="small" />
                        <View style={styles.rowInfo}>
                          <Text style={styles.rowName}>{entry.displayName ?? 'Anonymous'}</Text>
                          <Text style={styles.rowTier}>{formatRecord(entry)}</Text>
                        </View>
                        <Text style={styles.rowPoints}>{entry.rating}</Text>
                      </View>
                    </RockCard>
                  ))}
                </View>
              ) : null}

              {entries.length === 0 ? (
                <Text style={styles.emptyText}>No ranked players yet.</Text>
              ) : null}

              {mineStatus === 'ready' && myProfile && myRank ? (
                <RockCard glowColor={Colors.emberLight} style={styles.pinnedCard}>
                  <View style={styles.pinnedInner}>
                    <Text style={styles.pinnedRank}>{myRank.rank}</Text>
                    <PlayerAvatar emoji={getAvatarEmoji(myProfile.avatarId)} size="medium" />
                    <View style={styles.pinnedInfo}>
                      <Text style={styles.pinnedName}>{myProfile.displayName ?? 'You'}</Text>
                      <View style={styles.pinnedSubRow}>
                        <Text style={styles.pinnedTop}>TOP {percentile}%</Text>
                        <Text style={styles.pinnedDot}>•</Text>
                        <Text style={styles.pinnedElo}>{myProfile.rating} ELO</Text>
                      </View>
                    </View>
                    <View style={styles.pinnedXpCol}>
                      <Text style={styles.pinnedXpLabel}>Record</Text>
                      <Text style={styles.pinnedXpValue}>
                        {myProfile.wins}W {myProfile.losses}L
                      </Text>
                    </View>
                  </View>
                </RockCard>
              ) : null}
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      <View style={styles.navWrap}>
        <BottomNav
          activeTab="ranks"
          onTabPress={(tab) => {
            if (tab === 'home') router.push('/home');
            else if (tab === 'profile') router.push('/iron-id');
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
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
  filterBar: {
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
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: withOpacity(Colors.cyan, 0.18),
    boxShadow: `0px 0px 10px ${withOpacity(Colors.cyan, 0.35)}`,
  },
  filterTabText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterTabTextActive: {
    color: Colors.cyan,
  },
  comingSoonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  comingSoonText: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 120,
    gap: Spacing.xl,
  },
  loadingSpinner: {
    marginTop: Spacing.xl * 2,
  },
  errorWrap: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
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
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  podiumCol: {
    alignItems: 'center',
    gap: Spacing.sm,
    width: 92,
  },
  podiumColFirst: {
    width: 104,
  },
  pedestal: {
    width: '100%',
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalRank: {
    fontFamily: Fonts.display,
    fontSize: 28,
  },
  podiumName: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  podiumRating: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  list: {
    gap: Spacing.sm,
  },
  rowCard: {},
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowRank: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textMuted,
    width: 24,
    textAlign: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  rowTier: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rowPoints: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.cyan,
  },
  pinnedCard: {},
  pinnedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pinnedRank: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.emberLight,
    width: 32,
    textAlign: 'center',
  },
  pinnedInfo: {
    flex: 1,
  },
  pinnedName: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.cyan,
  },
  pinnedSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  pinnedTop: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.emberLight,
  },
  pinnedDot: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  pinnedElo: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  pinnedXpCol: {
    alignItems: 'flex-end',
  },
  pinnedXpLabel: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    color: Colors.emberLight,
    textTransform: 'uppercase',
  },
  pinnedXpValue: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 2,
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
