import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { CurrencyPill, EmberParticles, PlayerAvatar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

interface GameRow {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  trailing?: string;
  action: () => void;
}

export default function ControlCoreScreen() {
  const router = useRouter();
  const [musicOn, setMusicOn] = useState(false);
  const [soundFxOn, setSoundFxOn] = useState(true);

  const gameRows: GameRow[] = [
    {
      id: 'notifications',
      icon: 'bell-outline',
      label: 'Notifications',
      action: () => router.push('/backstage-alerts'),
    },
    {
      id: 'language',
      icon: 'translate',
      label: 'Language',
      trailing: 'English',
      action: () => console.log('Language pressed'),
    },
    {
      id: 'terms',
      icon: 'gavel',
      label: 'Terms of Service',
      action: () => console.log('Terms of Service pressed'),
    },
    {
      id: 'support',
      icon: 'lifebuoy',
      label: 'Help & Support',
      action: () => router.push('/roadie-support'),
    },
  ];

  return (
    <View style={styles.root}>
      <EmberParticles count={10} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PlayerAvatar emoji="🤘" size="small" />
          <Text style={styles.headerTitle}>Control Core</Text>
        </View>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SettingsSection icon="volume-high" title="Audio">
          <RockCard style={styles.sectionCard}>
            <ToggleRow
              title="Music"
              subtitle="Ambient stage themes"
              value={musicOn}
              onValueChange={setMusicOn}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              title="Sound FX"
              subtitle="Piece moves & alerts"
              value={soundFxOn}
              onValueChange={setSoundFxOn}
            />
          </RockCard>
        </SettingsSection>

        <SettingsSection icon="controller-classic-outline" title="Game">
          <RockCard style={styles.listCard}>
            {gameRows.map((row, index) => (
              <Pressable
                key={row.id}
                style={[styles.listRow, index < gameRows.length - 1 && styles.rowDivider]}
                onPress={row.action}
              >
                <View style={styles.listRowLeft}>
                  <MaterialCommunityIcons name={row.icon} size={20} color={Colors.textMuted} />
                  <Text style={styles.listRowLabel}>{row.label}</Text>
                </View>
                <View style={styles.listRowRight}>
                  {row.trailing ? <Text style={styles.listRowTrailing}>{row.trailing}</Text> : null}
                  <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
                </View>
              </Pressable>
            ))}
          </RockCard>
        </SettingsSection>

        <SettingsSection icon="account-circle-outline" title="Account">
          <RockCard style={styles.accountCard}>
            <View style={styles.accountRow}>
              <View style={styles.accountIconCircle}>
                <MaterialCommunityIcons name="shield-account" size={28} color={Colors.chrome} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>Grandmaster ID</Text>
                <Text style={styles.accountValue}>GM_KASPAROV_88</Text>
              </View>
              <Pressable
                style={styles.editButton}
                onPress={() => router.push('/account-security')}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            </View>
          </RockCard>
        </SettingsSection>

        <View style={styles.dangerZone}>
          <RockButton
            label="Logout"
            variant="danger"
            icon={<MaterialCommunityIcons name="logout" size={20} color={Colors.textPrimary} />}
            onPress={() => console.log('Logout pressed')}
          />
          <Text style={styles.versionText}>App Version 2.4.0-STAGE-CORE</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsSection({
  icon,
  title,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <MaterialCommunityIcons name={icon} size={20} color={Colors.cyan} />
        <Text style={styles.sectionHeadingText}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: withOpacity(Colors.chromeDark, 0.4), true: withOpacity(Colors.cyan, 0.5) }}
        thumbColor={value ? Colors.cyan : Colors.chrome}
        ios_backgroundColor={withOpacity(Colors.chromeDark, 0.4)}
      />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.cyan,
    textTransform: 'uppercase',
    textShadowColor: withOpacity(Colors.cyan, 0.5),
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionHeadingText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  sectionCard: {
    gap: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  toggleTitle: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(Colors.chromeDark, 0.2),
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  listRowLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listRowTrailing: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.cyan,
  },
  accountCard: {},
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  accountIconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  accountInfo: {
    flex: 1,
  },
  accountLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accountValue: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.cyan,
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: withOpacity(Colors.bgPanel, 0.9),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  editButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  dangerZone: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  versionText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    opacity: 0.5,
  },
});
