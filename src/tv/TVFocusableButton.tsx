import React, { forwardRef } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FocusSurface, type FocusSurfaceProps } from '@/tv/FocusSurface';
import { TV_CONTROL_FOCUS_SCALE } from '@/tv/focusStyles';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { fontScale } from '@/utils/layout';

type Props = Omit<FocusSurfaceProps, 'children'> & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
  subtitle?: string;
  /** TV-sized button — larger tap/focus target for remote use. */
  size?: 'default' | 'large' | 'hero';
};

/** Large, focusable pill button optimized for Android TV remotes. */
export const TVFocusableButton = forwardRef<View, Props>(function TVFocusableButton(
  {
    label,
    icon,
    iconColor,
    textColor,
    style,
    className,
    subtitle,
    focusVariant = 'default',
    focusedScale = TV_CONTROL_FOCUS_SCALE,
    size = 'large',
    ...rest
  },
  ref
) {
  const { colors } = useAppTheme();

  const paddingV = size === 'hero' ? 18 : size === 'large' ? 14 : 12;
  const paddingH = size === 'hero' ? 32 : size === 'large' ? 24 : 16;
  const iconSize = size === 'hero' ? 28 : size === 'large' ? 24 : 20;
  const fontSize = size === 'hero' ? fontScale(18) : size === 'large' ? fontScale(16) : fontScale(15);

  return (
    <FocusSurface
      ref={ref}
      className={className ?? 'rounded-2xl flex-row items-center gap-3'}
      style={[{ paddingVertical: paddingV, paddingHorizontal: paddingH }, style]}
      focusVariant={focusVariant}
      focusedScale={focusedScale}
      {...rest}
    >
      {icon ? <Ionicons name={icon} color={iconColor ?? colors.text} size={iconSize} /> : null}
      <View className="min-w-0">
        <Text className="font-bold" style={{ color: textColor ?? colors.text, fontSize }}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5" style={{ color: colors.textMuted, fontSize: fontScale(13) }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </FocusSurface>
  );
});
