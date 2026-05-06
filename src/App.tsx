import '../global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { RootNavigator } from '@/navigation/RootNavigator';
import { queryClient } from '@/api/queryClient';
import { useSettingsStore } from '@/store/settingsStore';
import { setOmssBaseUrl } from '@/api/runtimeConfig';

export default function App() {
  const url = useSettingsStore((s) => s.cineproBaseUrl);

  useEffect(() => {
    setOmssBaseUrl(url);
  }, [url]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync('#07080d');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
