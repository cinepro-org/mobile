import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BRAND_ACCENT } from '@/theme/colors';
import { FocusSurface } from '@/tv/FocusSurface';

type Props = {
  progress: number;
  bufferedProgress: number;
  disabled?: boolean;
  isTv?: boolean;
  /** Thicker track + thumb — phone-friendly scrubbing outside cinematic mode. */
  comfortableTouch?: boolean;
  /** Thin full-width bar with red accent — cinematic player chrome. */
  cinematic?: boolean;
  previewBackdropUri?: string;
  duration: number;
  onSeekRatio: (ratio: number) => void;
  formatDuration: (sec: number) => string;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
};

/** Seek bar with buffered lane, scrub thumb, and optional preview while dragging. */
export const PlayerProgressBar = memo(function PlayerProgressBar({
  progress,
  bufferedProgress,
  disabled,
  isTv,
  comfortableTouch = Platform.OS === 'android' && !Platform.isTV,
  cinematic = false,
  previewBackdropUri,
  duration,
  onSeekRatio,
  formatDuration,
  onScrubStart,
  onScrubEnd,
}: Props) {
  const barWidth = useRef(1);
  const dragging = useSharedValue(0);
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);

  const seekFromX = useCallback(
    (x: number) => {
      if (!duration || barWidth.current <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / barWidth.current));
      onSeekRatio(ratio);
    },
    [duration, onSeekRatio]
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && !isTv,
        onMoveShouldSetPanResponder: (_, g) =>
          !disabled && !isTv && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onPanResponderGrant: (e) => {
          dragging.value = 1;
          onScrubStart?.();
          const r = Math.max(0, Math.min(1, e.nativeEvent.locationX / barWidth.current));
          setScrubRatio(r);
          seekFromX(e.nativeEvent.locationX);
        },
        onPanResponderMove: (e) => {
          const r = Math.max(0, Math.min(1, e.nativeEvent.locationX / barWidth.current));
          setScrubRatio(r);
          seekFromX(e.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          dragging.value = 0;
          setScrubRatio(null);
          onScrubEnd?.();
        },
        onPanResponderTerminate: () => {
          dragging.value = 0;
          setScrubRatio(null);
          onScrubEnd?.();
        },
      }),
    [disabled, dragging, isTv, onScrubEnd, onScrubStart, seekFromX]
  );

  const trackH = cinematic ? 3 : comfortableTouch ? 8 : 6;
  const thumbSize = cinematic ? 12 : comfortableTouch ? 24 : 20;
  const thumb = cinematic
    ? { size: thumbSize, radius: 6, border: 0 }
    : comfortableTouch
      ? { size: thumbSize, radius: 12, border: 3 }
      : { size: thumbSize, radius: 10, border: 3 };

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -thumbSize / 2 },
      { translateY: -thumbSize / 2 },
      { scale: withSpring(dragging.value ? 1.2 : 1, { damping: 14 }) },
    ],
  }));

  const p = Math.max(0, Math.min(1, progress));
  const b = Math.max(0, Math.min(1, bufferedProgress));
  const previewTime = scrubRatio != null ? scrubRatio * duration : 0;

  const onBarLayout = (e: LayoutChangeEvent) => {
    barWidth.current = e.nativeEvent.layout.width;
  };

  const trackContent = (
    <View className="relative w-full" style={{ height: trackH }}>
      <View
        className="rounded-full overflow-hidden w-full"
        style={{
          height: trackH,
          backgroundColor: cinematic ? 'rgba(229,9,20,0.28)' : undefined,
        }}
      >
        {!cinematic ? <View className="absolute inset-0 rounded-full bg-white/12" /> : null}
        <View
          className={`absolute left-0 top-0 bottom-0 rounded-full ${cinematic ? '' : 'bg-white/22'}`}
          style={{
            width: `${b * 100}%`,
            backgroundColor: cinematic ? 'rgba(229,9,20,0.45)' : undefined,
          }}
        />
        <View
          className={`absolute left-0 top-0 bottom-0 rounded-full ${cinematic ? 'bg-accent' : 'bg-accent'}`}
          style={{ width: `${p * 100}%` }}
        />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          thumbStyle,
          {
            position: 'absolute',
            left: `${p * 100}%`,
            top: trackH / 2,
            width: thumb.size,
            height: thumb.size,
            borderRadius: thumb.radius,
            backgroundColor: BRAND_ACCENT,
            borderWidth: thumb.border,
            borderColor: '#fff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: cinematic ? 1 : comfortableTouch ? 3 : 2 },
            shadowOpacity: cinematic ? 0.35 : comfortableTouch ? 0.4 : 0.35,
            shadowRadius: cinematic ? 3 : comfortableTouch ? 6 : 4,
            elevation: cinematic ? 4 : comfortableTouch ? 8 : 6,
          },
        ]}
      />
    </View>
  );

  const touchH = cinematic ? 36 : comfortableTouch ? 56 : 44;

  return (
    <View className={cinematic ? '' : 'gap-2'}>
      {scrubRatio != null && !disabled && !cinematic ? (
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(160)} className="items-center">
          <View className="rounded-2xl overflow-hidden border border-white/20 bg-black/50 h-[72px] w-[124px]">
            {previewBackdropUri ? (
              <Image source={{ uri: previewBackdropUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View className="flex-1 bg-white/8 items-center justify-center">
                <Text className="text-white/45 text-[11px] font-semibold">Scrub</Text>
              </View>
            )}
            <View className="absolute bottom-1 right-1 rounded-md bg-black/75 px-1.5 py-0.5 border border-white/15">
              <Text className="text-white text-[11px] font-bold tabular-nums">{formatDuration(previewTime)}</Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      {isTv ? (
        <FocusSurface
          focusVariant="onMedia"
          accessibilityLabel="Seek along timeline"
          style={{ height: touchH, justifyContent: 'center' }}
          onLayout={onBarLayout}
          onPress={(e) => seekFromX(e.nativeEvent.locationX)}
        >
          <View pointerEvents="none">{trackContent}</View>
        </FocusSurface>
      ) : (
        <View style={{ height: touchH, justifyContent: 'center' }} onLayout={onBarLayout} {...pan.panHandlers}>
          {trackContent}
        </View>
      )}
    </View>
  );
});
