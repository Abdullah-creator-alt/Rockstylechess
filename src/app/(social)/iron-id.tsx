import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, BottomNav, CurrencyPill, PlayerAvatar, ProgressBar, RockButton, RockCard } from '@/components/ui';
import { getAvatarEmoji } from '@/constants/avatars';
import type { ICONS } from '@/constants/icons';
import { Colors, withOpacity } from '@/constants/theme';
import { getMyMatches, getMyProfile, type MatchHistoryEntry, type PlayerProfile } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';
import { getLevelProgress } from '@/lib/leveling';
import { formatRelativeTime } from '@/lib/time';
import { tierLabel } from '@/lib/tierLabel';

interface SocialLink {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  accent: string;
  route: '/bands' | '/friends' | '/messages' | '/front-row';
}

const SOCIAL_LINKS: SocialLink[] = [
  { id: 'bands', label: 'Bands', icon: 'sports_esports', accent: Colors.emberLight, route: '/bands' },
  { id: 'friends', label: 'Friends', icon: 'group', accent: Colors.cyan, route: '/friends' },
  { id: 'messages', label: 'Messages', icon: 'chat', accent: Colors.cyan, route: '/messages' },
  { id: 'front-row', label: 'Spectate', icon: 'visibility', accent: Colors.crimson, route: '/front-row' },
];

interface QuickLink {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  accent: string;
  route: '/achievements' | '/quests' | '/collections';
}

const QUICK_LINKS: QuickLink[] = [
  { id: 'achievements', label: 'Achievements', icon: 'emoji_events', accent: Colors.gold, route: '/achievements' },
  { id: 'quests', label: 'Quests', icon: 'military_tech', accent: Colors.cyan, route: '/quests' },
  { id: 'collections', label: 'Collections', icon: 'style', accent: Colors.emberLight, route: '/collections' },
];

// No achievements backend exists yet (same deliberately-deferred pattern as
// the rest of the app's social/rewards features) -- left as flavor.
const TROPHIES: { id: string; icon: keyof typeof ICONS; accent: string; label: string }[] = [
  { id: 'masters-open', icon: 'emoji_events', accent: Colors.cyan, label: "MASTERS OPEN '24" },
  { id: 'iron-knight', icon: 'military_tech', accent: Colors.emberLight, label: 'IRON KNIGHT' },
  { id: 'stage-boss', icon: 'stars', accent: Colors.gold, label: 'THE STAGE BOSS' },
];

