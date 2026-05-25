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
import { useTV } from '@/hooks/useTV';
import { useTVContentFocusLink } from '@/tv/useTVContentFocusLink';
import { useAppTheme } from '@/theme/AppThemeProvider';
import type { ThemeMode } from '@/theme/colors';

const OMSS_URL_PLACEHOLDER = CINEPRO_ENV_BASE_URL || 'https://your-core.example.com';

function healthCardStyle(
  status: OmssHealthResponse['status'] | undefined,
  hasError: boolean,
  colors: { border: string; inputBg: string }
) {
  if (hasError || !status) {
    return { borderColor: colors.border, backgroundColor: colors.inputBg };
  }
  switch (status) {
    case 'operational':
      return { borderColor: 'rgba(52,211,153,0.35)', backgroundColor: 'rgba(52,211,153,0.1)' };
    case 'degraded':
      return { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.12)' };
    case 'maintenance':
    case 'offline':
      return { borderColor: 'rgba(251,146,60,0.35)', backgroundColor: 'rgba(251,146,60,0.1)' };
    default:
      return { borderColor: colors.border, backgroundColor: colors.inputBg };
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
  const autoplayNextEpisode = useSettingsStore((s) => s.autoplayNextEpisode);
  const setAutoplayNextEpisode = useSettingsStore((s) => s.setAutoplayNextEpisode);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const { colors, isDark } = useAppTheme();
  const isTV = useTV();
  const { contentFocusRef, nextFocusLeft } = useTVContentFocusLink();

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

  const themeOptions: { id: ThemeMode; label: string; icon: 'moon' | 'sunny' }[] = [
    { id: 'dark', label: 'Dark', icon: 'moon' },
    { id: 'light', label: 'Light', icon: 'sunny' },
  ];

  const placeholderColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(11,12,18,0.35)';

  return (
    <ScrollView
      className="flex-1 px-4"
      style={{ backgroundColor: colors.ink }}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, sectionGap * 4),
        paddingBottom: sectionGap * 8,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-3xl font-bold mb-6" style={{ color: colors.text }}>
        Settings
      </Text>

      <Text className="text-xs mb-2" style={{ color: colors.textMuted }}>
        Appearance
      </Text>
      <View className="flex-row gap-2 mb-6">
        {themeOptions.map((opt, index) => (
          <FocusSurface
            key={opt.id}
            ref={isTV && index === 0 ? contentFocusRef : undefined}
            className="flex-1 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 border"
            style={{
              backgroundColor: themeMode === opt.id ? colors.accent : colors.inputBg,
              borderColor: themeMode === opt.id ? colors.accent : colors.border,
            }}
            focusVariant={themeMode === opt.id ? 'accent' : 'subtle'}
            hasTVPreferredFocus={isTV && index === 0}
            collapseTVNavOnFocus={isTV}
            nextFocusLeft={isTV && index === 0 ? nextFocusLeft : undefined}
            onPress={() => setThemeMode(opt.id)}
            accessibilityLabel={`${opt.label} theme`}
            accessibilityState={{ selected: themeMode === opt.id }}
          >
            <Ionicons
              name={opt.icon}
              color={themeMode === opt.id ? colors.textOnAccent : colors.text}
              size={18}
            />
            <Text
              className="font-bold text-[15px]"
              style={{ color: themeMode === opt.id ? colors.textOnAccent : colors.text }}
            >
              {opt.label}
            </Text>
          </FocusSurface>
        ))}
      </View>

      <Text className="text-xs mb-2" style={{ color: colors.textMuted }}>
        TMDB API key
      </Text>
      <TextInput
        value={tmdbApiKey}
        onChangeText={(t) => setTmdbKey(t)}
        placeholder="Paste API v3 key"
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        className="rounded-2xl border px-4 py-3 mb-2"
        style={{
          backgroundColor: colors.inputBg,
          borderColor: colors.border,
          color: colors.text,
        }}
        accessibilityLabel="TMDB API key"
      />
      <Text className="text-[11px] mb-6 leading-4" style={{ color: colors.textFaint }}>
        Stored only on this device. Catalog and artwork use TMDB; playback uses your Core URL below.
      </Text>

      <Text className="text-xs mb-2" style={{ color: colors.textMuted }}>
        CinePro Core base URL (OMSS)
      </Text>
      <TextInput
        value={cineproBaseUrl}
        onChangeText={(t) => setUrl(t)}
        placeholder={OMSS_URL_PLACEHOLDER}
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        className="rounded-2xl border px-4 py-3 mb-4"
        style={{
          backgroundColor: colors.inputBg,
          borderColor: colors.border,
          color: colors.text,
        }}
        accessibilityLabel="CinePro Core base URL"
      />

      <Text className="text-xs mb-2" style={{ color: colors.textMuted }}>
        CinePro Core status
      </Text>
      <View
        className="rounded-2xl border px-4 py-3 mb-4 flex-row items-start gap-3"
        style={healthCardStyle(coreDetails.h?.status, coreDetails.failed, colors)}
      >
        <View className={`w-10 h-10 rounded-xl items-center justify-center border shrink-0 ${iconBoxBorder}`}>
          <Ionicons
            name={health.isFetching ? 'sync' : coreDetails.h ? 'cloud-done-outline' : 'cloud-offline-outline'}
            color={healthIconColor(coreDetails.h?.status, coreDetails.failed)}
            size={20}
          />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="font-semibold text-[15px]" style={{ color: colors.text }}>
            Open Core (OMSS)
          </Text>
          <Text className="text-xs mt-1 leading-4" style={{ color: colors.textMuted }}>
            {coreDetails.primaryLine}
          </Text>
          {coreDetails.failed && coreDetails.errorDetail ? (
            <Text className="text-amber-200/90 text-[11px] mt-2 leading-4 font-mono" selectable>
              {coreDetails.errorDetail}
            </Text>
          ) : null}
          {coreDetails.h?.status ? (
            <Text
              className="text-[11px] mt-2 uppercase tracking-wider font-semibold"
              style={{ color: colors.textFaint }}
            >
              Status: {coreDetails.h.status}
            </Text>
          ) : null}
          {!coreDetails.h && !health.isFetching ? (
            <Text className="text-xs mt-2 leading-5" style={{ color: colors.textFaint }}>
              Save a reachable base URL below and tap Apply. The health endpoint is{' '}
              <Text className="font-mono text-[11px]" style={{ color: colors.textMuted }}>
                GET /v1/health
              </Text>
              .
            </Text>
          ) : null}
          {coreDetails.h?.note ? (
            <Text className="text-xs mt-2 leading-5" style={{ color: colors.textMuted }}>
              {coreDetails.h.note}
            </Text>
          ) : null}
          {coreDetails.endpoints.length ? (
            <View className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
              <Text
                className="text-[10px] font-bold tracking-[0.15em] mb-2"
                style={{ color: colors.textFaint }}
              >
                ENDPOINTS
              </Text>
              {coreDetails.endpoints.map((line) => (
                <Text
                  key={line}
                  className="text-[11px] font-mono leading-5"
                  style={{ color: colors.textMuted }}
                  selectable
                >
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
          <FocusSurface
            className="mt-3 self-start rounded-lg px-3 py-2 flex-row items-center gap-2 border"
            style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
            onPress={() => void health.refetch()}
            accessibilityLabel="Refresh Core status"
          >
            <Ionicons name="refresh-outline" color={colors.text} size={16} />
            <Text className="font-semibold text-xs" style={{ color: colors.text }}>
              Refresh status
            </Text>
          </FocusSurface>
        </View>
      </View>

      <FocusSurface
        className="self-start rounded-xl px-4 py-2 mb-10"
        style={{ backgroundColor: colors.accent }}
        onPress={() => {
          void queryClient.invalidateQueries({ queryKey: ['omss'] });
          void queryClient.invalidateQueries({ queryKey: ['tmdb'] });
          Alert.alert('Applied', 'URLs and keys synced; caches refreshed.');
        }}
      >
        <Text className="font-semibold" style={{ color: colors.textOnAccent }}>
          Apply & refresh OMSS
        </Text>
      </FocusSurface>

      <FocusSurface
        className="flex-row items-center justify-between py-3 border-t"
        style={{ borderColor: colors.border }}
        focusVariant="subtle"
        onPress={() => setAutoQuality(!autoQuality)}
        accessibilityLabel="Toggle auto quality"
      >
        <Text className="text-base flex-1 pr-4" style={{ color: colors.text }}>
          Auto quality selection
        </Text>
        <Switch value={autoQuality} pointerEvents="none" accessibilityLabel="Toggle auto quality" />
      </FocusSurface>

      <FocusSurface
        className="flex-row items-center justify-between py-3 border-t"
        style={{ borderColor: colors.border }}
        focusVariant="subtle"
        onPress={() => setAutoplayNextEpisode(!autoplayNextEpisode)}
        accessibilityLabel="Toggle autoplay next episode"
      >
        <Text className="text-base flex-1 pr-4" style={{ color: colors.text }}>
          Autoplay next episode
        </Text>
        <Switch
          value={autoplayNextEpisode}
          pointerEvents="none"
          accessibilityLabel="Toggle autoplay next episode"
        />
      </FocusSurface>

      <View className="py-4 border-t" style={{ borderColor: colors.border }}>
        <Text className="text-base mb-2" style={{ color: colors.text }}>
          Default playback speed
        </Text>
        <Text className="text-xs mb-3" style={{ color: colors.textMuted }}>
          {[0.75, 1, 1.25, 1.5, 2].map((r) => `${r}x`).join(' · ')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {[0.75, 1, 1.25, 1.5, 2].map((r) => (
            <FocusSurface
              key={r}
              className="rounded-full px-4 py-2 border"
              style={{
                backgroundColor: defaultPlaybackRate === r ? colors.accent : colors.inputBg,
                borderColor: defaultPlaybackRate === r ? colors.accent : colors.border,
              }}
              onPress={() => setRate(r)}
              accessibilityLabel={`Playback speed ${r}`}
            >
              <Text
                className="font-semibold"
                style={{ color: defaultPlaybackRate === r ? colors.textOnAccent : colors.text }}
              >
                {r}x
              </Text>
            </FocusSurface>
          ))}
        </View>
      </View>

      <FocusSurface
        className="self-start rounded-xl border px-4 py-3 mb-8 mt-2"
        style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
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
        <Text className="font-semibold text-sm" style={{ color: colors.text }}>
          Re-run setup wizard
        </Text>
      </FocusSurface>

      <Text className="text-xs mt-2 leading-5" style={{ color: colors.textFaint }}>
        Optional: developers can still set defaults via EXPO_PUBLIC_TMDB_API_KEY and EXPO_PUBLIC_CINEPRO_BASE_URL at build
        time—the onboarding flow and Settings override them at runtime on this device. Streams follow OMSS v1.0 from your
        Core instance.
      </Text>
    </ScrollView>
  );
}
