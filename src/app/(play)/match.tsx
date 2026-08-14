import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BottomNav, ChatPanel, ChatToast, ChessBoard, EmberParticles, RockCard } from '@/components/ui';
import { StockfishEngine, type StockfishEngineHandle } from '@/components/StockfishEngine';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { useChessGame, type BotDifficulty, type ChessGameResult, type GameMode } from '@/hooks/useChessGame';
import { useMatchChat } from '@/hooks/useMatchChat';
import type { EngineMove, StockfishConfig } from '@/lib/botEngine';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const CROWD_SILHOUETTE_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDaXXF0CMT7YW54CZmBpXIOWSCkNu7f13zeFglHBL71SHNZUnIcnmsAPYJuARLUDUhW2NLzJeYUoroRs7WPB1MX64AwC4XcrsGxqyHm0rwQMwHXNDD4bM2A2mmcbPGaofF-E65LuOEAmQnE76snvgaeLDgOkZQaIRDsMuRZb6zpM8cpvnCavM9yobNyZJ5Beuq0tWPeQheeG4D22tc0571ruxYhbts4_8_jNbt8Y-ENdSAul4ZsKWQxW1Xzqd2801Uz8BWyT-lmbKg';

const MOVE_HISTORY =
  '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e5 7.Nb3 Be7 8.f3 Be6 9.Qd2 Nbd7 10.O-O-O O-O 11.g4 b5 12.g5 Nh5  •  ';

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
  } = useLocalSearchParams<{
    mode?: string;
    difficulty?: string;
    matchId?: string;
    color?: string;
    fen?: string;
    opponentName?: string;
  }>();
  const mode: GameMode = modeParam === 'bot' ? 'bot' : modeParam === 'online' ? 'online' : 'local';
  const difficulty: BotDifficulty =
    difficultyParam === 'medium' || difficultyParam === 'stockfish-lite' || difficultyParam === 'stockfish-strong'
      ? difficultyParam
      : 'easy';
  const isStockfishTier = difficulty === 'stockfish-lite' || difficulty === 'stockfish-strong';
  const playerColor: 'w' | 'b' = colorParam === 'b' ? 'b' : 'w';
  const online =
    mode === 'online' && matchId && fenParam
      ? { matchId, playerColor, initialFen: fenParam }
      : undefined;
  const navigatedRef = useRef(false);
  const stockfishRef = useRef<StockfishEngineHandle>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const requestEngineMove = useCallback((fen: string, config: StockfishConfig): Promise<EngineMove | null> => {
    if (!stockfishRef.current) return Promise.resolve(null);
    return stockfishRef.current.requestBestMove(fen, config);
  }, []);

  function handleGameOver(result: ChessGameResult) {
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
    } else if (result.type === 'stalemate') {
      outcome = 'draw';
      reason = 'stalemate';
    } else {
      outcome = 'draw';
      reason = 'draw';
    }
    console.log('Game over', outcome, reason);

    // Brief pause so the final position (e.g. the checkmating move) is
    // visible for a beat before the Result screen takes over.
    setTimeout(() => {
      router.replace({ pathname: '/result-placeholder', params: { outcome, reason } });
    }, 900);
  }

  const game = useChessGame({ mode, difficulty, requestEngineMove, online, onGameOver: handleGameOver });
  const chat = useMatchChat({ mode, online, isOpen: chatOpen });
  const animateOpponentMove = game.lastMoveSource !== null && game.lastMoveSource !== 'human';

  return (
    <View style={styles.root}>
      <StockfishEngine ref={stockfishRef} enabled={isStockfishTier} />
      <Image
        source={{ uri: CROWD_SILHOUETTE_URI }}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={styles.crowdImage}
      />
      <EmberParticles count={8} />

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.topBarTitle}>RockStyle Chess</Text>
        <View style={styles.xpPill}>
          <Text style={styles.xpPillText}>XP: 2400</Text>
        </View>
      </View>

      <View style={styles.middle}>
        <PlayerRow
          name={mode === 'online' ? opponentName || 'OPPONENT' : 'STORM_KING'}
          rank="GRANDMASTER (2150)"
          time="03:45"
          accent={Colors.crimson}
          pulsing={game.turn === 'b'}
          captured={game.capturedByBlack}
        />

        <MoveTicker />

        <ChessBoard
          board={game.board}
          selectedSquare={game.selectedSquare}
          legalTargets={game.legalTargets}
          checkSquare={game.checkSquare}
          lastMove={game.lastMove}
          turn={game.turn}
          animateLastMove={animateOpponentMove}
          onSquarePress={(square) => game.handleSquarePress(square as Parameters<typeof game.handleSquarePress>[0])}
        />

        <ActionBar
          onResign={() => game.resign(playerColor)}
          mode={mode}
          unreadCount={chat.unreadCount}
          onOpenChat={() => setChatOpen(true)}
        />

        <PlayerRow
          name="AXL_CHESS"
          rank="PRO (2145)"
          time="04:12"
          accent={Colors.cyan}
          pulsing={game.turn === 'w'}
          captured={game.capturedByWhite}
        />
      </View>

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
    </View>
  );
}

