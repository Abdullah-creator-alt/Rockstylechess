import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyPill, PlayerAvatar } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const BACKSTAGE_LOUNGE_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD926mFHFUI9tkQMGPDTBEO_Pm9nkKUgrFyUAHKxPBMUe3f43lScP9B3g3sd6NAGsCtCX41-gunWS18R9GhZal0PRdrc2NchMhwe0e2dObeyXKmbPlykH5H3gKdLhGD83VDMkt0apT7OZ_5DMMGbK_Kby_B6aQXhu2FrcLe1Bwy1EGOuaUbdIzMdSLRO6uaYarRKVnnTBpIUoGA0iHJfoHaR1mO3-kxk_UszynOaJZFHDgdQS9ccmdFw2RBoj02IYuPxvot-Be6d4g';

type Accent = 'gold' | 'cyan' | 'crimson' | 'muted';

interface NotificationItem {
  id: string;
  accent: Accent;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  emoji?: string;
  title: string;
  body: string;
  time: string;
  actionLabel: string;
  read: boolean;
}

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'bounty',
    accent: 'gold',
    icon: 'medal',
    title: "Champion's Bounty",
    body: 'Your performance in the Blitz Arena earned you a Rare Tier chest.',
    time: '2m ago',
    actionLabel: 'Claim',
    read: false,
  },
  {
    id: 'rival',
    accent: 'cyan',
    icon: 'sword-cross',
    emoji: '🦾',
    title: 'Rival Challenge',
    body: 'Vespera_7 has invited you to join their elite chess guild.',
    time: '45m ago',
    actionLabel: 'View',
    read: false,
  },
  {
    id: 'tournament',
    accent: 'crimson',
    icon: 'trophy',
    title: 'Master Tournament',
    body: "The 'Obsidian Cup' begins in 3 hours. Final call for elite entries.",
    time: '2h ago',
    actionLabel: 'View',
    read: false,
  },
  {
    id: 'order',
    accent: 'muted',
    icon: 'cart',
    title: 'Order Confirmed',
    body: "Purchase of 'Liquid Gold' skin was successful.",
    time: '1d ago',
    actionLabel: 'Details',
    read: true,
  },
];

const ACCENT_COLOR: Record<Accent, string> = {
  gold: Colors.gold,
  cyan: Colors.cyan,
  crimson: Colors.crimson,
  muted: Colors.textMuted,
};

export default function BackstageAlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gems } = usePlayerProfile();
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(NOTIFICATIONS.filter((n) => n.read).map((n) => n.id)),
  );

  const unreadCount = NOTIFICATIONS.filter((n) => !readIds.has(n.id)).length;

  function handleMarkAllRead() {
    console.log('Mark all as read pressed');
    setReadIds(new Set(NOTIFICATIONS.map((n) => n.id)));
  }

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: BACKSTAGE_LOUNGE_URI }}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={styles.backgroundImage}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(Colors.bgBase, 0.6), Colors.bgBase]}
        style={styles.backgroundImage}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <CurrencyPill type="gems" value={gems} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionRow}>
          <View>
            <Text style={styles.sectionLabel}>Backstage Alerts</Text>
            <Text style={styles.sectionSubtitle}>
              {unreadCount > 0 ? `You have ${unreadCount} priority messages` : 'All caught up'}
            </Text>
          </View>
          <Pressable onPress={handleMarkAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.markAllText}>Mark All as Read</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {NOTIFICATIONS.map((notification) => {
            const isRead = readIds.has(notification.id);
            const accentColor = ACCENT_COLOR[notification.accent];
            return (
              <View
                key={notification.id}
                style={[
                  styles.card,
                  isRead ? styles.cardRead : { borderLeftColor: accentColor },
                ]}
              >
                {notification.emoji ? (
                  <PlayerAvatar emoji={notification.emoji} size="small" />
                ) : (
                  <View
                    style={[
                      styles.iconCircle,
                      !isRead && {
                        borderColor: withOpacity(accentColor, 0.4),
                        boxShadow: `0px 0px 12px ${withOpacity(accentColor, 0.3)}`,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name={notification.icon} size={26} color={isRead ? Colors.textMuted : accentColor} />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.cardTitle, isRead && styles.cardTitleRead]}>{notification.title}</Text>
                    <Text style={styles.cardTime}>{notification.time.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.cardBody} numberOfLines={1}>
                    {notification.body}
                  </Text>
                </View>
                <Pressable
                  style={isRead ? styles.detailsButton : [styles.actionButton, { backgroundColor: accentColor }]}
                  onPress={() => {
                    console.log(`${notification.actionLabel} pressed`, notification.title);
                    setReadIds((prev) => new Set(prev).add(notification.id));
                  }}
                >
                  <Text style={isRead ? styles.detailsButtonText : styles.actionButtonText}>
                    {notification.actionLabel}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
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
    opacity: 0.2,
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
    fontSize: 16,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.emberLight,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  markAllText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: withOpacity(Colors.bgPanel, 0.7),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.15),
    borderLeftWidth: 4,
  },
  cardRead: {
    opacity: 0.6,
    borderLeftColor: withOpacity(Colors.chromeDark, 0.3),
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.3),
  },
  cardInfo: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  cardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  cardTitleRead: {
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  cardTime: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textMuted,
  },
  cardBody: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  actionButtonText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.bgBase,
    textTransform: 'uppercase',
  },
  detailsButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  detailsButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  bottomSpacer: {
    height: 20,
  },
});