const RESULT_LABEL: Record<MatchHistoryEntry['resultType'], string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  draw: 'Draw',
  resignation: 'Resignation',
  forfeit: 'Forfeit',
  timeout: 'Timeout',
};

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
      const [{ profile: fetchedProfile }, { matches: fetchedMatches }] = await Promise.all([getMyProfile(token), getMyMatches(token, matchLimit)]);
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
  const levelProgress = getLevelProgress(profile?.xp ?? 0);

  return (
    <View className="flex-1 bg-bg-base">
      <View className="flex-row items-center justify-between px-lg pb-md" style={{ paddingTop: insets.top + 16 }}>
        <Text className="font-display-hero text-cyan" style={{ fontSize: 16, textTransform: 'uppercase', textShadowColor: withOpacity(Colors.cyan, 0.5), textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }}>
          Iron ID
        </Text>
        <View className="flex-row items-center gap-sm">
          <CurrencyPill type="gems" value={profile?.gems ?? 0} />
          <Pressable className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: withOpacity(Colors.bgPanel, 0.85), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.4) }} onPress={() => router.push('/control-core')}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {status === 'guest' ? (
        <View className="flex-1 items-center justify-center gap-md px-xl">
          <Text className="text-center font-body-base text-body-base text-text-muted">Sign in to see your stats.</Text>
          <RockButton label="Sign In" variant="primary" onPress={() => router.push('/sign-in')} />
        </View>
      ) : status === 'loading' && !profile ? (
        <ActivityIndicator color={Colors.cyan} style={{ marginTop: 48 }} />
      ) : status === 'error' && !profile ? (
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="font-body-base text-body-base text-text-muted">Couldn&apos;t load your profile.</Text>
          <RockButton label="Retry" variant="primary" onPress={() => load(matchesExpanded ? 50 : 10)} />
        </View>
      ) : profile ? (
        <ScrollView
          contentContainerClassName="gap-xl px-lg"
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.cyan} />}
        >
          <RockCard>
            <View className="items-center gap-sm">
              <PlayerAvatar emoji={getAvatarEmoji(profile.avatarId)} size="large" level={profile.level} />
              <Text className="font-display-hero text-cyan" style={{ fontSize: 22, textTransform: 'uppercase' }}>
                {profile.displayName ?? 'Player'}
              </Text>
              <View className="flex-row items-center gap-1">
                <MaterialCommunityIcons name="medal" size={16} color={Colors.cyan} />
                <Text className="font-section-header text-section-header uppercase tracking-wide text-text-muted">{tierLabel(profile.rating)}</Text>
              </View>
              <View style={{ width: '70%', marginTop: 4 }}>
                <ProgressBar progress={levelProgress.progress} height={6} label={`${levelProgress.xpIntoLevel.toLocaleString()} / ${levelProgress.xpForNextLevel.toLocaleString()} XP`} />
              </View>
            </View>
          </RockCard>

          <View className="flex-row gap-sm">
            {SOCIAL_LINKS.map((link) => (
              <Pressable key={link.id} style={{ flex: 1 }} onPress={() => router.push(link.route)}>
                <RockCard glowColor={link.accent}>
                  <View className="items-center gap-1">
                    <AppIcon name={link.icon} size={24} color={link.accent} />
                    <Text className="font-section-header text-caption uppercase text-text-primary">{link.label}</Text>
                  </View>
                </RockCard>
              </Pressable>
            ))}
          </View>

          <View className="flex-row flex-wrap gap-gutter">
            <RockCard style={{ width: '47%' }}>
              <View className="items-center justify-center">
                <AppIcon name="trending_up" size={22} color={Colors.cyan} />
                <Text className="mt-xs font-heading-md text-heading-md" style={{ color: Colors.emberLight }}>
                  {winRate}
                </Text>
                <Text className="font-caption text-caption uppercase tracking-wide text-text-muted">Win Rate</Text>
              </View>
            </RockCard>
            <RockCard style={{ width: '47%' }}>
              <View className="items-center justify-center">
                <AppIcon name="sports_esports" size={22} color={Colors.cyan} />
                <Text className="mt-xs font-heading-md text-heading-md" style={{ color: Colors.emberLight }}>
                  {profile.winStreak}
                </Text>
                <Text className="font-caption text-caption uppercase tracking-wide text-text-muted">Win Streak</Text>
              </View>
            </RockCard>
            <RockCard style={{ width: '100%' }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-caption text-caption uppercase tracking-wide text-text-muted">Global Rating</Text>
                  <View className="flex-row items-baseline gap-sm">
                    <Text className="font-display-hero text-cyan" style={{ fontSize: 32 }}>
                      {profile.rating}
                    </Text>
                    {latestDelta !== null ? (
                      <Text className="font-heading-md text-cyan" style={{ fontSize: 14 }}>
                        {formatDelta(latestDelta)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <MaterialCommunityIcons name="trending-up" size={72} color={withOpacity(Colors.cyan, 0.15)} />
              </View>
            </RockCard>
          </View>

          <View>
            <Text className="mb-md font-display-hero text-cyan" style={{ fontSize: 20, textTransform: 'uppercase' }}>
              Trophy Case
            </Text>
            <View className="flex-row gap-sm">
              {TROPHIES.map((trophy) => (
                <View key={trophy.id} className="flex-1 items-center gap-sm rounded-lg p-md" style={{ backgroundColor: withOpacity(Colors.bgPanel, 0.5), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.2) }}>
                  <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: withOpacity(Colors.bgBase, 0.4), boxShadow: `0px 0px 15px ${withOpacity(trophy.accent, 0.25)}` }}>
                    <AppIcon name={trophy.icon} size={32} color={trophy.accent} />
                  </View>
                  <Text className="text-center font-section-header text-caption text-text-primary">{trophy.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="flex-row gap-gutter">
            {QUICK_LINKS.map((link) => (
              <Pressable key={link.id} onPress={() => router.push(link.route)} style={{ width: '31%' }} className="items-center justify-center gap-xs rounded-lg bg-bg-panel p-md">
                <AppIcon name={link.icon} size={22} color={link.accent} />
                <Text className="text-center font-caption text-caption uppercase text-text-primary">{link.label}</Text>
              </Pressable>
            ))}
          </View>

          <View>
            <Text className="mb-md font-display-hero text-cyan" style={{ fontSize: 20, textTransform: 'uppercase' }}>
              Match History
            </Text>
            {matches.length === 0 ? (
              <Text className="font-body-base text-body-base text-text-muted">No matches played yet.</Text>
            ) : (
              <View className="gap-sm">
                {matches.map((match) => (
                  <Pressable
                    key={match.matchId}
                    onPress={() =>
                      router.push({
                        pathname: '/replay',
                        params: { matchId: match.matchId, opponentDisplayName: match.opponentDisplayName, resultType: match.resultType, color: match.color, playedAt: match.playedAt },
                      })
                    }
                  >
                    <RockCard>
                      <View className="flex-row items-center gap-md">
                        <View
                          className="h-12 w-12 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: withOpacity(match.outcome === 'win' ? Colors.cyan : match.outcome === 'loss' ? Colors.crimson : Colors.gold, 0.12),
                            borderWidth: 1,
                            borderColor: withOpacity(match.outcome === 'win' ? Colors.cyan : match.outcome === 'loss' ? Colors.crimson : Colors.gold, 0.3),
                          }}
                        >
                          <Text className="font-display-hero" style={{ fontSize: 18, color: match.outcome === 'win' ? Colors.cyan : match.outcome === 'loss' ? Colors.crimson : Colors.gold }}>
                            {match.outcome === 'win' ? 'W' : match.outcome === 'loss' ? 'L' : 'D'}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-heading-md" style={{ fontSize: 13, color: Colors.textPrimary }}>
                            VS. {match.opponentDisplayName.toUpperCase()}
                          </Text>
                          <Text className="font-body-sm" style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>
                            {formatRelativeTime(match.playedAt)} • {RESULT_LABEL[match.resultType]}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="font-display-hero" style={{ fontSize: 16, color: match.outcome === 'win' ? Colors.cyan : match.outcome === 'loss' ? Colors.crimson : Colors.gold }}>
                            {formatDelta(match.ratingDelta)}
                          </Text>
                          <Text className="font-body-sm" style={{ fontSize: 11, color: Colors.textMuted }}>
                            {match.ratingAfter}
                          </Text>
                        </View>
                        <AppIcon name="replay" size={20} color={Colors.textMuted} />
                      </View>
                    </RockCard>
                  </Pressable>
                ))}
              </View>
            )}

            {!matchesExpanded && matches.length >= 10 ? (
              <View style={{ marginTop: 8 }}>
                <RockButton label="Show All Matches" variant="primary" onPress={handleShowAllMatches} />
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : null}

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
  );
}
