import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon, BottomNav, CurrencyPill, PlayerAvatar, RockCard } from '@/components/ui';
import { SubPageHeader } from '@/components/layout';
import { Colors, withOpacity } from '@/constants/theme';
import type { BotDifficulty } from '@/hooks/useChessGame';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

interface Bot {
  id: string;
  name: string;
  emoji: string;
  stars: number;
  tier: string;
  locked: boolean;
  gemPrice?: number;
  /** A real difficulty ladder, independent of the cosmetic `stars` rating above. */
  difficulty: BotDifficulty;
}

// Avatars use emoji via PlayerAvatar, consistent with every other screen's
// character-avatar convention -- not a fidelity drop, just our established
// pattern (the Stitch source's photo URLs are for character portraits, which
// we've abstracted to emoji app-wide since Prompt 2).
const BOTS: Bot[] = [
  { id: 'roadie-rick', name: 'Roadie Rick', emoji: '🧢', stars: 1, tier: 'Novice', locked: false, difficulty: 'easy' },
  { id: 'valkyrie-riff', name: 'Valkyrie Riff', emoji: '⚡', stars: 3, tier: 'Amateur', locked: false, difficulty: 'medium' },
  { id: 'metal-head', name: 'Metal Head', emoji: '🤘', stars: 4, tier: 'Skilled', locked: false, difficulty: 'stockfish-basic' },
  { id: 'the-reaper', name: 'The Reaper', emoji: '💀', stars: 5, tier: 'Expert', locked: false, difficulty: 'stockfish-lite' },
  { id: 'old-school-roy', name: 'Old School Roy', emoji: '🕶️', stars: 3, tier: 'Amateur', locked: false, difficulty: 'medium' },
  { id: 'king-axl', name: 'King Axl', emoji: '👑', stars: 5, tier: 'Grandmaster', locked: false, difficulty: 'stockfish-strong' },
];

export default function BotsGalleryScreen() {
  const router = useRouter();
  const { gems } = usePlayerProfile();

  function handleBotPress(bot: Bot) {
    if (bot.locked) {
      console.log('Bot locked', bot.name, `${bot.gemPrice} gems required`);
      return;
    }
    console.log('Bot challenged', bot.name);
    router.push({
      pathname: '/match',
      params: { mode: 'bot', difficulty: bot.difficulty, botName: bot.name, botEmoji: bot.emoji },
    });
  }

  return (
    <View className="flex-1 bg-bg-base">
      <SubPageHeader title="Challenge the Legends" trailing={<CurrencyPill type="gems" value={gems} />} />
      <ScrollView contentContainerClassName="mx-auto w-full max-w-4xl gap-md px-margin-mobile pb-xl pt-lg">
        <View className="mb-sm">
          <Text className="font-headline-lg text-headline-lg uppercase text-text-primary">Pick Your Opponent</Text>
          <Text className="mt-2 font-body-sm text-body-sm text-text-muted">Challenge bots of varying difficulties to earn XP.</Text>
        </View>

        {BOTS.map((bot) => (
          <RockCard key={bot.id} glowColor={bot.locked ? undefined : Colors.cyan}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-md">
                <View>
                  <PlayerAvatar emoji={bot.locked ? '🔒' : bot.emoji} size="medium" />
                  <View className="absolute -bottom-1 -right-1 rounded-full p-1" style={{ backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: Colors.chromeDark }}>
                    <AppIcon name="smart_toy" size={12} color={Colors.textMuted} />
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="font-heading-md text-heading-md" style={{ color: bot.locked ? Colors.textMuted : Colors.textPrimary }}>
                    {bot.name}
                  </Text>
                  {bot.locked ? (
                    <View className="mt-1 flex-row items-center gap-1 self-start rounded-full px-sm" style={{ paddingVertical: 4, backgroundColor: withOpacity(Colors.bgBase, 0.5), borderWidth: 1, borderColor: withOpacity(Colors.emberLight, 0.5) }}>
                      <AppIcon name="diamond" size={12} color={Colors.emberLight} />
                      <Text className="font-heading-md text-caption" style={{ color: Colors.emberLight }}>
                        {bot.gemPrice} Gems
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-1 flex-row gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <AppIcon key={i} name="star" size={14} color={i < bot.stars ? Colors.gold : Colors.chromeDark} />
                      ))}
                    </View>
                  )}
                  <Text className="mt-1 font-caption text-caption uppercase text-text-muted">{bot.tier}</Text>
                </View>
              </View>
              <Pressable onPress={() => handleBotPress(bot)} className="rounded px-4 py-2" style={{ backgroundColor: bot.locked ? withOpacity(Colors.chromeDark, 0.4) : Colors.chromeDark }}>
                <Text className="font-button-label text-button-label text-text-primary">{bot.locked ? 'UNLOCK' : 'CHALLENGE'}</Text>
              </Pressable>
            </View>
          </RockCard>
        ))}
      </ScrollView>

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
