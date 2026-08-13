import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, CurrencyPill, PlayerAvatar, RockButton, SectionLabel } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { updateProfile } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';

interface RockstarOption {
  id: string;
  name: string;
  emoji: string;
  locked: boolean;
  gemPrice?: number;
}

const ROCKSTARS: RockstarOption[] = [
  { id: 'axe', name: 'AXE', emoji: '🎸', locked: false },
  { id: 'nova', name: 'NOVA', emoji: '⚡', locked: false },
  { id: 'riff', name: 'RIFF', emoji: '🤘', locked: false },
  { id: 'reaper', name: 'REAPER', emoji: '💀', locked: true, gemPrice: 120 },
  { id: 'king', name: 'KING', emoji: '👑', locked: true, gemPrice: 150 },
];

const AVATAR_SLOT = 100;

export default function PickRockstarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState('axe');
  const [stageName, setStageName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSelect(option: RockstarOption) {
    if (option.locked) {
      console.log('Locked rockstar tapped', option.name, option.gemPrice, 'gems');
      return;
    }
    setSelectedId(option.id);
  }

  async function handleContinue() {
    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      if (token) {
        await updateProfile(token, { displayName: stageName || undefined, avatarId: selectedId });
      }
    } catch (error) {
      // Non-fatal -- the onboarding flow shouldn't get stuck over a profile
      // update failing; the player can still play, just without a saved
      // stage name/avatar until they update their profile again later.
      console.log('Profile update failed', error);
    } finally {
      setIsSubmitting(false);
      router.replace('/welcome-reward');
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.topBarLeft}>
          <PlayerAvatar emoji="🎸" size="small" />
          <Text style={styles.brandText}>RockStyle Chess</Text>
        </View>
        <View style={styles.xpPill}>
          <Text style={styles.xpText}>XP: 2400</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>PICK YOUR ROCKSTAR</Text>
        <Text style={styles.subheading}>Select your stage persona</Text>

        <View style={styles.grid}>
          {ROCKSTARS.map((option) => {
            const isSelected = !option.locked && selectedId === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => handleSelect(option)}
                style={({ pressed }) => [styles.tile, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
              >
                <View style={styles.avatarSlot}>
                  <View style={{ opacity: option.locked ? 0.5 : 1 }}>
                    <PlayerAvatar emoji={option.emoji} size="large" selected={isSelected} />
                  </View>
                  {option.locked ? (
                    <View style={styles.lockOverlay}>
                      <MaterialCommunityIcons name="lock" size={26} color={Colors.gold} />
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.tileName, isSelected && styles.tileNameSelected]}>{option.name}</Text>

                {option.locked ? (
                  <CurrencyPill type="gems" value={option.gemPrice ?? 0} />
                ) : isSelected ? (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>SELECTED</Text>
                  </View>
                ) : (
                  <Text style={styles.starterLabel}>STARTER</Text>
                )}
              </Pressable>
            );
          })}

          <View style={styles.tile}>
            <View style={[styles.avatarSlot, styles.comingSoonSlot]}>
              <MaterialCommunityIcons name="plus" size={32} color={Colors.chromeMid} />
            </View>
            <Text style={styles.tileNameMuted}>COMING</Text>
            <Text style={styles.starterLabel}>SOON</Text>
          </View>
        </View>

        <View style={styles.nameSection}>
          <SectionLabel label="Stage Name" />
          <TextInput
            style={styles.nameInput}
            placeholder="Enter your stage name"
            placeholderTextColor={Colors.textMuted}
            value={stageName}
            onChangeText={setStageName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.ctaWrap}>
          <RockButton
            label={isSubmitting ? 'Loading...' : "Let's Rock"}
            variant="primary"
            disabled={isSubmitting}
            onPress={handleContinue}
          />
        </View>
      </ScrollView>

      <View style={styles.navWrap}>
        <BottomNav
          activeTab="play"
          onTabPress={(tab) => {
            if (tab === 'ranks') router.push('/world-rankings');
            else if (tab === 'profile') router.push('/iron-id');
            else console.log('tab', tab);
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: withOpacity(Colors.bgPanel, 0.85),
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(Colors.gold, 0.15),
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.cyan,
  },
  xpPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.chromeDark,
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
  },
  xpText: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.emberLight,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
    alignItems: 'center',
  },
  heading: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  subheading: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.xl,
    width: '100%',
    maxWidth: 440,
  },
  tile: {
    width: '47%',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatarSlot: {
    width: AVATAR_SLOT,
    height: AVATAR_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    width: AVATAR_SLOT,
    height: AVATAR_SLOT,
    borderRadius: AVATAR_SLOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.35),
  },
  comingSoonSlot: {
    borderRadius: AVATAR_SLOT / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: withOpacity(Colors.chromeDark, 0.6),
  },
  tileName: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },
  tileNameSelected: {
    color: Colors.cyan,
  },
  tileNameMuted: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: withOpacity(Colors.textMuted, 0.6),
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },
  selectedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: withOpacity(Colors.cyan, 0.18),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.45),
  },
  selectedBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.cyan,
    letterSpacing: 1,
  },
  starterLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  nameSection: {
    width: '100%',
    maxWidth: 440,
    marginTop: Spacing.xl,
  },
  nameInput: {
    height: 52,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    color: Colors.textPrimary,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  ctaWrap: {
    width: '100%',
    maxWidth: 440,
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
