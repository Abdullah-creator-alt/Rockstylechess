import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CurrencyPill, PlayerAvatar, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

// Real, currently-live Stitch preview asset (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const CROWD_SILHOUETTE_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAWYNM0jE8WXbmtxN0d4LRVfoX7AWRGs_a084goDdQP1zSFp-lH4ZdcvoClo4Iktfxd_1ywHkmxp4SKG9sGiDkO6lUuGFUlrvuL9X3O7TONQfnUksdaTyCUQmoqENBU0ie82tGHQsIsh_RL7Yl6Zuoblb-8LpsrHTRdHYKYat-c5dWOYJRn41VmZ_KVcfyYXBORgzNUC3Mt0-Xe7oS03O8i3mQdEY61XB96VUS5h9xULktG3YI0wUQXn3mfU76s-4pGh-1hP-t_1MM';

type FriendStatus = 'online' | 'offline' | 'in-game';

interface Friend {
  id: string;
  name: string;
  emoji: string;
  badge?: string;
  status: FriendStatus;
  meta: string;
}

const FRIENDS: Friend[] = [
  { id: 'echo-knight', name: 'ECHO_KNIGHT', emoji: '⚔️', badge: 'GM', status: 'online', meta: 'Rating: 2450' },
  { id: 'void-strategist', name: 'VOID_STRATEGIST', emoji: '🎮', badge: 'M', status: 'online', meta: 'Rating: 2180' },
  { id: 'zen-master-7', name: 'ZEN_MASTER_7', emoji: '🗿', status: 'offline', meta: 'Last seen 2h ago' },
  { id: 'ember-king', name: 'EMBER_KING', emoji: '🔥', status: 'in-game', meta: 'Blitz • 5:00' },
];

const STATUS_DOT_COLOR: Record<FriendStatus, string> = {
  online: Colors.cyan,
  offline: Colors.chromeDark,
  'in-game': Colors.emberLight,
};

type FriendsTab = 'all' | 'recent';

export default function FriendsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FriendsTab>('all');

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: CROWD_SILHOUETTE_URI }}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={styles.backgroundImage}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(Colors.bgBase, 0.6), Colors.bgBase]}
        style={styles.backgroundImage}
      />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Friends</Text>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <MaterialCommunityIcons name="magnify" size={18} color={Colors.textMuted} />
            <TextInput
              placeholder="Search friends by ID or rank..."
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <Pressable style={styles.addButton} onPress={() => console.log('Add friend pressed')}>
            <MaterialCommunityIcons name="account-plus" size={22} color={Colors.bgBase} />
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
            onPress={() => setActiveTab('all')}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={14}
              color={activeTab === 'all' ? Colors.cyan : Colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === 'all' && styles.tabLabelActive]}>All Friends (24)</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'recent' && styles.tabButtonActive]}
            onPress={() => setActiveTab('recent')}
          >
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={14}
              color={activeTab === 'recent' ? Colors.cyan : Colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === 'recent' && styles.tabLabelActive]}>Recent (5)</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {FRIENDS.map((friend) => {
            const offline = friend.status === 'offline';
            return (
              <RockCard key={friend.id} style={[styles.friendCard, offline && styles.friendCardOffline]}>
                <View style={styles.friendRow}>
                  <View style={styles.friendAvatarWrap}>
                    <PlayerAvatar emoji={friend.emoji} size="medium" />
                    <View style={[styles.statusDot, { backgroundColor: STATUS_DOT_COLOR[friend.status] }]} />
                  </View>
                  <View style={styles.friendInfo}>
                    <View style={styles.friendNameRow}>
                      <Text style={[styles.friendName, offline && styles.friendNameOffline]}>{friend.name}</Text>
                      {friend.badge ? (
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>{friend.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.friendMeta}>{friend.meta}</Text>
                  </View>
                  <View style={styles.friendActions}>
                    {friend.status === 'offline' ? (
                      <View style={styles.offlinePill}>
                        <Text style={styles.offlinePillText}>Offline</Text>
                      </View>
                    ) : friend.status === 'in-game' ? (
                      <Pressable
                        style={styles.watchButton}
                        onPress={() => {
                          console.log('Watch pressed', friend.name);
                          router.push('/front-row');
                        }}
                      >
                        <MaterialCommunityIcons name="eye-outline" size={14} color={Colors.cyan} />
                        <Text style={styles.watchButtonText}>Watch</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.challengeButton}
                        onPress={() => console.log('Challenge pressed', friend.name)}
                      >
                        <Text style={styles.challengeButtonText}>Challenge</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={styles.chatButton}
                      onPress={() => {
                        console.log('Chat pressed', friend.name);
                        router.push('/messages');
                      }}
                    >
                      <MaterialCommunityIcons name="chat-outline" size={14} color={Colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              </RockCard>
            );
          })}
        </View>

        <RockCard style={styles.referralCard}>
          <Text style={styles.referralTitle}>Forge New Rivalries</Text>
          <View style={styles.referralRow}>
            <View style={styles.referralLeft}>
              <View style={styles.referralIconCircle}>
                <MaterialCommunityIcons name="share-variant" size={22} color={Colors.cyan} />
              </View>
              <View>
                <Text style={styles.referralLabel}>Share Profile Link</Text>
                <Text style={styles.referralSubtitle}>Earn 50 gems for each referral</Text>
              </View>
            </View>
            <Pressable style={styles.copyButton} onPress={() => console.log('Copy referral link pressed')}>
              <MaterialCommunityIcons name="content-copy" size={18} color={Colors.cyan} />
            </Pressable>
          </View>
        </RockCard>

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
    fontSize: 16,
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
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: withOpacity(Colors.bgPanel, 0.85),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cyan,
    boxShadow: `0px 0px 14px ${withOpacity(Colors.cyan, 0.4)}`,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: withOpacity(Colors.bgPanel, 0.6),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.3),
  },
  tabButtonActive: {
    backgroundColor: withOpacity(Colors.cyan, 0.14),
    borderColor: withOpacity(Colors.cyan, 0.4),
  },
  tabLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: Colors.cyan,
  },
  list: {
    gap: Spacing.sm,
  },
  friendCard: {},
  friendCardOffline: {
    opacity: 0.7,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  friendAvatarWrap: {
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.bgBase,
  },
  friendInfo: {
    flex: 1,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendName: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  friendNameOffline: {
    color: Colors.textMuted,
  },
  badgePill: {
    paddingHorizontal: 4,
    borderRadius: 3,
    backgroundColor: withOpacity(Colors.emberLight, 0.15),
  },
  badgePillText: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    color: Colors.emberLight,
  },
  friendMeta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  friendActions: {
    gap: 6,
    alignItems: 'flex-end',
  },
  challengeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cyan,
    boxShadow: `0px 0px 10px ${withOpacity(Colors.cyan, 0.4)}`,
  },
  challengeButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.bgBase,
    textTransform: 'uppercase',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: withOpacity(Colors.bgPanel, 0.9),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.4),
  },
  watchButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  offlinePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: withOpacity(Colors.chromeDark, 0.2),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  offlinePillText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  chatButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgPanel, 0.9),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  referralCard: {
    gap: Spacing.md,
  },
  referralTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.cyan,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  referralLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 1,
  },
  referralIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.cyan, 0.12),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.3),
  },
  referralLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  referralSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  copyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgPanel, 0.9),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  bottomSpacer: {
    height: 20,
  },
});
