import React, { memo, forwardRef } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { tmdbImg } from '@/services/tmdbImages';
import type { MediaCardModel } from '@/components/MediaCard';
import { fontScale } from '@/utils/layout';

type Props = {
  item: MediaCardModel;
  width: number;
  height: number;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  landscape?: boolean;
};

const CARD_RADIUS = 14;
const RING_PAD = 4;

/** Landscape TV card with outer focus ring that is not clipped by poster content. */
export const TVFocusableCard = memo(
  forwardRef<View, Props>(function TVFocusableCard(
    { item, width, height, onPress, hasTVPreferredFocus, landscape = false },
    ref
  ) {
    const { colors } = useAppTheme();
    const uri = landscape
      ? tmdbImg(item.backdropPath ?? item.posterPath, 'w780')
      : tmdbImg(item.posterPath, 'w342');

    return (
      <FocusSurface
        ref={ref}
        onPress={onPress}
        hasTVPreferredFocus={hasTVPreferredFocus}
        collapseTVNavOnFocus
        focusVariant="card"
        accessibilityLabel={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
        style={{
          padding: RING_PAD,
          overflow: 'visible',
        }}
      >
        <View
          style={{
            width,
            height,
            borderRadius: CARD_RADIUS,
            overflow: 'hidden',
            backgroundColor: colors.elevated,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <Image
            source={uri ? { uri } : undefined}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={240}
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.55 }}
          />
          {item.mediaType ? (
            <View
              className="absolute top-3 left-3 rounded-md px-2 py-1"
              style={{ backgroundColor: 'rgba(0,0,0,0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <Text className="font-bold" style={{ color: '#fff', fontSize: fontScale(10) }}>
                {item.mediaType === 'tv' ? 'TV' : 'FILM'}
              </Text>
            </View>
          ) : null}
          <View className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8">
            <Text
              numberOfLines={2}
              className="font-bold leading-5"
              style={{ color: '#fff', fontSize: fontScale(landscape ? 15 : 14) }}
            >
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text numberOfLines={1} className="mt-1" style={{ color: 'rgba(255,255,255,0.72)', fontSize: fontScale(12) }}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </FocusSurface>
    );
  })
);
