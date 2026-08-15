import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { CurrencyPill, EmberParticles, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { getSpinStatus, spinWheel, type SpinResult } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';
import { ANGLE_PER_SEGMENT, SPIN_SEGMENTS, type SpinSegment } from '@/lib/spinPrizes';

const WHEEL_SIZE = 300;

function buildSegmentPath(startAngle: number, endAngle: number): string {
  const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
  const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
  const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
  const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);
  return `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
}

export default function SpinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status: profileStatus, gems, refresh } = usePlayerProfile();
  const rotation = useSharedValue(0);
  const totalRotationRef = useRef(0);
  const [canSpin, setCanSpin] = useState<boolean | null>(null); // null = not loaded yet
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<SpinSegment | null>(null);

  useEffect(() => {
    if (profileStatus !== 'ready') return;
    let cancelled = false;
    (async () => {
      const token = await getAuthToken();
      if (!token) return;
      try {
        const status = await getSpinStatus(token);
        if (!cancelled) setCanSpin(status.canSpin);
      } catch (error) {
        console.log('Failed to load spin status', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileStatus]);

  function handleSpinComplete(spinResult: SpinResult, segmentIndex: number) {
    setIsSpinning(false);
    setCanSpin(false);
    setResult(SPIN_SEGMENTS[segmentIndex] ?? null);
    refresh();
  }

  async function handleSpin() {
    if (isSpinning || !canSpin) return;
    const token = await getAuthToken();
    if (!token) return;

    setIsSpinning(true);
    setResult(null);

    let spinResult: SpinResult;
    try {
      spinResult = await spinWheel(token);
    } catch (error) {
      console.log('Spin failed', error);
      setIsSpinning(false);
      setCanSpin(false);
      return;
    }

    const segmentIndex = Math.max(
      0,
      SPIN_SEGMENTS.findIndex((s) => s.id === spinResult.prizeId),
    );
    const extraRounds = 5 + Math.floor(Math.random() * 5);
    // Land the fixed top pointer on the middle of the winning segment --
    // reverse of the old "derive the prize from wherever the wheel lands"
    // logic: the server already decided the prize, we just animate to it.
    const segmentMidAngle = segmentIndex * ANGLE_PER_SEGMENT + ANGLE_PER_SEGMENT / 2;
    const targetNormalized = (360 - segmentMidAngle) % 360;
    const currentNormalized = totalRotationRef.current % 360;
    const delta = (targetNormalized - currentNormalized + 360) % 360;
    totalRotationRef.current += extraRounds * 360 + delta;
    const target = totalRotationRef.current;

    rotation.value = withTiming(
      target,
      { duration: 4000, easing: Easing.bezier(0.15, 0, 0.15, 1) },
      (finished) => {
        if (finished) {
          runOnJS(handleSpinComplete)(spinResult, segmentIndex);
        }
      },
    );
  }

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.root}>
      <EmberParticles count={10} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Daily Spin</Text>
        <CurrencyPill type="gems" value={gems} />
      </View>

      {profileStatus === 'guest' ? (
        <View style={styles.guestWrap}>
          <Text style={styles.guestText}>Sign in to spin the wheel.</Text>
          <RockButton label="Sign In" variant="primary" onPress={() => router.push('/sign-in')} />
        </View>
      ) : canSpin === null ? (
        <ActivityIndicator color={Colors.cyan} style={styles.loadingSpinner} />
      ) : (
        <View style={[styles.content, { paddingBottom: Spacing.lg + insets.bottom }]}>
          <Text style={styles.subheading}>Test your luck on the 45</Text>

          <View style={styles.wheelWrap}>
            <View style={styles.pointer}>
              <Svg width={32} height={40} viewBox="0 0 40 50">
                <Path d="M20 50L0 10C0 4.47715 4.47715 0 10 0H30C35.5228 0 40 4.47715 40 10L20 50Z" fill={Colors.crimson} />
              </Svg>
            </View>

            <Animated.View style={[styles.wheel, wheelStyle]}>
              <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox="0 0 100 100">
                {SPIN_SEGMENTS.map((segment, i) => (
                  <Path
                    key={segment.id}
                    d={buildSegmentPath(i * ANGLE_PER_SEGMENT, (i + 1) * ANGLE_PER_SEGMENT)}
                    fill={segment.color}
                    stroke={withOpacity(Colors.chrome, 0.08)}
                    strokeWidth={0.5}
                  />
                ))}
              </Svg>

              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                {SPIN_SEGMENTS.map((segment, i) => {
                  const midAngle = i * ANGLE_PER_SEGMENT + ANGLE_PER_SEGMENT / 2;
                  return (
                    <View
                      key={segment.id}
                      style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: `${midAngle}deg` }] }]}
                    >
                      <Text style={styles.segmentLabel}>{segment.label}</Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            <View style={styles.centerLabel}>
              <Text style={styles.centerLabelNumber}>45</Text>
              <Text style={styles.centerLabelSub}>RPM High Fidelity</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.spinButton, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
              disabled={isSpinning || !canSpin}
              onPress={handleSpin}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[withOpacity(Colors.chrome, 0.4), withOpacity(Colors.chrome, 0)]}
                style={styles.spinButtonGloss}
              />
              <Text style={styles.spinButtonText}>
                {isSpinning ? 'Spinning…' : canSpin ? 'Spin' : 'Come Back Tomorrow'}
              </Text>
            </Pressable>
          </View>

          {result ? (
            <RockCard glowColor={Colors.gold} style={styles.resultCard}>
              <Text style={styles.resultLabel}>You Won!</Text>
              <Text style={styles.resultValue}>{result.label}</Text>
              <Pressable onPress={() => setResult(null)}>
                <Text style={styles.resultDismiss}>Nice — collect later</Text>
              </Pressable>
            </RockCard>
          ) : null}
        </View>
      )}
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
    fontSize: 16,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  guestWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  guestText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  loadingSpinner: {
    marginTop: Spacing.xl * 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  subheading: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: -Spacing.lg,
  },
  wheelWrap: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointer: {
    position: 'absolute',
    top: -14,
    zIndex: 2,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    borderWidth: 10,
    borderColor: Colors.chromeDark,
    overflow: 'hidden',
    boxShadow: `0px 0px 50px ${withOpacity(Colors.bgBase, 0.8)}, inset 0px 0px 30px ${withOpacity(Colors.bgBase, 0.6)}`,
  },
  segmentLabel: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textPrimary,
    textShadowColor: withOpacity(Colors.bgBase, 0.8),
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  centerLabel: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.ember,
    borderWidth: 4,
    borderColor: Colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 12px ${withOpacity(Colors.bgBase, 0.6)}`,
  },
  centerLabelNumber: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.bgBase,
  },
  centerLabelSub: {
    fontFamily: Fonts.heading,
    fontSize: 7,
    color: withOpacity(Colors.bgBase, 0.8),
    letterSpacing: 0.5,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.md,
  },
  spinButton: {
    height: 64,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.gold,
    boxShadow: `0px 0px 20px ${withOpacity(Colors.gold, 0.5)}`,
  },
  spinButtonGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  spinButtonText: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.bgBase,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  resultLabel: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  resultValue: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.gold,
    marginTop: 4,
    textShadowColor: withOpacity(Colors.gold, 0.5),
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  resultDismiss: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
    marginTop: Spacing.sm,
  },
});
