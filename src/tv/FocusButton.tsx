import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FocusSurface, type FocusSurfaceProps } from '@/tv/FocusSurface';
import { useAppTheme } from '@/theme/AppThemeProvider';

type Props = Omit<FocusSurfaceProps, 'children'> & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
  subtitle?: string;
};

/** Pill / row button with icon, label, and TV focus ring. */
export function FocusButton({
  label,
  icon,
  iconColor,
  textColor,
  style,
  className,
  subtitle,
  focusVariant = 'default',
  ...rest
}: Props) {
  const { colors } = useAppTheme();

  return (
    <FocusSurface
      className={className ?? 'rounded-2xl px-4 py-3.5 flex-row items-center gap-2.5'}
      style={style}
      focusVariant={focusVariant}
      {...rest}
    >
      {icon ? <Ionicons name={icon} color={iconColor ?? colors.text} size={20} /> : null}
      <View className="flex-1 min-w-0">
        <Text className="font-semibold text-[15px]" style={{ color: textColor ?? colors.text }}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </FocusSurface>
  );
}
