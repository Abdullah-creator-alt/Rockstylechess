import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, CurrencyPill, ProgressBar, RockButton, RockCard, SectionLabel } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const STADIUM_BACKGROUND_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBbeRUbooc5RlBVWKdVwe3IsQuh_lpnts_q05_Ucli69A7adfvfhAIW4-8NPYCuV6_SCbrZ8MtJZGfy8aDP43Jc09Eza8JpoFJa2rg0meJNgWfGa66ITQkJdh9wnbbUACIgUCX5nu7F6UTUkG1v9V0YXNMEIxNApx44trxRlRik-frfqovsIkgu8fdxQe0ZZzxDixwHHQu5YirB5Bv2BeZ8yJpYZ-krAFPr04YRh2JcI3s3r1tL8tR-p6ncx2Chuwizo0ya0XFFDDw';

interface UpcomingEvent {
  id: string;
  title: string;
  subtitle: string;
  startsIn: string;
  accent: string;
  locked: boolean;
}

const UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    id: 'blitz-battle',
    title: 'Blitz Battle',
    subtitle: 'Fast-paced 3min games • Winner takes 500k',
    startsIn: '2h',
    accent: Colors.cyan,
    locked: false,
  },
  {
    id: 'night-of-the-king',
    title: 'Night of the King',
    subtitle: 'Elimination bracket • Pro Ranking Points',
    startsIn: '6h',
    accent: Colors.emberLight,
    locked: false,
  },
  {
    id: 'rock-n-roll-rapid',
    title: "Rock 'n' Roll Rapid",
    subtitle: 'Classic 10min time control • Entry 50k',
    startsIn: '12h',
    accent: Colors.textMuted,
    locked: true,
  },
];

