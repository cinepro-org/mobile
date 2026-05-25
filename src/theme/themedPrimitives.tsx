import React from 'react';
import {
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAppTheme } from '@/theme/AppThemeProvider';

export function ThemedScreen({
  children,
  style,
  className,
  ...rest
}: ViewProps & { className?: string }) {
  const { colors } = useAppTheme();
  return (
    <View className={className ?? 'flex-1'} style={[{ backgroundColor: colors.ink }, style]} {...rest}>
      {children}
    </View>
  );
}

type TextVariant = 'body' | 'muted' | 'faint' | 'accent' | 'eyebrow' | 'title' | 'subtitle';

export function ThemedText({
  variant = 'body',
  style,
  className,
  ...rest
}: TextProps & { variant?: TextVariant; className?: string }) {
  const { colors } = useAppTheme();
  const variantStyle: TextStyle =
    variant === 'muted'
      ? { color: colors.textMuted }
      : variant === 'faint'
        ? { color: colors.textFaint }
        : variant === 'accent'
          ? { color: colors.accent }
          : variant === 'eyebrow'
            ? {
                color: colors.textFaint,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 2,
                textTransform: 'uppercase',
              }
            : variant === 'title'
              ? { color: colors.text, fontSize: 20, fontWeight: '700' }
              : variant === 'subtitle'
                ? { color: colors.textMuted, fontSize: 15 }
                : { color: colors.text };

  return <Text className={className} style={[variantStyle, style]} {...rest} />;
}

export function SectionHeader({
  title,
  eyebrow,
  style,
  action,
}: {
  title: string;
  eyebrow?: string;
  style?: StyleProp<ViewStyle>;
  action?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-end justify-between gap-3 mb-3" style={style}>
      <View className="flex-1">
        {eyebrow ? <ThemedText variant="eyebrow">{eyebrow}</ThemedText> : null}
        <ThemedText variant="title" className="text-xl tracking-tight">
          {title}
        </ThemedText>
      </View>
      {action}
    </View>
  );
}

export function ThemedBackButton({
  onPress,
  accessibilityLabel = 'Go back',
  variant = 'default',
  hasTVPreferredFocus,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
  /** Circular control over photos/video — no full-width bar look */
  variant?: 'default' | 'onMedia';
  hasTVPreferredFocus?: boolean;
}) {
  const { colors } = useAppTheme();

  if (variant === 'onMedia') {
    return (
      <FocusSurface
        onPress={onPress}
        focusVariant="onMedia"
        hasTVPreferredFocus={hasTVPreferredFocus}
        accessibilityLabel={accessibilityLabel}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.42)',
        }}
      >
        <Ionicons name="chevron-back" color="#ffffff" size={26} />
      </FocusSurface>
    );
  }

  return (
    <FocusSurface
      className="rounded-full px-3 py-2"
      style={{
        backgroundColor: colors.inputBg,
        borderColor: colors.border,
        borderWidth: 1,
        alignSelf: 'flex-start',
      }}
      focusVariant="subtle"
      hasTVPreferredFocus={hasTVPreferredFocus}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="arrow-back" color={colors.text} size={22} />
    </FocusSurface>
  );
}

export function ThemedCard({
  children,
  style,
  className,
  padded = true,
  ...rest
}: ViewProps & { className?: string; padded?: boolean }) {
  const { colors, isDark } = useAppTheme();
  return (
    <View
      className={`rounded-2xl overflow-hidden border ${padded ? 'p-4' : ''} ${className ?? ''}`}
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...(isDark
            ? {}
            : {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
