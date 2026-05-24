import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { qk } from '@/api/queryKeys';
import { TmdbApi } from '@/api/tmdbClient';
import { FocusSurface } from '@/tv/FocusSurface';
import { Image } from 'expo-image';
import { tmdbImg } from '@/services/tmdbImages';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useSettingsStore } from '@/store/settingsStore';
import { useHasConfiguredTmdbKey } from '@/utils/tmdbCredentials';
import { usePlayTvEpisode } from '@/player/usePlayTvEpisode';
import { resolveStreamReadyState } from '@/player/streamAvailability';
import { ThemedBackButton, ThemedScreen, ThemedText } from '@/theme/themedPrimitives';
import { useAppTheme } from '@/theme/AppThemeProvider';

export function EpisodeBrowserScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EpisodeBrowser'>>();
  const { id, seasonNumber, title } = route.params;
  const { overscanX, sectionGap } = useResponsive();
  const { colors } = useAppTheme();
  const hasTmdb = useHasConfiguredTmdbKey();
  const cineproBaseUrl = useSettingsStore((s) => s.cineproBaseUrl);
  const coreConfigured = !!cineproBaseUrl.trim();

  const season = useQuery({
    queryKey: qk.tvSeason(id, seasonNumber),
    queryFn: () => TmdbApi.tvSeason(id, seasonNumber),
    enabled: hasTmdb,
  });

  const show = useQuery({
    queryKey: qk.tvDetail(id),
    queryFn: () => TmdbApi.tvDetail(id),
    enabled: hasTmdb,
  });

  const episodes = season.data?.episodes ?? [];
  const showTitle = show.data?.name ?? 'Series';

  const { playEpisode, episodeQueryByNumber, readyCount } = usePlayTvEpisode({
    tmdbId: id,
    seasonNumber,
    episodes,
    showTitle,
    posterPath: show.data?.poster_path,
    backdropPath: show.data?.backdrop_path,
  });

  const renderItem = useCallback(
    ({ item }: { item: (typeof episodes)[number] }) => {
      const uri = tmdbImg(item.still_path ?? show.data?.poster_path, 'w500');
      const epQuery = episodeQueryByNumber.get(item.episode_number);
      const epState = epQuery ? resolveStreamReadyState(coreConfigured, epQuery) : null;
      const epReady = epState?.status === 'ready';
      const epLoading = epState?.status === 'loading';

      return (
        <FocusSurface
          className="mx-4 mb-4 rounded-3xl overflow-hidden"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          }}
          onPress={() => playEpisode(item.episode_number, item.name)}
          accessibilityLabel={`Play episode ${item.episode_number} ${item.name}`}
        >
          <View className="flex-row">
            <Image
              source={uri ? { uri } : undefined}
              style={{ width: 160, height: 90 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View className="flex-1 p-3">
              <View className="flex-row items-center gap-2">
                <Text className="font-semibold flex-1" style={{ color: colors.text }} numberOfLines={2}>
                  E{item.episode_number}: {item.name}
                </Text>
                {epLoading ? (
                  <ActivityIndicator color={colors.accent} size="small" />
                ) : epReady ? (
                  <Ionicons name="cloud-done-outline" color={colors.accent} size={18} />
                ) : null}
              </View>
              {item.overview ? (
                <Text className="text-xs mt-2" style={{ color: colors.textMuted }} numberOfLines={3}>
                  {item.overview}
                </Text>
              ) : null}
            </View>
          </View>
        </FocusSurface>
      );
    },
    [colors, coreConfigured, episodeQueryByNumber, playEpisode, show.data?.poster_path]
  );

  const listData = useMemo(() => episodes, [episodes]);

  return (
    <ThemedScreen className="pt-14">
      <View style={{ paddingHorizontal: overscanX }} className="flex-row items-center mb-4 gap-3">
        <ThemedBackButton onPress={() => navigation.goBack()} />
        <ThemedText variant="title" className="text-xl flex-1" numberOfLines={2}>
          {title ?? `Season ${seasonNumber}`}
        </ThemedText>
      </View>

      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(e) => String(e.id)}
        style={{ flex: 1 }}
        ListHeaderComponent={
          <View className="px-6 mb-3" style={{ marginBottom: sectionGap }}>
            <ThemedText variant="muted">
              {season.isLoading
                ? 'Loading episodes…'
                : coreConfigured
                  ? readyCount > 0
                    ? `${listData.length} episodes · ${readyCount} stream${readyCount === 1 ? '' : 's'} ready`
                    : `${listData.length} episodes · tap to load streams`
                  : `${listData.length} episodes`}
            </ThemedText>
            {!coreConfigured ? (
              <ThemedText variant="faint" className="text-xs mt-2">
                Configure CinePro Core in Settings to load episode streams on demand.
              </ThemedText>
            ) : null}
          </View>
        }
      />
    </ThemedScreen>
  );
}
