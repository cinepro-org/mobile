import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAppTheme } from '@/theme/AppThemeProvider';

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  accessibilityLabel?: string;
};

/** Drawer / top-nav menu row with TV focus styling. */
export function FocusMenuItem({
  label,
  icon,
  active = false,
  onPress,
  hasTVPreferredFocus,
  accessibilityLabel,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <FocusSurface
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusVariant={active ? 'accent' : 'default'}
      accessibilityRole="menuitem"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5 mb-1.5"
      style={{
        backgroundColor: active ? colors.accentSoft : 'transparent',
      }}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{
          backgroundColor: active ? colors.accent : colors.inputBg,
        }}
      >
        <Ionicons name={icon} color={active ? colors.textOnAccent : colors.textMuted} size={22} />
      </View>
      <Text
        className="text-base font-semibold flex-1"
        style={{ color: active ? colors.text : colors.textMuted }}
      >
        {label}
      </Text>
      {active ? <Ionicons name="chevron-forward" color={colors.accent} size={18} /> : null}
    </FocusSurface>
  );
}
