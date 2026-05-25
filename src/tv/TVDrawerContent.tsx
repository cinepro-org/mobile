import React from 'react';
import { Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
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

/** Android TV collapsible side rail — icons when collapsed, icons + labels when expanded. */
export function TVDrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { expanded } = useTVNavigation();
  const activeRoute = state.routes[state.index]?.name as keyof MainTabParamList;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        paddingTop: Math.max(insets.top, 20),
        paddingBottom: Math.max(insets.bottom, 20),
        paddingHorizontal: expanded ? 14 : 8,
        borderRightWidth: 1,
        borderRightColor: colors.border,
      }}
    >
      <View
        className="mb-6 items-center"
        style={{ paddingHorizontal: expanded ? 4 : 0, minHeight: 48, justifyContent: 'center' }}
      >
        {expanded ? (
          <>
            <AppLogo width={148} height={40} />
            <Text className="text-xs mt-3 tracking-[0.2em] font-semibold" style={{ color: colors.textFaint }}>
              ANDROID TV
            </Text>
          </>
        ) : (
          <View
            className="rounded-xl items-center justify-center"
            style={{ width: 44, height: 44, backgroundColor: colors.accent }}
          >
            <Text className="text-lg font-black" style={{ color: colors.textOnAccent }}>
              C
            </Text>
          </View>
        )}
      </View>

      {ITEMS.map((item, index) => (
        <TVSideNavItem
          key={item.route}
          label={item.label}
          icon={item.icon}
          active={activeRoute === item.route}
          expanded={expanded}
          hasTVPreferredFocus={index === 0 && activeRoute === 'Home' && expanded}
          onPress={() => navigation.navigate(item.route)}
        />
      ))}
    </View>
  );
}
