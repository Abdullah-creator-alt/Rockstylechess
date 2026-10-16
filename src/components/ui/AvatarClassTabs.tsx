import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AVATAR_CLASSES, getAvatarsByClass, isAvatarOwned, type AvatarClass } from '@/constants/avatars';
import { Colors, Fonts, withOpacity } from '@/constants/theme';

interface AvatarClassTabsProps {
  value: AvatarClass;
  onChange: (next: AvatarClass) => void;
  ownedCosmeticIds: readonly string[] | undefined;
}

/**
 * The three avatar-class tabs (Garage Band / Main Stage / Hall of Fame) with an
 * owned/total count each, plus a header strip in the active class's accent
 * colour. Shared by every avatar picker (Forge, Collections, onboarding) so a
 * grid never mixes classes -- mixing the three art styles in one grid is what
 * made them look random. The caller renders the grid for `value` itself
 * (`getAvatarsByClass`), since each screen has its own tile.
 */
export function AvatarClassTabs({ value, onChange, ownedCosmeticIds }: AvatarClassTabsProps) {
  const active = AVATAR_CLASSES.find((c) => c.id === value) ?? AVATAR_CLASSES[0];
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        {AVATAR_CLASSES.map((cls) => {
          const all = getAvatarsByClass(cls.id);
          const owned = all.filter((a) => isAvatarOwned(a.id, ownedCosmeticIds)).length;
          const isActive = cls.id === value;
          return (
            <Pressable
              key={cls.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(cls.id)}
              style={[
                styles.tab,
                {
                  borderColor: isActive ? cls.accent : withOpacity(Colors.chromeDark, 0.5),
                  backgroundColor: isActive ? withOpacity(cls.accent, 0.16) : withOpacity(Colors.bgPanel, 0.7),
                  boxShadow: isActive ? `0px 0px 10px ${withOpacity(cls.accent, 0.45)}` : undefined,
                },
              ]}
            >
              <Text numberOfLines={1} style={[styles.tabLabel, { color: isActive ? cls.accent : Colors.textMuted }]}>
                {cls.label}
              </Text>
              <Text style={[styles.tabCount, { color: isActive ? Colors.textPrimary : Colors.chromeDark }]}>
                {owned}/{all.length}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.header, { borderColor: withOpacity(active.accent, 0.45) }]}>
        <LinearGradient
          colors={[withOpacity(active.accent, 0.28), withOpacity(active.accent, 0.04)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[styles.headerTitle, { color: active.accent }]}>{active.label}</Text>
        <Text style={styles.headerTagline}>{active.tagline}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabLabel: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 0.8 },
  tabCount: { fontFamily: Fonts.heading, fontSize: 15, marginTop: 1 },
  header: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: withOpacity(Colors.bgPanel, 0.6),
  },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 13, letterSpacing: 1.2 },
  headerTagline: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 1 },
});
