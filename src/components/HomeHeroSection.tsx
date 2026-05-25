import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { HeroCarousel } from '@/components/HeroCarousel';
import type { MediaCardModel } from '@/components/MediaCard';
type Props = {
  heroHeight: number;
  horizontalPadding: number;
  overscanX: number;
  items: MediaCardModel[];
  onOpenActive?: (item: MediaCardModel) => void;
  preferFocus?: boolean;
};

/** Spotlight bleeds under the status bar; logo sits in the top safe area. */
export function HomeHeroSection({
  heroHeight,
  horizontalPadding,
  overscanX,
  items,
  onOpenActive,
  preferFocus,
}: Props) {
  const insets = useSafeAreaInsets();
  const bleedH = heroHeight + insets.top;

  return (
    <View style={{ height: heroHeight, overflow: 'visible' }}>
      <View
        style={{
          position: 'absolute',
          top: -insets.top,
          left: overscanX,
          right: overscanX,
          height: bleedH,
        }}
      >
        <HeroCarousel
          heroHeight={bleedH}
          items={items}
          overscanX={0}
          onOpenActive={onOpenActive}
          preferFocus={preferFocus}
        />
      </View>

      <LinearGradient
        colors={['rgba(0,0,0,0.52)', 'rgba(0,0,0,0.18)', 'transparent']}
        locations={[0, 0.55, 1]}
        style={{
          position: 'absolute',
          top: -insets.top,
          left: 0,
          right: 0,
          height: insets.top + 72,
        }}
        pointerEvents="none"
      />

      <View
        style={{
          position: 'absolute',
          top: insets.top + 12,
          left: horizontalPadding,
          right: horizontalPadding,
          zIndex: 2,
        }}
        pointerEvents="box-none"
      >
        <AppLogo width={128} height={34} />
      </View>
    </View>
  );
}
