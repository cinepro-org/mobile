import React, { forwardRef, useMemo, useState } from 'react';
import { Pressable, PressableProps, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { focusedRingStyle, idleBorderStyle, TV_FOCUS_SCALE, type FocusVariant } from '@/tv/focusStyles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type FocusSurfaceProps = PressableProps & {
  children: React.ReactNode;
  focusedScale?: number;
  focusVariant?: FocusVariant;
  /** When true, receives initial focus on mount (Android TV / tvOS). */
  hasTVPreferredFocus?: boolean;
};

export const FocusSurface = forwardRef<View, FocusSurfaceProps>(function FocusSurface(
  {
    children,
    focusedScale = TV_FOCUS_SCALE,
    focusVariant = 'default',
    hasTVPreferredFocus,
    onFocus,
    onBlur,
    style,
    ...rest
  },
  ref
) {
  const { colors } = useAppTheme();
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
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.value = 0;
        setIsFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});
