import React, { useCallback, useMemo } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useResponsive } from '@/hooks/useResponsive';
import { useSettingsStore } from '@/store/settingsStore';
import { CineProApi } from '@/api/cineproClient';
import { qk } from '@/api/queryKeys';
import { OmssHttpError, type OmssHealthResponse } from '@/api/types/omss';
import { CINEPRO_ENV_BASE_URL } from '@/utils/env';
import { FocusSurface } from '@/tv/FocusSurface';

const OMSS_URL_PLACEHOLDER = CINEPRO_ENV_BASE_URL || 'https://your-core.example.com';

function healthCardClasses(status: OmssHealthResponse['status'] | undefined, hasError: boolean): string {
  if (hasError || !status) return 'border-white/12 bg-white/[0.06]';
  switch (status) {
    case 'operational':
      return 'border-emerald-500/25 bg-emerald-500/8';
    case 'degraded':
      return 'border-amber-500/30 bg-amber-500/10';
    case 'maintenance':
    case 'offline':
      return 'border-orange-500/25 bg-orange-500/8';
    default:
      return 'border-white/12 bg-white/[0.06]';
  }
}

function healthIconColor(status: OmssHealthResponse['status'] | undefined, hasError: boolean): string {
  if (hasError || !status) return 'rgba(255,255,255,0.75)';
  switch (status) {
    case 'operational':
      return '#34d399';
    case 'degraded':
      return '#fbbf24';
    case 'maintenance':
    case 'offline':
      return '#fb923c';
    default:
      return 'rgba(255,255,255,0.75)';
  }
}

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { sectionGap } = useResponsive();
  const cineproBaseUrl = useSettingsStore((s) => s.cineproBaseUrl);
  const setUrl = useSettingsStore((s) => s.setCineproBaseUrl);
  const tmdbApiKey = useSettingsStore((s) => s.tmdbApiKey);
  const setTmdbKey = useSettingsStore((s) => s.setTmdbApiKey);
  const reopenOnboarding = useSettingsStore((s) => s.reopenOnboarding);
  const autoQuality = useSettingsStore((s) => s.autoQuality);
  const setAutoQuality = useSettingsStore((s) => s.setAutoQuality);
  const defaultPlaybackRate = useSettingsStore((s) => s.defaultPlaybackRate);
  const setRate = useSettingsStore((s) => s.setDefaultPlaybackRate);

  const baseKey = cineproBaseUrl.trim();
  const health = useQuery({
    queryKey: [...qk.health, baseKey] as const,
    queryFn: () => CineProApi.health(),
    enabled: !!baseKey,
    retry: 1,
    staleTime: 30_000,
  });

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: qk.health });
    }, [queryClient])
  );

  const coreDetails = useMemo(() => {
    const h = health.data;
    const failed = !health.isFetching && health.isError;
    const err = health.error;
    const errorDetail =
      err instanceof OmssHttpError
        ? `${err.message} (${err.status})`
        : err instanceof Error
          ? err.message
          : health.isError
            ? 'Request failed'
            : null;
    const primaryLine = health.isFetching
      ? 'Checking server…'
      : h
        ? `${h.name} ${h.version}`
        : 'Can’t reach Core';

    const endpoints = h?.endpoints
      ? (['movie', 'tv', 'proxy'] as const)
          .filter((k) => h.endpoints?.[k])
          .map((k) => `${k}: ${h.endpoints![k]}`)
      : [];

    return { h, failed, primaryLine, endpoints, errorDetail };
  }, [health.data, health.error, health.isError, health.isFetching]);

  const iconBoxBorder =
    coreDetails.h?.status === 'operational'
      ? 'bg-emerald-500/15 border-emerald-500/25'
      : coreDetails.h?.status === 'degraded'
        ? 'bg-amber-500/15 border-amber-500/25'
        : coreDetails.h?.status === 'maintenance' || coreDetails.h?.status === 'offline'
          ? 'bg-orange-500/15 border-orange-500/25'
          : 'bg-white/10 border-white/12';

  return (
    <ScrollView
      className="flex-1 bg-ink px-4"
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, sectionGap * 4),
        paddingBottom: sectionGap * 8,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-white text-3xl font-bold mb-6">Settings</Text>

      <Text className="text-white/60 text-xs mb-2">TMDB API key</Text>
      <TextInput
        value={tmdbApiKey}
        onChangeText={(t) => setTmdbKey(t)}
        placeholder="Paste API v3 key"
        placeholderTextColor="rgba(255,255,255,0.35)"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-white mb-2"
        accessibilityLabel="TMDB API key"
      />
      <Text className="text-white/40 text-[11px] mb-6 leading-4">
        Stored only on this device. Catalog and artwork use TMDB; playback uses your Core URL below.
      </Text>

      <Text className="text-white/60 text-xs mb-2">CinePro Core base URL (OMSS)</Text>
      <TextInput
        value={cineproBaseUrl}
        onChangeText={(t) => setUrl(t)}
        placeholder={OMSS_URL_PLACEHOLDER}
        placeholderTextColor="rgba(255,255,255,0.35)"
        autoCapitalize="none"
        className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-white mb-4"
        accessibilityLabel="CinePro Core base URL"
      />

      <Text className="text-white/60 text-xs mb-2">CinePro Core status</Text>
      <View
        className={`rounded-2xl border px-4 py-3 mb-4 flex-row items-start gap-3 ${healthCardClasses(coreDetails.h?.status, coreDetails.failed)}`}
      >
        <View className={`w-10 h-10 rounded-xl items-center justify-center border shrink-0 ${iconBoxBorder}`}>
          <Ionicons
            name={health.isFetching ? 'sync' : coreDetails.h ? 'cloud-done-outline' : 'cloud-offline-outline'}
            color={healthIconColor(coreDetails.h?.status, coreDetails.failed)}
            size={20}
          />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-white font-semibold text-[15px]">Open Core (OMSS)</Text>
          <Text className="text-white/55 text-xs mt-1 leading-4">{coreDetails.primaryLine}</Text>
          {coreDetails.failed && coreDetails.errorDetail ? (
            <Text className="text-amber-200/90 text-[11px] mt-2 leading-4 font-mono" selectable>
              {coreDetails.errorDetail}
            </Text>
          ) : null}
          {coreDetails.h?.status ? (
            <Text className="text-white/45 text-[11px] mt-2 uppercase tracking-wider font-semibold">
              Status: {coreDetails.h.status}
            </Text>
          ) : null}
          {!coreDetails.h && !health.isFetching ? (
            <Text className="text-white/45 text-xs mt-2 leading-5">
              Save a reachable base URL below and tap Apply. The health endpoint is{' '}
              <Text className="text-white/70 font-mono text-[11px]">GET /v1/health</Text>.
            </Text>
          ) : null}
          {coreDetails.h?.note ? (
            <Text className="text-white/50 text-xs mt-2 leading-5">{coreDetails.h.note}</Text>
          ) : null}
          {coreDetails.endpoints.length ? (
            <View className="mt-3 pt-3 border-t border-white/10">
              <Text className="text-white/40 text-[10px] font-bold tracking-[0.15em] mb-2">ENDPOINTS</Text>
              {coreDetails.endpoints.map((line) => (
                <Text key={line} className="text-white/55 text-[11px] font-mono leading-5" selectable>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
          <FocusSurface
            className="mt-3 self-start rounded-lg bg-white/10 px-3 py-2 flex-row items-center gap-2 border border-white/12"
            onPress={() => void health.refetch()}
            accessibilityLabel="Refresh Core status"
          >
            <Ionicons name="refresh-outline" color="#fff" size={16} />
            <Text className="text-white font-semibold text-xs">Refresh status</Text>
          </FocusSurface>
        </View>
      </View>

      <FocusSurface
        className="self-start rounded-xl bg-accent px-4 py-2 mb-10"
        onPress={() => {
          void queryClient.invalidateQueries({ queryKey: ['omss'] });
          void queryClient.invalidateQueries({ queryKey: ['tmdb'] });
          Alert.alert('Applied', 'URLs and keys synced; caches refreshed.');
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
        <Text className="text-white/50 text-xs mb-3">{[0.75, 1, 1.25, 1.5, 2].map((r) => `${r}x`).join(' · ')}</Text>
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

      <FocusSurface
        className="self-start rounded-xl bg-white/10 border border-white/12 px-4 py-3 mb-8 mt-2"
        onPress={() =>
          Alert.alert(
            'Run setup again?',
            'You will return to the connection wizard. Your saved keys stay until you change them.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Continue', onPress: () => reopenOnboarding() },
            ]
          )
        }
      >
        <Text className="text-white font-semibold text-sm">Re-run setup wizard</Text>
      </FocusSurface>

      <Text className="text-white/45 text-xs mt-2 leading-5">
        Optional: developers can still set defaults via EXPO_PUBLIC_TMDB_API_KEY and EXPO_PUBLIC_CINEPRO_BASE_URL at build
        time—the onboarding flow and Settings override them at runtime on this device. Streams follow OMSS v1.0 from your
        Core instance.
      </Text>
    </ScrollView>
  );
}
