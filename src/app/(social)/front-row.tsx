import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ChessBoard, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const CROWD_SILHOUETTE_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCPz1xxKlE-mvs41pAs7kT2BRNA7pcF8Jo6jGBWZE2Di5IBuOOQVNCCjXKSP4PCdubwIcJS8OK4xBm4oWbhiG2nSgSJUYxWDdqc175vPBjq7Hi4y9mGQErQjowktB6af_Cl5DX2QSIOrWNzhREmDKpYwUaPMFE-TpIZfvDYqCxA3mZwrAPJsJayR_vcmnoY_UI6MUQaywVVFa8oEyLmD90wMudFZSbWW6s9ecUClqT0KODPIBGpAi029l_b3ycOkhSCPrOa7vGqJyA';

const CHAT_TICKER =
  'User_99: Incredible sacrifice!  •  ChessWiz: Hikaru is in trouble now.  •  Grandmaster_Fan: Wait for the engine evaluation!  •  ';

const REACTIONS = ['🔥', '⚡', '👏', '🤯', '👑'];

interface FloatingReaction {
  id: number;
  emoji: string;
  left: number;
}

export default function FrontRowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  function handleReactionPress(emoji: string) {
    const id = Date.now() + Math.random();
    const left = 40 + Math.random() * 60;
    setFloatingReactions((prev) => [...prev, { id, emoji, left }]);
    console.log('Reaction sent', emoji);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  }

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: CROWD_SILHOUETTE_URI }}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={styles.crowdImage}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Front Row</Text>
        <LiveBadge />
      </View>

      <View style={styles.viewerRow}>
        <MaterialCommunityIcons name="eye" size={14} color={Colors.textMuted} />
        <Text style={styles.viewerText}>2,847 watching</Text>
      </View>

      <View style={styles.playersRow}>
        <RockCard glowColor={Colors.chrome} style={styles.playerCard}>
          <View style={styles.playerInner}>
            <Text style={styles.playerName}>GM MAGNUS_V</Text>
            <Text style={styles.playerElo}>2854 ELO</Text>
            <Text style={[styles.playerClock, { color: Colors.chrome }]}>08:42</Text>
          </View>
        </RockCard>
        <RockCard glowColor={Colors.emberLight} style={styles.playerCard}>
          <View style={[styles.playerInner, styles.playerInnerRight]}>
            <Text style={[styles.playerName, { color: Colors.emberLight }]}>GM HIKARU_X</Text>
            <Text style={styles.playerElo}>2832 ELO</Text>
            <Text style={[styles.playerClock, { color: Colors.emberLight }]}>09:15</Text>
          </View>
        </RockCard>
      </View>

      <View style={styles.boardArea}>
        <ChessBoard />
      </View>

      <View style={[styles.reactionsRow, { paddingBottom: Spacing.lg + insets.bottom }]}>
        {REACTIONS.map((emoji) => (
          <Pressable key={emoji} style={styles.reactionButton} onPress={() => handleReactionPress(emoji)}>
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      <View pointerEvents="none" style={styles.floatingLayer}>
        {floatingReactions.map((reaction) => (
          <FloatingEmoji key={reaction.id} emoji={reaction.emoji} left={reaction.left} />
        ))}
      </View>

      <ChatTicker />
    </View>
  );
}

function LiveBadge() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 750, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 750 })),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.liveBadge, animatedStyle]}>
      <View style={styles.liveDot} />
      <Text style={styles.liveBadgeText}>Live</Text>
    </Animated.View>
  );
}

function FloatingEmoji({ emoji, left }: { emoji: string; left: number }) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(-200, { duration: 2000, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(1.5, { duration: 2000 });
    opacity.value = withTiming(0, { duration: 2000 });
  }, [translateY, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.floatingEmoji, { left }, animatedStyle]}>{emoji}</Animated.Text>
  );
}

function ChatTicker() {
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (textWidth === 0) return;
    translateX.value = 0;
    translateX.value = withRepeat(withTiming(-textWidth, { duration: 16000, easing: Easing.linear }), -1, false);
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
        {CHAT_TICKER + CHAT_TICKER}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  crowdImage: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    height: '18%',
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
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
    fontSize: 16,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.crimson,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textPrimary,
  },
  liveBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  viewerText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  playersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  playerCard: {
    flex: 1,
  },
  playerInner: {
    gap: 2,
  },
  playerInnerRight: {
    alignItems: 'flex-end',
  },
  playerName: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.chrome,
  },
  playerElo: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  playerClock: {
    fontFamily: Fonts.display,
    fontSize: 18,
    marginTop: 2,
  },
  boardArea: {
    flex: 1,
    justifyContent: 'center',
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  reactionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgPanel, 0.85),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.3),
    boxShadow: `0px 0px 12px ${withOpacity(Colors.cyan, 0.2)}`,
  },
  reactionEmoji: {
    fontSize: 24,
  },
  floatingLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingEmoji: {
    position: 'absolute',
    bottom: 110,
    fontSize: 28,
  },
  tickerContainer: {
    height: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.85),
    borderTopWidth: 1,
    borderTopColor: withOpacity(Colors.chromeDark, 0.3),
  },
  tickerText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    width: 2000,
  },
});
