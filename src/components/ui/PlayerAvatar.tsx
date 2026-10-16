import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { getAvatarClass, getAvatarImage, type AvatarClass } from '@/constants/avatars';
import { Colors, Fonts, Gradients, withOpacity } from '@/constants/theme';

export type AvatarSize = 'tiny' | 'small' | 'medium' | 'large';

interface PlayerAvatarProps {
  /**
   * A persisted avatar id (`profile.avatarId`, an opponent's `avatarId`, ...).
   * Resolves the image AND draws the avatar's class frame (steel / neon /
   * gold). Preferred over `source` for anything that is a real player avatar;
   * unknown or missing ids fall back to the default image in the Garage Band
   * frame. Pass `null` explicitly for "no avatar chosen yet".
   */
  avatarId?: string | null;
  /** A bundled avatar image (e.g. `getAvatarImage(avatarId)`). Wins over `imageUri`/`emoji`. */
  source?: ImageSourcePropType;
  imageUri?: string;
  /** Fallback glyph for non-avatar-set uses (bots, mock friends, "searching…" states). */
  emoji?: string;
  /** Omit to render the avatar with no level badge (e.g. character select). */
  level?: number;
  size?: AvatarSize;
  /** Swaps the fire ring for a cyan "selected" ring, e.g. character select. */
  selected?: boolean;
  /** Continuous ring rotation, e.g. while a spin-wheel result is pending. */
  spinning?: boolean;
}

const SIZE_MAP: Record<AvatarSize, { outer: number; ring: number; emoji: number; badge: number }> = {
  // For tight spots that can't absorb 'small''s footprint (e.g. the in-match
  // player-row card, where the box has to stay close to its old
  // icon-plus-two-lines-of-text height) -- no level badge is ever shown at
  // this size in practice, so its badge value only exists to keep the
  // container-height formula below uniform across sizes.
  tiny: { outer: 32, ring: 2, emoji: 14, badge: 12 },
  small: { outer: 44, ring: 3, emoji: 18, badge: 16 },
  medium: { outer: 68, ring: 4, emoji: 28, badge: 20 },
  large: { outer: 100, ring: 5, emoji: 42, badge: 26 },
};

// Per-class frames. Without `avatarId` (bots, emoji, mock friends, the
// bundled-`source` callers) the original ember "fire ring" is kept unchanged.
const CLASS_FRAME: Record<AvatarClass, { ring: readonly [string, string, ...string[]]; glow: string; glowAlpha: number }> = {
  garage_band: { ring: Gradients.avatarRingSteel, glow: Colors.chromeMid, glowAlpha: 0.3 },
  main_stage: { ring: Gradients.avatarRingNeon, glow: Colors.neon, glowAlpha: 0.65 },
  hall_of_fame: { ring: Gradients.avatarRingGold, glow: Colors.gold, glowAlpha: 0.75 },
};

// Hall of Fame extra: a slow breathing halo plus three twinkling sparkles on
// the ring. One shared value drives everything (cheap even in a list).
function GoldFx({ outer }: { outer: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.25 + 0.55 * t.value, transform: [{ scale: 1 + 0.08 * t.value }] }));
  // Inline (not a shared helper): a plain JS function isn't callable from the
  // UI-thread worklet. Triangle wave, each sparkle offset in phase.
  const s1 = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(((t.value + 0) % 1) * 2 - 1) }));
  const s2 = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(((t.value + 0.33) % 1) * 2 - 1) }));
  const s3 = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(((t.value + 0.66) % 1) * 2 - 1) }));
  const dot = Math.max(3, Math.round(outer * 0.07));
  const place = (angle: number) => {
    const r = outer / 2;
    return {
      position: 'absolute' as const,
      width: dot,
      height: dot,
      borderRadius: dot / 2,
      backgroundColor: '#FFFFFF',
      left: r + r * Math.cos(angle) - dot / 2,
      top: r + r * Math.sin(angle) - dot / 2,
      boxShadow: `0px 0px ${dot * 2}px ${Colors.gold}`,
    };
  };
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', width: outer, height: outer, borderRadius: outer / 2 },
          { borderWidth: 1.5, borderColor: withOpacity(Colors.gold, 0.8), boxShadow: `0px 0px ${outer * 0.25}px ${Colors.gold}` },
          halo,
        ]}
      />
      <Animated.View pointerEvents="none" style={[place(-0.9), s1]} />
      <Animated.View pointerEvents="none" style={[place(0.5), s2]} />
      <Animated.View pointerEvents="none" style={[place(2.3), s3]} />
    </>
  );
}

// expo-linear-gradient only renders linear (not conic) gradients, so the
// "fire ring" is approximated with a diagonal multi-stop sweep plus a
// matching colored glow rather than a literal 360° conic gradient.
export function PlayerAvatar({
  avatarId,
  source: sourceProp,
  imageUri,
  emoji,
  level,
  size = 'medium',
  selected = false,
  spinning = false,
}: PlayerAvatarProps) {
  const { outer, ring, emoji: emojiSize, badge } = SIZE_MAP[size];
  const inner = outer - ring * 2;
  const hasAvatarId = avatarId !== undefined;
  const avatarClass = hasAvatarId ? getAvatarClass(avatarId) : null;
  const frame = avatarClass ? CLASS_FRAME[avatarClass] : null;
  const source = hasAvatarId ? getAvatarImage(avatarId) : sourceProp;
  const ringColors = selected
    ? ([Colors.cyan, withOpacity(Colors.cyan, 0.6), Colors.cyan] as const)
    : (frame?.ring ?? Gradients.avatarRing);
  const glowColor = selected ? Colors.cyan : (frame?.glow ?? Colors.ember);
  const glowAlpha = selected ? 0.55 : (frame?.glowAlpha ?? 0.55);
  const showGoldFx = avatarClass === 'hall_of_fame' && !selected && size !== 'tiny';

  const rotation = useSharedValue(0);
  useEffect(() => {
    if (spinning) {
      rotation.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1);
    }
  }, [spinning, rotation]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <View style={[styles.container, { width: outer, height: outer + badge / 2 }]}>
      <Animated.View style={spinning ? spinStyle : undefined}>
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
              boxShadow: `0px 0px ${outer * 0.35}px ${withOpacity(glowColor, glowAlpha)}`,
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
            {source ? (
              <Image source={source} resizeMode="cover" style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
            ) : imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
            ) : (
              <Text style={{ fontSize: emojiSize }}>{emoji ?? '♟️'}</Text>
            )}
          </View>
        </LinearGradient>
        {showGoldFx ? <GoldFx outer={outer} /> : null}
      </Animated.View>

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

// #region Styles
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
// #endregion
