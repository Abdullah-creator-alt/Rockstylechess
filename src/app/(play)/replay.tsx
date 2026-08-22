import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChessBoard, RockCard } from '@/components/ui';
import { getPieceSprites } from '@/components/ui/pieceSprites';
import { getBoardTheme } from '@/constants/boardThemes';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { useMatchReplay } from '@/hooks/useMatchReplay';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { getMatchReplay, type MatchHistoryEntry } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';
import { getPendingLocalReplay, type LocalMatchReplay } from '@/lib/localMatchReplayStore';
import { formatRelativeTime } from '@/lib/time';

const RESULT_LABEL: Record<MatchHistoryEntry['resultType'], string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  draw: 'Draw',
  resignation: 'Resignation',
  forfeit: 'Forfeit',
};

type LoadStatus = 'loading' | 'ready' | 'error';

export default function ReplayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { source, matchId, opponentDisplayName, resultType, color, playedAt } = useLocalSearchParams<{
    source?: string;
    matchId?: string;
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

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Replay</Text>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.middle, { paddingBottom: insets.bottom + Spacing.lg }]}>
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
            <ChessBoard
              board={replay.board}
              checkSquare={replay.checkSquare}
              lastMove={replay.lastMove}
              turn={replay.turn}
              animateLastMove
              theme={boardTheme}
              pieceSprites={pieceSprites}
            />

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
          </>
        )}
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
    fontSize: 15,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  middle: {
    flex: 1,
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
});
