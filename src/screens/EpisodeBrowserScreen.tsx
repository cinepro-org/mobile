import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, PlayerRouteParams } from '@/navigation/types';
import { qk } from '@/api/queryKeys';
import { TmdbApi } from '@/api/tmdbClient';
import { FocusSurface } from '@/tv/FocusSurface';
import { Image } from 'expo-image';
import { tmdbImg } from '@/services/tmdbImages';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useLibraryStore, mediaStorageKey } from '@/store/libraryStore';

export function EpisodeBrowserScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EpisodeBrowser'>>();
  const { id, seasonNumber, title } = route.params;
  const { overscanX, sectionGap } = useResponsive();

  const season = useQuery({
    queryKey: qk.tvSeason(id, seasonNumber),
    queryFn: () => TmdbApi.tvSeason(id, seasonNumber),
  });

  const show = useQuery({
    queryKey: qk.tvDetail(id),
    queryFn: () => TmdbApi.tvDetail(id),
  });

  const episodes = season.data?.episodes ?? [];
  const continueWatching = useLibraryStore((s) => s.continueWatching);

  const resumeForEp = useCallback(
    (episodeNumber: number) => {
      const key = mediaStorageKey({ mediaType: 'tv', tmdbId: id, season: seasonNumber, episode: episodeNumber });
      return continueWatching.find((c) => c.mediaKey === key)?.positionSec;
    },
    [continueWatching, id, seasonNumber]
  );

  const playEpisode = useCallback(
    (episodeNumber: number, episodeTitle: string) => {
      const idx = episodes.findIndex((e) => e.episode_number === episodeNumber);
      const nextEp = idx >= 0 ? episodes[idx + 1] : undefined;
      const showTitle = show.data?.name ?? 'Series';

      const base: PlayerRouteParams = {
        title: `${showTitle} · ${episodeTitle}`,
        mediaType: 'tv',
        tmdbId: id,
        season: seasonNumber,
        episode: episodeNumber,
        episodeTitle,
        posterPath: show.data?.poster_path,
        backdropPath: show.data?.backdrop_path,
        resumeSec: resumeForEp(episodeNumber),
        next: nextEp
          ? {
              mediaType: 'tv',
              tmdbId: id,
              season: seasonNumber,
              episode: nextEp.episode_number,
              episodeTitle: nextEp.name,
              showTitle,
              posterPath: show.data?.poster_path,
              backdropPath: show.data?.backdrop_path,
            }
          : undefined,
      };

      navigation.navigate('Player', base);
    },
    [episodes, id, navigation, resumeForEp, seasonNumber, show.data?.backdrop_path, show.data?.name, show.data?.poster_path]
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof episodes)[number] }) => {
      const uri = tmdbImg(item.still_path ?? show.data?.poster_path, 'w500');
      return (
        <FocusSurface
          className="mx-4 mb-4 rounded-3xl overflow-hidden bg-elevated border border-white/10"
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
              <Text className="text-white font-semibold">
                E{item.episode_number}: {item.name}
              </Text>
              {item.overview ? (
                <Text className="text-white/55 text-xs mt-2" numberOfLines={3}>
                  {item.overview}
                </Text>
              ) : null}
            </View>
          </View>
        </FocusSurface>
      );
    },
    [playEpisode, show.data?.poster_path]
  );

  const listData = useMemo(() => episodes, [episodes]);

  return (
    <View className="flex-1 bg-ink pt-14">
      <View style={{ paddingHorizontal: overscanX }} className="flex-row items-center mb-4">
        <FocusSurface
          className="rounded-full bg-black/45 border border-white/15 px-3 py-2 mr-3"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" color="#fff" size={22} />
        </FocusSurface>
        <Text className="text-white text-xl font-bold flex-1" numberOfLines={2}>
          {title ?? `Season ${seasonNumber}`}
        </Text>
      </View>

      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(e) => String(e.id)}
        style={{ flex: 1 }}
        ListHeaderComponent={
          <Text className="text-white/60 px-6 mb-3" style={{ marginBottom: sectionGap }}>
            {season.isLoading ? 'Loading episodes…' : `${listData.length} episodes`}
          </Text>
        }
      />
    </View>
  );
}
