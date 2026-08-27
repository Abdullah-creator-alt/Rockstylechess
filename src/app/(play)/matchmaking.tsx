import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { EmberParticles, PlayerAvatar, RockButton } from '@/components/ui';
import { getAvatarEmoji } from '@/constants/avatars';
import { Colors, Fonts, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { getPlayerId } from '@/lib/playerId';
import { ensureAuthenticated, getSocket } from '@/lib/socket';
import { isDuration, isVenueTier, type QueueMatchedPayload } from '@/lib/onlineMatch';

export default function MatchmakingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(0);
  const { profile } = usePlayerProfile();
  const { venueTier: venueTierParam, duration: durationParam } = useLocalSearchParams<{
    venueTier?: string;
    duration?: string;
  }>();
  const venueTier = isVenueTier(venueTierParam) ? venueTierParam : 'garage';
  const duration = isDuration(durationParam) ? durationParam : '5m';

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  useEffect(() => {
    let cancelled = false;
    const socket = getSocket();

    function handleMatched(payload: QueueMatchedPayload) {
      if (cancelled) return;
      router.replace({
        pathname: '/match',
        params: {
          mode: 'online',
          matchId: payload.matchId,
          color: payload.color,
          fen: payload.fen,
          opponentName: payload.opponent.displayName,
          opponentAvatarId: payload.opponent.avatarId ?? undefined,
          clockW: String(payload.clocks.w),
          clockB: String(payload.clocks.b),
          incrementMs: String(payload.incrementMs),
        },
      });
    }

    socket.on('queue:matched', handleMatched);

    // Wait for the connection's auth token (if any) to attach before
    // emitting -- otherwise a signed-in player's join can race the async
    // SecureStore read in ensureAuthenticated() and go out on the
    // still-anonymous initial connection, silently downgrading them to a
    // guest for that match (no rating/history persisted).
    function joinQueue() {
      Promise.all([ensureAuthenticated(), getPlayerId()]).then(([, guestId]) => {
        if (cancelled) return;
        socket.emit('queue:join', { guestId, displayName: 'AXL_CHESS', venueTier, duration });
      });
    }

    // Re-join on every 'connect' -- Socket.IO fires this for the initial
    // connection AND for every automatic reconnect after a network blip.
    // The server only knows about a waiting player via their current
    // socket.id, so without re-emitting here, a reconnect while still
    // queued (not yet matched) would leave the player stuck forever: the
    // server's queue entry is now stale, and the client never asks again.
    // (server/src/matchmaking.ts's joinQueue treats a repeat join from the
    // same guestId as a refresh, not a duplicate, so this is safe to call
    // more than once.)
    socket.on('connect', joinQueue);
    if (socket.connected) joinQueue();

    return () => {
      cancelled = true;
      socket.off('queue:matched', handleMatched);
      socket.off('connect', joinQueue);
      socket.emit('queue:leave');
    };
  }, [router, venueTier, duration]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * 0.5,
    transform: [{ scale: 1 + pulse.value * 0.08 }],
  }));

  return (
    <View style={[styles.root, { paddingTop: Spacing.xl + insets.top, paddingBottom: Spacing.xl + insets.bottom }]}>
      <EmberParticles count={8} />

      <Text style={styles.title}>Finding Opponent</Text>

      <View style={styles.vsRow}>
        <View style={styles.playerCol}>
          <PlayerAvatar emoji={getAvatarEmoji(profile?.avatarId)} size="large" />
          <Text style={styles.playerName}>{profile?.displayName ?? 'AXL_CHESS'}</Text>
        </View>

        <Text style={styles.vsLabel}>VS</Text>

        <Animated.View style={[styles.playerCol, pulseStyle]}>
          <PlayerAvatar emoji="❓" size="large" />
          <Text style={styles.playerName}>???</Text>
        </Animated.View>
      </View>

      <Text style={styles.searchingText}>Searching for opponent...</Text>

      <View style={styles.cancelWrap}>
        <RockButton
          label="Cancel"
          variant="danger"
          onPress={() => {
            getSocket().emit('queue:leave');
            router.back();
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: withOpacity(Colors.cyan, 0.6),
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  playerCol: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerName: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  vsLabel: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.emberLight,
  },
  searchingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  cancelWrap: {
    marginTop: Spacing.lg,
  },
});
