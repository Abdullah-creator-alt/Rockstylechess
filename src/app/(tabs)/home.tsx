import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, BottomNav, CurrencyPill, EmberParticles, PlayerAvatar, RockButton, RockCard } from '@/components/ui';
import { getAvatarEmoji } from '@/constants/avatars';
import type { ICONS } from '@/constants/icons';
import { ScreenArt } from '@/constants/screenArt';
import { Colors, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { tierLabel } from '@/lib/tierLabel';

type Duration = '3m' | '5m' | '10m';
const DURATIONS: Duration[] = ['3m', '5m', '10m'];

interface VenueTile {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  locked: boolean;
}

const VENUES: VenueTile[] = [
  { id: 'club', name: 'The Club', icon: 'glass-cocktail', locked: false },
  { id: 'arena', name: 'The Arena', icon: 'stadium-variant', locked: false },
  { id: 'stadium', name: 'Stadium', icon: 'castle', locked: true },
];

// Bento grid -- migrated 1:1 from new_ui (tabs)/index.tsx (icons, labels,
// sub-labels, accent colors, routes). `glow: undefined` = no colored card
// glow (new_ui's `glowColor="none"` for the ember tile).
type HomeTile = {
  icon: keyof typeof ICONS;
  color: string;
  glow: string | undefined;
  label: string;
  sub: string;
  route: '/setup' | '/tournaments' | '/bots' | '/puzzles';
};

const HOME_TILES: HomeTile[] = [
  { icon: 'swords', color: Colors.cyan, glow: Colors.cyan, label: 'Iron Duel', sub: '1v1 Ranked', route: '/setup' },
  { icon: 'emoji_events', color: Colors.gold, glow: Colors.gold, label: 'Tournaments', sub: 'High Stakes', route: '/tournaments' },
  { icon: 'smart_toy', color: Colors.ember, glow: undefined, label: 'Bots', sub: 'Practice', route: '/bots' },
  { icon: 'extension', color: Colors.cyan, glow: Colors.cyan, label: 'Puzzles', sub: 'Daily Grind', route: '/puzzles' },
];

export default function HomeLobbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, chips, gems } = usePlayerProfile();
  const [selectedVenue, setSelectedVenue] = useState('arena');
  const [duration, setDuration] = useState<Duration>('5m');

  function handleVenuePress(venue: VenueTile) {
    if (venue.locked) {
      console.log('Venue locked', venue.name);
      return;
    }
    setSelectedVenue(venue.id);
    console.log('Venue selected', venue.name);
  }

  return (
    <View className="flex-1 bg-bg-base">
      <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: withOpacity(Colors.cyan, 0.06), boxShadow: `0px 0px 120px ${withOpacity(Colors.cyan, 0.25)}` }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 60, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: withOpacity(Colors.ember, 0.06), boxShadow: `0px 0px 100px ${withOpacity(Colors.ember, 0.22)}` }} />
      <EmberParticles count={10} />

      <View
        className="flex-row items-center justify-between px-lg pb-md"
        style={{ paddingTop: insets.top + 16, backgroundColor: withOpacity(Colors.bgPanel, 0.85), borderBottomWidth: 1, borderBottomColor: withOpacity(Colors.cyan, 0.15) }}
      >
        <View className="flex-1 flex-row items-center gap-sm">
          <View style={{ position: 'relative' }}>
            <PlayerAvatar emoji={getAvatarEmoji(profile?.avatarId)} level={profile?.level} size="small" />
            <Pressable
              className="items-center justify-center rounded-full"
              style={{ position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, backgroundColor: Colors.gold, borderWidth: 1.5, borderColor: Colors.bgBase, boxShadow: `0px 0px 6px ${withOpacity(Colors.gold, 0.6)}` }}
              onPress={() => {
                console.log('Forge entry point pressed');
                router.push('/forge');
              }}
            >
              <MaterialCommunityIcons name="hammer" size={14} color={Colors.bgBase} />
            </Pressable>
          </View>
          <View>
            <Text className="font-display-hero text-cyan" style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {profile?.displayName ?? 'Player'}
            </Text>
            <Text className="font-section-header" style={{ fontSize: 10, color: Colors.emberLight, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>
              LVL {profile?.level ?? 1} {tierLabel(profile?.rating ?? 1200)}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-sm">
          <CurrencyPill
            type="chips"
            value={chips}
            onPressAdd={() => {
              console.log('Buy chips');
              router.push('/shop');
            }}
          />
          <CurrencyPill
            type="gems"
            value={gems}
            onPressAdd={() => {
              console.log('Buy gems');
              router.push('/shop');
            }}
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-xl px-lg" contentContainerStyle={{ paddingTop: 20, paddingBottom: 130 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-md" contentContainerStyle={{ paddingBottom: 4 }}>
          {VENUES.map((venue) => {
            const isActive = !venue.locked && selectedVenue === venue.id;
            return (
              <Pressable
                key={venue.id}
                onPress={() => handleVenuePress(venue)}
                className="items-center justify-center gap-1 rounded-lg"
                style={{
                  width: isActive ? 130 : 110,
                  height: isActive ? 92 : 80,
                  backgroundColor: isActive ? withOpacity(Colors.cyan, 0.14) : withOpacity(Colors.bgPanel, 0.7),
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive ? Colors.cyan : withOpacity(Colors.ember, 0.18),
                  boxShadow: isActive ? `0px 0px 20px ${withOpacity(Colors.cyan, 0.4)}` : undefined,
                  opacity: venue.locked ? 0.6 : 1,
                }}
              >
                {venue.locked ? (
                  <View style={{ position: 'absolute', top: 6, right: 6 }}>
                    <MaterialCommunityIcons name="lock" size={18} color={Colors.chromeMid} />
                  </View>
                ) : null}
                <MaterialCommunityIcons name={venue.icon} size={isActive ? 28 : 22} color={venue.locked ? Colors.chromeMid : isActive ? Colors.cyan : Colors.textMuted} />
                <Text className="font-heading-md uppercase" style={{ fontSize: isActive ? 13 : 11, color: venue.locked ? Colors.chromeMid : isActive ? Colors.cyan : Colors.textMuted }}>
                  {venue.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <RockCard variant="surface" glowColor={Colors.cyan} backgroundImage={ScreenArt.homeArenaHero} style={{ minHeight: 280 }}>
          <View className="flex-row items-end justify-between gap-md">
            <View className="flex-shrink">
              <Text className="font-display-hero text-text-primary" style={{ fontSize: 26, textTransform: 'uppercase', textShadowColor: withOpacity(Colors.bgBase, 0.8), textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } }}>
                The Arena
              </Text>
              <View className="mt-sm flex-row items-center gap-md">
                <View>
                  <Text className="font-heading-md text-caption uppercase tracking-wide text-text-muted">Buy-In</Text>
                  <Text className="font-display-hero" style={{ fontSize: 18, color: Colors.cyan }}>
                    250K
                  </Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: withOpacity(Colors.chromeDark, 0.5) }} />
                <View>
                  <Text className="font-heading-md text-caption uppercase tracking-wide text-text-muted">Grand Prize</Text>
                  <Text className="font-display-hero" style={{ fontSize: 18, color: Colors.emberLight }}>
                    500K
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-xs">
              {DURATIONS.map((d) => {
                const active = duration === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => {
                      setDuration(d);
                      console.log('Duration selected', d);
                    }}
                    className="rounded"
                    style={{ paddingHorizontal: 8, paddingVertical: 6, backgroundColor: active ? Colors.cyan : withOpacity(Colors.bgBase, 0.5), borderWidth: 1, borderColor: active ? Colors.cyan : withOpacity(Colors.chromeDark, 0.4) }}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Text className="font-heading-md" style={{ fontSize: 12, color: active ? Colors.bgBase : Colors.textPrimary }}>
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mt-lg">
            <RockButton
              label="Play Now"
              variant="primary"
              icon={<MaterialCommunityIcons name="play" size={20} color={Colors.bgBase} />}
              onPress={() => {
                console.log('Play Now pressed', { selectedVenue, duration });
                router.push('/setup');
              }}
            />
          </View>
        </RockCard>

        {/* Bento grid -- from new_ui (tabs)/index.tsx. Fixed tile height (not
            aspect-ratio) so all four are identical regardless of screen width
            or how many lines a label wraps to -- icon/label/sub stay at one
            fixed size each, never shrink-to-fit. */}
        <View className="flex-row flex-wrap gap-gutter">
          {HOME_TILES.map((tile) => (
            <Pressable key={tile.label} onPress={() => router.push(tile.route)} style={{ width: '47%' }}>
              <RockCard variant="surface" glowColor={tile.glow} style={{ height: 160 }}>
                <View className="flex-1 items-center justify-center">
                  <AppIcon name={tile.icon} size={36} color={tile.color} />
                  {/* Fixed-height label slot -- keeps the icon and sub-label
                      at the same y across all four tiles even when a label
                      wraps to two lines. Tightened line height so a 2-line
                      label fits without shrinking the 20px type. */}
                  <View className="mt-sm items-center justify-center" style={{ height: 52 }}>
                    <Text
                      className="text-center font-heading-md text-heading-md text-text-primary"
                      numberOfLines={2}
                      style={{ lineHeight: 22 }}
                    >
                      {tile.label}
                    </Text>
                  </View>
                  <Text className="text-center font-caption text-caption text-text-muted" numberOfLines={1}>
                    {tile.sub}
                  </Text>
                </View>
              </RockCard>
            </Pressable>
          ))}
        </View>

        {/* Daily rewards -- migrated 1:1 from new_ui (tabs)/index.tsx */}
        <View className="gap-sm">
          <Text className="pl-xs font-section-header text-section-header uppercase tracking-widest text-text-muted">
            Daily Rewards
          </Text>

          <Pressable onPress={() => router.push('/daily-bonus')}>
            <RockCard variant="surface">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-md">
                  <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: withOpacity(Colors.chrome, 0.1) }}>
                    <AppIcon name="calendar_today" size={20} color={Colors.gold} />
                  </View>
                  <View>
                    <Text className="font-heading-md text-heading-md text-text-primary">Daily Bonus</Text>
                    <Text className="font-caption text-caption text-text-muted">Claim in 2h 45m</Text>
                  </View>
                </View>
                <View className="h-4 w-24 overflow-hidden rounded-full" style={{ backgroundColor: withOpacity(Colors.chrome, 0.1) }}>
                  <LinearGradient
                    colors={[Colors.cyan, Colors.chrome]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ width: '80%', height: '100%' }}
                  />
                </View>
              </View>
            </RockCard>
          </Pressable>

          <RockCard variant="surface">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-md">
                <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: withOpacity(Colors.chrome, 0.1) }}>
                  <AppIcon name="casino" size={20} color={Colors.ember} />
                </View>
                <View>
                  <Text className="font-heading-md text-heading-md text-text-primary">Spin to Win</Text>
                  <Text className="font-caption text-caption text-text-muted">1 Free Spin</Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/spin')}
                className="rounded-full px-md py-xs"
                style={{ backgroundColor: withOpacity(Colors.chrome, 0.1), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.5) }}
              >
                <Text className="font-button-label text-button-label uppercase text-text-primary">Spin</Text>
              </Pressable>
            </View>
          </RockCard>
        </View>
      </ScrollView>

      <BottomNav
        activeTab="home"
        onTabPress={(tab) => {
          if (tab === 'ranks') router.push('/world-rankings');
          else if (tab === 'profile') router.push('/iron-id');
          else if (tab === 'shop') router.push('/shop');
          else console.log('tab pressed', tab);
        }}
      />
    </View>
  );
}
