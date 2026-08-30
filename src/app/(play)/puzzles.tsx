import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubPageHeader } from '@/components/layout';
import { AppIcon, BottomNav, CurrencyPill, RockCard, ScreenBackdrop, SectionLabel } from '@/components/ui';
import { ScreenArt } from '@/constants/screenArt';
import { Colors, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
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
    <Pressable onPress={() => onPress(puzzle)} style={{ marginTop: Spacing.sm }}>
      <RockCard>
        <View className="flex-row items-center gap-md">
          <View
            className="h-14 w-14 items-center justify-center rounded-md"
            style={{ backgroundColor: withOpacity(Colors.cyan, 0.1), borderWidth: 1, borderColor: withOpacity(Colors.cyan, 0.25) }}
          >
            <AppIcon name="extension" size={26} color={Colors.cyan} />
          </View>

          <View className="flex-1 gap-xs">
            <View
              className="flex-row items-center gap-1 self-start rounded-full px-sm"
              style={{ paddingVertical: 3, backgroundColor: withOpacity(Colors.cyan, 0.14), borderWidth: 1, borderColor: withOpacity(Colors.cyan, 0.4) }}
            >
              <AppIcon name="extension" size={12} color={Colors.cyan} />
              <Text className="font-heading-md text-cyan" style={{ fontSize: 12 }}>
                {puzzle.rating}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-xs">
              {puzzle.themes.slice(0, 2).map((theme) => (
                <View key={theme} className="rounded-full px-sm" style={{ paddingVertical: 3, backgroundColor: withOpacity(Colors.chrome, 0.1) }}>
                  <Text className="font-body-sm text-text-muted" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                    {theme}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <AppIcon name="chevron_right" size={20} color={Colors.textMuted} />
        </View>
      </RockCard>
    </Pressable>
  );
});

export default function PuzzlesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gems } = usePlayerProfile();

  function handlePuzzlePress(puzzle: PuzzleEntry) {
    router.push({ pathname: '/puzzle-match', params: { puzzleId: puzzle.id } });
  }

  return (
    <View className="flex-1 bg-bg-base">
      <ScreenBackdrop source={ScreenArt.puzzlesBoard} opacity={0.2} />
      <SubPageHeader title="Puzzles" trailing={<CurrencyPill type="gems" value={gems} />} />

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

      <BottomNav
        activeTab="play"
        onTabPress={(tab) => {
          if (tab === 'ranks') router.push('/world-rankings');
          else if (tab === 'profile') router.push('/iron-id');
          else if (tab === 'shop') router.push('/shop');
          else console.log('tab pressed', tab);
        }}
      />
    </View>
  );
}

// #region Styles
const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  // SectionList renders headers and rows as flat siblings (no per-section
  // wrapper to put a `gap` on) -- this margin is what separates one rating
  // band from the next; PuzzleRow's own marginTop handles spacing between
  // a header and its first row, and between consecutive rows.
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});
// #endregion
