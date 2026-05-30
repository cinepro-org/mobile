import React from 'react';
import { View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { AppIcon } from '@/components/AppIcon';
import { TVSideNavItem } from '@/tv/TVSideNavItem';
import { useTVNavigation } from '@/tv/TVNavigationContext';
import { useAppTheme } from '@/theme/AppThemeProvider';
import type { MainTabParamList } from '@/navigation/types';

const ITEMS: {
  route: keyof MainTabParamList;
  label: string;
  icon: 'home' | 'search' | 'albums' | 'settings';
}[] = [
  { route: 'Home', label: 'Home', icon: 'home' },
  { route: 'Search', label: 'Search', icon: 'search' },
  { route: 'Library', label: 'Library', icon: 'albums' },
  { route: 'Settings', label: 'Settings', icon: 'settings' },
];

/** Overlay side rail — expands over content without reflowing the main pane. */
export function TVSideNavRail({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { railAnimatedStyle, navProgress } = useTVNavigation();
  const activeRoute = state.routes[state.index]?.name as keyof MainTabParamList;

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(navProgress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(navProgress.value, [0, 0.45], [1, 0.92], Extrapolation.CLAMP) }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(navProgress.value, [0.25, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(navProgress.value, [0.25, 1], [-8, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <Animated.View
      style={[
        railAnimatedStyle,
        {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 20,
          backgroundColor: colors.surface,
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
          paddingHorizontal: 6,
          borderRightWidth: 1,
          borderRightColor: colors.border,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 4, height: 0 },
          elevation: 12,
        },
      ]}
    >
      <View className="mb-6 items-center justify-center" style={{ minHeight: 48 }}>
        <Animated.View style={[{ position: 'absolute' }, iconStyle]}>
          <AppIcon size={42} />
        </Animated.View>
        <Animated.View style={logoStyle}>
          <AppLogo width={148} height={40} />
        </Animated.View>
      </View>

      {ITEMS.map((item, index) => (
        <TVSideNavItem
          key={item.route}
          label={item.label}
          icon={item.icon}
          active={activeRoute === item.route}
          isNavFocusAnchor={index === 0}
          hasTVPreferredFocus={false}
          onPress={() => navigation.navigate(item.route)}
        />
      ))}
    </Animated.View>
  );
}
