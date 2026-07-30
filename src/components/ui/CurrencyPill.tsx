import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

export type CurrencyType = 'chips' | 'gems';

interface CurrencyPillProps {
  type: CurrencyType;
  value: number | string;
  onPressAdd?: () => void;
}

const TYPE_CONFIG: Record<CurrencyType, { icon: 'poker-chip' | 'diamond-stone'; accent: string }> = {
  chips: { icon: 'poker-chip', accent: Colors.gold },
  gems: { icon: 'diamond-stone', accent: Colors.cyan },
};

export function CurrencyPill({ type, value, onPressAdd }: CurrencyPillProps) {
  const { icon, accent } = TYPE_CONFIG[type];
  const displayValue = typeof value === 'number' ? value.toLocaleString('en-US') : value;

  return (
    <View
      style={[
        styles.pill,
        {
          borderColor: withOpacity(accent, 0.4),
          boxShadow: `0px 2px 8px ${withOpacity(Colors.bgBase, 0.5)}`,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={16} color={accent} />
      <Text style={styles.value}>{displayValue}</Text>

      {onPressAdd ? (
        <Pressable
          onPress={onPressAdd}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: accent,
              boxShadow: `0px 0px 8px ${withOpacity(accent, 0.6)}`,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <Text style={styles.addLabel}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: withOpacity(Colors.bgPanel, 0.85),
  },
  value: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  addLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 18,
    color: Colors.bgBase,
  },
});
