import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ChatPanel, ChatToast, ChessBoard, ConfirmModal, EmberParticles, PlayerAvatar } from '@/components/ui';
import { StockfishEngine, type StockfishEngineHandle } from '@/components/StockfishEngine';
import { getPieceSprites } from '@/components/ui/pieceSprites';
import { getAvatarImage } from '@/constants/avatars';
import { getBoardTheme } from '@/constants/boardThemes';
import { ScreenArt } from '@/constants/screenArt';
import { Colors, Spacing, withOpacity } from '@/constants/theme';
import { useChessClock, type ClockTimes } from '@/hooks/useChessClock';
import { useChessGame, type BotDifficulty, type ChessGameResult, type GameMode } from '@/hooks/useChessGame';
import { useMatchChat } from '@/hooks/useMatchChat';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { claimMatchReward, reportMatchForQuests } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';
import type { EngineMove, StockfishConfig } from '@/lib/botEngine';
import { setPendingLocalReplay, type LocalMatchReplay } from '@/lib/localMatchReplayStore';
import { MATCH_CHIP_REWARDS } from '@/lib/matchRewards';


// Bot/local always default to this (matches setup.tsx's own default duration
// pick, no dedicated picker exists for these modes). Online's real starting
// time comes from the server once phase 2 lands (server/src/match.ts's
// createMatch, threaded through setup.tsx's actual 3m/5m/10m picker) -- this
// is the interim guess used until then, so online still gets a real ticking
// clock today rather than reverting to static placeholder text.
const DEFAULT_CLOCK_MS = 5 * 60_000;

// Pieces are always lowercase letters from chess.js's `captured` field --
// a tiny local glyph map just for rendering the captured-piece trays.
const CAPTURED_GLYPHS: Record<string, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
};

