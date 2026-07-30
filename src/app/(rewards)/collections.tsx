import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CurrencyPill, ProgressBar, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

// Real, currently-live Stitch preview assets (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const TOUR_BUS_BACKGROUND_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBxxLbhpAlHWOB57EnyDkl6QVapvBmskZYnn3wioR3UaLzWRXcsTWKi40mmZZO6v765Kv_70xK8hzpBni9ZzMqVF01yAintJ80XkwKF5ezqOrQKLpEkWR55BbUPS8Mj8dU5JyGEu_4bu7zFjQ8MK5heCSieBMfDp7lyHAF0wC-0wEVGR-y_4S4k6-BFuICmJJ2-KJOg9M5S_Wv9m2oJFSV2FzQhfTE6xsgDnXXiVMDFCGTCkSKGEo6ppBDnLun-Tqn_byewXn5Vh9Y';

interface CollectibleCard {
  id: string;
  name: string;
  rarity: string;
  imageUri: string;
  isNew?: boolean;
  locked?: boolean;
}

interface CardSet {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  owned: number;
  total: number;
  cards: CollectibleCard[];
}

const CARD_SETS: CardSet[] = [
  {
    id: 'metal-legends',
    name: 'Metal Legends',
    tagline: 'The heaviest pieces in the game',
    accent: Colors.crimson,
    owned: 12,
    total: 30,
    cards: [
      {
        id: 'thrasher-max',
        name: 'Thrasher Max',
        rarity: 'Legendary Pawn',
        isNew: true,
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCMSamn-Xh9gkZP9EeCsY6wN5IcSR8iOrtQbitD7Zu8EGfmKD6pLFzQlvxgL126uonxZOCGtagX6r4MMqTmeY1Wc-F1ougSRr-60Nad3oi9b_QaeQdvYU35czUByJwUr-fOOM6958WM_Yx_ENlh9_i2yYhxw98lCmq8pseI3Q8uLKVs5a1sO_TcNszb9-tLccflZDinDPaOkAHvYSO32VYhhP_MTWNmd6IWUVwdTCp-rGbUsUBLApis5fuxGx2hM815oNi88ahadm8',
      },
      {
        id: 'valkyrie-riff',
        name: 'Valkyrie Riff',
        rarity: 'Elite Queen',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuB1N9RYk87xpGl0SAlbWQsWv0h2ITeNqGJlfsXyD8qFefY9K4RCD1lgWIBSXSHMyTbAz3psAXr9hj8DgabOSa4ywUdbdbg5azBdj01VZbhxTVKD2ABK6M8OE6ZQIQHUlLHs2ysuHfDkegoveoYu3EOUrZHwKAnw2xAp4n4nitscY-azhcxEaYoF4_ir1KxYaB9VPDkdDs4ng2JXiw8gORUQENrIpx6MUq-PoPYG4ckAU04atrhsVlIww7oFR_9OVRAjXLuDJ78BXC4',
      },
      { id: 'locked-1', name: '', rarity: '', imageUri: '', locked: true },
      {
        id: 'iron-steed',
        name: 'Iron Steed',
        rarity: 'Rare Knight',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDM8gnmb8QoNjDPY6-vrDFMWMuoMWBOf9O5A7CcCfqThkMbrXqtobib_w6gpwTJtaKuW_sIYNLq8rS_ooUGiHPrFDVksE4tfdq0wxxWQJJYBJsOqbUd7ThQcTR2g6f_2kGzmdWAxKhch7_Rknh4TbPm6zGRdbntZc6rfszcQcwz9dwK0BV7LVCFObn-aPL56ye9cVTsJY8A8gRDIM7YICCtrx0-PVRyHD1eI23lnkoWlVPRzoLyt7wdEYx7nka4iWrAmXUuL2jj6FE',
      },
      {
        id: 'the-blast-beat',
        name: 'The Blast Beat',
        rarity: 'Elite Rook',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBM6OB0fUBSlaSvW4itGpVzJ92rEj3bSguZtQ9zrEcgtg6vIfbQKTM34JvHWiC4pgwM9IknDjedFOStS5NH2g3GEf4n661Zyxf9lY2uYTkGceGxP3SY4wuMZyvWdSTc0FHHDB7ywTJAZeyTZOyY0D99bqp8lOjpwjIlxdoLKFIZYwIeBrsq59o4PEOqr9garMMHDgeyaBSFteGTh7zXP1HNhJcP7vArTUc06BR__VTuphb1GKhlYP78E-uaLsHzt46RYF6CdMPfbaY',
      },
    ],
  },
  {
    id: 'punk-rockers',
    name: 'Punk Rockers',
    tagline: 'Fast, loud, and unstoppable',
    accent: Colors.emberLight,
    owned: 8,
    total: 15,
    cards: [
      {
        id: 'spike-junior',
        name: 'Spike Junior',
        rarity: 'Common Pawn',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCRPQn4aR2o6P--Yy7Kcxsl_1DkWV1Xguj19jdh4tlCOH-8wIO7qnX32VqWIa20I-4kZjjzOE4-hWOqVywuWznxYeXIZZOAC6ZsQwWVvpo4ahLrV5RrKM5zromKNOqkgpMkWJfDnLHElyNnOqiHyfkgm7SqZ9GRuUE3O44CimBlYPUPiSpDgpmzxnvAXB1pCFMsKayBzQehWKezkJMxbAyY3MvMILs0FUC7M7hGdGjYaoWJq_yoVYjaRR532qLX-CbZBWzXeWwQe5c',
      },
      {
        id: 'anarchy-bish',
        name: 'Anarchy Bish',
        rarity: 'Rare Bishop',
        isNew: true,
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDvjDpYV72wdEkNg1RGudgKCBHqy2canioV71pY4k7Kxqmdyu81faUhJiL2PvCsmC_WCY-L4t5eIW_7dp0HbLZrNmVtHbCSF2r1sI1bH73tbq04oeWqtJWUL_x7OdU-Z5PJOU9PKrSKW9RdpR6n9EhPsIJeuIPwY-TCFxeVtb9didkukerPb82JEWxTRYBjW0jpcU3nDi12QETBo4cV_KjP62q2ewc4I7jWJyvXgGo9oj67D5OBGZ68-b6RwH7UDnQVAlmKEj7CwF4',
      },
      {
        id: 'old-school-roy',
        name: 'Old School Roy',
        rarity: 'Elite King',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBqC_izM-WYz2Es3MhGQSAupI9yUcoJ62gshJ3-G-NwcmF9JcUXZnfE7etI49LNYfoLEGoNa0JVU0IE7ejPNzqECvNpv433vCRG6lyqFu-6tSdsFVAxK6-0Roe6Su09m_oIEfdYo03smUtNVhmyOJLe3oecqKWgOMvV5oazceU45c-__Y0_eCQcJlM8ylEZX76I3UxUOmepPtlVWGXoxpM5kCd1SdqscRxpzBKQGQ7EBkq4oRotn6kjqwI4sVGTPSmoJ22_RCwx9g8',
      },
      { id: 'locked-2', name: '', rarity: '', imageUri: '', locked: true },
    ],
  },
];

