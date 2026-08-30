import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { AppIcon, CurrencyPill, EmberParticles, GlowBox, PlayerAvatar, RockButton, ScreenBackdrop } from '@/components/ui';
import { SubPageHeader } from '@/components/layout';
import { ScreenArt } from '@/constants/screenArt';
import { Colors, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
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
  const { gems } = usePlayerProfile();
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
          opponentAvatarId: payload.opponent.avatarId ?? undefined,
          clockW: String(payload.clocks.w),
          clockB: String(payload.clocks.b),
          incrementMs: String(payload.incrementMs),
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
    <View className="flex-1 bg-bg-base">
      <ScreenBackdrop source={ScreenArt.gameRoom} opacity={0.28} />
      <EmberParticles count={8} />
      <SubPageHeader title="Game Room" trailing={<CurrencyPill type="gems" value={gems} />} />

      <View className="mt-xl w-full flex-row self-center rounded-xl p-1" style={{ maxWidth: 380, backgroundColor: withOpacity(Colors.bgPanel, 0.5), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.3) }}>
        <Pressable onPress={() => setTab('create')} className="flex-1 items-center rounded-lg py-sm" style={tab === 'create' ? { backgroundColor: withOpacity(Colors.cyan, 0.1), borderWidth: 1, borderColor: withOpacity(Colors.cyan, 0.2) } : undefined}>
          <Text className="font-section-header text-section-header uppercase tracking-widest" style={{ color: tab === 'create' ? Colors.cyan : Colors.textMuted }}>
            Create
          </Text>
        </Pressable>
        <Pressable onPress={() => setTab('join')} className="flex-1 items-center rounded-lg py-sm" style={tab === 'join' ? { backgroundColor: withOpacity(Colors.cyan, 0.1), borderWidth: 1, borderColor: withOpacity(Colors.cyan, 0.2) } : undefined}>
          <Text className="font-section-header text-section-header uppercase tracking-widest" style={{ color: tab === 'join' ? Colors.cyan : Colors.textMuted }}>
            Join
          </Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center gap-lg px-xl" style={{ paddingTop: 24, paddingBottom: insets.bottom + 24 }}>
        {tab === 'create' ? (
          createState === 'waiting' && code ? (
            <>
              <Text className="text-center font-body-base text-body-base text-text-muted">Share this code with a friend</Text>
              <GlowBox color="ember" style={{ width: '100%', maxWidth: 380 }}>
                <View className="items-center rounded-xl p-lg" style={{ backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.5) }}>
                  <Text
                    className="font-display-hero"
                    style={{ fontSize: 36, letterSpacing: 8, color: Colors.emberLight, textShadowColor: withOpacity(Colors.emberLight, 0.5), textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } }}
                  >
                    {code}
                  </Text>
                </View>
              </GlowBox>
              <Pressable className="flex-row items-center gap-1 rounded-lg px-md py-sm" style={{ backgroundColor: withOpacity(Colors.bgPanel, 0.7), borderWidth: 1, borderColor: withOpacity(Colors.cyan, 0.3) }} onPress={handleCopyCode}>
                <AppIcon name={copied ? 'check' : 'content_copy'} size={18} color={Colors.cyan} />
                <Text className="font-section-header text-caption uppercase text-cyan">{copied ? 'Copied!' : 'Copy Code'}</Text>
              </Pressable>

              <Animated.View className="mt-md items-center gap-sm" style={pulseStyle}>
                <PlayerAvatar emoji="❓" size="medium" />
                <Text className="font-body-sm text-body-sm text-text-muted">Waiting for opponent...</Text>
              </Animated.View>

              <View className="mt-sm w-full">
                <RockButton label="Cancel" variant="danger" onPress={handleCancelWaiting} />
              </View>
            </>
          ) : (
            <>
              <Text className="text-center font-body-base text-body-base text-text-muted">Create a room and invite a friend with a 6-character code.</Text>
              <View className="mt-sm w-full">
                <RockButton label={createState === 'creating' ? 'Creating...' : 'Create Room'} variant="primary" disabled={createState === 'creating'} onPress={handleCreate} />
              </View>
            </>
          )
        ) : (
          <>
            <Text className="text-center font-body-base text-body-base text-text-muted">Enter the 6-character code your friend shared.</Text>
            <TextInput
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase().slice(0, 6))}
              placeholder="ABCDEF"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={6}
              className="w-full rounded-lg font-display-hero text-cyan"
              style={{ height: 64, borderWidth: 1.5, borderColor: withOpacity(Colors.chromeDark, 0.4), backgroundColor: withOpacity(Colors.bgBase, 0.5), fontSize: 26, letterSpacing: 8, textAlign: 'center' }}
            />
            {joinError ? <Text className="text-center font-body-sm text-body-sm text-crimson">{joinError}</Text> : null}
            <View className="mt-sm w-full">
              <RockButton label={joining ? 'Joining...' : 'Join Room'} variant="primary" disabled={joining || joinCode.length === 0} onPress={handleJoin} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
