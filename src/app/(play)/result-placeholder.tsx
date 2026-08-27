import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyPill, EmberParticles, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { chargeForAnalysis } from '@/lib/api';
import { ANALYSIS_COST } from '@/lib/analysisCost';
import { getAuthToken } from '@/lib/authStorage';
import { clearPendingLocalReplay, getPendingLocalReplay } from '@/lib/localMatchReplayStore';
import { MATCH_CHIP_REWARDS } from '@/lib/matchRewards';

type Outcome = 'win' | 'loss' | 'draw';

// ELO numbers are still sample/decorative -- rating changes aren't part of
// this pass (chips/gems only). Route/filename kept as result-placeholder
// per the original brief ("replaces result-placeholder.tsx, same route").
const OUTCOME_ELO: Record<Outcome, { eloBefore: number; eloAfter: number }> = {
  win: { eloBefore: 710, eloAfter: 726 },
  loss: { eloBefore: 710, eloAfter: 694 },
  draw: { eloBefore: 710, eloAfter: 710 },
};

const REASON_LABEL: Record<string, string> = {
  checkmate: 'by Checkmate',
  stalemate: 'by Stalemate',
  draw: 'by Draw',
  resignation: 'by Resignation',
  timeout: 'by Timeout',
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
  const {
    outcome: outcomeParam,
    reason,
    chipsGranted: chipsGrantedParam,
  } = useLocalSearchParams<{ outcome?: string; reason?: string; chipsGranted?: string }>();
  const outcome: Outcome = outcomeParam === 'loss' || outcomeParam === 'draw' ? outcomeParam : 'win';
  const isVictory = outcome === 'win';
  const isDraw = outcome === 'draw';
  // Set by match.tsx's handleGameOver for bot/local outcomes only (online
  // already has a server-backed replay, reached from Iron ID instead) --
  // read once per mount, not on every render, since Home explicitly clears
  // it and we don't want that clear to also blank the button mid-transition.
  const [localReplay] = useState(() => getPendingLocalReplay());
  const { chips: currentChips, refresh: refreshPlayerProfile } = usePlayerProfile();

  async function handleAnalyzePress() {
    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Sign In Required', 'Sign in to use Game Analysis.');
      return;
    }
    const currency: 'chips' | 'gems' = currentChips >= ANALYSIS_COST.chips ? 'chips' : 'gems';
    const price = ANALYSIS_COST[currency];
    Alert.alert('Analyze This Game', `Get move-by-move analysis for ${price.toLocaleString()} ${currency}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Analyze',
        onPress: async () => {
          try {
            await chargeForAnalysis(token, currency);
            refreshPlayerProfile();
            router.push({ pathname: '/replay', params: { source: 'local', mode: 'analysis' } });
          } catch (error) {
            if (error instanceof Error && error.message === 'insufficient-funds') {
              Alert.alert('Not Enough Currency', `You need ${price.toLocaleString()} ${currency} to analyze this game.`);
            } else {
              console.log('Failed to charge for analysis', error);
              Alert.alert('Something Went Wrong', 'Please try again.');
            }
          }
        },
      },
    ]);
  }

  const { eloBefore, eloAfter } = OUTCOME_ELO[outcome];
  // match.tsx always passes this (the real, just-granted amount) -- the
  // reward table fallback only covers reaching this screen some other way
  // (e.g. direct navigation during development).
  const parsedChipsGranted = Number(chipsGrantedParam);
  const chips = Number.isFinite(parsedChipsGranted) ? parsedChipsGranted : MATCH_CHIP_REWARDS[outcome];
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
        {localReplay && localReplay.mode !== 'online' ? (
          <RockButton
            label="Replay"
            variant="primary"
            icon={<MaterialCommunityIcons name="replay" size={20} color={Colors.bgBase} />}
            onPress={() => router.push({ pathname: '/replay', params: { source: 'local' } })}
          />
        ) : null}
        {localReplay ? (
          <View style={styles.analyzeButtonWrap}>
            <RockButton
              label="Analyze Game"
              variant="primary"
              icon={<MaterialCommunityIcons name="chart-line" size={20} color={Colors.bgBase} />}
              onPress={handleAnalyzePress}
            />
            <View style={styles.analyzePriceRow}>
              <Text style={styles.analyzePriceCaption}>Costs</Text>
              <CurrencyPill type="chips" value={ANALYSIS_COST.chips} />
            </View>
          </View>
        ) : null}
        <RockButton
          label="Home"
          variant="reward"
          icon={<MaterialCommunityIcons name="home" size={20} color={Colors.bgBase} />}
          onPress={() => {
            console.log('Home pressed from result screen');
            // Explicit "going back" -- the one point the temporary bot/local
            // replay data gets deleted (no-ops harmlessly if there was none).
            clearPendingLocalReplay();
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
  analyzeButtonWrap: {
    gap: Spacing.xs,
  },
  analyzePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  analyzePriceCaption: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shareLink: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
