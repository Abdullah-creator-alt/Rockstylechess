import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CurrencyPill, PlayerAvatar, ProgressBar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

type LinkedStatus = 'connected' | 'not-linked';

interface LinkedAccount {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  detail: string;
  status: LinkedStatus;
}

const LINKED_ACCOUNTS: LinkedAccount[] = [
  { id: 'google', name: 'Google', icon: 'google', detail: 'gm.player@gmail.com', status: 'connected' },
  { id: 'facebook', name: 'Facebook', icon: 'facebook', detail: 'Not Linked', status: 'not-linked' },
  { id: 'apple', name: 'Apple ID', icon: 'apple', detail: 'Not Linked', status: 'not-linked' },
];

export default function AccountSecurityScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <View style={styles.ambientGlow} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Linked Accounts</Text>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.ironIdCard}>
          <Rivet style={{ top: 8, left: 8 }} />
          <Rivet style={{ top: 8, right: 8 }} />
          <Rivet style={{ bottom: 8, left: 8 }} />
          <Rivet style={{ bottom: 8, right: 8 }} />

          <View style={styles.ironIdInner}>
            <PlayerAvatar emoji="🤘" size="large" />
            <Text style={styles.ironIdName}>IRON ID: GRANDMASTER_X</Text>
            <Text style={styles.ironIdSubtitle}>Verified Contender • Level 88</Text>
            <ProgressBar progress={0.75} height={6} />
          </View>
        </View>

        <Text style={styles.sectionLabel}>External Services</Text>
        <View style={styles.list}>
          {LINKED_ACCOUNTS.map((account) => (
            <RockCard key={account.id} style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View style={styles.accountLeft}>
                  <View style={styles.accountIconCircle}>
                    <MaterialCommunityIcons name={account.icon} size={22} color={Colors.textMuted} />
                  </View>
                  <View>
                    <Text style={styles.accountName}>{account.name.toUpperCase()}</Text>
                    <Text style={styles.accountDetail}>{account.detail}</Text>
                  </View>
                </View>

                {account.status === 'connected' ? (
                  <View style={styles.connectedPill}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={Colors.cyan} />
                    <Text style={styles.connectedText}>Connected</Text>
                  </View>
                ) : (
                  <Pressable
                    style={styles.linkButton}
                    onPress={() => console.log('Link account pressed', account.name)}
                  >
                    <Text style={styles.linkButtonText}>Link Now</Text>
                  </Pressable>
                )}
              </View>
            </RockCard>
          ))}
        </View>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Security &amp; Data</Text>
          <Text style={styles.dangerBody}>
            Deleting your account is permanent. All ranks, currency, and digital assets will be
            forfeited immediately.
          </Text>
          <RockButton
            label="Delete Account"
            variant="danger"
            icon={<MaterialCommunityIcons name="delete-alert-outline" size={20} color={Colors.textPrimary} />}
            onPress={() => console.log('Delete account pressed')}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function Rivet({ style }: { style: object }) {
  return <View style={[styles.rivet, style]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  ambientGlow: {
    position: 'absolute',
    top: -100,
    left: '50%',
    marginLeft: -200,
    width: 400,
    height: 300,
    borderRadius: 200,
    backgroundColor: withOpacity(Colors.cyan, 0.06),
    boxShadow: `0px 0px 140px ${withOpacity(Colors.cyan, 0.2)}`,
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
    paddingBottom: 60,
    gap: Spacing.lg,
  },
  ironIdCard: {
    position: 'relative',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: withOpacity(Colors.bgPanel, 0.85),
    borderWidth: 1,
    borderTopColor: withOpacity(Colors.chrome, 0.3),
    borderColor: withOpacity(Colors.chrome, 0.1),
    boxShadow: `0px 15px 30px ${withOpacity(Colors.bgBase, 0.85)}`,
  },
  rivet: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.chrome,
    boxShadow: `1px 1px 2px ${withOpacity(Colors.bgBase, 0.5)}`,
  },
  ironIdInner: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ironIdName: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.cyan,
    letterSpacing: 1,
    marginTop: Spacing.sm,
  },
  ironIdSubtitle: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  list: {
    gap: Spacing.sm,
  },
  accountCard: {},
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 1,
  },
  accountIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.3),
  },
  accountName: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  accountDetail: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectedText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  linkButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.chrome,
  },
  linkButtonText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.bgBase,
    textTransform: 'uppercase',
  },
  dangerZone: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: withOpacity(Colors.chromeDark, 0.2),
    gap: Spacing.md,
    alignItems: 'center',
  },
  dangerTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  dangerBody: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  bottomSpacer: {
    height: 20,
  },
});
