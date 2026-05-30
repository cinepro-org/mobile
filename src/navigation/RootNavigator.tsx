import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { RootStackParamList, MainTabParamList } from '@/navigation/types';
import { HomeScreen } from '@/screens/HomeScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { MovieDetailScreen } from '@/screens/MovieDetailScreen';
import { TvDetailScreen } from '@/screens/TvDetailScreen';
import { EpisodeBrowserScreen } from '@/screens/EpisodeBrowserScreen';
import { GenreScreen } from '@/screens/GenreScreen';
import { PlayerScreen } from '@/screens/PlayerScreen';
import { TVSideNavRail } from '@/tv/TVSideNavRail';
import { TVNavigationProvider } from '@/tv/TVNavigationContext';
import { TVTabBarCapture, TVTabBarPlaceholder } from '@/tv/TVTabBarBridge';
import { TV_NAV_COLLAPSED_WIDTH } from '@/tv/tvNavSizes';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function Tabs() {
  const { colors } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarAccessibilityLabel: 'Search',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarAccessibilityLabel: 'Library',
          tabBarIcon: ({ color, size }) => <Ionicons name="albums" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarAccessibilityLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function TvTabsInner() {
  const [tabBarProps, setTabBarProps] = useState<BottomTabBarProps | null>(null);
  const onTabBarProps = useCallback((props: BottomTabBarProps) => {
    setTabBarProps(props);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingLeft: TV_NAV_COLLAPSED_WIDTH }}>
        <Tab.Navigator
          tabBar={(props) => (
            <>
              <TVTabBarCapture tabBarProps={props} onTabBarProps={onTabBarProps} />
              <TVTabBarPlaceholder />
            </>
          )}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Search" component={SearchScreen} />
          <Tab.Screen name="Library" component={LibraryScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </View>
      {tabBarProps ? <TVSideNavRail {...tabBarProps} /> : null}
    </View>
  );
}

function TvTabs() {
  return (
    <TVNavigationProvider>
      <TvTabsInner />
    </TVNavigationProvider>
  );
}

function Shell() {
  return Platform.isTV ? <TvTabs /> : <Tabs />;
}

export function RootNavigator() {
  const { navTheme } = useAppTheme();
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: Platform.isTV ? 'fade' : 'default',
          animationDuration: Platform.isTV ? 280 : undefined,
        }}
      >
        <RootStack.Screen name="Main" component={Shell} />
        <RootStack.Screen
          name="MovieDetail"
          component={MovieDetailScreen}
          options={{
            presentation: Platform.isTV ? 'card' : 'modal',
            animation: Platform.isTV ? 'fade' : 'slide_from_right',
            animationDuration: Platform.isTV ? 280 : undefined,
          }}
        />
        <RootStack.Screen
          name="TvDetail"
          component={TvDetailScreen}
          options={{
            presentation: Platform.isTV ? 'card' : 'modal',
            animation: Platform.isTV ? 'fade' : 'slide_from_right',
            animationDuration: Platform.isTV ? 280 : undefined,
          }}
        />
        <RootStack.Screen
          name="EpisodeBrowser"
          component={EpisodeBrowserScreen}
          options={{
            presentation: Platform.isTV ? 'card' : 'modal',
            animation: Platform.isTV ? 'fade' : 'default',
            animationDuration: Platform.isTV ? 280 : undefined,
          }}
        />
        <RootStack.Screen name="Genre" component={GenreScreen} options={{ animation: Platform.isTV ? 'fade' : 'default' }} />
        <RootStack.Screen
          name="Player"
          component={PlayerScreen}
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
