import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RockButton } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

const REWARD_CHIPS = 10_000_000;
const COUNT_DURATION_MS = 2000;

export default function WelcomeRewardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [displayChips, setDisplayChips] = useState(0);
  const countAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listenerId = countAnim.addListener(({ value }) => {
      setDisplayChips(Math.floor(value));
    });

    Animated.timing(countAnim, {
      toValue: REWARD_CHIPS,
      duration: COUNT_DURATION_MS,
      useNativeDriver: false,
    }).start();

    return () => countAnim.removeListener(listenerId);
  }, [countAnim]);

  function handleClaim() {
    console.log('Claimed reward', REWARD_CHIPS, 'chips');
    router.replace('/home');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.glowSpot} />

      <View style={styles.content}>
        <Text style={styles.congrats}>CONGRATULATIONS</Text>
        <Text style={styles.subtitle}>Stage Clear Reward</Text>

        <View style={styles.chestWrap}>
          <View style={styles.chestGlow} />
          <MaterialCommunityIcons name="treasure-chest" size={140} color={Colors.gold} />
        </View>

        <View style={styles.chipPill}>
          <MaterialCommunityIcons name="poker-chip" size={26} color={Colors.gold} />
          <Text style={styles.chipCount}>{displayChips.toLocaleString('en-US')}</Text>
          <Text style={styles.chipLabel}>Chips</Text>
        </View>

        <View style={styles.ctaWrap}>
          <RockButton label="Claim & Play" variant="reward" onPress={handleClaim} />
        </View>

        <Text style={styles.footerNote}>Added to your total XP: 2400</Text>
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
    overflow: 'hidden',
  },
  glowSpot: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: withOpacity(Colors.ember, 0.12),
    boxShadow: `0px 0px 160px ${withOpacity(Colors.ember, 0.35)}`,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  congrats: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.gold,
    textShadowColor: withOpacity(Colors.gold, 0.6),
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 4 },
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.emberLight,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: Spacing.xs,
  },
  chestWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
  },
  chestGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: withOpacity(Colors.gold, 0.08),
    boxShadow: `0px 0px 80px ${withOpacity(Colors.gold, 0.5)}`,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: withOpacity(Colors.bgPanel, 0.7),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  chipCount: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  chipLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.gold,
    textTransform: 'uppercase',
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerNote: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: withOpacity(Colors.textMuted, 0.7),
    marginTop: Spacing.md,
  },
});
