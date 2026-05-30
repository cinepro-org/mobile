import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { tmdbImg } from '@/services/tmdbImages';
import type { MediaCardModel } from '@/components/MediaCard';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAppTheme } from '@/theme/AppThemeProvider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MOTION_DURATION, MOTION_EASE_IN_OUT, motionTiming } from '@/utils/motion';

type Props = {
  heroHeight: number;
  items: MediaCardModel[];
  overscanX: number;
  onOpenActive?: (item: MediaCardModel) => void;
  preferFocus?: boolean;
};

export const HeroCarousel = memo(function HeroCarousel({
  heroHeight,
  items,
  overscanX,
  onOpenActive,
  preferFocus,
}: Props) {
  const { colors } = useAppTheme();
  const [index, setIndex] = useState(0);
  const [heroFocused, setHeroFocused] = useState(false);
  const opacity = useSharedValue(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = useMemo(() => items.slice(0, 6), [items]);
  const active = slides.length ? slides[index % slides.length] : undefined;
  const slideCount = slides.length;

  const advanceSlide = useCallback(() => {
    setIndex((i) => (i + 1) % slideCount);
    opacity.value = withTiming(1, motionTiming(MOTION_DURATION.slow, MOTION_EASE_IN_OUT));
  }, [opacity, slideCount]);

  useEffect(() => {
    if (!slides.length || heroFocused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      opacity.value = withTiming(0, motionTiming(MOTION_DURATION.normal, MOTION_EASE_IN_OUT), (finished) => {
        if (finished) runOnJS(advanceSlide)();
      });
    }, 8500);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [advanceSlide, heroFocused, opacity, slides.length]);

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
        <View className="flex-1 rounded-3xl overflow-hidden border" style={{ borderColor: colors.border }}>
          <LinearGradient colors={colors.gradientHero} style={{ flex: 1 }} />
          <View className="absolute bottom-8 left-6 right-6">
            <Text className="text-xs tracking-[3px] font-semibold" style={{ color: colors.textFaint }}>
              FEATURED
            </Text>
            <Text className="text-base mt-2" style={{ color: colors.textMuted }}>
              Add your TMDB API key in Settings to see spotlight titles.
            </Text>
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
      <Animated.View
        style={[
          { flex: 1, borderColor: colors.border, borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
          fadeStyle,
        ]}
      >
        <Image
          source={backdropUri ? { uri: backdropUri } : undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={600}
          cachePolicy="memory-disk"
        />
        <LinearGradient colors={colors.heroGradient} locations={[0, 0.45, 1]} style={{ position: 'absolute', inset: 0 }} />
        <LinearGradient
          colors={[colors.overlay, 'transparent']}
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
              <View
                className="w-[102] aspect-[2/3] rounded-[14px]"
                style={{ backgroundColor: colors.skeleton }}
              />
            )}
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: colors.accent }}>
                  <Text className="text-[10px] font-bold tracking-wide" style={{ color: colors.textOnAccent }}>
                    {kind}
                  </Text>
                </View>
                <Text className="text-[10px] font-semibold tracking-[3px]" style={{ color: colors.textFaint }}>
                  SPOTLIGHT
                </Text>
              </View>
              <Text className="text-2xl font-bold leading-8" numberOfLines={2} style={{ color: colors.text }}>
                {active.title}
              </Text>
              {active.subtitle ? (
                <Text className="text-sm mt-1.5" style={{ color: colors.textMuted }}>
                  {active.subtitle}
                </Text>
              ) : null}
              <View className="flex-row items-center mt-4">
                {onOpenActive ? (
                  <>
                    <FocusSurface
                      className="rounded-full flex-row items-center gap-2 px-5 py-2.5"
                      style={{ backgroundColor: colors.accent }}
                      focusVariant="accent"
                      hasTVPreferredFocus={preferFocus}
                      onFocus={() => setHeroFocused(true)}
                      onBlur={() => setHeroFocused(false)}
                      onPress={() => onOpenActive(active)}
                      accessibilityLabel={`Open ${active.title}`}
                    >
                      <Ionicons name="information-circle-outline" color={colors.textOnAccent} size={18} />
                      <Text className="font-bold text-sm" style={{ color: colors.textOnAccent }}>
                        Details
                      </Text>
                    </FocusSurface>
                    <View
                      className="w-px h-9 self-center mx-3"
                      style={{ backgroundColor: colors.borderStrong }}
                      accessibilityElementsHidden
                    />
                  </>
                ) : null}
                <View className="flex-row items-center gap-1.5">
                  {slides.map((_, i) => {
                    const activeDot = i === index % slides.length;
                    return (
                      <View
                        key={i}
                        className="h-1.5 rounded-full"
                        style={{
                          width: activeDot ? 20 : 6,
                          backgroundColor: activeDot ? colors.accent : colors.inputBg,
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
});
