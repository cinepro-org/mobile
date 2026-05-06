import React from 'react';
import { Text, View } from 'react-native';
import { FocusSurface } from '@/tv/FocusSurface';

type Props = {
  onOpenSettings?: () => void;
};

export function MissingKeysBanner({ onOpenSettings }: Props) {
  return (
    <View className="mx-4 mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <Text className="text-white font-semibold text-base">TMDB API key required</Text>
      <Text className="text-white/70 text-sm mt-2 leading-5">
        Set EXPO_PUBLIC_TMDB_API_KEY in your environment (for example app.config.js extra or .env with Expo),
        then restart Metro. TMDB powers browse, search, and artwork; CinePro Core powers streams (OMSS).
      </Text>
      {onOpenSettings ? (
        <FocusSurface
          className="mt-3 self-start rounded-xl bg-accent px-4 py-2"
          onPress={onOpenSettings}
          accessibilityLabel="Open settings"
        >
          <Text className="text-white font-semibold">Open settings</Text>
        </FocusSurface>
      ) : null}
    </View>
  );
}
