import React, { forwardRef, useMemo, useState } from 'react';
import { Pressable, PressableProps, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { focusedRingStyle, idleBorderStyle, TV_FOCUS_SCALE, type FocusVariant } from '@/tv/focusStyles';
import { useTVNavigationOptional } from '@/tv/TVNavigationContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type FocusSurfaceProps = PressableProps & {
  children: React.ReactNode;
  focusedScale?: number;
  focusVariant?: FocusVariant;
  /** When true, receives initial focus on mount (Android TV / tvOS). */
  hasTVPreferredFocus?: boolean;
  /** Collapse the TV side rail when this element receives focus (main content only). */
  collapseTVNavOnFocus?: boolean;
  /** Android TV: native node handle for D-pad left focus search. */
  nextFocusLeft?: number;
  /** Android TV: native node handle for D-pad right focus search. */
  nextFocusRight?: number;
  /** Android TV: native node handle for D-pad down focus search. */
  nextFocusDown?: number;
  /** Android TV: native node handle for D-pad up focus search. */
  nextFocusUp?: number;
};

export const FocusSurface = forwardRef<View, FocusSurfaceProps>(function FocusSurface(
  {
    children,
    focusedScale = TV_FOCUS_SCALE,
    focusVariant = 'default',
    hasTVPreferredFocus,
    collapseTVNavOnFocus,
    nextFocusLeft,
    nextFocusRight,
    nextFocusDown,
    nextFocusUp,
    onFocus,
    onBlur,
    style,
    ...rest
  },
  ref
) {
  const { colors } = useAppTheme();
  const tvNav = useTVNavigationOptional();
  const focused = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);

  const idleStyle = useMemo(
    () => idleBorderStyle(focusVariant, colors),
    [colors, focusVariant]
  );

  const ringStyle = useMemo(
    () => focusedRingStyle(focusVariant, colors, isFocused),
    [colors, focusVariant, isFocused]
  );

  const anim = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(focused.value > 0.5 ? focusedScale : 1, {
          damping: 18,
          stiffness: 220,
        }),
      },
    ],
  }));

  return (
    <AnimatedPressable
      ref={ref as never}
      accessibilityRole="button"
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[idleStyle, ringStyle, anim, style as StyleProp<ViewStyle>]}
      onFocus={(e) => {
        focused.value = 1;
        setIsFocused(true);
        if (collapseTVNavOnFocus) tvNav?.registerContentFocus();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.value = 0;
        setIsFocused(false);
        onBlur?.(e);
      }}
      {...({
        ...rest,
        nextFocusLeft,
        nextFocusRight,
        nextFocusDown,
        nextFocusUp,
      } as PressableProps)}
    >
      {children}
    </AnimatedPressable>
  );
});
