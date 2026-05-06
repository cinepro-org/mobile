import React, { useEffect } from 'react';
import { Alert, Switch, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useResponsive } from '@/hooks/useResponsive';
import { useSettingsStore } from '@/store/settingsStore';
import { setOmssBaseUrl } from '@/api/runtimeConfig';
import { CINEPRO_BASE_URL } from '@/utils/env';
import { FocusSurface } from '@/tv/FocusSurface';

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const { sectionGap } = useResponsive();
  const cineproBaseUrl = useSettingsStore((s) => s.cineproBaseUrl);
  const setUrl = useSettingsStore((s) => s.setCineproBaseUrl);
  const autoQuality = useSettingsStore((s) => s.autoQuality);
  const setAutoQuality = useSettingsStore((s) => s.setAutoQuality);
  const defaultPlaybackRate = useSettingsStore((s) => s.defaultPlaybackRate);
  const setRate = useSettingsStore((s) => s.setDefaultPlaybackRate);

  useEffect(() => {
    setOmssBaseUrl(cineproBaseUrl);
  }, [cineproBaseUrl]);

  return (
    <View className="flex-1 bg-ink px-4" style={{ paddingTop: sectionGap * 6 }}>
      <Text className="text-white text-3xl font-bold mb-6">Settings</Text>

      <Text className="text-white/60 text-xs mb-2">CinePro Core base URL (OMSS)</Text>
      <TextInput
        value={cineproBaseUrl}
        onChangeText={(t) => setUrl(t)}
        placeholder={CINEPRO_BASE_URL}
        placeholderTextColor="rgba(255,255,255,0.35)"
        autoCapitalize="none"
        className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-white mb-4"
        accessibilityLabel="CinePro Core base URL"
      />
      <FocusSurface
        className="self-start rounded-xl bg-accent px-4 py-2 mb-10"
        onPress={() => {
          setOmssBaseUrl(cineproBaseUrl);
          queryClient.invalidateQueries({ queryKey: ['omss'] });
          Alert.alert('Applied', 'OMSS base URL updated and caches invalidated.');
        }}
      >
        <Text className="text-white font-semibold">Apply & refresh OMSS</Text>
      </FocusSurface>

      <View className="flex-row items-center justify-between py-3 border-t border-white/10">
        <Text className="text-white text-base flex-1 pr-4">Auto quality selection</Text>
        <Switch value={autoQuality} onValueChange={setAutoQuality} accessibilityLabel="Toggle auto quality" />
      </View>

      <View className="py-4 border-t border-white/10">
        <Text className="text-white text-base mb-2">Default playback speed</Text>
        <Text className="text-white/50 text-xs mb-3">
          {[0.75, 1, 1.25, 1.5, 2].map((r) => `${r}x`).join(' · ')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {[0.75, 1, 1.25, 1.5, 2].map((r) => (
            <FocusSurface
              key={r}
              className={`rounded-full px-4 py-2 border ${
                defaultPlaybackRate === r ? 'bg-accent border-accent' : 'bg-white/10 border-white/10'
              }`}
              onPress={() => setRate(r)}
              accessibilityLabel={`Playback speed ${r}`}
            >
              <Text className="text-white font-semibold">{r}x</Text>
            </FocusSurface>
          ))}
        </View>
      </View>

      <Text className="text-white/45 text-xs mt-8 leading-5">
        Streams come from your self-hosted CinePro Core instance following OMSS v1.0 (movies, TV episodes,
        proxy, refresh). Discovery metadata uses TMDB via EXPO_PUBLIC_TMDB_API_KEY. LG webOS can consume the
        Expo web bundle with focus-friendly markup; tvOS/Android TV targets should use native TV builds.
      </Text>
    </View>
  );
}
