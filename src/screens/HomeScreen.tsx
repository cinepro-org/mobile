import React, { useCallback, useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { TmdbApi } from '@/api/tmdbClient';
import { CineProApi } from '@/api/cineproClient';
import { qk } from '@/api/queryKeys';
import type { MediaCardModel } from '@/components/MediaCard';
import { HeroCarousel } from '@/components/HeroCarousel';
import { MediaRow } from '@/components/MediaRow';
import { MissingKeysBanner } from '@/components/MissingKeysBanner';
import { useResponsive } from '@/hooks/useResponsive';
import { useLibraryStore } from '@/store/libraryStore';
import { TMDB_API_KEY } from '@/utils/env';
import { FlashList } from '@shopify/flash-list';
import { FocusSurface } from '@/tv/FocusSurface';
import type { TmdbGenre, TmdbMovieListResult, TmdbTvListResult } from '@/api/types/tmdb';

function mapMovie(m: TmdbMovieListResult): MediaCardModel {
  return {
    id: m.id,
    title: m.title,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    subtitle: m.release_date?.slice(0, 4),
    mediaType: 'movie',
  };
}

function mapTv(m: TmdbTvListResult): MediaCardModel {
  return {
    id: m.id,
    title: m.name,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    subtitle: m.first_air_date?.slice(0, 4),
    mediaType: 'tv',
  };
}

export function HomeScreen() {
  const navigation = useAppNavigation();
  const { posterW, posterH, heroH, overscanX, sectionGap } = useResponsive();
  const continueWatching = useLibraryStore((s) => s.continueWatching);

  const trendingMovies = useQuery({
    queryKey: qk.trendingMovies(1),
    queryFn: () => TmdbApi.trendingMovies(1),
    enabled: !!TMDB_API_KEY,
  });

  const trendingTv = useQuery({
    queryKey: qk.trendingTv(1),
    queryFn: () => TmdbApi.trendingTv(1),
    enabled: !!TMDB_API_KEY,
  });

  const discoverMovies = useQuery({
    queryKey: qk.discoverMovies(1),
    queryFn: () => TmdbApi.discoverMovies({ page: 1 }),
    enabled: !!TMDB_API_KEY,
  });

  const genres = useQuery({
    queryKey: qk.genresMovie,
    queryFn: () => TmdbApi.movieGenres(),
    enabled: !!TMDB_API_KEY,
  });

  const health = useQuery({
    queryKey: qk.health,
    queryFn: () => CineProApi.health(),
    retry: 1,
    staleTime: 30_000,
  });

  const heroItems = useMemo(() => {
    const mv = trendingMovies.data?.results?.slice(0, 8).map(mapMovie) ?? [];
    return mv.length ? mv : discoverMovies.data?.results?.slice(0, 8).map(mapMovie) ?? [];
  }, [discoverMovies.data?.results, trendingMovies.data?.results]);

  const continueModels: MediaCardModel[] = useMemo(
    () =>
      continueWatching.slice(0, 12).map((c) => ({
        id: c.tmdbId,
        title: c.title,
        posterPath: c.posterPath,
        backdropPath: c.backdropPath,
        mediaType: c.mediaType,
        subtitle:
          c.mediaType === 'tv'
            ? `S${c.season ?? 1}:E${c.episode ?? 1}`
            : `${Math.round((c.positionSec / Math.max(c.durationSec, 1)) * 100)}% watched`,
      })),
    [continueWatching]
  );

  const onSelect = useCallback(
    (item: MediaCardModel) => {
      navigation.navigate('MovieDetail', { id: item.id });
    },
    [navigation]
  );

  const onSelectTv = useCallback(
    (item: MediaCardModel) => {
      navigation.navigate('TvDetail', { id: item.id });
    },
    [navigation]
  );

  const onContinueSelect = useCallback(
    (item: MediaCardModel) => {
      if (item.mediaType === 'tv') navigation.navigate('TvDetail', { id: item.id });
      else navigation.navigate('MovieDetail', { id: item.id });
    },
    [navigation]
  );

  const refresh = useCallback(() => {
    trendingMovies.refetch();
    trendingTv.refetch();
    discoverMovies.refetch();
    genres.refetch();
    health.refetch();
  }, [discoverMovies, genres, health, trendingMovies, trendingTv]);

  const genreChips = genres.data?.genres ?? [];

  const refreshing =
    trendingMovies.isFetching || trendingTv.isFetching || discoverMovies.isFetching || genres.isFetching;

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ paddingBottom: sectionGap * 6, paddingTop: sectionGap * 2 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" />}
    >
      {!TMDB_API_KEY ? (
        <MissingKeysBanner onOpenSettings={() => navigation.navigate('Settings' as never)} />
      ) : null}

      <View className="px-4 mb-4 flex-row flex-wrap gap-2">
        <Text className="text-white/60 text-xs w-full mb-1">CinePro Core</Text>
        <View className="rounded-full px-3 py-1 bg-white/10 border border-white/10">
          <Text className="text-white text-xs">
            {health.isFetching
              ? 'Checking OMSS health…'
              : health.data
                ? `${health.data.name} · ${health.data.version} · ${health.data.status}`
                : 'Offline — verify EXPO_PUBLIC_CINEPRO_BASE_URL / Core is running'}
          </Text>
        </View>
      </View>

      <HeroCarousel heroHeight={heroH} items={heroItems} overscanX={overscanX} />

      {genreChips.length ? (
        <View style={{ marginTop: sectionGap * 2 }}>
          <Text className="text-white text-lg font-semibold px-4 mb-3">Browse genres</Text>
          <FlashList
            horizontal
            data={genreChips}
            keyExtractor={(g: TmdbGenre) => String(g.id)}
            style={{ height: 44 }}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            renderItem={({ item }: { item: TmdbGenre }) => (
              <FocusSurface
                className="rounded-full bg-white/10 border border-white/10 px-4 py-2"
                onPress={() =>
                  navigation.navigate('Genre', {
                    genreId: item.id,
                    genreName: item.name,
                    mediaType: 'movie',
                  })
                }
                accessibilityLabel={`Genre ${item.name}`}
              >
                <Text className="text-white text-sm">{item.name}</Text>
              </FocusSurface>
            )}
          />
        </View>
      ) : null}

      <View style={{ marginTop: sectionGap * 2 }}>
        <MediaRow
          title="Continue watching"
          data={continueModels}
          posterW={posterW}
          posterH={posterH}
          isLoading={false}
          onSelect={onContinueSelect}
        />
        <MediaRow
          title="Trending movies"
          data={(trendingMovies.data?.results ?? []).map(mapMovie)}
          posterW={posterW}
          posterH={posterH}
          isLoading={trendingMovies.isLoading}
          onSelect={onSelect}
        />
        <MediaRow
          title="Trending series"
          data={(trendingTv.data?.results ?? []).map(mapTv)}
          posterW={posterW}
          posterH={posterH}
          isLoading={trendingTv.isLoading}
          onSelect={onSelectTv}
        />
        <MediaRow
          title="Recently added picks"
          data={(discoverMovies.data?.results ?? []).map(mapMovie)}
          posterW={posterW}
          posterH={posterH}
          isLoading={discoverMovies.isLoading}
          onSelect={onSelect}
        />
      </View>
    </ScrollView>
  );
}
