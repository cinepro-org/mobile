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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tmdbImg } from '@/services/tmdbImages';
import type { MediaCardModel } from '@/components/MediaCard';
import { TVFocusableButton } from '@/tv/TVFocusableButton';
import { useTVContentFocusLink } from '@/tv/useTVContentFocusLink';
import { useInitialTVFocus } from '@/tv/useInitialTVFocus';
import { useTVFocusHandle } from '@/tv/useTVFocusHandle';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { fontScale } from '@/utils/layout';
import { MOTION_DURATION, MOTION_EASE_IN_OUT, motionTiming } from '@/utils/motion';

type Props = {
  heroHeight: number;
  horizontalPadding: number;
  items: MediaCardModel[];
  onOpenActive?: (item: MediaCardModel) => void;
  onPlayActive?: (item: MediaCardModel) => void;
  /** Native handle for D-pad down from hero buttons into rows/genres below. */
  downFocusHandle?: number;
  /** Called when the Play button native focus handle is ready (for category row up-nav). */
  onPlayFocusHandle?: (handle: number) => void;
};

/**
 * Full-bleed Android TV home hero. Only Play / Details are focusable — the backdrop
 * and metadata are decorative and must not receive TV focus.
 */
export const TVHomeHero = memo(function TVHomeHero({
  heroHeight,
  horizontalPadding,
  items,
  onOpenActive,
  onPlayActive,
  downFocusHandle,
  onPlayFocusHandle,
}: Props) {
  const { colors } = useAppTheme();
  const { contentFocusRef, nextFocusLeft } = useTVContentFocusLink();
  const { hasTVPreferredFocus, onInitialFocus } = useInitialTVFocus(true);
  const playBtn = useTVFocusHandle();
  const detailsBtn = useTVFocusHandle();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [buttonsFocused, setButtonsFocused] = useState(false);
  const buttonFocusCount = useRef(0);
  const opacity = useSharedValue(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = useMemo(() => items.slice(0, 6), [items]);
  const active = slides.length ? slides[index % slides.length] : undefined;
  const bleedH = heroHeight + insets.top;
  const slideCount = slides.length;

  const advanceSlide = useCallback(() => {
    setIndex((i) => (i + 1) % slideCount);
    opacity.value = withTiming(1, motionTiming(MOTION_DURATION.slow, MOTION_EASE_IN_OUT));
  }, [opacity, slideCount]);

  useEffect(() => {
    if (playBtn.handle != null) onPlayFocusHandle?.(playBtn.handle);
  }, [onPlayFocusHandle, playBtn.handle]);

  useEffect(() => {
    if (!slides.length || buttonsFocused) {
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
    }, 9000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [advanceSlide, buttonsFocused, opacity, slides.length]);

  useEffect(() => {
    if (!slides.length) setIndex(0);
    else setIndex((i) => i % slides.length);
  }, [slides]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const onButtonFocus = () => {
    buttonFocusCount.current += 1;
    setButtonsFocused(true);
    onInitialFocus();
  };

  const onButtonBlur = () => {
    buttonFocusCount.current = Math.max(0, buttonFocusCount.current - 1);
    requestAnimationFrame(() => {
      if (buttonFocusCount.current === 0) setButtonsFocused(false);
    });
  };

  if (!active) {
    return (
      <View style={{ height: heroHeight }} focusable={false}>
        <LinearGradient colors={colors.gradientHero} style={{ flex: 1, paddingTop: insets.top + 40, paddingHorizontal: horizontalPadding }}>
          <Text className="tracking-[4px] font-bold" style={{ color: colors.textFaint, fontSize: fontScale(12) }}>
            FEATURED
          </Text>
          <Text className="mt-3 leading-7" style={{ color: colors.textMuted, fontSize: fontScale(16) }}>
            Add your TMDB API key in Settings to see spotlight titles.
          </Text>
        </LinearGradient>
      </View>
    );
  }

  const backdropUri = tmdbImg(active.backdropPath ?? active.posterPath, 'w1280');
  const kind = active.mediaType === 'tv' ? 'Series' : 'Movie';

  return (
    <View style={{ height: heroHeight, overflow: 'visible' }} focusable={false} importantForAccessibility="no-hide-descendants">
      {/* Backdrop — not focusable */}
      <Animated.View
        focusable={false}
        importantForAccessibility="no"
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -insets.top,
            left: 0,
            right: 0,
            height: bleedH,
          },
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
        <LinearGradient colors={colors.heroGradient} locations={[0, 0.4, 1]} style={{ position: 'absolute', inset: 0 }} />
        <LinearGradient
          colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.35)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        <LinearGradient
          colors={[colors.overlay, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.75, y: 0 }}
          style={{ position: 'absolute', inset: 0 }}
        />
      </Animated.View>

      {/* Metadata — not focusable; only the action buttons below accept focus. */}
      <View
        focusable={false}
        importantForAccessibility="no"
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          paddingHorizontal: horizontalPadding,
          paddingBottom: 28,
        }}
        pointerEvents="box-none"
      >
        <View className="flex-row items-center gap-2 mb-3" focusable={false} pointerEvents="none">
          <View className="rounded-md px-2.5 py-1" style={{ backgroundColor: colors.accent }}>
            <Text className="font-bold tracking-wide" style={{ color: colors.textOnAccent, fontSize: fontScale(11) }}>
              {kind}
            </Text>
          </View>
          <Text className="font-semibold tracking-[4px]" style={{ color: colors.textFaint, fontSize: fontScale(11) }}>
            FEATURED
          </Text>
        </View>

        <Text
          className="font-black leading-tight"
          numberOfLines={2}
          style={{ color: colors.text, fontSize: fontScale(36), maxWidth: '72%' }}
        >
          {active.title}
        </Text>

        {active.subtitle ? (
          <Text className="mt-2" style={{ color: colors.textMuted, fontSize: fontScale(16) }}>
            {active.subtitle}
          </Text>
        ) : null}

        <View className="flex-row items-center mt-6 gap-4" focusable={false}>
          {onPlayActive ? (
            <TVFocusableButton
              ref={(node) => {
                playBtn.ref(node);
                contentFocusRef(node);
              }}
              nextFocusLeft={nextFocusLeft}
              nextFocusRight={onOpenActive ? detailsBtn.handle : undefined}
              nextFocusDown={downFocusHandle}
              label="Play"
              icon="play"
              size="hero"
              focusVariant="heroPlay"
              hasTVPreferredFocus={hasTVPreferredFocus}
              collapseTVNavOnFocus
              onFocus={onButtonFocus}
              onBlur={onButtonBlur}
              onPress={() => onPlayActive(active)}
              style={{ backgroundColor: colors.accent, borderRadius: 16 }}
              iconColor={colors.textOnAccent}
              textColor={colors.textOnAccent}
              accessibilityLabel={`Play ${active.title}`}
            />
          ) : null}
          {onOpenActive ? (
            <TVFocusableButton
              ref={detailsBtn.ref}
              nextFocusLeft={playBtn.handle ?? nextFocusLeft}
              nextFocusDown={downFocusHandle}
              label="Details"
              icon="information-circle-outline"
              size="hero"
              focusVariant="heroDetails"
              collapseTVNavOnFocus
              onFocus={onButtonFocus}
              onBlur={onButtonBlur}
              onPress={() => onOpenActive(active)}
              style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16 }}
              iconColor="#fff"
              textColor="#fff"
              accessibilityLabel={`Details for ${active.title}`}
            />
          ) : null}
          <View className="flex-row items-center gap-2 ml-2" pointerEvents="none" focusable={false}>
            {slides.map((_, i) => {
              const activeDot = i === index % slides.length;
              return (
                <View
                  key={i}
                  className="rounded-full"
                  style={{
                    width: activeDot ? 24 : 8,
                    height: 8,
                    backgroundColor: activeDot ? colors.accent : 'rgba(255,255,255,0.28)',
                  }}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
});
