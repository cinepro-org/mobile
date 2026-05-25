import { Platform, type ViewStyle } from 'react-native';

export type FocusVariant = 'default' | 'subtle' | 'card' | 'accent' | 'onMedia' | 'nav';

type FocusColors = {
  accent: string;
  borderStrong: string;
  border: string;
};

export function idleBorderStyle(variant: FocusVariant, colors: FocusColors): ViewStyle {
  if (variant === 'card') {
    return {
      borderWidth: 2,
      borderColor: 'transparent',
      borderRadius: 18,
    };
  }
  if (variant === 'nav') {
    return {
      borderWidth: 2,
      borderColor: 'transparent',
      borderRadius: 14,
    };
  }
  if (variant === 'onMedia') {
    return { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 999 };
  }
  return {};
}

export function focusedRingStyle(
  variant: FocusVariant,
  colors: FocusColors,
  focused: boolean
): ViewStyle {
  if (!Platform.isTV || !focused) {
    return idleBorderStyle(variant, colors);
  }

  if (variant === 'nav') {
    return {
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.06)',
    };
  }

  if (variant === 'card') {
    return {
      borderWidth: 3,
      borderColor: colors.accent,
      borderRadius: 18,
      shadowColor: colors.accent,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    };
  }

  const radius =
    variant === 'onMedia' || variant === 'accent' ? 999 : variant === 'subtle' ? 999 : 12;

  return {
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: radius,
    shadowColor: colors.accent,
    shadowOpacity: variant === 'subtle' ? 0.35 : 0.5,
    shadowRadius: variant === 'subtle' ? 10 : 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: variant === 'subtle' ? 6 : 12,
  };
}

/** Cards use a smaller scale so rings are not clipped in horizontal rows. */
export const TV_FOCUS_SCALE = Platform.isTV ? 1.04 : 1.02;
export const TV_NAV_FOCUS_SCALE = 1;
