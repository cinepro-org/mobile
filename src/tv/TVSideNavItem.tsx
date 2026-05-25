import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { useTVNavigationOptional } from '@/tv/TVNavigationContext';

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  expanded: boolean;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  accessibilityLabel?: string;
};

/**
 * Collapsible side-nav row: icon always visible; label fades in when expanded.
 * Expands the rail when focused; active route stays highlighted when collapsed.
 */
export function TVSideNavItem({
  label,
  icon,
  active = false,
  expanded,
  onPress,
  hasTVPreferredFocus,
  accessibilityLabel,
}: Props) {
  const { colors } = useAppTheme();
  const tvNav = useTVNavigationOptional();
  const labelOpacity = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const labelWidth = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(labelOpacity, {
        toValue: expanded ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(labelWidth, {
        toValue: expanded ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [expanded, labelOpacity, labelWidth]);

  return (
    <FocusSurface
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusVariant={active ? 'accent' : 'default'}
      onFocus={() => tvNav?.expand()}
      accessibilityRole="menuitem"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      className="flex-row items-center rounded-2xl mb-1.5 overflow-hidden"
      style={{
        paddingVertical: 12,
        paddingHorizontal: expanded ? 14 : 10,
        backgroundColor: active ? colors.accentSoft : 'transparent',
        minHeight: 52,
      }}
    >
      <View
        className="rounded-xl items-center justify-center"
        style={{
          width: 44,
          height: 44,
          backgroundColor: active ? colors.accent : colors.inputBg,
        }}
      >
        <Ionicons name={icon} color={active ? colors.textOnAccent : colors.textMuted} size={24} />
      </View>

      <Animated.View
        style={{
          opacity: labelOpacity,
          maxWidth: labelWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 180] }),
          overflow: 'hidden',
          marginLeft: expanded ? 12 : 0,
          flex: expanded ? 1 : 0,
        }}
      >
        <Text
          className="text-base font-semibold"
          style={{ color: active ? colors.text : colors.textMuted }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>

      {active && expanded ? (
        <Ionicons name="chevron-forward" color={colors.accent} size={18} />
      ) : null}
    </FocusSurface>
  );
}
