import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerAvatar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

type ForgeCategory = 'boards' | 'pieces' | 'avatars';

interface ForgeOption {
  id: string;
  name: string;
  locked: boolean;
  gemPrice?: number;
}

const BOARD_OPTIONS: (ForgeOption & { light: string; dark: string })[] = [
  { id: 'classic-chrome', name: 'Classic Chrome', locked: false, light: Colors.chrome, dark: Colors.chromeDark },
  { id: 'crimson-stage', name: 'Crimson Stage', locked: false, light: Colors.chrome, dark: Colors.crimson },
  { id: 'cyan-storm', name: 'Cyan Storm', locked: false, light: Colors.chrome, dark: Colors.cyan },
  { id: 'gold-rush', name: 'Gold Rush', locked: true, gemPrice: 200, light: Colors.chrome, dark: Colors.gold },
  { id: 'obsidian-void', name: 'Obsidian Void', locked: true, gemPrice: 350, light: Colors.chromeMid, dark: Colors.bgBase },
];

const PIECE_OPTIONS: (ForgeOption & { color: string })[] = [
  { id: 'classic-chrome', name: 'Classic Chrome', locked: false, color: Colors.chrome },
  { id: 'graphite-tour', name: 'Graphite Tour', locked: false, color: Colors.chromeDark },
  { id: 'neon-cyan', name: 'Neon Cyan', locked: false, color: Colors.cyan },
  { id: 'molten-gold', name: 'Molten Gold', locked: true, gemPrice: 250, color: Colors.gold },
  { id: 'crimson-reaper', name: 'Crimson Reaper', locked: true, gemPrice: 300, color: Colors.crimson },
];

const AVATAR_OPTIONS: (ForgeOption & { emoji: string })[] = [
  { id: 'axl', name: 'Axl', locked: false, emoji: '🤘' },
  { id: 'riff', name: 'Riff', locked: false, emoji: '🎸' },
  { id: 'beats', name: 'Beats', locked: false, emoji: '🥁' },
  { id: 'mic-drop', name: 'Mic Drop', locked: false, emoji: '🎤' },
  { id: 'king-axl', name: 'King Axl', locked: true, gemPrice: 250, emoji: '👑' },
  { id: 'reaper', name: 'The Reaper', locked: true, gemPrice: 120, emoji: '💀' },
];

const TABS: { key: ForgeCategory; label: string }[] = [
  { key: 'boards', label: 'Boards' },
  { key: 'pieces', label: 'Pieces' },
  { key: 'avatars', label: 'Avatars' },
];

