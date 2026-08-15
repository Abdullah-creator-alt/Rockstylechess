import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyPill, RockButton } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const STAGE_RIG_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBL3bum6SyR5Wt3JyeAGlpCGagzAz6DJu7K1g3WcJQlFLtDB6l5lQr12HHI1d9UVRpI9YGFOR_PlXZSFdHMeuMy08itpUqLrTZpluWDwAG_2qbVAmNnu9qRzD5MMTDNYXQRVvy4AvZ-se5Wmax3YWc84JDweqZS_5a8GXVF0bq201UTFC70NWPcK-snhxGd5HoYQV-ypyj7SC2KXhf_bDDGRR_hxkX-BfG51FOeNK6NnJUSDidw1_uoNwSZBtQqnFpV30Kk6q0ryrc';

interface SupportCategory {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  danger?: boolean;
}

const SUPPORT_CATEGORIES: SupportCategory[] = [
  { id: 'faq', icon: 'help-circle-outline', title: 'FAQ', subtitle: 'The playbook for all common issues.' },
  { id: 'technical', icon: 'console-line', title: 'Technical Issues', subtitle: 'Latency, display, or piece logic glitches.' },
  { id: 'billing', icon: 'receipt-text-outline', title: 'Billing Support', subtitle: 'Gems, subscriptions, and store items.' },
  { id: 'report', icon: 'gavel', title: 'Report a Player', subtitle: 'Fair play and conduct enforcement.', danger: true },
];

export default function RoadieSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gems } = usePlayerProfile();

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: STAGE_RIG_URI }}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={styles.backgroundImage}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(Colors.bgBase, 0.65), Colors.bgBase]}
        style={styles.backgroundImage}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Roadie Support</Text>
        <CurrencyPill type="gems" value={gems} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTag}>Crew Access Only</Text>
          <Text style={styles.heroTitle}>How Can We Rig The Stage?</Text>
          <Text style={styles.heroSubtitle}>
            Our crew is on standby to ensure your grandmaster performance remains uninterrupted.
          </Text>
        </View>

        <View style={styles.grid}>
          {SUPPORT_CATEGORIES.map((category) => (
            <Pressable
              key={category.id}
              style={styles.categoryCard}
              onPress={() => console.log('Support category pressed', category.title)}
            >
              <View
                style={[
                  styles.categoryIconCircle,
                  category.danger && styles.categoryIconCircleDanger,
                ]}
              >
                <MaterialCommunityIcons
                  name={category.icon}
                  size={28}
                  color={category.danger ? Colors.crimson : Colors.cyan}
                />
              </View>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.contactWrap}>
          <RockButton
            label="Contact Crew"
            variant="primary"
            icon={<MaterialCommunityIcons name="chat" size={20} color={Colors.bgBase} />}
            onPress={() => console.log('Contact Crew pressed')}
          />
          <Text style={styles.responseTime}>Estimated response time: &lt; 5 minutes</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink} onPress={() => console.log('Privacy Policy pressed')}>
              Privacy Policy
            </Text>
            <Text style={styles.footerDot}>•</Text>
            <Text style={styles.footerLink} onPress={() => console.log('Terms of Service pressed')}>
              Terms of Service
            </Text>
          </View>
          <Text style={styles.footerVersion}>Version 4.2.0-Staging</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
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
    gap: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  heroTag: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.emberLight,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  categoryCard: {
    width: '48%',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: withOpacity(Colors.bgPanel, 0.6),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.2),
    gap: Spacing.sm,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.cyan, 0.1),
  },
  categoryIconCircleDanger: {
    backgroundColor: withOpacity(Colors.crimson, 0.1),
    borderWidth: 1,
    borderColor: withOpacity(Colors.crimson, 0.3),
  },
  categoryTitle: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  categorySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  contactWrap: {
    gap: Spacing.sm,
  },
  responseTime: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  footerLink: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  footerDot: {
    color: withOpacity(Colors.chrome, 0.2),
  },
  footerVersion: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    opacity: 0.5,
    letterSpacing: 1,
  },
});
