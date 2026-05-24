import '../global.css';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from '@/navigation/RootNavigator';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { SplashScreen as AppSplashScreen } from '@/screens/SplashScreen';
import { queryClient } from '@/api/queryClient';
import { SPLASH_BACKGROUND } from '@/constants/splash';
import { useAppSplashGate } from '@/splash/useAppSplashGate';
import { useSettingsStore } from '@/store/settingsStore';
import { AppThemeProvider, useAppTheme } from '@/theme/AppThemeProvider';

function AppShell() {
  const [hydrated, setHydrated] = useState(() => useSettingsStore.persist.hasHydrated());
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const { showAnimatedSplash, splashFinished } = useAppSplashGate({ hydrated });

  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useSettingsStore.persist.hasHydrated());
    return unsub;
  }, []);

  if (!hydrated) {
    return <View className="flex-1" style={{ backgroundColor: SPLASH_BACKGROUND }} />;
  }

  if (!splashFinished) {
    return showAnimatedSplash ? <AppSplashScreen /> : <View className="flex-1" style={{ backgroundColor: SPLASH_BACKGROUND }} />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen />;
  }

  return <RootNavigator />;
}

function ThemedStatusBar() {
  const { colors } = useAppTheme();
  return <StatusBar style={colors.statusBar} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <ThemedStatusBar />
            <AppShell />
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