export default function ForgeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ForgeCategory>('boards');
  const [selected, setSelected] = useState<Record<ForgeCategory, string>>({
    boards: 'classic-chrome',
    pieces: 'classic-chrome',
    avatars: 'axl',
  });

  function handleSelect(category: ForgeCategory, option: ForgeOption) {
    if (option.locked) {
      console.log('Forge option locked', option.name, `${option.gemPrice} gems required`);
      return;
    }
    setSelected((prev) => ({ ...prev, [category]: option.id }));
    console.log('Forge option selected', category, option.name);
  }

  const selectedName =
    activeTab === 'boards'
      ? BOARD_OPTIONS.find((o) => o.id === selected.boards)?.name
      : activeTab === 'pieces'
        ? PIECE_OPTIONS.find((o) => o.id === selected.pieces)?.name
        : AVATAR_OPTIONS.find((o) => o.id === selected.avatars)?.name;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>The Forge</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {activeTab === 'boards'
            ? BOARD_OPTIONS.map((option) => (
                <Pressable key={option.id} style={styles.gridSlot} onPress={() => handleSelect('boards', option)}>
                  <RockCard
                    glowColor={selected.boards === option.id ? Colors.cyan : undefined}
                    style={selected.boards === option.id ? styles.optionCardActive : styles.optionCard}
                  >
                    <View style={[styles.optionInner, option.locked && styles.optionInnerLocked]}>
                      <BoardSwatch light={option.light} dark={option.dark} />
                      <Text style={[styles.optionName, option.locked && styles.optionNameLocked]}>{option.name}</Text>
                      {option.locked ? <LockBadge gemPrice={option.gemPrice} /> : null}
                    </View>
                  </RockCard>
                </Pressable>
              ))
            : null}

          {activeTab === 'pieces'
            ? PIECE_OPTIONS.map((option) => (
                <Pressable key={option.id} style={styles.gridSlot} onPress={() => handleSelect('pieces', option)}>
                  <RockCard
                    glowColor={selected.pieces === option.id ? Colors.cyan : undefined}
                    style={selected.pieces === option.id ? styles.optionCardActive : styles.optionCard}
                  >
                    <View style={[styles.optionInner, option.locked && styles.optionInnerLocked]}>
                      <View style={styles.pieceSwatch}>
                        <Text style={[styles.pieceGlyph, { color: option.color }]}>♔</Text>
                      </View>
                      <Text style={[styles.optionName, option.locked && styles.optionNameLocked]}>{option.name}</Text>
                      {option.locked ? <LockBadge gemPrice={option.gemPrice} /> : null}
                    </View>
                  </RockCard>
                </Pressable>
              ))
            : null}

          {activeTab === 'avatars'
            ? AVATAR_OPTIONS.map((option) => (
                <Pressable key={option.id} style={styles.gridSlot} onPress={() => handleSelect('avatars', option)}>
                  <RockCard
                    glowColor={selected.avatars === option.id ? Colors.cyan : undefined}
                    style={selected.avatars === option.id ? styles.optionCardActive : styles.optionCard}
                  >
                    <View style={[styles.optionInner, option.locked && styles.optionInnerLocked]}>
                      <PlayerAvatar
                        emoji={option.locked ? '🔒' : option.emoji}
                        size="medium"
                        selected={selected.avatars === option.id}
                      />
                      <Text style={[styles.optionName, option.locked && styles.optionNameLocked]}>{option.name}</Text>
                      {option.locked ? <LockBadge gemPrice={option.gemPrice} /> : null}
                    </View>
                  </RockCard>
                </Pressable>
              ))
            : null}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.equipBar, { paddingBottom: Spacing.lg + insets.bottom }]}>
        <RockButton
          label={`Equip ${selectedName ?? ''}`}
          variant="primary"
          icon={<MaterialCommunityIcons name="hammer" size={20} color={Colors.bgBase} />}
          onPress={() => console.log('Equip pressed', activeTab, selectedName)}
        />
      </View>
    </View>
  );
}

function BoardSwatch({ light, dark }: { light: string; dark: string }) {
  return (
    <View style={styles.boardSwatch}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.boardSwatchCell,
            { backgroundColor: (Math.floor(i / 2) + i) % 2 === 0 ? light : dark },
          ]}
        />
      ))}
    </View>
  );
}

function LockBadge({ gemPrice }: { gemPrice?: number }) {
  return (
    <View style={styles.lockBadge}>
      <MaterialCommunityIcons name="diamond-stone" size={11} color={Colors.emberLight} />
      <Text style={styles.lockBadgeText}>{gemPrice} Gems</Text>
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
    fontSize: 18,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: withOpacity(Colors.bgPanel, 0.7),
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.3),
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: Colors.cyan,
    boxShadow: `0px 0px 15px ${withOpacity(Colors.cyan, 0.4)}`,
  },
  tabLabel: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: Colors.bgBase,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 30,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  gridSlot: {
    width: '48%',
  },
  optionCard: {},
  optionCardActive: {},
  optionInner: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionInnerLocked: {
    opacity: 0.6,
  },
  optionName: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.cyan,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  optionNameLocked: {
    color: Colors.textMuted,
  },
  boardSwatch: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: withOpacity(Colors.bgBase, 0.4),
  },
  boardSwatchCell: {
    width: '50%',
    height: '50%',
  },
  pieceSwatch: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  pieceGlyph: {
    fontSize: 32,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.emberLight, 0.5),
  },
  lockBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.emberLight,
  },
  bottomSpacer: {
    height: 20,
  },
  equipBar: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: withOpacity(Colors.chromeDark, 0.3),
    backgroundColor: withOpacity(Colors.bgPanel, 0.9),
  },
});
