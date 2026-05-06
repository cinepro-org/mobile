import React, { forwardRef } from 'react';
import { Platform, Pressable, PressableProps, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type FocusSurfaceProps = PressableProps & {
  children: React.ReactNode;
  focusedScale?: number;
};

export const FocusSurface = forwardRef<View, FocusSurfaceProps>(function FocusSurface(
  { children, focusedScale = Platform.isTV ? 1.05 : 1.02, onFocus, onBlur, ...rest },
  ref
) {
  const focused = useSharedValue(0);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused.value ? focusedScale : 1, { damping: 18 }) }],
  }));

  return (
    <AnimatedPressable
      ref={ref as never}
      accessibilityRole="button"
      style={anim}
      onFocus={(e) => {
        focused.value = 1;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.value = 0;
        onBlur?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});
