import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, CurrencyPill, EmberParticles, PlayerAvatar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

type Duration = '3m' | '5m' | '10m';
const DURATIONS: Duration[] = ['3m', '5m', '10m'];

// Stitch-generated preview asset (lh3.googleusercontent.com/aida-public/...).
// Currently resolves fine but has no documented permanence guarantee -- swap
// for a locally bundled asset if it ever 404s.
const ARENA_HERO_IMAGE_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDTtmmYTscDjrsZ86iV8qSp2msuu0-FhpXqgkv3CBMmnYdzD47w98Fk2VKQ_V7gkKiKDgfCAJpyZjbIT9__OBUB2gDTE6EtPDmp4K0ekLTnP6Q1AOGdSVYwHN6X6ZMudanTrkzQLsCiG5NWD_faMGPtIKK02DCzEIMRCzv_4dd4HU8rnzbtYOOk1g4pzokbl-ZzqTllXsqI0fhSPFDOCm0B6bnB5W4rrx_CQfWAY_ZFyh_q5rsJNPv8Mh8PoxF-JgkGy_B7I2G4aPI';

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

interface BentoTile {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
  size: 'lg' | 'sm';
  /** Omit for tiles with no destination screen yet (still console.log-only). */
  route?: '/setup' | '/tournaments' | '/bots' | '/game-room';
}

const BENTO_TILES: BentoTile[] = [
  { id: 'iron-duel', title: 'Iron Duel', subtitle: '1v1 High Stakes', icon: 'sword-cross', accent: Colors.cyan, size: 'lg', route: '/setup' },
  { id: 'tournaments', title: 'Tournaments', subtitle: '8 Live Now', icon: 'trophy', accent: Colors.emberLight, size: 'lg', route: '/tournaments' },
  { id: 'bots', title: 'Vs Bots', icon: 'robot', accent: Colors.cyan, size: 'sm', route: '/bots' },
  { id: 'puzzles', title: 'Puzzles', icon: 'puzzle', accent: Colors.cyan, size: 'sm' },
  { id: 'learn', title: 'Learn', icon: 'school', accent: Colors.cyan, size: 'sm' },
  // Replaces the old decorative, unwired "Watch" tile -- distinct warm
  // accent (rather than the cyan every other small tile uses) so the one
  // real, newly-functional tile doesn't blend into the still-decorative
  // ones next to it (Puzzles/Learn).
  { id: 'game-room', title: 'Game Room', subtitle: 'Play a Friend', icon: 'door-open', accent: Colors.emberLight, size: 'sm', route: '/game-room' },
];

