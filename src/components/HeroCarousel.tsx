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
import { FocusSurface } from '@/tv/FocusSurface';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  heroHeight: number;
  items: MediaCardModel[];
  overscanX: number;
  onOpenActive?: (item: MediaCardModel) => void;
};

export const HeroCarousel = memo(function HeroCarousel({
  heroHeight,
  items,
  overscanX,
  onOpenActive,
}: Props) {
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);

  const slides = useMemo(() => items.slice(0, 6), [items]);
  const active = slides.length ? slides[index % slides.length] : undefined;

  useEffect(() => {
    if (!slides.length) return;
    const id = setInterval(() => {
      opacity.value = 0;
      setIndex((i) => (i + 1) % slides.length);
      opacity.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    }, 8500);
    return () => clearInterval(id);
  }, [opacity, slides]);

  useEffect(() => {
    if (!slides.length) {
      setIndex(0);
      return;
    }
    setIndex((i) => i % slides.length);
  }, [slides]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!active) {
    return (
      <View style={{ height: heroHeight, paddingHorizontal: overscanX }}>
        <View className="flex-1 rounded-3xl overflow-hidden">
          <LinearGradient colors={['#1a1f35', '#07080d', '#07080d']} style={{ flex: 1 }} />
          <View className="absolute bottom-8 left-6 right-6">
            <Text className="text-white/35 text-xs tracking-[3px] font-semibold">FEATURED</Text>
          <Text className="text-white/50 text-base mt-2">Add your TMDB API key in Settings to see spotlight titles.</Text>
          </View>
        </View>
      </View>
    );
  }

  const backdropUri = tmdbImg(active.backdropPath ?? active.posterPath, 'w1280');
  const posterUri = tmdbImg(active.posterPath, 'w342');
  const kind = active.mediaType === 'tv' ? 'Series' : 'Movie';

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
          colors={['rgba(7,8,13,0.2)', 'rgba(7,8,13,0.5)', 'rgba(7,8,13,0.95)']}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 0 }}
          style={{ position: 'absolute', inset: 0 }}
        />

        <View className="absolute bottom-0 left-0 right-0 p-5 pb-6">
          <View className="flex-row items-end gap-4">
            {posterUri ? (
              <Image
                source={{ uri: posterUri }}
                style={{ width: 102, aspectRatio: 2 / 3, borderRadius: 14 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View className="w-[102] aspect-[2/3] rounded-[14px] bg-white/10" />
            )}
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="rounded-md bg-accent/90 px-2 py-0.5">
                  <Text className="text-white text-[10px] font-bold tracking-wide">{kind}</Text>
                </View>
                <Text className="text-white/45 text-[10px] font-semibold tracking-[3px]">SPOTLIGHT</Text>
              </View>
              <Text className="text-white text-2xl font-bold leading-8" numberOfLines={2}>
                {active.title}
              </Text>
              {active.subtitle ? (
                <Text className="text-white/65 text-sm mt-1.5">{active.subtitle}</Text>
              ) : null}
              <View className="flex-row items-center mt-4">
                {onOpenActive ? (
                  <>
                    <FocusSurface
                      className="rounded-full bg-white flex-row items-center gap-2 px-5 py-2.5"
                      onPress={() => onOpenActive(active)}
                      accessibilityLabel={`Open ${active.title}`}
                    >
                      <Ionicons name="information-circle-outline" color="#07080d" size={18} />
                      <Text className="text-ink font-bold text-sm">Details</Text>
                    </FocusSurface>
                    <View className="w-px h-9 bg-white/25 self-center mx-3" accessibilityElementsHidden />
                  </>
                ) : null}
                <View className="flex-row items-center gap-1.5">
                  {slides.map((_, i) => (
                    <View
                      key={i}
                      className={`h-1.5 rounded-full ${i === index % slides.length ? 'bg-white w-5' : 'bg-white/35 w-1.5'}`}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
});
