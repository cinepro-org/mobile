import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
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

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<MainTabParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#07080d',
    card: '#07080d',
    primary: '#e50914',
    text: '#ffffff',
    border: 'rgba(255,255,255,0.08)',
    notification: '#e50914',
  },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f111a',
          borderTopColor: 'rgba(255,255,255,0.06)',
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
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

function TvDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'permanent',
        drawerStyle: { width: 300, backgroundColor: '#0f111a' },
        drawerActiveTintColor: '#ffffff',
        drawerInactiveTintColor: 'rgba(255,255,255,0.55)',
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{ drawerIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Drawer.Screen
        name="Search"
        component={SearchScreen}
        options={{ drawerIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} /> }}
      />
      <Drawer.Screen
        name="Library"
        component={LibraryScreen}
        options={{ drawerIcon: ({ color, size }) => <Ionicons name="albums" color={color} size={size} /> }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Drawer.Navigator>
  );
}

function Shell() {
  return Platform.isTV ? <TvDrawer /> : <Tabs />;
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: Platform.isTV ? 'none' : 'default',
        }}
      >
        <RootStack.Screen name="Main" component={Shell} />
        <RootStack.Screen
          name="MovieDetail"
          component={MovieDetailScreen}
          options={{
            presentation: Platform.isTV ? 'card' : 'modal',
            animation: Platform.isTV ? 'none' : 'slide_from_right',
          }}
        />
        <RootStack.Screen
          name="TvDetail"
          component={TvDetailScreen}
          options={{
            presentation: Platform.isTV ? 'card' : 'modal',
            animation: Platform.isTV ? 'none' : 'slide_from_right',
          }}
        />
        <RootStack.Screen
          name="EpisodeBrowser"
          component={EpisodeBrowserScreen}
          options={{
            presentation: Platform.isTV ? 'card' : 'modal',
          }}
        />
        <RootStack.Screen name="Genre" component={GenreScreen} />
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
