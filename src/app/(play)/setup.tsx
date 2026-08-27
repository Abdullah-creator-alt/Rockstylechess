import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyPill, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import type { Duration } from '@/lib/onlineMatch';

const DURATIONS: Duration[] = ['3m', '5m', '10m'];

interface Venue {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  buyIn: number;
  prize: number;
}

const VENUES: Venue[] = [
  { id: 'garage', name: 'The Garage', icon: 'garage', buyIn: 0, prize: 0 },
  { id: 'club', name: 'The Club', icon: 'glass-cocktail', buyIn: 10_000, prize: 20_000 },
  { id: 'arena', name: 'The Arena', icon: 'stadium-variant', buyIn: 250_000, prize: 500_000 },
  { id: 'stadium', name: 'The Stadium', icon: 'castle', buyIn: 2_000_000, prize: 4_000_000 },
  { id: 'mainstage', name: 'Mainstage', icon: 'guitar-electric', buyIn: 25_000_000, prize: 50_000_000 },
  { id: 'world-tour', name: 'World Tour', icon: 'earth', buyIn: 100_000_000, prize: 200_000_000 },
];

function formatChips(value: number): string {
  if (value === 0) return 'FREE';
  if (value >= 1_000_000) return `${value % 1_000_000 === 0 ? value / 1_000_000 : (value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${value % 1_000 === 0 ? value / 1_000 : (value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

export default function PlaySetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { chips } = usePlayerProfile();
  const [selectedVenueId, setSelectedVenueId] = useState('arena');
  const [duration, setDuration] = useState<Duration>('5m');

  const selectedVenue = VENUES.find((v) => v.id === selectedVenueId) ?? VENUES[2];

  function handleVenuePress(venue: Venue) {
    if (venue.buyIn > chips) {
      console.log('Venue locked - insufficient chips', venue.name);
      return;
    }
    setSelectedVenueId(venue.id);
    console.log('Venue selected', venue.name);
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Select Venue</Text>
        <CurrencyPill type="chips" value={chips} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ladderRow}
        >
          {VENUES.map((venue) => {
            const locked = venue.buyIn > chips;
            const isActive = !locked && selectedVenueId === venue.id;
            return (
              <Pressable
                key={venue.id}
                onPress={() => handleVenuePress(venue)}
                style={[styles.venueTile, isActive && styles.venueTileActive, locked && styles.venueTileLocked]}
              >
                {locked ? (
                  <View style={styles.venueLockOverlay}>
                    <MaterialCommunityIcons name="lock" size={18} color={Colors.chromeMid} />
                  </View>
                ) : null}
                <MaterialCommunityIcons
                  name={venue.icon}
                  size={isActive ? 28 : 22}
                  color={locked ? Colors.chromeMid : isActive ? Colors.cyan : Colors.textMuted}
                />
                <Text style={[styles.venueLabel, isActive && styles.venueLabelActive, locked && styles.venueLabelLocked]}>
                  {venue.name}
                </Text>
                <Text style={[styles.venueBuyIn, locked && styles.venueLabelLocked]}>
                  {formatChips(venue.buyIn)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <RockCard glowColor={Colors.cyan} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroTitle}>{selectedVenue.name}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Buy-In</Text>
                  <Text style={[styles.statValue, { color: Colors.cyan }]}>{formatChips(selectedVenue.buyIn)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Grand Prize</Text>
                  <Text style={[styles.statValue, { color: Colors.emberLight }]}>{formatChips(selectedVenue.prize)}</Text>
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
                router.push({ pathname: '/matchmaking', params: { venueTier: selectedVenue.id, duration } });
              }}
            />
          </View>
        </RockCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgPanel, 0.8),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
    gap: Spacing.xl,
  },
  ladderRow: {
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  venueTile: {
    width: 110,
    height: 96,
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
    height: 108,
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
  venueBuyIn: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.gold,
  },
  heroCard: {
    minHeight: 200,
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
  bottomSpacer: {
    height: 20,
  },
});
