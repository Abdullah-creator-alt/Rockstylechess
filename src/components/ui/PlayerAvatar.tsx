import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, withOpacity } from '@/constants/theme';

export type AvatarSize = 'small' | 'medium' | 'large';

interface PlayerAvatarProps {
  imageUri?: string;
  emoji?: string;
  /** Omit to render the avatar with no level badge (e.g. character select). */
  level?: number;
  size?: AvatarSize;
  /** Swaps the fire ring for a cyan "selected" ring, e.g. character select. */
  selected?: boolean;
}

const SIZE_MAP: Record<AvatarSize, { outer: number; ring: number; emoji: number; badge: number }> = {
  small: { outer: 44, ring: 3, emoji: 18, badge: 16 },
  medium: { outer: 68, ring: 4, emoji: 28, badge: 20 },
  large: { outer: 100, ring: 5, emoji: 42, badge: 26 },
};

// expo-linear-gradient only renders linear (not conic) gradients, so the
// "fire ring" is approximated with a diagonal multi-stop sweep plus a
// matching colored glow rather than a literal 360° conic gradient.
export function PlayerAvatar({ imageUri, emoji, level, size = 'medium', selected = false }: PlayerAvatarProps) {
  const { outer, ring, emoji: emojiSize, badge } = SIZE_MAP[size];
  const inner = outer - ring * 2;
  const ringColors = selected
    ? ([Colors.cyan, withOpacity(Colors.cyan, 0.6), Colors.cyan] as const)
    : ([Colors.ember, Colors.gold, Colors.crimson, Colors.ember] as const);
  const glowColor = selected ? Colors.cyan : Colors.ember;

  return (
    <View style={[styles.container, { width: outer, height: outer + badge / 2 }]}>
      <LinearGradient
        colors={ringColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.ring,
          {
            width: outer,
            height: outer,
            borderRadius: outer / 2,
            boxShadow: `0px 0px ${outer * 0.35}px ${withOpacity(glowColor, 0.55)}`,
          },
        ]}
      >
        <View
          style={[
            styles.content,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
            },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
          ) : (
            <Text style={{ fontSize: emojiSize }}>{emoji ?? '♟️'}</Text>
          )}
        </View>
      </LinearGradient>

      {level !== undefined ? (
        <View
          style={[
            styles.badge,
            {
              width: badge,
              height: badge,
              borderRadius: badge / 2,
              boxShadow: `0px 0px 6px ${withOpacity(Colors.gold, 0.6)}`,
            },
          ]}
        >
          <Text style={[styles.badgeLabel, { fontSize: badge * 0.55 }]}>{level}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    backgroundColor: Colors.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: Colors.gold,
    borderWidth: 1.5,
    borderColor: Colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontFamily: Fonts.heading,
    color: Colors.bgBase,
  },
});
