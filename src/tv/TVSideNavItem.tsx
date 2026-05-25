import React, { useEffect, useRef } from 'react';
import { Text, View, type View as RNView } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { useTVNavigationOptional } from '@/tv/TVNavigationContext';
import { TV_NAV_FOCUS_SCALE } from '@/tv/focusStyles';
import { TV_NAV_COLLAPSED_WIDTH } from '@/tv/tvNavSizes';

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  accessibilityLabel?: string;
  isNavFocusAnchor?: boolean;
};

/** Side-nav row: clean icon pill focus — no nested dark boxes or heavy glow. */
export function TVSideNavItem({
  label,
  icon,
  active = false,
  onPress,
  hasTVPreferredFocus,
  accessibilityLabel,
  isNavFocusAnchor,
}: Props) {
  const { colors } = useAppTheme();
  const tvNav = useTVNavigationOptional();
  const itemRef = useRef<RNView>(null);
  const navProgress = tvNav?.navProgress;

  const labelStyle = useAnimatedStyle(() => {
    const p = navProgress?.value ?? 0;
    return {
      opacity: p,
      transform: [{ translateX: (1 - p) * -6 }],
    };
  });

  useEffect(() => {
    if (isNavFocusAnchor) {
      tvNav?.setNavFocusRef(itemRef.current);
    }
  }, [isNavFocusAnchor, tvNav]);

  return (
    <FocusSurface
      ref={itemRef}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusVariant="nav"
      focusedScale={TV_NAV_FOCUS_SCALE}
      onFocus={() => {
        tvNav?.setNavFocusRef(itemRef.current);
        tvNav?.registerNavFocus();
      }}
      nextFocusRight={tvNav?.contentFocusHandle ?? undefined}
      accessibilityRole="menuitem"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      className="flex-row items-center mb-1"
      style={{
        width: '100%',
        minHeight: 48,
        paddingVertical: 4,
        paddingHorizontal: 4,
        overflow: 'visible',
      }}
    >
      {active ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: 2,
            backgroundColor: colors.accent,
          }}
        />
      ) : null}

      <View
        style={{
          width: TV_NAV_COLLAPSED_WIDTH - 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          className="rounded-xl items-center justify-center"
          style={{
            width: 42,
            height: 42,
            backgroundColor: active ? colors.accent : colors.elevated,
            borderWidth: 1,
            borderColor: active ? colors.accent : colors.border,
          }}
        >
          <Ionicons name={icon} color={active ? colors.textOnAccent : colors.textMuted} size={22} />
        </View>
      </View>

      <Animated.View
        style={[
          labelStyle,
          {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 6,
            overflow: 'hidden',
          },
        ]}
        pointerEvents={tvNav?.expanded ? 'auto' : 'none'}
      >
        <Text
          className="text-base font-semibold flex-1"
          style={{ color: active ? colors.text : colors.textMuted }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {active ? <Ionicons name="chevron-forward" color={colors.accent} size={16} /> : null}
      </Animated.View>
    </FocusSurface>
  );
}