function PlayerRow({
  name,
  rank,
  time,
  accent,
  pulsing = false,
  captured = [],
}: {
  name: string;
  rank: string;
  time: string;
  accent: string;
  pulsing?: boolean;
  captured?: string[];
}) {
  return (
    <View style={styles.playerBlock}>
      <View style={styles.playerRow}>
        <RockCard style={styles.playerCard}>
          <View style={styles.playerCardInner}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color={accent} />
            <View>
              <Text style={styles.playerCardName}>{name}</Text>
              <Text style={styles.playerCardRank}>{rank}</Text>
            </View>
          </View>
        </RockCard>

        <View
          style={[
            styles.timerPill,
            {
              backgroundColor: withOpacity(accent, 0.18),
              borderColor: accent,
              boxShadow: pulsing ? `0px 0px 15px ${withOpacity(accent, 0.5)}` : undefined,
            },
          ]}
        >
          <Text style={[styles.timerText, { color: accent }]}>{time}</Text>
        </View>
      </View>

      {captured.length > 0 ? (
        <View style={styles.capturedRow}>
          {captured.map((piece, index) => (
            <Text key={`${piece}-${index}`} style={[styles.capturedGlyph, { color: accent }]}>
              {CAPTURED_GLYPHS[piece] ?? ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MoveTicker() {
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (textWidth === 0) return;
    translateX.value = 0;
    translateX.value = withRepeat(withTiming(-textWidth, { duration: 14000, easing: Easing.linear }), -1, false);
  }, [textWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.tickerContainer}>
      <Animated.Text
        onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
        style={[styles.tickerText, animatedStyle]}
        numberOfLines={1}
      >
        {MOVE_HISTORY + MOVE_HISTORY}
      </Animated.Text>
    </View>
  );
}

function ActionBar({
  onResign,
  mode,
  unreadCount,
  onOpenChat,
}: {
  onResign: () => void;
  mode: GameMode;
  unreadCount: number;
  onOpenChat: () => void;
}) {
  return (
    <View style={styles.actionBarWrap}>
      <RockCard style={styles.actionBarCard}>
        <View style={styles.actionBarRow}>
          <ActionButton
            icon="message-text-outline"
            label="Chat"
            colors={[Colors.chromeDark, Colors.bgBase]}
            onPress={onOpenChat}
            badgeCount={mode === 'online' ? unreadCount : 0}
            disabled={mode !== 'online'}
          />
          <ActionButton
            icon="lightbulb-on-outline"
            label="Hint"
            colors={[Colors.cyan, Colors.cyan]}
            onPress={() => console.log('Hint pressed')}
          />
          <ActionButton
            icon="flag"
            label=""
            colors={[Colors.crimson, Colors.crimson]}
            shape="circle"
            size={60}
            iconSize={24}
            onPress={onResign}
          />
          <ActionButton
            icon="handshake"
            label="Draw"
            colors={[Colors.chromeDark, Colors.bgBase]}
            onPress={() => console.log('Draw offered')}
          />
          <ActionButton
            icon="menu"
            label="Menu"
            colors={[Colors.chromeDark, Colors.bgBase]}
            onPress={() => console.log('Menu pressed')}
          />
        </View>
      </RockCard>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  colors,
  onPress,
  shape = 'square',
  size = 52,
  iconSize = 20,
  badgeCount = 0,
  disabled = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  colors: readonly [ColorValue, ColorValue];
  onPress: () => void;
  shape?: 'square' | 'circle';
  size?: number;
  iconSize?: number;
  badgeCount?: number;
  disabled?: boolean;
}) {
  const radius = shape === 'circle' ? size / 2 : Radius.md;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          width: size,
          height: size,
          borderRadius: radius,
          boxShadow: `0px 4px 12px ${withOpacity(Colors.bgBase, 0.7)}, 0px 0px 14px ${withOpacity(String(colors[0]), 0.4)}`,
          transform: [{ scale: pressed ? 0.92 : 1 }],
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={colors}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(Colors.chrome, 0.4), withOpacity(Colors.chrome, 0)]}
        style={[styles.actionButtonGloss, { borderRadius: radius }]}
      />
      <MaterialCommunityIcons name={icon} size={iconSize} color={Colors.textPrimary} />
      {label ? <Text style={styles.actionButtonLabel}>{label}</Text> : null}
      {badgeCount > 0 ? (
        <View style={styles.actionButtonBadge}>
          <Text style={styles.actionButtonBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  topBarTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.cyan,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  xpPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: withOpacity(Colors.cyan, 0.1),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.2),
  },
  xpPillText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.cyan,
  },
  middle: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    justifyContent: 'space-between',
  },
  playerBlock: {
    gap: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  capturedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    paddingHorizontal: Spacing.sm,
  },
  capturedGlyph: {
    fontSize: 14,
    opacity: 0.85,
  },
  playerCard: {
    flexShrink: 1,
  },
  playerCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerCardName: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  playerCardRank: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  timerPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  timerText: {
    fontFamily: Fonts.display,
    fontSize: 16,
  },
  tickerContainer: {
    height: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgPanel, 0.6),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.2),
  },
  tickerText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.cyan,
    letterSpacing: 1,
    textTransform: 'uppercase',
    width: 2000,
  },
  actionBarWrap: {
    marginTop: Spacing.xs,
  },
  actionBarCard: {},
  actionBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actionButtonGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  actionButtonLabel: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    // Pinned explicitly (not left to the font's natural metrics) -- custom
    // TTFs like Oswald can report a much taller default line height on
    // native than in a browser, which combined with actionButton's
    // overflow: 'hidden' silently clipped the bottom of this label on
    // native even though it looked fine on web.
    lineHeight: 11,
    color: withOpacity(Colors.textPrimary, 0.85),
    textTransform: 'uppercase',
    marginTop: 2,
  },
  actionButtonBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.emberLight,
    boxShadow: `0px 0px 8px ${withOpacity(Colors.emberLight, 0.6)}`,
  },
  actionButtonBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    color: Colors.bgBase,
  },
  navWrap: {
    left: 0,
    right: 0,
  },
});
