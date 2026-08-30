import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Gradients, Radius, Spacing, withOpacity } from '@/constants/theme';

interface RockCardProps {
  children: ReactNode;
  /** Accent for a highlighted/active card (e.g. the current venue). */
  glowColor?: string;
  /** Optional full-bleed photo behind the content (e.g. a hero/arena card).
   *  Accepts a remote `{ uri }`, a `require(...)` module, or a URL string. */
  backgroundImage?: ImageSource | number | string;
  /**
   * `'depth'` (default) -- the layered gloss / inner-glow / top-highlight
   * treatment used across most screens. `'surface'` -- new_ui's flatter
   * `GradientCard` look: one outer shadow (the glow color when set), a
   * vertical `bgPanel -> bgBase` surface gradient, thin asymmetric borders,
   * radius 8, and none of the extra light layers.
   */
  variant?: 'depth' | 'surface';
  style?: StyleProp<ViewStyle>;
}

export function RockCard({ children, glowColor, backgroundImage, variant = 'depth', style }: RockCardProps) {
  const glow = glowColor ?? Colors.gold;

  const photoLayers = backgroundImage ? (
    <>
      <Image
        source={typeof backgroundImage === 'string' ? { uri: backgroundImage } : backgroundImage}
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
  ) : null;

  if (variant === 'surface') {
    return (
      <View
        style={[
          styles.surfaceCard,
          {
            // new_ui GradientCard: a single outer shadow -- the glow color
            // when one is set, otherwise a plain drop shadow.
            shadowColor: glowColor ?? Colors.bgBase,
            shadowOpacity: glowColor ? 0.4 : 0.7,
            shadowRadius: glowColor ? 18 : 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          },
          style,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={Gradients.cardSurface}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {photoLayers}
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

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

      {photoLayers}

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

// #region Styles
const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderTopColor: withOpacity(Colors.chrome, 0.3),
    overflow: 'hidden',
  },
  // new_ui GradientCard's box: radius 8, a bright hairline top edge and a
  // fainter 0.5px frame around the rest.
  surfaceCard: {
    borderRadius: 8,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: withOpacity(Colors.chromeDark, 0.3),
    borderTopColor: withOpacity(Colors.chrome, 0.15),
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
    // flex:1 is a no-op when the card's height is content-driven (the common
    // case) and lets the content fill the card when it has an explicit
    // height/aspectRatio (e.g. the square Home bento tiles).
    flex: 1,
    padding: Spacing.lg,
  },
});
// #endregion
