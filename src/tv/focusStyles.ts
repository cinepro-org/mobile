import { Platform, type ViewStyle } from 'react-native';

export type FocusVariant = 'default' | 'subtle' | 'card' | 'accent' | 'onMedia';

type FocusColors = {
  accent: string;
  borderStrong: string;
  border: string;
};

export function idleBorderStyle(variant: FocusVariant, colors: FocusColors): ViewStyle {
  if (variant === 'card') {
    return {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 16,
      ...(Platform.isTV ? { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 } : {}),
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

  const radius =
    variant === 'card' ? 16 : variant === 'onMedia' || variant === 'accent' ? 999 : 12;

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

export const TV_FOCUS_SCALE = Platform.isTV ? 1.05 : 1.02;
