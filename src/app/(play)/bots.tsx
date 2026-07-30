import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomNav, CurrencyPill, PlayerAvatar, RockCard } from '@/components/ui';
import { Colors, Fonts, Spacing, withOpacity } from '@/constants/theme';

interface Bot {
  id: string;
  name: string;
  emoji: string;
  stars: number;
  locked: boolean;
  gemPrice?: number;
}

// Avatars use emoji via PlayerAvatar, consistent with every other screen's
// character-avatar convention -- not a fidelity drop, just our established
// pattern (the Stitch source's photo URLs are for character portraits, which
// we've abstracted to emoji app-wide since Prompt 2).
const BOTS: Bot[] = [
  { id: 'roadie-rick', name: 'Roadie Rick', emoji: '🧢', stars: 1, locked: false },
  { id: 'valkyrie-riff', name: 'Valkyrie Riff', emoji: '⚡', stars: 3, locked: false },
  { id: 'metal-head', name: 'Metal Head', emoji: '🤘', stars: 4, locked: false },
  { id: 'the-reaper', name: 'The Reaper', emoji: '💀', stars: 5, locked: true, gemPrice: 120 },
  { id: 'old-school-roy', name: 'Old School Roy', emoji: '🕶️', stars: 3, locked: false },
  { id: 'king-axl', name: 'King Axl', emoji: '👑', stars: 5, locked: true, gemPrice: 250 },
];

export default function BotsGalleryScreen() {
  const router = useRouter();

  function handleBotPress(bot: Bot) {
    if (bot.locked) {
      console.log('Bot locked', bot.name, `${bot.gemPrice} gems required`);
      return;
    }
    console.log('Bot challenged', bot.name);
    router.push({ pathname: '/match', params: { mode: 'bot' } });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Challenge the Legends</Text>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {BOTS.map((bot) => (
            <Pressable key={bot.id} style={styles.gridSlot} onPress={() => handleBotPress(bot)}>
              <RockCard glowColor={bot.locked ? undefined : Colors.cyan} style={styles.botCard}>
                <View style={[styles.botInner, bot.locked && styles.botInnerLocked]}>
                  <PlayerAvatar emoji={bot.locked ? '🔒' : bot.emoji} size="medium" />
                  <Text style={[styles.botName, bot.locked && styles.botNameLocked]}>{bot.name}</Text>
                  {bot.locked ? (
                    <View style={styles.gemPill}>
                      <MaterialCommunityIcons name="diamond-stone" size={12} color={Colors.emberLight} />
                      <Text style={styles.gemPillText}>{bot.gemPrice} Gems</Text>
                    </View>
                  ) : (
                    <View style={styles.starsRow}>
                      {Array.from({ length: bot.stars }).map((_, i) => (
                        <MaterialCommunityIcons key={i} name="star" size={14} color={Colors.gold} />
                      ))}
                    </View>
                  )}
                </View>
              </RockCard>
            </Pressable>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  gridSlot: {
    width: '48%',
  },
  botCard: {},
  botInner: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  botInnerLocked: {
    opacity: 0.6,
  },
  botName: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.cyan,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  botNameLocked: {
    color: Colors.textMuted,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  gemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.emberLight, 0.5),
  },
  gemPillText: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.emberLight,
  },
  bottomSpacer: {
    height: 20,
  },
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
