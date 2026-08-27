import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StockfishEngine, type StockfishEngineHandle } from '@/components/StockfishEngine';
import { ChessBoard, ProgressBar, RockCard } from '@/components/ui';
import { getPieceSprites } from '@/components/ui/pieceSprites';
import { getBoardTheme } from '@/constants/boardThemes';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { useGameAnalysis } from '@/hooks/useGameAnalysis';
import { useMatchReplay } from '@/hooks/useMatchReplay';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { getMatchReplay, type MatchHistoryEntry } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';
import { MOVE_QUALITY_LABEL, type MoveQuality } from '@/lib/gameAnalysis';
import { getPendingLocalReplay, type LocalMatchReplay } from '@/lib/localMatchReplayStore';
import { formatRelativeTime } from '@/lib/time';

const RESULT_LABEL: Record<MatchHistoryEntry['resultType'], string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  draw: 'Draw',
  resignation: 'Resignation',
  forfeit: 'Forfeit',
  timeout: 'Timeout',
};

const QUALITY_COLOR: Record<MoveQuality, string> = {
  best: Colors.cyan,
  good: Colors.gold,
  inaccuracy: Colors.emberLight,
  mistake: Colors.ember,
  blunder: Colors.crimson,
};

// Skull for blunder is a deliberate nod to this app's own rockstar/metal
// bot roster (The Reaper is already 💀) -- not just a generic "error" icon.
const QUALITY_ICON: Record<MoveQuality, keyof typeof MaterialCommunityIcons.glyphMap> = {
  best: 'star-circle',
  good: 'thumb-up',
  inaccuracy: 'help-circle',
  mistake: 'alert-circle',
  blunder: 'skull',
};

// A raw "86.5% accuracy" reads like a model metric, not feedback -- pairing
// it with a plain-language verdict is what actually tells the player how
// their game went.
function accuracyVerdict(accuracy: number): string {
  if (accuracy >= 95) return 'Flawless';
  if (accuracy >= 85) return 'Excellent';
  if (accuracy >= 70) return 'Solid';
  if (accuracy >= 50) return 'Shaky';
  return 'Rough Game';
}

type LoadStatus = 'loading' | 'ready' | 'error';

