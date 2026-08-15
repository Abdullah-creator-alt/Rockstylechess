import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, RockCard, SectionLabel } from '@/components/ui';
import { Colors, Fonts, Spacing, withOpacity } from '@/constants/theme';
import { PUZZLES, type PuzzleEntry } from '@/lib/puzzleCatalog';

// Same 200-point bands scripts/curate-puzzles.mjs curated by -- grouping the
// list this way (rather than one flat scroll) keeps the ~250 entries
// navigable without needing a search/filter UI for this first version.
const BAND_SIZE = 200;
const BAND_START = 800;

function bandLabel(rating: number): string {
  const low = BAND_START + Math.floor((rating - BAND_START) / BAND_SIZE) * BAND_SIZE;
  return `${low}-${low + BAND_SIZE - 1}`;
}

interface PuzzleSection {
  title: string;
  data: PuzzleEntry[];
}

function groupByBand(puzzles: PuzzleEntry[]): PuzzleSection[] {
  const groups = new Map<string, PuzzleEntry[]>();
  for (const puzzle of puzzles) {
    const label = bandLabel(puzzle.rating);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(puzzle);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => Number(a.split('-')[0]) - Number(b.split('-')[0]))
    .map(([title, data]) => ({ title, data }));
}

// Computed once at module scope (not per-render) -- 252 entries is a
// trivial, sub-millisecond pass, not the source of any navigation delay.
const SECTIONS = groupByBand(PUZZLES);

// Memoized so scrolling (which mounts/unmounts rows as SectionList
// virtualizes) never re-renders a row whose own puzzle/onPress didn't
// change -- same pattern as ChessBoard.tsx's Square/MoveGhost.
const PuzzleRow = memo(function PuzzleRow({
  puzzle,
  onPress,
}: {
  puzzle: PuzzleEntry;
  onPress: (puzzle: PuzzleEntry) => void;
}) {
  return (
    <Pressable onPress={() => onPress(puzzle)}>
      <RockCard style={styles.puzzleRow}>
        <View style={styles.puzzleRowInner}>
          <View style={styles.ratingPill}>
            <MaterialCommunityIcons name="puzzle" size={14} color={Colors.cyan} />
            <Text style={styles.ratingPillText}>{puzzle.rating}</Text>
          </View>
          <View style={styles.themeRow}>
            {puzzle.themes.slice(0, 2).map((theme) => (
              <View key={theme} style={styles.themeTag}>
                <Text style={styles.themeTagText}>{theme}</Text>
              </View>
            ))}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </View>
      </RockCard>
    </Pressable>
  );
});

export default function PuzzlesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function handlePuzzlePress(puzzle: PuzzleEntry) {
    router.push({ pathname: '/puzzle-match', params: { puzzleId: puzzle.id } });
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Puzzles</Text>
        <View style={styles.backButton} />
      </View>

      {/* SectionList (not ScrollView+map) -- ~250 puzzles as plain mapped
          RockCards meant ~4,000 native views mounting synchronously on
          every navigation to this screen, which is what made the tile feel
          slow. Virtualization renders only the on-screen rows regardless of
          total catalog size. */}
      <SectionList
        sections={SECTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PuzzleRow puzzle={item} onPress={handlePuzzlePress} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <SectionLabel label={section.title} />
          </View>
        )}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      <View style={styles.navWrap}>
        <BottomNav
          activeTab="play"
          onTabPress={(tab) => {
            if (tab === 'ranks') router.push('/world-rankings');
            else if (tab === 'profile') router.push('/iron-id');
            else console.log('tab pressed', tab);
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
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  // SectionList renders headers and rows as flat siblings (no per-section
  // wrapper to put a `gap` on) -- this margin is what separates one rating
  // band from the next; puzzleRow's own marginTop handles spacing between
  // a header and its first row, and between consecutive rows.
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  puzzleRow: {
    marginTop: Spacing.sm,
  },
  puzzleRowInner: {
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
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
