import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing, withOpacity } from '@/constants/theme';

interface RockCardProps {
  children: ReactNode;
  /** Accent for a highlighted/active card (e.g. the current venue). */
  glowColor?: string;
  /** Optional full-bleed photo behind the content (e.g. a hero/arena card). */
  backgroundImageUri?: string;
  style?: StyleProp<ViewStyle>;
}

export function RockCard({ children, glowColor, backgroundImageUri, style }: RockCardProps) {
  const glow = glowColor ?? Colors.gold;
  const ambientShadow = `0px 15px 30px ${withOpacity(Colors.bgBase, 0.85)}`;
  const accentShadow = glowColor ? `, 0px 0px 24px ${withOpacity(glow, 0.45)}` : '';

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: withOpacity(glowColor ?? Colors.gold, glowColor ? 0.55 : 0.22),
          boxShadow: `${ambientShadow}${accentShadow}`,
        },
        style,
      ]}
    >
      {/* Base fill: a real diagonal gradient (translates the Stitch source's
          `.card-object { background: linear-gradient(135deg, panel, base) }`)
          instead of a flat translucent color. */}
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(Colors.bgPanel, 0.85), withOpacity(Colors.bgBase, 0.85)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {backgroundImageUri ? (
        <>
          <Image
            source={{ uri: backgroundImageUri }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Matches the source's `bg-gradient-to-t from-base-black
              via-base-black/50 to-transparent` scrim over the photo. */}
          <LinearGradient
            pointerEvents="none"
            colors={[withOpacity(Colors.bgBase, 0), withOpacity(Colors.bgBase, 0.5), Colors.bgBase]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </>
      ) : null}

      {/* Soft accent glow near the top -- independent of the photo scrim. */}
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(glow, 0.16), withOpacity(glow, 0)]}
        style={styles.innerGlow}
      />

      {/* Thin top highlight line: translates the source's `::before` 1px
          gradient-line trick for a crisp chrome edge catching light. */}
      <LinearGradient
        pointerEvents="none"
        colors={[withOpacity(Colors.chrome, 0), withOpacity(Colors.chrome, 0.35), withOpacity(Colors.chrome, 0)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topHighlightLine}
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderTopColor: withOpacity(Colors.chrome, 0.3),
    overflow: 'hidden',
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  topHighlightLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    padding: Spacing.lg,
  },
});
