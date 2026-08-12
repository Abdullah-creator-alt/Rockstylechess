import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmberParticles, ProgressBar, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

// Real, currently-live Stitch preview assets (lh3.googleusercontent.com/aida-public/...),
// verified resolvable. No documented permanence guarantee.
const VIP_BANNER_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDafjepQeiCTtUhUVDP0ApgXdaTkSO_8Le9k9QCCKKS9QMJaSCTUv70I8LRQlFYUThHsFp22hxPk2uSocs2Eg_gBNrnY5hzSFQb4C48zSrYSdmulAeF_4E27DmXMr-ZdCJntkZ4Bew4lXS9WqwnzhXAtSOrBjKMokCAsg9kP5KMRmIvWHWmqp18R2xjTye2voh5XORsRcNLndYv_FNBC1amoWPv-lcQnb7qvWmi2DyDrkXmTTMognoROW7gmPi0ne6krUTYJvLklWg';

interface ChipPack {
  id: string;
  amount: string;
  name: string;
  price: string;
  imageUri: string;
  isClaim?: boolean;
  highlighted?: boolean;
  badge?: string;
  bonusNote?: string;
}

const CHIP_PACKS: ChipPack[] = [
  {
    id: 'starter',
    amount: '1,000,000',
    name: 'Starter Pack',
    price: '$1.99',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAhwbuzIyFtMC2d3sn_1vkXpHlEha2vOzQ3NNVd1HawkeIapwa1LUs3ZUAcbbGZu1pUqNWO5_w07OyytIBtoS_oBj7Ct-rvU3cWCXbATmMtjbbhD3xXDagJXnLPnZjrILHmpPQW8f6LQSf8RxuQjMvL0Qu54orCcuPWiTILel0HSMaZNSdTJQkqC_E0i3p1aNSyS5p2YPTa1cS6k8Xt3Z3rQ34yxLYIV4jjpyR7OY1ixwxlmQBjcyp6b14kcpncsY2QjiPdoYfwEvQ',
  },
  {
    id: 'roadie-box',
    amount: '10,000,000',
    name: 'Roadie Box',
    price: '$9.99',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAnZj2JZees5_XHips8f3QeQtyKEN_5d5UDFsf1B6I5gblSdL5P7tKYwEfdbBs2ym2dixxe3waerKuthru6f1JAXeq7P1yvAT5_tuKpxXIGcsOt9Sq435-2-X3ieMX_ZEzskLg46qhXrIgWX23ciwU56BPuieYG16tVq6GUgolXhhcedIBXtFKXIcntWV45BCCLNxAmJ9potsV5hYiw0TprDdjCplXGkQ6LSt3oqLzO557ufB5L7ZivaohpI83VgFaxfcYrXIRkaRc',
  },
  {
    id: 'bonus-pack',
    amount: '250,000,000',
    name: '+ Bonus Pack',
    price: '$49.99',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC6QYn2TLSykBH_r1jwauV4nOQZ-DaDRaA_r60wJBqc1YjDEP_sKJfRkF_tWJYR2B5PtQEiMuYPvp_F3x3d95jd5BHOUEV6TRk6dXtY-lVv6sxaBw-8YlsiM64dJGmvgMPLJH7QzLGjb3WvI1y7Yhuto7mT3FfAwcJPwUsfgDr4S6wY66bO447-M_uaggY8E9F_7wXwcDb9dBHpgzkYAVFRasvXxRxzemMBufgGwIj-RBOuSOy_ZMmrRwcprIlG2IrqwRPprYPa4ZQ',
    highlighted: true,
    badge: 'HOT',
    bonusNote: 'Includes Exclusive "Electric Legend" Piece Skin',
  },
  {
    id: 'headliner-chest',
    amount: '50,000,000',
    name: 'Headliner Chest',
    price: '$24.99',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBMyLLkWBbWnz8dg13puVqlKZEBFfGKt9fpJK0OOjf3JZ3DxtR4hFYtlDcT_FxrL1rC2N6YcFRLGpr_QunP5RVL6hFGUGi58gNBqD_7Ovx6wYfhBbp8nc3i6D-d6C30kYKGGu8zw6fTfjkckh5I0aIWnEnzQXrdJu8Sm3ybnEwCSoiiXKqHpE_VjQ9lu4WXwmLWlgzPyJ3EkWHxBwL9Nv195Au18sPJG4TvyHDUaptupGRL1hDSReC1hJbCVookRcii_oZ-JIfH__E',
  },
  {
    id: 'stadium-vault',
    amount: 'Stadium Vault',
    name: 'Unlimited Energy',
    price: 'Claim',
    isClaim: true,
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBubXXUdXIjInLu85c5IEQ42VZeMg2ClpZjrJi9RlDlWBQEd0rqbUNHbCSO1dhmmD-HI1jn6RQK-k5jbDebxhWbJa4VA_IHx4-u-7x55kpFA3Yb_3Ihrpjh9Q0PzITQO1yw0iUdPXcQBCVzh62Lt8WYt1ecIcfibXlcDuCbCc-P3aqb_NKxzcnP8XMjXhtpW_0v3UHzuOv-H0LK6XpYFNolIXHBc0YTP4Z16GOP8_LRzkM87s7Kfh-rMMZPBiGc4agkaOFmpYWfLEU',
  },
];

