import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmberParticles, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Spacing, withOpacity } from '@/constants/theme';

type Outcome = 'win' | 'loss' | 'draw';

// Sample chip/ELO numbers per outcome -- real currency/rating wiring is a
// separate, later (backend) step. Route/filename kept as result-placeholder
// per the original brief ("replaces result-placeholder.tsx, same route").
const OUTCOME_NUMBERS: Record<Outcome, { chips: number; eloBefore: number; eloAfter: number }> = {
  win: { chips: 475_000, eloBefore: 710, eloAfter: 726 },
  loss: { chips: 0, eloBefore: 710, eloAfter: 694 },
  draw: { chips: 50_000, eloBefore: 710, eloAfter: 710 },
};

const REASON_LABEL: Record<string, string> = {
  checkmate: 'by Checkmate',
  stalemate: 'by Stalemate',
  draw: 'by Draw',
  resignation: 'by Resignation',
};

function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = Date.now();
    let frame: ReturnType<typeof setTimeout>;

    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame = setTimeout(tick, 16);
      }
    }
    tick();

    return () => clearTimeout(frame);
  }, [target, durationMs]);

  return value;
}

export default function ResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { outcome: outcomeParam, reason } = useLocalSearchParams<{ outcome?: string; reason?: string }>();
  const outcome: Outcome = outcomeParam === 'loss' || outcomeParam === 'draw' ? outcomeParam : 'win';
  const isVictory = outcome === 'win';
  const isDraw = outcome === 'draw';

  const { chips, eloBefore, eloAfter } = OUTCOME_NUMBERS[outcome];
  const chipsWon = useCountUp(chips);
  const eloDelta = eloAfter - eloBefore;
  const reasonLabel = reason ? REASON_LABEL[reason] : undefined;

  const bannerText = isVictory ? 'Victory' : isDraw ? 'Draw' : 'Defeat';
  const bannerStyle = isVictory ? styles.bannerVictory : isDraw ? styles.bannerDraw : styles.bannerDefeat;
  const glowColor = isVictory ? Colors.gold : isDraw ? Colors.chrome : Colors.crimson;

  return (
    <View style={[styles.root, { paddingTop: Spacing.xl + insets.top, paddingBottom: Spacing.xl + insets.bottom }]}>
      <EmberParticles count={10} />

      <View style={styles.bannerWrap}>
        <Text style={[styles.banner, bannerStyle]}>{bannerText}</Text>
        {reasonLabel ? <Text style={styles.reasonLabel}>{reasonLabel}</Text> : null}
      </View>

      <RockCard glowColor={glowColor} style={styles.statsCard}>
        <View style={styles.statRow}>
          <MaterialCommunityIcons name="poker-chip" size={22} color={Colors.gold} />
          <Text style={styles.chipsValue}>+{chipsWon.toLocaleString('en-US')}</Text>
        </View>

        <View style={styles.eloRow}>
          <Text style={styles.eloValue}>{eloBefore}</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={Colors.textMuted} />
          <Text style={styles.eloValue}>{eloAfter}</Text>
          {eloDelta !== 0 ? (
            <View
              style={[
                styles.eloDeltaPill,
                eloDelta < 0 && { backgroundColor: withOpacity(Colors.crimson, 0.12), borderColor: withOpacity(Colors.crimson, 0.4) },
              ]}
            >
              <MaterialCommunityIcons
                name={eloDelta > 0 ? 'arrow-up-bold' : 'arrow-down-bold'}
                size={12}
                color={eloDelta > 0 ? Colors.cyan : Colors.crimson}
              />
              <Text style={[styles.eloDeltaText, eloDelta < 0 && { color: Colors.crimson }]}>
                {eloDelta > 0 ? '+' : ''}{eloDelta}
              </Text>
            </View>
          ) : null}
        </View>
      </RockCard>

      <View style={styles.buttonStack}>
        <RockButton
          label="Rematch"
          variant="primary"
          icon={<MaterialCommunityIcons name="refresh" size={20} color={Colors.bgBase} />}
          onPress={() => {
            console.log('Rematch pressed');
            router.replace('/matchmaking');
          }}
        />
        <RockButton
          label="Home"
          variant="reward"
          icon={<MaterialCommunityIcons name="home" size={20} color={Colors.bgBase} />}
          onPress={() => {
            console.log('Home pressed from result screen');
            router.replace('/home');
          }}
        />
      </View>

      {isVictory ? (
        <Pressable
          onPress={() => console.log('Share this win pressed')}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={styles.shareLink}>Share this win</Text>
        </Pressable>
      ) : null}
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
  bannerWrap: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  banner: {
    fontFamily: Fonts.display,
    fontSize: 48,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reasonLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  bannerVictory: {
    color: Colors.gold,
    textShadowColor: withOpacity(Colors.cyan, 0.5),
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 0 },
  },
  bannerDraw: {
    color: Colors.chrome,
    textShadowColor: withOpacity(Colors.chrome, 0.4),
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  bannerDefeat: {
    color: Colors.textMuted,
    textShadowColor: withOpacity(Colors.crimson, 0.5),
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  statsCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chipsValue: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.gold,
    textShadowColor: withOpacity(Colors.gold, 0.5),
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  eloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  eloValue: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eloDeltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: withOpacity(Colors.cyan, 0.12),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.4),
    marginLeft: Spacing.xs,
  },
  eloDeltaText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.cyan,
  },
  buttonStack: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.md,
  },
  shareLink: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
