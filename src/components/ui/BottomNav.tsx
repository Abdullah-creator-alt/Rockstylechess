import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Spacing, withOpacity } from '@/constants/theme';

export type NavTab = 'home' | 'ranks' | 'play' | 'shop' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabPress: (tab: NavTab) => void;
}

const SIDE_TABS: { key: NavTab; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'ranks', label: 'Ranks', icon: 'trophy' },
  { key: 'shop', label: 'Shop', icon: 'storefront' },
  { key: 'profile', label: 'Profile', icon: 'account' },
];

export function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  const leftTabs = SIDE_TABS.slice(0, 2);
  const rightTabs = SIDE_TABS.slice(2);

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={styles.sideGroup}>
          {leftTabs.map((tab) => (
            <NavItem key={tab.key} tab={tab} active={activeTab === tab.key} onPress={onTabPress} />
          ))}
        </View>
        <View style={styles.centerSpacer} />
        <View style={styles.sideGroup}>
          {rightTabs.map((tab) => (
            <NavItem key={tab.key} tab={tab} active={activeTab === tab.key} onPress={onTabPress} />
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => onTabPress('play')}
        style={({ pressed }) => [styles.playButton, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <LinearGradient
          colors={[Colors.emberLight, Colors.ember]}
          style={[
            styles.playGradient,
            { boxShadow: `0px 0px 18px ${withOpacity(Colors.ember, 0.7)}` },
          ]}
        >
          <MaterialCommunityIcons name="play" size={28} color={Colors.textPrimary} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function NavItem({
  tab,
  active,
  onPress,
}: {
  tab: { key: NavTab; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap };
  active: boolean;
  onPress: (tab: NavTab) => void;
}) {
  const color = active ? Colors.cyan : Colors.chromeMid;
  return (
    <Pressable
      style={styles.navItem}
      onPress={() => onPress(tab.key)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialCommunityIcons name={tab.icon} size={22} color={color} />
      <Text style={[styles.navLabel, { color }]}>{tab.label}</Text>
    </Pressable>
  );
}

const BAR_HEIGHT = 64;
const PLAY_SIZE = 64;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: BAR_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: withOpacity(Colors.gold, 0.18),
    backgroundColor: withOpacity(Colors.bgPanel, 0.92),
    boxShadow: `0px -4px 16px ${withOpacity(Colors.bgBase, 0.6)}`,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  centerSpacer: {
    width: PLAY_SIZE * 0.8,
  },
  navItem: {
    alignItems: 'center',
    gap: 2,
  },
  navLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
  },
  playButton: {
    position: 'absolute',
    top: -PLAY_SIZE * 0.4,
  },
  playGradient: {
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    borderRadius: PLAY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: withOpacity(Colors.chrome, 0.35),
  },
});
