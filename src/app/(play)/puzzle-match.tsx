import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChessBoard, EmberParticles, RockButton, RockCard } from '@/components/ui';
import { getPieceSprites } from '@/components/ui/pieceSprites';
import { getBoardTheme } from '@/constants/boardThemes';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { useChessGame } from '@/hooks/useChessGame';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { PUZZLES } from '@/lib/puzzleCatalog';

export default function PuzzleMatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { puzzleId } = useLocalSearchParams<{ puzzleId?: string }>();
  const entry = PUZZLES.find((p) => p.id === puzzleId);
  const { profile } = usePlayerProfile();
  const boardTheme = getBoardTheme(profile?.equippedBoardId);
  const pieceSprites = getPieceSprites(profile?.equippedPieceId);

  // Hooks must run unconditionally -- passed a placeholder puzzle when the
  // param doesn't resolve so useChessGame stays happy; the render below
  // shows a "not found" state instead of using any of this hook's output.
  const game = useChessGame({
    mode: 'puzzle',
    puzzle: entry ? { puzzleId: entry.id, fen: entry.fen, moves: entry.moves } : undefined,
  });

  if (!entry) {
    return (
      <View style={[styles.root, styles.notFoundRoot]}>
        <Text style={styles.notFoundText}>Puzzle not found</Text>
        <View style={styles.notFoundButton}>
          <RockButton label="Back to Puzzles" variant="primary" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // entry.fen's turn field is whoever plays the auto-played SETUP move
  // (moves[0]) -- the solver is the other color.
  const solverColor = entry.fen.split(' ')[1] === 'b' ? 'White' : 'Black';
  const statusText =
    game.puzzleStatus === 'solved'
      ? 'Solved!'
      : game.puzzleStatus === 'failed'
        ? 'Not quite — try again'
        : `Find the best move for ${solverColor}`;
  const statusColor =
    game.puzzleStatus === 'solved' ? Colors.gold : game.puzzleStatus === 'failed' ? Colors.crimson : Colors.cyan;

  return (
    <View style={styles.root}>
      <EmberParticles count={8} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Puzzle</Text>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.middle, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <RockCard glowColor={statusColor} style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.ratingPill}>
              <MaterialCommunityIcons name="puzzle" size={14} color={Colors.cyan} />
              <Text style={styles.ratingPillText}>{entry.rating}</Text>
            </View>
            <View style={styles.themeRow}>
              {entry.themes.slice(0, 3).map((theme) => (
                <View key={theme} style={styles.themeTag}>
                  <Text style={styles.themeTagText}>{theme}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </RockCard>

        <ChessBoard
          board={game.board}
          selectedSquare={game.selectedSquare}
          legalTargets={game.legalTargets}
          checkSquare={game.checkSquare}
          lastMove={game.lastMove}
          turn={game.turn}
          animateLastMove={game.lastMoveSource !== null && game.lastMoveSource !== 'human'}
          onSquarePress={(square) => game.handleSquarePress(square as Parameters<typeof game.handleSquarePress>[0])}
          theme={boardTheme}
          pieceSprites={pieceSprites}
        />

        <View style={styles.actionRow}>
          {game.puzzleStatus === 'solved' ? (
            <>
              <View style={styles.actionButton}>
                <RockButton label="Back to Puzzles" variant="primary" onPress={() => router.back()} />
              </View>
              <View style={styles.actionButton}>
                <RockButton label="Reset" variant="reward" onPress={game.resetPuzzle} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.actionButton}>
                <RockButton
                  label="Hint"
                  variant="primary"
                  onPress={() => game.hintSquare && game.handleSquarePress(game.hintSquare)}
                />
              </View>
              <View style={styles.actionButton}>
                <RockButton label="Give Up" variant="danger" onPress={game.resetPuzzle} />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  notFoundRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  notFoundText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  notFoundButton: {
    minWidth: 200,
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
  },
  infoCard: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: withOpacity(Colors.cyan, 0.14),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.4),
  },
  ratingPillText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.cyan,
  },
  themeRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  themeTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: withOpacity(Colors.chrome, 0.1),
  },
  themeTagText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  statusText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
