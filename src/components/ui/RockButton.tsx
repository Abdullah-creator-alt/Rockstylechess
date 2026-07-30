import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

export type RockButtonVariant = 'primary' | 'reward' | 'danger';

interface RockButtonProps {
  label: string;
  onPress: () => void;
  variant?: RockButtonVariant;
  icon?: ReactNode;
  disabled?: boolean;
}

const VARIANT_ACCENT: Record<RockButtonVariant, string> = {
  primary: Colors.cyan,
  reward: Colors.gold,
  danger: Colors.crimson,
};

// Bright chips (cyan/gold) read best with dark text; crimson is dark enough
// that it needs light text to stay legible.
const VARIANT_TEXT_COLOR: Record<RockButtonVariant, string> = {
  primary: Colors.bgBase,
  reward: Colors.bgBase,
  danger: Colors.textPrimary,
};

export function RockButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
}: RockButtonProps) {
  const accent = VARIANT_ACCENT[variant];
  const textColor = VARIANT_TEXT_COLOR[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: accent,
          borderTopColor: withOpacity(Colors.chrome, 0.5),
          borderBottomColor: withOpacity(Colors.bgBase, 0.6),
          boxShadow: pressed
            ? `0px 2px 4px ${withOpacity(Colors.bgBase, 0.6)}, 0px 0px 8px ${withOpacity(accent, 0.35)}`
            : `0px 4px 10px ${withOpacity(Colors.bgBase, 0.7)}, 0px 0px 18px ${withOpacity(accent, 0.5)}`,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }, { translateY: pressed ? 1 : 0 }],
        },
      ]}
    >
      {/* Source CSS uses a real 3-stop `linear-gradient(180deg, light, accent,
          dark)` fill. We keep the solid accent as the base layer and lay this
          light-to-dark gradient on top instead of inventing new off-palette
          hex stops -- same light-top/dark-bottom depth, zero new colors. */}
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(Colors.chrome, 0.4), withOpacity(Colors.chrome, 0), withOpacity(Colors.bgBase, 0.35)]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Crisper specular highlight, separate from the shading above --
          translates the source's `inset 0 2px 4px rgba(255,255,255,0.3)`. */}
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(Colors.chrome, 0.55), withOpacity(Colors.chrome, 0)]}
        style={styles.gloss}
      />
      <View style={styles.content}>
        {icon}
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
