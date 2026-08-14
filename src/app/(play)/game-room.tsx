import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CurrencyPill, EmberParticles, PlayerAvatar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { getPlayerId } from '@/lib/playerId';
import { ensureAuthenticated, getSocket } from '@/lib/socket';
import type { QueueMatchedPayload, RoomCreatedPayload, RoomErrorPayload } from '@/lib/onlineMatch';

type Tab = 'create' | 'join';
type CreateState = 'idle' | 'creating' | 'waiting';

// Create a room, get a shareable code back, and wait for a friend to join
// it -- or enter a code someone else shared to join theirs. Both paths
// bottom out in the exact same queue:matched event venue-tier matchmaking
// already uses (see server/src/gameRoom.ts), so once paired this hands off
// to /match identically either way.
export default function GameRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('create');

  const [createState, setCreateState] = useState<CreateState>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  useEffect(() => {
    const socket = getSocket();

    function handleMatched(payload: QueueMatchedPayload) {
      router.replace({
        pathname: '/match',
        params: {
          mode: 'online',
          matchId: payload.matchId,
          color: payload.color,
          fen: payload.fen,
          opponentName: payload.opponent.displayName,
        },
      });
    }

    function handleRoomCreated(payload: RoomCreatedPayload) {
      setCode(payload.code);
      setCreateState('waiting');
    }

    function handleRoomError(payload: RoomErrorPayload) {
      setJoining(false);
      setJoinError(payload.reason === 'own-room' ? "You can't join your own room." : 'Room not found or expired.');
    }

    socket.on('queue:matched', handleMatched);
    socket.on('room:created', handleRoomCreated);
    socket.on('room:error', handleRoomError);

    return () => {
      socket.off('queue:matched', handleMatched);
      socket.off('room:created', handleRoomCreated);
      socket.off('room:error', handleRoomError);
      // Harmless no-op if this session never created a room -- the server
      // just finds nothing to cancel.
      socket.emit('room:cancel');
    };
  }, [router]);

  async function handleCreate() {
    setCreateState('creating');
    // Same race-condition guard matchmaking.tsx's own queue:join relies on
    // -- wait for the connection's auth token to attach before emitting,
    // otherwise a signed-in player's room can silently form as a guest.
    const [, guestId] = await Promise.all([ensureAuthenticated(), getPlayerId()]);
    getSocket().emit('room:create', { guestId, displayName: 'AXL_CHESS' });
  }

  function handleCancelWaiting() {
    getSocket().emit('room:cancel');
    setCreateState('idle');
    setCode(null);
    setCopied(false);
  }

  async function handleCopyCode() {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleJoin() {
    if (joinCode.trim().length === 0) return;
    setJoining(true);
    setJoinError(null);
    const [, guestId] = await Promise.all([ensureAuthenticated(), getPlayerId()]);
    getSocket().emit('room:join', { guestId, displayName: 'AXL_CHESS', code: joinCode.trim() });
  }

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * 0.5,
  }));

  return (
    <View style={styles.root}>
      <EmberParticles count={8} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Game Room</Text>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      <View style={styles.tabBar}>
        <Pressable style={[styles.tab, tab === 'create' && styles.tabActive]} onPress={() => setTab('create')}>
          <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>Create</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'join' && styles.tabActive]} onPress={() => setTab('join')}>
          <Text style={[styles.tabText, tab === 'join' && styles.tabTextActive]}>Join</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {tab === 'create' ? (
          createState === 'waiting' && code ? (
            <>
              <Text style={styles.instructions}>Share this code with a friend</Text>
              <RockCard glowColor={Colors.emberLight} style={styles.codeCard}>
                <Text style={styles.codeText}>{code}</Text>
              </RockCard>
              <Pressable style={styles.copyButton} onPress={handleCopyCode}>
                <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={18} color={Colors.cyan} />
                <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy Code'}</Text>
              </Pressable>

              <Animated.View style={[styles.waitingRow, pulseStyle]}>
                <PlayerAvatar emoji="❓" size="medium" />
                <Text style={styles.waitingText}>Waiting for opponent...</Text>
              </Animated.View>

              <View style={styles.actionWrap}>
                <RockButton label="Cancel" variant="danger" onPress={handleCancelWaiting} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.instructions}>Create a room and invite a friend with a 6-character code.</Text>
              <View style={styles.actionWrap}>
                <RockButton
                  label={createState === 'creating' ? 'Creating...' : 'Create Room'}
                  variant="primary"
                  disabled={createState === 'creating'}
                  onPress={handleCreate}
                />
              </View>
            </>
          )
        ) : (
          <>
            <Text style={styles.instructions}>Enter the 6-character code your friend shared.</Text>
            <TextInput
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase().slice(0, 6))}
              placeholder="ABCDEF"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={6}
              style={styles.codeInput}
            />
            {joinError ? <Text style={styles.errorText}>{joinError}</Text> : null}
            <View style={styles.actionWrap}>
              <RockButton
                label={joining ? 'Joining...' : 'Join Room'}
                variant="primary"
                disabled={joining || joinCode.length === 0}
                onPress={handleJoin}
              />
            </View>
          </>
        )}
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
    fontSize: 15,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: withOpacity(Colors.bgPanel, 0.7),
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.3),
    gap: 4,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: withOpacity(Colors.cyan, 0.18),
    boxShadow: `0px 0px 10px ${withOpacity(Colors.cyan, 0.35)}`,
  },
  tabText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: Colors.cyan,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  instructions: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  actionWrap: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  codeCard: {
    width: '100%',
  },
  codeText: {
    fontFamily: Fonts.display,
    fontSize: 36,
    letterSpacing: 8,
    color: Colors.emberLight,
    textAlign: 'center',
    textShadowColor: withOpacity(Colors.emberLight, 0.5),
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: withOpacity(Colors.bgPanel, 0.7),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.3),
  },
  copyButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  waitingRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  waitingText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  codeInput: {
    width: '100%',
    height: 64,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    color: Colors.textPrimary,
    fontFamily: Fonts.display,
    fontSize: 26,
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.crimson,
    textAlign: 'center',
  },
});