interface GemPack {
  id: string;
  amount: number;
  price: string;
  imageUri: string;
}

const GEM_PACKS: GemPack[] = [
  {
    id: 'gem-100',
    amount: 100,
    price: '$0.99',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB0eRU1ziCc2HTX5S0d1DIPF5tYPHjPzXK6UIi7xe-AqbPw-bi3uAIg8Hnk35VzSg8NxHmNbM24MPBX-teda1lFC_Q_0f_ykVspxIUDhP-zkJzDYtBKHDJkWBg5qHtS0UasTOAY-Th8_UXeTjiSwcvlLUDZEfk1Sk9LchZKYybyp428x6w-r4tUGjCZlMXV3LlbD2XIugXL3dqvt6gfd2mlN9mfDL1KqaliE8ei2yp_MVlzMOlLvvCRMJHv2X7bexw90BirDjoFQ6A',
  },
  {
    id: 'gem-550',
    amount: 550,
    price: '$4.99',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCvMVut7bxq-ta2afl6OHrcUKHgf8OyhX7C7E24ixGOOeYZiCD3QpcQR9jn7IEMstswiHgDAkXSnmBGCorJ1XLVmzFPpyiCeMEf7OD8gW3H4DazZEyXd0KPTEOXHqA4KRvDI5Zz8nGZNfv-GunpcFofV1Mzui4WQkoUmo_Avbuk20ItIJcy3OOy8teg5oNgjaGNjwpEShfmFVPKXY1dQ-YQmbyeT1PS6rFf_upRQIWQpRO9MLmpZTyJYZ8aos0NkDaY9rLEGSkgK_Q',
  },
  {
    id: 'gem-1200',
    amount: 1200,
    price: '$9.99',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDIYsj5xU_MdAskDRQf5J70W_Iq08Wi4CP4om-Sh2-a_IYfxu7ks7YOw8jEvJ1YUanh7IbZz3AYLNO6dtOgl0yE63d0NGMsgTcuFM1ZgEjX6udlGJekP_-h5sf3W6qSjyOb1uqFk1p2WWhk7PUHKax7-0ZTet9ps2czYAgafHWXPJM_HNLdx9FfZ_HyEzY69CZ4w_5NtEK1GKNGNIDIaafUnAyJpm_PULPC-_Kwu1uqct_BE3N9f0A8xvFuz2AdgRSH19iQbRUzvXs',
  },
];

const VIP_PERKS = ['+20% Chip Bonus on every win', 'Exclusive avatar skin', 'Daily Bonus x2', 'Ad-free matchmaking'];

type ShopTab = 'chips' | 'gems' | 'vip';

