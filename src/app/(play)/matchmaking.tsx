import { useRouter } from 'expo-router';
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
import { Colors, Fonts, Spacing, withOpacity } from '@/constants/theme';

const AUTO_MATCH_DELAY_MS = 3000;

export default function MatchmakingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Opponent found (simulated)');
      router.replace('/match');
    }, AUTO_MATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [router]);

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
          <PlayerAvatar emoji="🤘" size="large" />
          <Text style={styles.playerName}>AXL_CHESS</Text>
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
            console.log('Matchmaking cancelled');
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