// Navigation params: bots.tsx passes mode=bot + difficulty (which of the
// four bot engines to use); matchmaking.tsx passes mode=online + matchId/
// color/fen/opponentName once the server has paired a real opponent; the
// PvP/"Iron Duel" flow otherwise defaults to local pass-and-play.
export default function MatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    mode: modeParam,
    difficulty: difficultyParam,
    matchId,
    color: colorParam,
    fen: fenParam,
    opponentName,
    opponentAvatarId,
    botName,
    botEmoji,
    clockW: clockWParam,
    clockB: clockBParam,
    incrementMs: incrementMsParam,
  } = useLocalSearchParams<{
    mode?: string;
    difficulty?: string;
    matchId?: string;
    color?: string;
    fen?: string;
    opponentName?: string;
    opponentAvatarId?: string;
    botName?: string;
    botEmoji?: string;
    clockW?: string;
    clockB?: string;
    incrementMs?: string;
  }>();
  const mode: GameMode = modeParam === 'bot' ? 'bot' : modeParam === 'online' ? 'online' : 'local';
  const difficulty: BotDifficulty =
    difficultyParam === 'medium' ||
    difficultyParam === 'stockfish-basic' ||
    difficultyParam === 'stockfish-lite' ||
    difficultyParam === 'stockfish-strong'
      ? difficultyParam
      : 'easy';
  const isStockfishTier =
    difficulty === 'stockfish-basic' || difficulty === 'stockfish-lite' || difficulty === 'stockfish-strong';
  const playerColor: 'w' | 'b' = colorParam === 'b' ? 'b' : 'w';
  const online =
    mode === 'online' && matchId && fenParam
      ? { matchId, playerColor, initialFen: fenParam }
      : undefined;
  const opponentDisplayName =
    mode === 'online' ? opponentName || 'OPPONENT' : mode === 'bot' ? botName || 'STORM_KING' : 'LOCAL PLAYER';
  // Online opponents get their picked avatar badge; bots keep their roster
  // emoji, and a same-device "local" opponent falls back to the rock hand.
  const opponentAvatarSource = mode === 'online' ? getAvatarImage(opponentAvatarId) : undefined;
  const opponentAvatarEmoji = mode === 'bot' ? botEmoji || '🤖' : mode === 'online' ? undefined : '🤘';
  const navigatedRef = useRef(false);
  const stockfishRef = useRef<StockfishEngineHandle>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [resignVisible, setResignVisible] = useState(false);
  const { profile, refresh: refreshPlayerProfile } = usePlayerProfile();
  const boardTheme = getBoardTheme(profile?.equippedBoardId);
  const pieceSprites = getPieceSprites(profile?.equippedPieceId);

  const requestEngineMove = useCallback((fen: string, config: StockfishConfig): Promise<EngineMove | null> => {
    if (!stockfishRef.current) return Promise.resolve(null);
    return stockfishRef.current.requestBestMove(fen, config);
  }, []);

  async function handleGameOver(result: ChessGameResult) {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    // Close the chat panel before the transition below so it doesn't just
    // vanish abruptly with the rest of the screen.
    setChatOpen(false);

    let outcome: 'win' | 'loss' | 'draw';
    let reason: string;
    if (result.type === 'checkmate') {
      outcome = result.winner === playerColor ? 'win' : 'loss';
      reason = 'checkmate';
    } else if (result.type === 'resignation') {
      outcome = result.winner === playerColor ? 'win' : 'loss';
      reason = 'resignation';
    } else if (result.type === 'forfeit') {
      outcome = result.winner === playerColor ? 'win' : 'loss';
      reason = 'forfeit';
    } else if (result.type === 'timeout') {
      outcome = result.winner === playerColor ? 'win' : 'loss';
      reason = 'timeout';
    } else if (result.type === 'stalemate') {
      outcome = 'draw';
      reason = 'stalemate';
    } else {
      outcome = 'draw';
      reason = 'draw';
    }
    console.log('Game over', outcome, reason);

    const chipsGranted = MATCH_CHIP_REWARDS[outcome];
    if (mode !== 'online') {
      // Bot/local matches never reach the server otherwise (pure
      // client-side chess.js) -- this is the only point a reward gets
      // persisted for those modes. Online matches are already credited
      // authoritatively server-side, inside persistMatchResult.ts, at the
      // same moment this fires -- calling the claim endpoint here too
      // would double-credit.
      const token = await getAuthToken();
      if (token) {
        try {
          await claimMatchReward(token, outcome);
        } catch (error) {
          console.log('Failed to claim match reward', error);
        }
        try {
          const capturedCount =
            playerColor === 'w' ? game.capturedByWhite.length : game.capturedByBlack.length;
          await reportMatchForQuests(token, {
            won: outcome === 'win',
            checkmate: outcome === 'win' && reason === 'checkmate',
            capturedCount,
          });
        } catch (error) {
          console.log('Failed to report match for quests', error);
        }
      }
    }

    // Stashes a client-side replay for the immediate post-match Replay/
    // Analyze Game entry points on result-placeholder.tsx -- for bot/local
    // this is the only record that will ever exist (no server-side match
    // row at all); for online it's a deliberate *duplicate* of what
    // persistMatchResult.ts is also persisting server-side right now, used
    // only for this immediate moment since the server-assigned matches.id
    // isn't knowable client-side yet (see localMatchReplayStore.ts's header
    // comment). null for forfeit (never reachable from bot/local, and not
    // worth the reconnect-mid-game edge case for online either).
    const replayData = game.getReplayData();
    if (replayData && reason !== 'forfeit') {
      setPendingLocalReplay({
        ...replayData,
        mode: mode as 'bot' | 'local' | 'online',
        // Matches the opponent name shown live during the match (opponentDisplayName above).
        opponentLabel: mode === 'local' ? 'Local Match' : opponentDisplayName,
        outcome,
        resultType: reason as LocalMatchReplay['resultType'],
        playedAt: new Date().toISOString(),
        playerColor,
      });
    }

    // Picks up the new balance -- server-credited for online, just-claimed
    // for bot/local, or a no-op for guests (still 'guest' status).
    refreshPlayerProfile();

    // Brief pause so the final position (e.g. the checkmating move) is
    // visible for a beat before the Result screen takes over.
    setTimeout(() => {
      router.replace({
        pathname: '/result-placeholder',
        params: { outcome, reason, chipsGranted: String(chipsGranted) },
      });
    }, 900);
  }

  // useChessClock needs game.turn/isGameOver, so it can't be created before
  // `game` -- but useChessGame's onClockSync needs to reach whichever clock
  // instance that later-created hook returns. Broken via a ref: the arrow
  // passed to useChessGame below only looks up clockReconcileRef.current at
  // CALL time (when a move actually arrives), by which point the clock
  // instance has already been assigned into it a few lines further down,
  // synchronously, in the same render.
  const clockReconcileRef = useRef<((clocks: ClockTimes) => void) | null>(null);
  const game = useChessGame({
    mode,
    difficulty,
    requestEngineMove,
    online,
    onGameOver: handleGameOver,
    onClockSync: (clocks) => clockReconcileRef.current?.(clocks),
  });
  const chat = useMatchChat({ mode, online, isOpen: chatOpen });
  const animateOpponentMove = game.lastMoveSource !== null && game.lastMoveSource !== 'human';

  // Online's real starting time/increment come from the server (via
  // matchmaking.tsx/game-room.tsx's route params, themselves from
  // queue:matched) -- clockW/clockB/incrementMs are only ever present for
  // mode === 'online'; bot/local always fall through to the fixed default.
  const parsedClockW = Number(clockWParam);
  const parsedClockB = Number(clockBParam);
  const parsedIncrement = Number(incrementMsParam);
  const initialClockMs =
    mode === 'online' && Number.isFinite(parsedClockW) && Number.isFinite(parsedClockB)
      ? { w: parsedClockW, b: parsedClockB }
      : { w: DEFAULT_CLOCK_MS, b: DEFAULT_CLOCK_MS };
  const clockIncrementMs = mode === 'online' && Number.isFinite(parsedIncrement) ? parsedIncrement : 0;

  const clock = useChessClock({
    turn: game.turn,
    isGameOver: game.isGameOver,
    initialMs: initialClockMs,
    incrementMs: clockIncrementMs,
    onExpire: (color) => game.reportTimeout(color),
  });
  clockReconcileRef.current = clock.reconcile;

  return (
    <View style={styles.root}>
      <StockfishEngine ref={stockfishRef} enabled={isStockfishTier} />
      <Image
        source={ScreenArt.frontRowCrowd}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={styles.crowdImage}
      />
      <EmberParticles count={8} />

      <View className="flex-row items-center justify-between px-lg pb-sm" style={{ paddingTop: insets.top + Spacing.sm }}>
        <Text className="font-display-hero text-cyan" style={{ fontSize: 16, fontStyle: 'italic', letterSpacing: 0.5 }}>
          RockStyle Chess
        </Text>
        <Pressable
          onPress={() => console.log('Match menu pressed')}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: withOpacity(Colors.bgPanel, 0.6), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.4) }}
        >
          <MaterialCommunityIcons name="dots-vertical" size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <View className="flex-1 justify-between px-md pb-sm">
        <PlayerRow
          name={opponentDisplayName}
          avatarSource={opponentAvatarSource}
          avatarEmoji={opponentAvatarEmoji}
          rank="GRANDMASTER (2150)"
          remainingMs={clock.remainingMs.b}
          accent={Colors.crimson}
          pulsing={game.turn === 'b'}
          captured={game.capturedByBlack}
        />

        <ChessBoard
          board={game.board}
          selectedSquare={game.selectedSquare}
          legalTargets={game.legalTargets}
          checkSquare={game.checkSquare}
          lastMove={game.lastMove}
          turn={game.turn}
          animateLastMove={animateOpponentMove}
          lastMoveSound={game.lastMoveSound}
          onSquarePress={(square) => game.handleSquarePress(square as Parameters<typeof game.handleSquarePress>[0])}
          theme={boardTheme}
          pieceSprites={pieceSprites}
        />

        <PlayerRow
          name={profile?.displayName ?? 'AXL_CHESS'}
          avatarSource={getAvatarImage(profile?.avatarId)}
          rank="PRO (2145)"
          remainingMs={clock.remainingMs.w}
          accent={Colors.cyan}
          pulsing={game.turn === 'w'}
          captured={game.capturedByWhite}
        />
      </View>

      <View
        className="flex-row items-center gap-sm rounded-t-xl px-margin-mobile pt-md"
        style={{ paddingBottom: insets.bottom + 10, backgroundColor: withOpacity(Colors.bgPanel, 0.96), borderTopWidth: 1, borderTopColor: withOpacity(Colors.chromeDark, 0.5) }}
      >
        <ActionPillButton
          icon="chat"
          label="Chat"
          onPress={() => setChatOpen(true)}
          disabled={mode !== 'online'}
          badgeCount={mode === 'online' ? chat.unreadCount : 0}
        />
        <ActionPillButton icon="flag" label="Resign" tone="danger" onPress={() => setResignVisible(true)} />
        <ActionPillButton icon="handshake" label="Draw" onPress={() => console.log('Draw offered')} />
        <Pressable
          onPress={() => router.push('/control-core')}
          className="h-12 w-12 items-center justify-center rounded-lg"
          style={{ backgroundColor: withOpacity(Colors.chromeDark, 0.25), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.4) }}
        >
          <MaterialCommunityIcons name="menu" size={22} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <ChatPanel
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chat.messages}
        myColor={playerColor}
        onSend={chat.send}
        canSend={chat.canSend && !game.isGameOver}
      />

      {chat.toastMessage ? (
        <ChatToast key={chat.toastMessage.id} message={chat.toastMessage} onDismiss={chat.dismissToast} />
      ) : null}

      <ConfirmModal
        visible={resignVisible}
        variant="danger"
        icon="flag"
        title="Resign Match?"
        message="This counts as a loss and your rating will drop. This can't be undone."
        confirmLabel="Resign"
        onCancel={() => setResignVisible(false)}
        onConfirm={() => {
          setResignVisible(false);
          game.resign(playerColor);
        }}
      />
    </View>
  );
}

