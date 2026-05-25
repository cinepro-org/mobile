import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { tmdbImg } from '@/services/tmdbImages';

export type MediaCardModel = {
  id: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  subtitle?: string;
  mediaType?: 'movie' | 'tv';
};

type Props = {
  item: MediaCardModel;
  width: number;
  height: number;
  onPress: () => void;
  focusedGlow?: boolean;
  hasTVPreferredFocus?: boolean;
};

export const MediaCard = memo(function MediaCard({
  item,
  width,
  height,
  onPress,
  focusedGlow = true,
  hasTVPreferredFocus,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const uri = tmdbImg(item.posterPath, 'w342');

  return (
    <FocusSurface
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusVariant="card"
      className="rounded-2xl overflow-hidden"
      style={focusedGlow ? { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 16 } : undefined}
      accessibilityLabel={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
    >
      <View
        style={{
          width,
          height,
          backgroundColor: colors.elevated,
          overflow: 'hidden',
          borderRadius: 16,
          ...(isDark
            ? { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }
            : {
                shadowColor: colors.shadow,
                shadowOpacity: 0.12,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }),
        }}
      >
        <Image
          source={uri ? { uri } : undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={240}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
        <LinearGradient
          colors={colors.posterGradient}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: height * 0.45,
          }}
        />
        {item.mediaType ? (
          <View
            className="absolute top-2 left-2 rounded-md px-1.5 py-0.5 border"
            style={{ backgroundColor: colors.badgeBg, borderColor: colors.border }}
          >
            <Text className="text-[9px] font-bold" style={{ color: colors.badgeText }}>
              {item.mediaType === 'tv' ? 'TV' : 'FILM'}
            </Text>
          </View>
        ) : null}
        <View className="absolute bottom-0 left-0 right-0 px-2.5 pb-2 pt-6">
          <Text numberOfLines={2} className="text-[13px] font-bold leading-4" style={{ color: colors.text }}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text numberOfLines={1} className="text-[11px] mt-1" style={{ color: colors.textMuted }}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </FocusSurface>
  );
});
