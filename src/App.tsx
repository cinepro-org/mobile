import '../global.css';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { RootNavigator } from '@/navigation/RootNavigator';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { queryClient } from '@/api/queryClient';
import { useSettingsStore } from '@/store/settingsStore';

function AppShell() {
  const [hydrated, setHydrated] = useState(() => useSettingsStore.persist.hasHydrated());
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);

  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useSettingsStore.persist.hasHydrated());
    return unsub;
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync('#07080d');
  }, []);

  if (!hydrated) {
    return <View className="flex-1 bg-ink" />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen />;
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <AppShell />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