function PlayerRow({
  name,
  avatarSource,
  avatarEmoji,
  rank,
  remainingMs,
  accent,
  pulsing = false,
  captured = [],
}: {
  name: string;
  avatarSource?: ImageSourcePropType;
  avatarEmoji?: string;
  rank: string;
  remainingMs: number;
  accent: string;
  pulsing?: boolean;
  captured?: string[];
}) {
  return (
    <View className="flex-row items-center justify-between gap-sm px-sm py-xs">
      <View className="flex-shrink flex-row items-center gap-sm">
        <PlayerAvatar source={avatarSource} emoji={avatarEmoji} size="small" />
        <View className="flex-shrink">
          <Text className="font-display-hero uppercase text-text-primary" style={{ fontSize: 14 }} numberOfLines={1}>
            {name}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <MaterialCommunityIcons name="star" size={11} color={Colors.gold} />
            <Text className="font-heading-md uppercase text-text-muted" style={{ fontSize: 10 }}>
              {rank}
            </Text>
          </View>
        </View>
      </View>

      <View className="items-end gap-1">
        <TimerPill remainingMs={remainingMs} accent={accent} pulsing={pulsing} />
        {captured.length > 0 ? (
          <View
            className="flex-row flex-wrap rounded-full px-sm"
            style={{ paddingVertical: 2, backgroundColor: withOpacity(Colors.chromeDark, 0.35), maxWidth: 120 }}
          >
            {captured.map((piece, index) => (
              <Text key={`${piece}-${index}`} style={{ fontSize: 13, color: accent, opacity: 0.9 }}>
                {CAPTURED_GLYPHS[piece] ?? ''}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

type ClockUrgency = 'normal' | 'low' | 'critical';

// Absolute thresholds, not proportional to base time -- the last 10-30
// seconds reads as "flag territory" regardless of whether the game started
// with 3 or 10 minutes on the clock, matching established chess-app convention.
function clockUrgency(ms: number): ClockUrgency {
  if (ms < 10_000) return 'critical';
  if (ms < 30_000) return 'low';
  return 'normal';
}

function formatClockMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Urgency color applies regardless of whose turn it is (a frozen-but-low
// clock is still worth flagging visually) -- the breathing pulse below is
// reserved for critical AND actively ticking, since a clock that isn't
// running can't be racing toward zero.
function TimerPill({ remainingMs, accent, pulsing }: { remainingMs: number; accent: string; pulsing: boolean }) {
  const urgency = clockUrgency(remainingMs);
  const isCriticalAndTicking = urgency === 'critical' && pulsing;
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = isCriticalAndTicking
      ? withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true)
      : 0;
  }, [isCriticalAndTicking, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isCriticalAndTicking ? 0.75 + pulse.value * 0.25 : 1,
    transform: [{ scale: isCriticalAndTicking ? 1 + pulse.value * 0.05 : 1 }],
  }));

  // Urgency wins (critical -> crimson, low -> gold); otherwise the active
  // side glows its accent and the idle side sits muted grey.
  const urgencyColor =
    urgency === 'critical' ? Colors.crimson : urgency === 'low' ? Colors.gold : pulsing ? accent : Colors.chromeMid;

  return (
    <Animated.View
      className="items-center justify-center rounded-lg px-md"
      style={[
        {
          minWidth: 92,
          paddingVertical: 6,
          borderWidth: 1,
          backgroundColor: withOpacity(urgencyColor, pulsing ? 0.12 : 0.06),
          borderColor: withOpacity(urgencyColor, pulsing ? 0.9 : 0.35),
          boxShadow: pulsing ? `0px 0px 15px ${withOpacity(urgencyColor, 0.5)}` : undefined,
        },
        animatedStyle,
      ]}
    >
      <Text className="font-display-hero" style={{ fontSize: 22, color: urgencyColor }}>
        {formatClockMs(remainingMs)}
      </Text>
    </Animated.View>
  );
}

function ActionPillButton({
  icon,
  label,
  onPress,
  tone = 'neutral',
  disabled = false,
  badgeCount = 0,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'danger';
  disabled?: boolean;
  badgeCount?: number;
}) {
  const bg = tone === 'danger' ? Colors.crimson : withOpacity(Colors.chromeDark, 0.25);
  const border = tone === 'danger' ? withOpacity(Colors.textPrimary, 0.2) : withOpacity(Colors.chromeDark, 0.4);
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className="h-12 flex-1 flex-row items-center justify-center gap-1 rounded-lg"
      style={{ backgroundColor: bg, borderWidth: 1, borderColor: border, opacity: disabled ? 0.4 : 1 }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={Colors.textPrimary} />
      <Text className="font-button-label uppercase text-text-primary" style={{ fontSize: 13 }}>
        {label}
      </Text>
      {badgeCount > 0 ? (
        <View
          className="absolute items-center justify-center rounded-full px-1"
          style={{ top: -4, right: -4, minWidth: 16, height: 16, backgroundColor: Colors.emberLight }}
        >
          <Text className="font-heading-md" style={{ fontSize: 9, color: Colors.bgBase }}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// #region Styles
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  crowdImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '22%',
    opacity: 0.35,
  },
});
// #endregion