export default function HomeLobbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View style={styles.root}>
      <View style={styles.ambientGlowCyan} />
      <View style={styles.ambientGlowEmber} />
      <EmberParticles count={10} />

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.avatarWrap}>
            <PlayerAvatar emoji="🤘" size="small" />
            <Pressable
              style={styles.forgeBadge}
              onPress={() => {
                console.log('Forge entry point pressed');
                router.push('/forge');
              }}
            >
              <MaterialCommunityIcons name="hammer" size={14} color={Colors.bgBase} />
            </Pressable>
          </View>
          <View>
            <Text style={styles.playerName}>AXL_CHESS</Text>
            <Text style={styles.playerLevel}>LVL 42 GRANDMASTER</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <CurrencyPill
            type="chips"
            value="12.5M"
            onPressAdd={() => {
              console.log('Buy chips');
              router.push('/shop');
            }}
          />
          <CurrencyPill
            type="gems"
            value={1_400}
            onPressAdd={() => {
              console.log('Buy gems');
              router.push('/shop');
            }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.venueRow}
        >
          {VENUES.map((venue) => {
            const isActive = !venue.locked && selectedVenue === venue.id;
            return (
              <Pressable
                key={venue.id}
                onPress={() => handleVenuePress(venue)}
                style={[
                  styles.venueTile,
                  isActive && styles.venueTileActive,
                  venue.locked && styles.venueTileLocked,
                ]}
              >
                {venue.locked ? (
                  <View style={styles.venueLockOverlay}>
                    <MaterialCommunityIcons name="lock" size={18} color={Colors.chromeMid} />
                  </View>
                ) : null}
                <MaterialCommunityIcons
                  name={venue.icon}
                  size={isActive ? 28 : 22}
                  color={venue.locked ? Colors.chromeMid : isActive ? Colors.cyan : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.venueLabel,
                    isActive && styles.venueLabelActive,
                    venue.locked && styles.venueLabelLocked,
                  ]}
                >
                  {venue.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <RockCard
          glowColor={Colors.cyan}
          backgroundImageUri={ARENA_HERO_IMAGE_URI}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroTitle}>The Arena</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Buy-In</Text>
                  <Text style={[styles.statValue, { color: Colors.cyan }]}>250K</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Grand Prize</Text>
                  <Text style={[styles.statValue, { color: Colors.emberLight }]}>500K</Text>
                </View>
              </View>
            </View>

            <View style={styles.durationRow}>
              {DURATIONS.map((d) => {
                const active = duration === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => {
                      setDuration(d);
                      console.log('Duration selected', d);
                    }}
                    style={[styles.durationChip, active && styles.durationChipActive]}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Text style={[styles.durationText, active && styles.durationTextActive]}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.heroButtonWrap}>
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

        <View style={styles.bentoGrid}>
          {BENTO_TILES.map((tile) => (
            <Pressable
              key={tile.id}
              onPress={() => {
                console.log('Bento tile pressed', tile.title);
                if (tile.route) {
                  router.push(tile.route);
                }
              }}
              style={tile.size === 'lg' ? styles.bentoSlotLg : styles.bentoSlotSm}
            >
              <RockCard glowColor={tile.accent} style={styles.bentoCard}>
                <View style={tile.size === 'lg' ? styles.bentoInnerLg : styles.bentoInnerSm}>
                  <MaterialCommunityIcons name={tile.icon} size={tile.size === 'lg' ? 36 : 26} color={tile.accent} />
                  <View>
                    <Text style={styles.bentoTitle}>{tile.title}</Text>
                    {tile.subtitle ? <Text style={styles.bentoSubtitle}>{tile.subtitle}</Text> : null}
                  </View>
                </View>
              </RockCard>
            </Pressable>
          ))}
        </View>

        <View style={styles.dailyHeadingRow}>
          <View style={styles.dailyHeading}>
            <MaterialCommunityIcons name="star" size={18} color={Colors.emberLight} />
            <Text style={styles.dailyHeadingText}>Daily Bonuses</Text>
          </View>
          <View style={styles.dailyHeadingIcons}>
            <Pressable
              style={[styles.dailyHeadingIconButton, styles.dailyHeadingIconButtonGold]}
              onPress={() => {
                console.log('Achievements entry point pressed');
                router.push('/achievements');
              }}
            >
              <MaterialCommunityIcons name="trophy" size={20} color={Colors.gold} />
            </Pressable>
            <Pressable
              style={[styles.dailyHeadingIconButton, styles.dailyHeadingIconButtonCyan]}
              onPress={() => {
                console.log('Collections entry point pressed');
                router.push('/collections');
              }}
            >
              <MaterialCommunityIcons name="cards" size={20} color={Colors.cyan} />
            </Pressable>
          </View>
        </View>
        <View style={styles.dailyGrid}>
          <Pressable
            style={styles.dailySlot}
            onPress={() => {
              console.log('Spin the 45 pressed');
              router.push('/spin');
            }}
          >
            <RockCard glowColor={Colors.emberLight} style={styles.dailyCard}>
              <View style={styles.dailyInner}>
                <View style={styles.dailyIconCircle}>
                  <MaterialCommunityIcons name="rotate-right" size={26} color={Colors.emberLight} />
                </View>
                <View>
                  <Text style={styles.dailyTitle}>Spin the 45</Text>
                  <Text style={styles.dailyReady}>Ready!</Text>
                </View>
              </View>
            </RockCard>
          </Pressable>

          <Pressable
            style={styles.dailySlot}
            onPress={() => {
              console.log('Claim daily bonus pressed');
              router.push('/daily-bonus');
            }}
          >
            <RockCard glowColor={Colors.cyan} style={styles.dailyCard}>
              <View style={styles.dailyInner}>
                <View style={[styles.dailyIconCircle, styles.dailyIconCircleCyan]}>
                  <MaterialCommunityIcons name="gift-outline" size={22} color={Colors.cyan} />
                </View>
                <View>
                  <Text style={styles.dailyTitle}>Daily Bonus</Text>
                  <View style={styles.claimPill}>
                    <Text style={styles.claimPillText}>Claim</Text>
                  </View>
                </View>
              </View>
            </RockCard>
          </Pressable>

          <Pressable
            style={styles.questsSlot}
            onPress={() => {
              console.log('Battle Quests pressed');
              router.push('/quests');
            }}
          >
            <RockCard glowColor={Colors.gold} style={styles.dailyCard}>
              <View style={styles.dailyInner}>
                <View style={[styles.dailyIconCircle, styles.dailyIconCircleGold]}>
                  <MaterialCommunityIcons name="sword-cross" size={22} color={Colors.gold} />
                </View>
                <View>
                  <Text style={styles.dailyTitle}>Battle Quests</Text>
                  <Text style={styles.dailyReady}>3 Active</Text>
                </View>
              </View>
            </RockCard>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.navWrap}>
        <BottomNav
          activeTab="home"
          onTabPress={(tab) => {
            if (tab === 'ranks') router.push('/world-rankings');
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
  ambientGlowCyan: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: withOpacity(Colors.cyan, 0.06),
    boxShadow: `0px 0px 120px ${withOpacity(Colors.cyan, 0.25)}`,
  },
  ambientGlowEmber: {
    position: 'absolute',
    bottom: 60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: withOpacity(Colors.ember, 0.06),
    boxShadow: `0px 0px 100px ${withOpacity(Colors.ember, 0.22)}`,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: withOpacity(Colors.bgPanel, 0.85),
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(Colors.cyan, 0.15),
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  forgeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    borderWidth: 1.5,
    borderColor: Colors.bgBase,
    boxShadow: `0px 0px 6px ${withOpacity(Colors.gold, 0.6)}`,
  },
  playerName: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playerLevel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.emberLight,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
    gap: Spacing.xl,
  },
  venueRow: {
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  venueTile: {
    width: 110,
    height: 80,
    borderRadius: Radius.lg,
    backgroundColor: withOpacity(Colors.bgPanel, 0.7),
    borderWidth: 1,
    borderColor: withOpacity(Colors.ember, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  venueTileActive: {
    width: 130,
    height: 92,
    backgroundColor: withOpacity(Colors.cyan, 0.14),
    borderWidth: 2,
    borderColor: Colors.cyan,
    boxShadow: `0px 0px 20px ${withOpacity(Colors.cyan, 0.4)}`,
  },
  venueTileLocked: {
    opacity: 0.6,
  },
  venueLockOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  venueLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  venueLabelActive: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.cyan,
  },
  venueLabelLocked: {
    color: Colors.chromeMid,
  },
  heroCard: {
    minHeight: 280,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  heroLeft: {
    flexShrink: 1,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    textShadowColor: withOpacity(Colors.bgBase, 0.8),
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  statCol: {
    gap: 2,
  },
  statLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: withOpacity(Colors.chromeDark, 0.5),
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  durationChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  durationChipActive: {
    backgroundColor: Colors.cyan,
    borderColor: Colors.cyan,
  },
  durationText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  durationTextActive: {
    color: Colors.bgBase,
  },
  heroButtonWrap: {
    marginTop: Spacing.lg,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  bentoSlotLg: {
    width: '48%',
  },
  bentoSlotSm: {
    width: '48%',
  },
  bentoCard: {},
  bentoInnerLg: {
    minHeight: 140,
    justifyContent: 'space-between',
  },
  bentoInnerSm: {
    minHeight: 90,
    justifyContent: 'space-between',
  },
  bentoTitle: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  bentoSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  dailyHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dailyHeadingIcons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dailyHeadingIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dailyHeadingIconButtonGold: {
    backgroundColor: withOpacity(Colors.gold, 0.16),
    borderColor: withOpacity(Colors.gold, 0.5),
    boxShadow: `0px 0px 8px ${withOpacity(Colors.gold, 0.3)}`,
  },
  dailyHeadingIconButtonCyan: {
    backgroundColor: withOpacity(Colors.cyan, 0.16),
    borderColor: withOpacity(Colors.cyan, 0.5),
    boxShadow: `0px 0px 8px ${withOpacity(Colors.cyan, 0.3)}`,
  },
  dailyHeadingText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.emberLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dailyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
    marginTop: Spacing.md,
  },
  dailySlot: {
    width: '48%',
  },
  questsSlot: {
    width: '100%',
  },
  dailyCard: {},
  dailyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dailyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.emberLight, 0.12),
  },
  dailyIconCircleCyan: {
    backgroundColor: withOpacity(Colors.cyan, 0.12),
  },
  dailyIconCircleGold: {
    backgroundColor: withOpacity(Colors.gold, 0.12),
  },
  dailyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  dailyReady: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.emberLight,
    letterSpacing: 1,
    marginTop: 2,
  },
  claimPill: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.cyan,
  },
  claimPillText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: Colors.bgBase,
    letterSpacing: 0.5,
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