export default function CollectionsScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: TOUR_BUS_BACKGROUND_URI }}
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
        <Text style={styles.headerTitle}>Collections</Text>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <RockCard glowColor={Colors.cyan} style={styles.statCard}>
          <View style={styles.statTopRow}>
            <View>
              <Text style={styles.statTitle}>Tour Collection</Text>
              <Text style={styles.statSubtitle}>Total Completion</Text>
            </View>
            <Text style={styles.statValue}>
              42<Text style={styles.statValueMuted}>/120</Text>
            </Text>
          </View>
          <ProgressBar progress={42 / 120} />
          <View style={styles.statFooterRow}>
            <Text style={styles.statFooterText}>Level 8 Vibe</Text>
            <Text style={styles.statFooterText}>Next: Legendary Pack</Text>
          </View>
        </RockCard>

        {CARD_SETS.map((set) => (
          <View key={set.id} style={styles.setSection}>
            <View style={[styles.setHeader, { borderLeftColor: set.accent }]}>
              <View>
                <Text style={styles.setName}>{set.name}</Text>
                <Text style={styles.setTagline}>{set.tagline.toUpperCase()}</Text>
              </View>
              <Text style={[styles.setProgress, { color: set.accent }]}>
                {set.owned}/{set.total}
              </Text>
            </View>

            <View style={styles.cardGrid}>
              {set.cards.map((card) =>
                card.locked ? (
                  <View key={card.id} style={styles.cardSlot}>
                    <View style={styles.lockedCard}>
                      <MaterialCommunityIcons name="lock" size={32} color={Colors.chromeMid} />
                      <Text style={styles.lockedCardText}>Locked</Text>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    key={card.id}
                    style={styles.cardSlot}
                    onPress={() => console.log('Collectible viewed', card.name)}
                  >
                    <View style={styles.collectibleCard}>
                      <Image
                        source={{ uri: card.imageUri }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={300}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <LinearGradient
                        pointerEvents="none"
                        colors={[withOpacity(Colors.bgBase, 0), withOpacity(Colors.bgBase, 0.95)]}
                        locations={[0.4, 1]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      {card.isNew ? (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>New</Text>
                        </View>
                      ) : null}
                      <View style={styles.cardFooter}>
                        <Text style={styles.cardRarity}>{card.rarity}</Text>
                        <Text style={styles.cardName}>{card.name}</Text>
                      </View>
                    </View>
                  </Pressable>
                ),
              )}
            </View>
          </View>
        ))}
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
    opacity: 0.35,
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
    gap: Spacing.xl,
  },
  statCard: {
    gap: Spacing.md,
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  statSubtitle: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  statValueMuted: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  statFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statFooterText: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  setSection: {
    gap: Spacing.md,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    paddingLeft: Spacing.md,
  },
  setName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  setTagline: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  setProgress: {
    fontFamily: Fonts.heading,
    fontSize: 15,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  cardSlot: {
    width: '48%',
    aspectRatio: 3 / 4,
  },
  collectibleCard: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withOpacity(Colors.chrome, 0.12),
    backgroundColor: Colors.bgPanel,
  },
  lockedCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: withOpacity(Colors.chrome, 0.06),
    backgroundColor: withOpacity(Colors.bgBase, 0.6),
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  lockedCardText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.chromeMid,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: Colors.cyan,
  },
  newBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    color: Colors.bgBase,
    textTransform: 'uppercase',
  },
  cardFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
  },
  cardRarity: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    color: withOpacity(Colors.textPrimary, 0.7),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardName: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
  },
});
