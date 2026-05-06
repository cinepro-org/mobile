import React, { memo, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { tmdbImg } from '@/services/tmdbImages';
import type { MediaCardModel } from '@/components/MediaCard';

type Props = {
  heroHeight: number;
  items: MediaCardModel[];
  overscanX: number;
};

export const HeroCarousel = memo(function HeroCarousel({ heroHeight, items, overscanX }: Props) {
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);

  const slides = useMemo(() => items.slice(0, 6), [items]);
  const active = slides[index] ?? slides[0];

  useEffect(() => {
    if (!slides.length) return;
    const id = setInterval(() => {
      opacity.value = 0;
      setIndex((i) => (i + 1) % slides.length);
      opacity.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    }, 8500);
    return () => clearInterval(id);
  }, [opacity, slides.length]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const backdropUri = tmdbImg(active.backdropPath ?? active.posterPath, 'w1280');

  if (!active) {
    return (
      <View style={{ height: heroHeight }} className="bg-ink">
        <LinearGradient colors={['#141726', '#07080d']} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={{ height: heroHeight, paddingHorizontal: overscanX }} className="relative">
      <Animated.View style={[{ flex: 1 }, fadeStyle]} className="overflow-hidden rounded-3xl">
        <Image
          source={backdropUri ? { uri: backdropUri } : undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={600}
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={['rgba(7,8,13,0.1)', 'rgba(7,8,13,0.55)', '#07080d']}
          locations={[0, 0.55, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View className="absolute bottom-0 left-0 right-0 p-6">
          <Text className="text-white/70 text-xs tracking-[2px] mb-2">FEATURED</Text>
          <Text className="text-white text-4xl font-bold">{active.title}</Text>
          {active.subtitle ? (
            <Text className="text-white/70 text-base mt-2 max-w-xl">{active.subtitle}</Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
});
