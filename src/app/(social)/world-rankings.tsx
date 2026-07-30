import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomNav, CurrencyPill, PlayerAvatar, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

type FilterTab = 'global' | 'friends' | 'venue' | 'country';
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'friends', label: 'Friends' },
  { key: 'venue', label: 'Venue' },
  { key: 'country', label: 'Country' },
];

interface PodiumPlayer {
  rank: 1 | 2 | 3;
  name: string;
  emoji: string;
  country: string;
  accent: string;
  pedestalHeight: number;
}

// Sample data matching the source's podium names -- no live leaderboard backend yet.
const PODIUM: PodiumPlayer[] = [
  { rank: 2, name: 'XIN_CHESS', emoji: '🥈', country: 'CN', accent: Colors.chromeMid, pedestalHeight: 64 },
  { rank: 1, name: 'KINGS_GAMBIT', emoji: '👑', country: 'US', accent: Colors.gold, pedestalHeight: 96 },
  { rank: 3, name: 'EN_PASSANT', emoji: '🥉', country: 'FR', accent: Colors.emberLight, pedestalHeight: 48 },
];

interface RankRow {
  rank: number;
  name: string;
  emoji: string;
  tier: string;
  points: string;
}

const RANKED_LIST: RankRow[] = [
  { rank: 4, name: 'CHESS_WIZARD_99', emoji: '🧙', tier: 'Master Rank • 2840 ELO', points: '2.4k pts' },
  { rank: 5, name: 'QUEEN_PIN_88', emoji: '♛', tier: 'Grandmaster Rank • 2795 ELO', points: '2.1k pts' },
  { rank: 6, name: 'ROOK_RAIDER', emoji: '🏰', tier: 'Master Rank • 2750 ELO', points: '1.9k pts' },
];

export default function WorldRankingsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('global');

  return (
    <View style={styles.root}>
      <View style={styles.header}>
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
              onPress={() => {
                setActiveFilter(tab.key);
                console.log('Filter selected', tab.key);
              }}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.podiumRow}>
          {PODIUM.map((player) => (
            <View key={player.rank} style={[styles.podiumCol, player.rank === 1 && styles.podiumColFirst]}>
              <PlayerAvatar emoji={player.emoji} size={player.rank === 1 ? 'medium' : 'small'} />
              <LinearGradient
                colors={[player.accent, Colors.bgBase]}
                style={[
                  styles.pedestal,
                  {
                    height: player.pedestalHeight,
                    boxShadow: player.rank === 1 ? `0px 0px 24px ${withOpacity(Colors.gold, 0.4)}` : undefined,
                  },
                ]}
              >
                <Text style={[styles.pedestalRank, { color: player.rank === 1 ? Colors.bgBase : Colors.textPrimary }]}>
                  {player.rank}
                </Text>
              </LinearGradient>
              <Text style={[styles.podiumName, { color: player.accent }]} numberOfLines={1}>
                {player.name}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.list}>
          {RANKED_LIST.map((row) => (
            <RockCard key={row.rank} style={styles.rowCard}>
              <View style={styles.rowInner}>
                <Text style={styles.rowRank}>{row.rank}</Text>
                <PlayerAvatar emoji={row.emoji} size="small" />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{row.name}</Text>
                  <Text style={styles.rowTier}>{row.tier}</Text>
                </View>
                <Text style={styles.rowPoints}>{row.points}</Text>
              </View>
            </RockCard>
          ))}
          <View style={styles.teaserRow}>
            <Text style={styles.teaserText}>CLIMB THE RANKS TO REVEAL MORE</Text>
          </View>
        </View>

        <RockCard glowColor={Colors.emberLight} style={styles.pinnedCard}>
          <View style={styles.pinnedInner}>
            <Text style={styles.pinnedRank}>124</Text>
            <PlayerAvatar emoji="🤘" size="medium" />
            <View style={styles.pinnedInfo}>
              <Text style={styles.pinnedName}>YOU (PLAYER_01)</Text>
              <View style={styles.pinnedSubRow}>
                <Text style={styles.pinnedTop}>TOP 5%</Text>
                <Text style={styles.pinnedDot}>•</Text>
                <Text style={styles.pinnedElo}>1650 ELO</Text>
              </View>
            </View>
            <View style={styles.pinnedXpCol}>
              <Text style={styles.pinnedXpLabel}>Next Rank in</Text>
              <Text style={styles.pinnedXpValue}>150 XP</Text>
            </View>
          </View>
        </RockCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>

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
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 120,
    gap: Spacing.xl,
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
  teaserRow: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    opacity: 0.5,
  },
  teaserText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
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