export default function TournamentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: STADIUM_BACKGROUND_URI }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={300}
        style={styles.backgroundImage}
      />
      {/* Matches the source's `bg-gradient-to-t from-base-black via-transparent
          to-transparent` -- only the bottom edge darkens, rest stays clear of
          the photo. The source's animated conic-gradient searchlight sweeps
          aren't representable with LinearGradient, so they're approximated
          below with two static soft glow blobs instead of skipped outright. */}
      <LinearGradient
        pointerEvents="none"
        colors={[Colors.bgBase, withOpacity(Colors.bgBase, 0)]}
        locations={[0, 0.4]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.backgroundImage}
      />
      <View style={styles.searchlightLeft} />
      <View style={styles.searchlightRight} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Championship Circuit</Text>
        <CurrencyPill type="chips" value="12.5M" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.liveHeader}>
          <Text style={styles.liveLabel}>Live Now</Text>
          <View style={styles.onAirRow}>
            <View style={styles.onAirDot} />
            <Text style={styles.onAirText}>On Air</Text>
          </View>
        </View>

        <RockCard glowColor={Colors.cyan} style={styles.liveCard}>
          <View style={styles.liveTopRow}>
            <View>
              <View style={styles.circuitBadge}>
                <Text style={styles.circuitBadgeText}>The Championship Circuit</Text>
              </View>
              <Text style={styles.tournamentTitle}>Grandmaster Open</Text>
            </View>
            <View style={styles.endsInCol}>
              <Text style={styles.endsInLabel}>Ends in</Text>
              <Text style={styles.endsInValue}>04:12:09</Text>
            </View>
          </View>

          <View style={styles.prizeBlock}>
            <Text style={styles.prizeLabel}>Grand Prize Pool</Text>
            <Text style={styles.prizeValue}>100,000,000 CHIPS</Text>
          </View>

          <View style={styles.joinRow}>
            <View style={styles.fillCol}>
              <View style={styles.fillLabelRow}>
                <Text style={styles.fillLabel}>1,240 / 2,000 PLAYERS</Text>
                <Text style={styles.fillPercent}>62% FULL</Text>
              </View>
              <ProgressBar progress={0.62} />
            </View>
          </View>

          <View style={styles.joinButtonWrap}>
            <RockButton
              label="Join Now - 1M"
              variant="primary"
              onPress={() => console.log('Join Grandmaster Open pressed')}
            />
          </View>
        </RockCard>

        <SectionLabel label="My Tickets" />
        <RockCard style={styles.ticketCard}>
          <View style={styles.ticketRow}>
            <View style={styles.ticketIconCircle}>
              <MaterialCommunityIcons name="ticket-confirmation" size={28} color={Colors.cyan} />
            </View>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketTitle}>Challenger Series</Text>
              <Text style={styles.ticketSubtitle}>Table #42 • Round 3/5</Text>
            </View>
          </View>
          <View style={styles.goToArenaButtonWrap}>
            <RockButton label="Go to Arena" variant="primary" onPress={() => console.log('Go to Arena pressed')} />
          </View>
        </RockCard>

        <SectionLabel label="Upcoming Events" />
        <View style={styles.eventsList}>
          {UPCOMING_EVENTS.map((event) => (
            <Pressable
              key={event.id}
              onPress={() =>
                console.log(event.locked ? `${event.title} is locked` : `${event.title} pressed`)
              }
            >
              <RockCard style={[styles.eventCard, event.locked && styles.eventCardLocked]}>
                <View style={styles.eventRow}>
                  <View style={styles.eventTimeCol}>
                    <Text style={styles.eventTimeValue}>{event.startsIn}</Text>
                    <Text style={styles.eventTimeLabel}>Starts</Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={[styles.eventTitle, { color: event.accent }]}>{event.title}</Text>
                    <Text style={styles.eventSubtitle}>{event.subtitle}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={event.locked ? 'lock' : 'chevron-right'}
                    size={20}
                    color={Colors.textMuted}
                  />
                </View>
              </RockCard>
            </Pressable>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.navWrap}>
        <BottomNav
          activeTab="play"
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
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  searchlightLeft: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    width: 200,
    height: 360,
    borderRadius: 100,
    backgroundColor: withOpacity(Colors.cyan, 0.08),
    boxShadow: `0px 0px 100px ${withOpacity(Colors.cyan, 0.2)}`,
  },
  searchlightRight: {
    position: 'absolute',
    bottom: 0,
    right: '15%',
    width: 180,
    height: 320,
    borderRadius: 100,
    backgroundColor: withOpacity(Colors.cyan, 0.08),
    boxShadow: `0px 0px 100px ${withOpacity(Colors.cyan, 0.2)}`,
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
    fontSize: 14,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 110,
    gap: Spacing.lg,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  liveLabel: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  onAirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onAirDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.crimson,
  },
  onAirText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.crimson,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  liveCard: {},
  liveTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  circuitBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: withOpacity(Colors.cyan, 0.1),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.2),
  },
  circuitBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    color: Colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tournamentTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.textPrimary,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  endsInCol: {
    alignItems: 'flex-end',
  },
  endsInLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  endsInValue: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  prizeBlock: {
    marginTop: Spacing.lg,
  },
  prizeLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  prizeValue: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.gold,
    marginTop: 2,
    textShadowColor: withOpacity(Colors.gold, 0.4),
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  joinRow: {
    marginTop: Spacing.lg,
  },
  fillCol: {
    gap: 4,
  },
  fillLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fillLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.cyan,
  },
  fillPercent: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  joinButtonWrap: {
    marginTop: Spacing.lg,
  },
  ticketCard: {
    gap: Spacing.md,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ticketIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.cyan, 0.1),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.3),
  },
  ticketInfo: {
    flexShrink: 1,
  },
  ticketTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  ticketSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  goToArenaButtonWrap: {
    marginTop: Spacing.md,
  },
  eventsList: {
    gap: Spacing.sm,
  },
  eventCard: {},
  eventCardLocked: {
    opacity: 0.7,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  eventTimeCol: {
    alignItems: 'center',
    paddingRight: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: withOpacity(Colors.chromeDark, 0.4),
  },
  eventTimeValue: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  eventTimeLabel: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  eventSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
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