export default function RockShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ShopTab>('chips');

  return (
    <View style={styles.root}>
      <View style={styles.ambientGlowCyan} />
      <View style={styles.ambientGlowEmber} />
      <EmberParticles count={12} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Rock Shop</Text>
        <View style={styles.xpPill}>
          <MaterialCommunityIcons name="star-four-points" size={14} color={Colors.gold} />
          <Text style={styles.xpPillText}>2,400 XP</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <ShopTabButton label="Chips" active={activeTab === 'chips'} onPress={() => setActiveTab('chips')} />
        <ShopTabButton label="Gems" active={activeTab === 'gems'} onPress={() => setActiveTab('gems')} />
        <ShopTabButton label="VIP" active={activeTab === 'vip'} onPress={() => setActiveTab('vip')} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'chips' ? (
          <>
            <VipBanner compact onUpgrade={() => setActiveTab('vip')} />

            <Text style={styles.sectionTitle}>Chip Stacks</Text>
            <View style={styles.chipGrid}>
              {CHIP_PACKS.map((pack) => (
                <ChipPackCard key={pack.id} pack={pack} />
              ))}
            </View>
          </>
        ) : null}

        {activeTab === 'gems' ? (
          <>
            <Text style={styles.sectionTitle}>Crystal Gems</Text>
            <View style={styles.gemGrid}>
              {GEM_PACKS.map((pack) => (
                <GemPackCard key={pack.id} pack={pack} />
              ))}
            </View>
          </>
        ) : null}

        {activeTab === 'vip' ? (
          <>
            <VipBanner compact={false} onUpgrade={() => console.log('Upgrade to Backstage Pass pressed')} />
            <View style={styles.perksList}>
              {VIP_PERKS.map((perk) => (
                <View key={perk} style={styles.perkRow}>
                  <MaterialCommunityIcons name="check-circle" size={18} color={Colors.gold} />
                  <Text style={styles.perkText}>{perk}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function ShopTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function VipBanner({ compact, onUpgrade }: { compact: boolean; onUpgrade: () => void }) {
  return (
    <RockCard
      glowColor={Colors.gold}
      backgroundImageUri={VIP_BANNER_URI}
      style={compact ? styles.vipBannerCompact : styles.vipBannerFull}
    >
      <View style={styles.vipBannerOverlay}>
        <View style={styles.vipBannerTopRow}>
          <View>
            <Text style={styles.vipBannerTitle}>Backstage Pass</Text>
            <Text style={styles.vipBannerSubtitle}>Season 4: Molten Riff</Text>
          </View>
          <RockButton label="Upgrade" variant="reward" onPress={onUpgrade} />
        </View>
        <ProgressBar progress={0.65} label="Level 42 / 60" />
      </View>
    </RockCard>
  );
}

function ChipPackCard({ pack }: { pack: ChipPack }) {
  return (
    <RockCard
      glowColor={pack.highlighted ? Colors.gold : undefined}
      style={pack.highlighted ? styles.chipCardHighlighted : styles.chipCard}
    >
      {pack.badge ? (
        <View style={styles.hotBadge}>
          <Text style={styles.hotBadgeText}>{pack.badge}</Text>
        </View>
      ) : null}
      <View style={pack.highlighted ? styles.chipCardRow : styles.chipCardCol}>
        <Image
          source={{ uri: pack.imageUri }}
          contentFit="contain"
          cachePolicy="memory-disk"
          style={pack.highlighted ? styles.chipImageLg : styles.chipImageSm}
        />
        <View style={pack.highlighted ? styles.chipInfoRow : styles.chipInfoCol}>
          <Text style={[styles.chipAmount, pack.highlighted && styles.chipAmountHighlighted]}>{pack.amount}</Text>
          <Text style={styles.chipName}>{pack.name}</Text>
          {pack.bonusNote ? <Text style={styles.chipBonusNote}>{pack.bonusNote}</Text> : null}
          <View style={styles.chipButtonWrap}>
            <RockButton
              label={pack.price}
              variant={pack.isClaim ? 'primary' : 'reward'}
              onPress={() => console.log('Purchase pressed', pack.id, pack.price)}
            />
          </View>
        </View>
      </View>
    </RockCard>
  );
}

// Standard RockButton's fixed padding doesn't fit a 3-col gem grid's narrow
// cards, so gem packs use a smaller dedicated price chip instead -- same
// depth language (gradient-free here since the source's gem buttons are
// flat too), just sized for the space, consistent with how Match's action
// bar already deviated from RockButton for a shape it wasn't built for.
function GemPackCard({ pack }: { pack: GemPack }) {
  return (
    <RockCard style={styles.gemCard}>
      <Image source={{ uri: pack.imageUri }} contentFit="contain" cachePolicy="memory-disk" style={styles.gemImage} />
      <Text style={styles.gemAmount}>{pack.amount}</Text>
      <Pressable
        style={styles.gemPriceChip}
        onPress={() => console.log('Purchase gems pressed', pack.id, pack.price)}
      >
        <Text style={styles.gemPriceText}>{pack.price}</Text>
      </Pressable>
    </RockCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  ambientGlowCyan: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: withOpacity(Colors.cyan, 0.06),
    boxShadow: `0px 0px 120px ${withOpacity(Colors.cyan, 0.25)}`,
  },
  ambientGlowEmber: {
    position: 'absolute',
    bottom: 60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: withOpacity(Colors.ember, 0.06),
    boxShadow: `0px 0px 100px ${withOpacity(Colors.ember, 0.22)}`,
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
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: withOpacity(Colors.gold, 0.1),
    borderWidth: 1,
    borderColor: withOpacity(Colors.gold, 0.3),
  },
  xpPillText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.gold,
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
    paddingBottom: 60,
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  vipBannerCompact: {
    minHeight: 150,
    overflow: 'hidden',
  },
  vipBannerFull: {
    minHeight: 200,
    overflow: 'hidden',
  },
  vipBannerOverlay: {
    gap: Spacing.sm,
  },
  vipBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  vipBannerTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.gold,
    textTransform: 'uppercase',
    fontStyle: 'italic',
  },
  vipBannerSubtitle: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.cyan,
  },
  perksList: {
    gap: Spacing.sm,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  perkText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  chipCard: {
    width: '48%',
  },
  chipCardHighlighted: {
    width: '100%',
  },
  hotBadge: {
    position: 'absolute',
    top: 10,
    right: -28,
    backgroundColor: Colors.crimson,
    paddingHorizontal: 36,
    paddingVertical: 4,
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
  hotBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  chipCardCol: {
    alignItems: 'center',
    gap: 4,
  },
  chipCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  chipImageSm: {
    width: 56,
    height: 56,
  },
  chipImageLg: {
    width: 88,
    height: 88,
  },
  chipInfoCol: {
    alignItems: 'center',
    width: '100%',
    gap: 2,
  },
  chipInfoRow: {
    flex: 1,
    gap: 2,
  },
  chipAmount: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  chipAmountHighlighted: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.gold,
  },
  chipName: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  chipBonusNote: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  chipButtonWrap: {
    width: '100%',
  },
  gemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  gemCard: {
    width: '31%',
    alignItems: 'center',
  },
  gemImage: {
    width: 44,
    height: 44,
  },
  gemAmount: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  gemPriceChip: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.cyan, 0.4),
  },
  gemPriceText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.cyan,
  },
  bottomSpacer: {
    height: 30,
  },
});
