import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { CurrencyPill, EmberParticles, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

interface Prize {
  label: string;
  color: string;
}

// Mirrors the source's 8-prize wheel. Jackpot gets our ember accent instead
// of an off-palette orange so it still reads as the "big win" segment.
const PRIZES: Prize[] = [
  { label: '500 CHIPS', color: Colors.bgBase },
  { label: '10 GEMS', color: Colors.bgPanel },
  { label: '1 VIP DAY', color: Colors.bgBase },
  { label: '1000 CHIPS', color: Colors.bgPanel },
  { label: '5 GEMS', color: Colors.bgBase },
  { label: '2 VIP DAYS', color: Colors.bgPanel },
  { label: 'JACKPOT', color: Colors.ember },
  { label: '250 CHIPS', color: Colors.bgPanel },
];

const ANGLE_PER_SEGMENT = 360 / PRIZES.length;
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
  const rotation = useSharedValue(0);
  const totalRotationRef = useRef(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);

  function handleSpinComplete(finalRotation: number) {
    setIsSpinning(false);
    const normalizedAngle = (360 - (finalRotation % 360)) % 360;
    const prizeIndex = Math.floor(normalizedAngle / ANGLE_PER_SEGMENT);
    const winningPrize = PRIZES[prizeIndex];
    console.log('Won:', winningPrize.label);
    setResult(winningPrize);
  }

  function handleSpin() {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    const extraRounds = 5 + Math.floor(Math.random() * 5);
    const randomAngle = Math.floor(Math.random() * 360);
    totalRotationRef.current += extraRounds * 360 + randomAngle;
    const target = totalRotationRef.current;

    rotation.value = withTiming(
      target,
      { duration: 4000, easing: Easing.bezier(0.15, 0, 0.15, 1) },
      (finished) => {
        if (finished) {
          runOnJS(handleSpinComplete)(target);
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

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Daily Spin</Text>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subheading}>Test your luck on the 45</Text>

        <View style={styles.wheelWrap}>
          <View style={styles.pointer}>
            <Svg width={32} height={40} viewBox="0 0 40 50">
              <Path d="M20 50L0 10C0 4.47715 4.47715 0 10 0H30C35.5228 0 40 4.47715 40 10L20 50Z" fill={Colors.crimson} />
            </Svg>
          </View>

          <Animated.View style={[styles.wheel, wheelStyle]}>
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox="0 0 100 100">
              {PRIZES.map((prize, i) => (
                <Path
                  key={prize.label}
                  d={buildSegmentPath(i * ANGLE_PER_SEGMENT, (i + 1) * ANGLE_PER_SEGMENT)}
                  fill={prize.color}
                  stroke={withOpacity(Colors.chrome, 0.08)}
                  strokeWidth={0.5}
                />
              ))}
            </Svg>

            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              {PRIZES.map((prize, i) => {
                const midAngle = i * ANGLE_PER_SEGMENT + ANGLE_PER_SEGMENT / 2;
                return (
                  <View
                    key={prize.label}
                    style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: `${midAngle}deg` }] }]}
                  >
                    <Text style={styles.segmentLabel}>{prize.label}</Text>
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
            disabled={isSpinning}
            onPress={handleSpin}
          >
            <LinearGradient
              pointerEvents="none"
              colors={[withOpacity(Colors.chrome, 0.4), withOpacity(Colors.chrome, 0)]}
              style={styles.spinButtonGloss}
            />
            <Text style={styles.spinButtonText}>{isSpinning ? 'Spinning…' : 'Spin'}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.extraSpinButton, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
            onPress={() => console.log('Extra Spin pressed')}
          >
            <MaterialCommunityIcons name="cursor-default-click-outline" size={18} color={Colors.cyan} />
            <Text style={styles.extraSpinText}>Extra Spin</Text>
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
  extraSpinButton: {
    height: 52,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: withOpacity(Colors.bgPanel, 0.9),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  extraSpinText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
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
