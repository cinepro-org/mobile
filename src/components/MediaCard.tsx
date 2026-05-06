import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FocusSurface } from '@/tv/FocusSurface';
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
};

export const MediaCard = memo(function MediaCard({
  item,
  width,
  height,
  onPress,
  focusedGlow = true,
}: Props) {
  const uri = tmdbImg(item.posterPath, 'w342');

  return (
    <FocusSurface
      onPress={onPress}
      className={`rounded-2xl overflow-hidden ${focusedGlow ? 'border border-white/0' : ''}`}
      accessibilityLabel={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
    >
      <View style={{ width, height }} className="bg-elevated overflow-hidden rounded-2xl">
        <Image
          source={uri ? { uri } : undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={240}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
        <LinearGradient
          colors={['transparent', 'rgba(7,8,13,0.92)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: height * 0.42,
          }}
        />
        <View className="absolute bottom-0 left-0 right-0 px-2 pb-2">
          <Text numberOfLines={2} className="text-white text-xs font-semibold">
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text numberOfLines={1} className="text-white/60 text-[11px] mt-0.5">
              {item.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </FocusSurface>
  );
});