export default function ReplayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { source, matchId, mode, opponentDisplayName, resultType, color, playedAt } = useLocalSearchParams<{
    source?: string;
    matchId?: string;
    // 'analysis' -- set only by the paid "Analyze Game" entry point
    // (result-placeholder.tsx). Plain replay entry points never set this,
    // so analysis is purely a function of how this screen was reached, not
    // something a visitor can switch on for free once already inside.
    mode?: string;
    opponentDisplayName?: string;
    resultType?: MatchHistoryEntry['resultType'];
    color?: 'w' | 'b';
    playedAt?: string;
  }>();
  const { profile } = usePlayerProfile();
  const boardTheme = getBoardTheme(profile?.equippedBoardId);
  const pieceSprites = getPieceSprites(profile?.equippedPieceId);

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [pgn, setPgn] = useState<string | null>(null);
  const [moveElapsedMs, setMoveElapsedMs] = useState<number[] | null>(null);
  // Set only for the bot/local path (source === 'local') -- read from the
  // temporary in-memory store instead of fetched from the server, since
  // these matches never reach it. Drives the info card in place of the
  // route params the online path uses.
  const [localReplay, setLocalReplay] = useState<LocalMatchReplay | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (source === 'local') {
        const local = getPendingLocalReplay();
        setLocalReplay(local);
        setPgn(local?.pgn ?? null);
        setMoveElapsedMs(local?.moveElapsedMs ?? null);
        setStatus('ready');
        return;
      }
      if (!matchId) {
        setStatus('error');
        return;
      }
      const token = await getAuthToken();
      if (!token) {
        setStatus('error');
        return;
      }
      try {
        const result = await getMatchReplay(token, matchId);
        if (cancelled) return;
        setPgn(result.pgn);
        setMoveElapsedMs(result.moveElapsedMs);
        setStatus('ready');
      } catch (error) {
        console.log('Failed to load match replay', error);
        if (!cancelled) setStatus('error');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [source, matchId]);

  const replay = useMatchReplay(pgn, moveElapsedMs);

  // Separate feature from replay itself, reusing its already-loaded pgn --
  // a fresh StockfishEngine instance scoped to this screen (no relation to
  // match.tsx's own instance, which only ever exists during live bot play).
  // Purely route-param-driven (see the mode param above) -- no in-screen
  // toggle, since this is now a paid action gated at result-placeholder.tsx.
  const analysisMode = mode === 'analysis';
  const analysisEngineRef = useRef<StockfishEngineHandle>(null);
  const analysis = useGameAnalysis(pgn, analysisEngineRef);

  useEffect(() => {
    if (analysisMode && pgn && analysis.status === 'idle') {
      analysis.start();
    }
    // analysis.start intentionally omitted -- it's a plain (non-memoized)
    // function recreated every render, and the status==='idle' guard above
    // already makes re-invoking it on every render harmless/idempotent, so
    // including it would just be a no-op churn dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisMode, pgn, analysis.status]);

  const currentMoveAnalysis = replay.plyIndex > 0 ? (analysis.result?.moves[replay.plyIndex - 1] ?? null) : null;
  const currentPositionEval = analysis.result?.positions[replay.plyIndex] ?? null;

  // "You" beats a bare color whenever we actually know which side the
  // viewer played -- online matches always do (the color route param);
  // bot matches do via the stored playerColor; local pass-and-play has no
  // single "you" (two humans, one device), so it stays White/Black.
  function sideLabel(side: 'w' | 'b'): string {
    if (localReplay) {
      if (localReplay.mode === 'bot' || localReplay.mode === 'online') {
        return side === localReplay.playerColor ? 'You' : localReplay.opponentLabel;
      }
      return side === 'w' ? 'White' : 'Black';
    }
    if (color) return side === color ? 'You' : opponentDisplayName || 'Opponent';
    return side === 'w' ? 'White' : 'Black';
  }

  return (
    <View style={styles.root}>
      <StockfishEngine ref={analysisEngineRef} enabled={analysisMode} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{analysisMode ? 'Game Analysis' : 'Replay'}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.middleScroll}
        contentContainerStyle={[styles.middle, { paddingBottom: insets.bottom + Spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {localReplay ? (
          <RockCard style={styles.infoCard}>
            <Text style={styles.infoOpponent}>VS. {localReplay.opponentLabel.toUpperCase()}</Text>
            <Text style={styles.infoMeta}>
              {formatRelativeTime(localReplay.playedAt)} • {RESULT_LABEL[localReplay.resultType]} •{' '}
              {localReplay.outcome === 'win' ? 'Victory' : localReplay.outcome === 'loss' ? 'Defeat' : 'Draw'}
            </Text>
          </RockCard>
        ) : opponentDisplayName ? (
          <RockCard style={styles.infoCard}>
            <Text style={styles.infoOpponent}>VS. {opponentDisplayName.toUpperCase()}</Text>
            <Text style={styles.infoMeta}>
              {playedAt ? `${formatRelativeTime(playedAt)} • ` : ''}
              {resultType ? RESULT_LABEL[resultType] : ''}
              {color ? ` • Played as ${color === 'w' ? 'White' : 'Black'}` : ''}
            </Text>
          </RockCard>
        ) : null}

        {status === 'loading' ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={Colors.cyan} size="large" />
          </View>
        ) : status === 'error' || !replay.isAvailable ? (
          <View style={styles.centerFill}>
            <Text style={styles.emptyText}>Replay isn&apos;t available for this match.</Text>
          </View>
        ) : (
          <>
            {analysisMode && analysis.status === 'analyzing' ? (
              <RockCard style={styles.analyzingCard}>
                <Text style={styles.analyzingTitle}>Reviewing your game…</Text>
                <ProgressBar
                  progress={analysis.progress.total ? analysis.progress.done / analysis.progress.total : 0}
                  height={8}
                />
              </RockCard>
            ) : null}

            {analysisMode && analysis.status === 'error' ? (
              <RockCard style={styles.analyzingCard}>
                <Text style={styles.analyzingTitle}>Couldn&apos;t analyze this game.</Text>
              </RockCard>
            ) : null}

            {analysisMode && currentPositionEval ? (
              <View style={styles.evalBarTrack}>
                <View style={[styles.evalBarFill, { width: `${currentPositionEval.whiteWinPercent}%` }]} />
              </View>
            ) : null}

            <ChessBoard
              board={replay.board}
              checkSquare={replay.checkSquare}
              lastMove={replay.lastMove}
              turn={replay.turn}
              animateLastMove
              lastMoveSound={replay.lastMoveSound}
              theme={boardTheme}
              pieceSprites={pieceSprites}
            />

            {analysisMode && currentMoveAnalysis ? (
              <View style={[styles.qualityCallout, { borderColor: withOpacity(QUALITY_COLOR[currentMoveAnalysis.quality], 0.5) }]}>
                <View style={[styles.qualityIconWrap, { backgroundColor: withOpacity(QUALITY_COLOR[currentMoveAnalysis.quality], 0.18) }]}>
                  <MaterialCommunityIcons
                    name={QUALITY_ICON[currentMoveAnalysis.quality]}
                    size={22}
                    color={QUALITY_COLOR[currentMoveAnalysis.quality]}
                  />
                </View>
                <View style={styles.qualityTextCol}>
                  <Text style={[styles.qualityLabel, { color: QUALITY_COLOR[currentMoveAnalysis.quality] }]}>
                    {currentMoveAnalysis.san} · {MOVE_QUALITY_LABEL[currentMoveAnalysis.quality]}
                  </Text>
                  {currentMoveAnalysis.bestMoveSan ? (
                    <Text style={styles.qualityHint}>Better was {currentMoveAnalysis.bestMoveSan}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.controlsCard}>
              <Text style={styles.plyCounter}>
                {replay.plyIndex === 0 ? 'Start' : `Move ${replay.plyIndex} / ${replay.totalPlies}`}
              </Text>
              <View style={styles.controlsRow}>
                <Pressable
                  style={[styles.controlButton, replay.plyIndex === 0 && styles.controlButtonDisabled]}
                  onPress={replay.prev}
                  disabled={replay.plyIndex === 0}
                >
                  <MaterialCommunityIcons name="skip-previous" size={26} color={Colors.textPrimary} />
                </Pressable>
                <Pressable style={styles.controlButtonPrimary} onPress={replay.isPlaying ? replay.pause : replay.play}>
                  <MaterialCommunityIcons name={replay.isPlaying ? 'pause' : 'play'} size={28} color={Colors.bgBase} />
                </Pressable>
                <Pressable
                  style={[styles.controlButton, replay.plyIndex >= replay.totalPlies && styles.controlButtonDisabled]}
                  onPress={replay.next}
                  disabled={replay.plyIndex >= replay.totalPlies}
                >
                  <MaterialCommunityIcons name="skip-next" size={26} color={Colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            {analysisMode && analysis.status === 'done' && analysis.result ? (
              <RockCard glowColor={Colors.gold} style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Game Report</Text>
                {(['w', 'b'] as const).map((c) => {
                  const { accuracy, counts } = analysis.result!.summary[c];
                  return (
                    <View key={c} style={styles.summarySideBlock}>
                      <View style={styles.summarySideHeader}>
                        <Text style={styles.summarySideName}>{sideLabel(c)}</Text>
                        <Text style={styles.summaryVerdict}>{accuracyVerdict(accuracy)}</Text>
                      </View>
                      <View style={styles.summaryAccuracyRow}>
                        <Text style={styles.summaryAccuracyBig}>{Math.round(accuracy)}%</Text>
                        <Text style={styles.summaryAccuracyCaption}>accuracy</Text>
                      </View>
                      <View style={styles.summaryChipsRow}>
                        {(Object.keys(MOVE_QUALITY_LABEL) as MoveQuality[])
                          .filter((q) => counts[q] > 0)
                          .map((q) => (
                            <View key={q} style={[styles.summaryChip, { borderColor: withOpacity(QUALITY_COLOR[q], 0.4) }]}>
                              <MaterialCommunityIcons name={QUALITY_ICON[q]} size={13} color={QUALITY_COLOR[q]} />
                              <Text style={[styles.summaryChipText, { color: QUALITY_COLOR[q] }]}>{counts[q]}</Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  );
                })}
              </RockCard>
            ) : null}
          </>
        )}
      </ScrollView>
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
    fontSize: 15,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  middleScroll: {
    flex: 1,
  },
  // contentContainerStyle, not a plain View's own style -- flexGrow (not
  // flex) so short content still stretches to fill/space-between like
  // before, but content taller than the screen (e.g. the Game Report card
  // pushing past the fold) scrolls instead of clipping/overflowing.
  middle: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  infoCard: {
    gap: 4,
  },
  infoOpponent: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.cyan,
  },
  infoMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  controlsCard: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  plyCounter: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgPanel, 0.8),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonPrimary: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cyan,
  },
  analyzingCard: {
    gap: Spacing.sm,
  },
  analyzingTitle: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  evalBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.chromeDark,
    overflow: 'hidden',
  },
  evalBarFill: {
    height: '100%',
    backgroundColor: Colors.chrome,
  },
  qualityCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: withOpacity(Colors.bgPanel, 0.8),
  },
  qualityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityTextCol: {
    flex: 1,
    gap: 2,
  },
  qualityLabel: {
    fontFamily: Fonts.heading,
    fontSize: 14,
  },
  qualityHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  summaryCard: {
    gap: Spacing.md,
  },
  summaryTitle: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  summarySideBlock: {
    gap: Spacing.xs,
  },
  summarySideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summarySideName: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  summaryVerdict: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  summaryAccuracyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  summaryAccuracyBig: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.cyan,
  },
  summaryAccuracyCaption: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  summaryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
  },
  summaryChipText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
  },
});
