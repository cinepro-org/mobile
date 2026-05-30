import { LayoutAnimation, Platform } from 'react-native';
import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/** Smooth deceleration — default for reveals and expansions. */
export const MOTION_EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

/** Balanced ease — cross-fades and collapses. */
export const MOTION_EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);

/** Gentle acceleration — dismiss / collapse exits. */
export const MOTION_EASE_IN = Easing.bezier(0.55, 0, 1, 0.45);

export const MOTION_DURATION = {
  instant: 120,
  fast: 200,
  normal: 320,
  slow: 480,
  hero: 640,
  pulse: 1400,
} as const;

export const MOTION_SPRING = {
  /** Focus rings, buttons, small feedback. */
  gentle: { damping: 22, stiffness: 170, mass: 0.85 } satisfies WithSpringConfig,
  /** Splash logo, scrub thumb. */
  responsive: { damping: 20, stiffness: 190, mass: 0.9 } satisfies WithSpringConfig,
  /** Large layout shifts when a spring feels better than timing. */
  layout: { damping: 26, stiffness: 150, mass: 1 } satisfies WithSpringConfig,
} as const;

export function motionTiming(
  duration: number = MOTION_DURATION.normal,
  easing: typeof MOTION_EASE_OUT = MOTION_EASE_OUT
): WithTimingConfig {
  return { duration, easing };
}

export const MOTION_FADE = {
  in: MOTION_DURATION.normal,
  out: MOTION_DURATION.fast,
} as const;

/** Softer layout transitions when expanding/collapsing inline sections. */
export function configureSmoothLayoutAnimation() {
  if (Platform.OS === 'web') return;
  LayoutAnimation.configureNext({
    duration: MOTION_DURATION.normal,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
}
