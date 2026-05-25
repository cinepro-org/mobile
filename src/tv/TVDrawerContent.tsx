import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { FocusMenuItem } from '@/tv/FocusMenuItem';
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

export function TVDrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const activeRoute = state.routes[state.index]?.name as keyof MainTabParamList;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20),
        paddingBottom: Math.max(insets.bottom, 20),
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-8 px-1">
        <AppLogo width={148} height={40} />
        <Text className="text-xs mt-3 tracking-[0.2em] font-semibold" style={{ color: colors.textFaint }}>
          ANDROID TV
        </Text>
      </View>

      {ITEMS.map((item, index) => (
        <FocusMenuItem
          key={item.route}
          label={item.label}
          icon={item.icon}
          active={activeRoute === item.route}
          hasTVPreferredFocus={index === 0 && activeRoute === 'Home'}
          onPress={() => navigation.navigate(item.route)}
        />
      ))}
    </ScrollView>
  );
}
