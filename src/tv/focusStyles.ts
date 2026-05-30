import { Platform, type ViewStyle } from 'react-native';

export type FocusVariant =
  | 'default'
  | 'subtle'
  | 'card'
  | 'accent'
  | 'onMedia'
  | 'nav'
  | 'control'
  | 'ghost'
  | 'chip'
  | 'chipOnAccent'
  | 'heroPlay'
  | 'heroDetails'
  | 'playerControl'
  | 'playerOverlay';

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
  if (variant === 'control') {
    return { borderWidth: 2, borderColor: 'transparent' };
  }
  if (variant === 'ghost') {
    return { borderWidth: 0, backgroundColor: 'transparent' };
  }
  if (variant === 'chip') {
    return {
      borderWidth: 2,
      borderColor: 'transparent',
      borderRadius: 999,
    };
  }
  if (variant === 'chipOnAccent') {
    return {
      borderWidth: 2,
      borderColor: 'transparent',
      borderRadius: 999,
    };
  }
  if (variant === 'heroPlay' || variant === 'heroDetails') {
    return {
      borderWidth: 4,
      borderColor: variant === 'heroDetails' ? 'rgba(255,255,255,0.28)' : 'transparent',
      borderRadius: 16,
    };
  }
  if (variant === 'playerControl') {
    return {
      borderWidth: 3,
      borderColor: 'transparent',
      borderRadius: 999,
    };
  }
  if (variant === 'playerOverlay') {
    return {
      borderWidth: 3,
      borderColor: 'transparent',
      borderRadius: 12,
    };
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
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.04)',
    };
  }

  if (variant === 'control') {
    return {
      borderWidth: 3,
      borderColor: colors.accent,
    };
  }

  if (variant === 'ghost') {
    return { borderWidth: 0, backgroundColor: 'transparent' };
  }

  if (variant === 'chip') {
    return {
      borderWidth: 3,
      borderColor: colors.accent,
      borderRadius: 999,
    };
  }

  if (variant === 'chipOnAccent') {
    return {
      borderWidth: 3,
      borderColor: '#ffffff',
      borderRadius: 999,
    };
  }

  if (variant === 'heroPlay') {
    return {
      borderWidth: 4,
      borderColor: '#ffffff',
      borderRadius: 16,
      backgroundColor: colors.accent,
    };
  }

  if (variant === 'heroDetails') {
    return {
      borderWidth: 4,
      borderColor: '#ffffff',
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.22)',
    };
  }

  if (variant === 'playerControl') {
    return {
      borderWidth: 4,
      borderColor: '#ffffff',
      borderRadius: 999,
    };
  }

  if (variant === 'playerOverlay') {
    return {
      borderWidth: 3,
      borderColor: '#ffffff',
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.1)',
    };
  }

  const radius =
    variant === 'onMedia' || variant === 'accent' ? 999 : variant === 'subtle' ? 999 : 12;

  return {
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius,
    ...(variant === 'onMedia' ? { backgroundColor: 'rgba(255,255,255,0.06)' } : null),
  };
}

/** No scale transform — avoids clipped rings and layout jitter on TV. */
export const TV_CONTROL_FOCUS_SCALE = 1;
export const TV_NAV_FOCUS_SCALE = 1;
/** Legacy default for non-control surfaces; prefer TV_CONTROL_FOCUS_SCALE on TV. */
export const TV_FOCUS_SCALE = Platform.isTV ? 1.02 : 1.02;
