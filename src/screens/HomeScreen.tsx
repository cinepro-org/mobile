import React, { useCallback, useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { TmdbApi } from '@/api/tmdbClient';
import { qk } from '@/api/queryKeys';
import type { MediaCardModel } from '@/components/MediaCard';
import { HeroCarousel } from '@/components/HeroCarousel';
import { MediaRow } from '@/components/MediaRow';
import { MissingKeysBanner } from '@/components/MissingKeysBanner';
import { useResponsive } from '@/hooks/useResponsive';
import { useHasConfiguredTmdbKey } from '@/utils/tmdbCredentials';
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
  const insets = useSafeAreaInsets();
  const { posterW, posterH, heroH, overscanX, sectionGap } = useResponsive();
  const hasTmdb = useHasConfiguredTmdbKey();
  const trendingMovies = useQuery({
    queryKey: qk.trendingMovies(1),
    queryFn: () => TmdbApi.trendingMovies(1),
    enabled: hasTmdb,
  });

  const trendingTv = useQuery({
    queryKey: qk.trendingTv(1),
    queryFn: () => TmdbApi.trendingTv(1),
    enabled: hasTmdb,
  });

  const discoverMovies = useQuery({
    queryKey: qk.discoverMovies(1),
    queryFn: () => TmdbApi.discoverMovies({ page: 1 }),
    enabled: hasTmdb,
  });

  const genres = useQuery({
    queryKey: qk.genresMovie,
    queryFn: () => TmdbApi.movieGenres(),
    enabled: hasTmdb,
  });

  const heroItems = useMemo((): MediaCardModel[] => {
    const movies = trendingMovies.data?.results?.map(mapMovie) ?? [];
    const tvShows = trendingTv.data?.results?.map(mapTv) ?? [];
    if (!movies.length && !tvShows.length) {
      return discoverMovies.data?.results?.slice(0, 8).map(mapMovie) ?? [];
    }
    const merged: MediaCardModel[] = [];
    for (let i = 0; i < 8 && merged.length < 8; i++) {
      if (movies[i]) merged.push(movies[i]);
      if (merged.length < 8 && tvShows[i]) merged.push(tvShows[i]);
    }
    return merged;
  }, [discoverMovies.data?.results, trendingMovies.data?.results, trendingTv.data?.results]);

  const onOpenHero = useCallback(
    (item: MediaCardModel) => {
      if (item.mediaType === 'tv') navigation.navigate('TvDetail', { id: item.id });
      else navigation.navigate('MovieDetail', { id: item.id });
    },
    [navigation]
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

  const refresh = useCallback(() => {
    trendingMovies.refetch();
    trendingTv.refetch();
    discoverMovies.refetch();
    genres.refetch();
  }, [discoverMovies, genres, trendingMovies, trendingTv]);

  const genreChips = genres.data?.genres ?? [];

  const refreshing =
    trendingMovies.isFetching || trendingTv.isFetching || discoverMovies.isFetching || genres.isFetching;

  const hp = Math.max(overscanX, 16);

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{
        paddingBottom: sectionGap * 10,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" />}
    >
      <LinearGradient
        colors={['#161929', '#07080d', '#07080d']}
        locations={[0, 0.35, 1]}
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: sectionGap * 2,
          paddingHorizontal: hp,
        }}
      >
        <View className="flex-row items-start justify-between gap-4 mb-1">
          <Text className="text-white/40 text-[11px] font-bold tracking-[0.28em]">CINESTREAM</Text>
        </View>
      </LinearGradient>

      {!hasTmdb ? (
        <MissingKeysBanner onOpenSettings={() => navigation.navigate('Settings' as never)} />
      ) : null}

      <HeroCarousel heroHeight={heroH} items={heroItems} overscanX={overscanX} onOpenActive={onOpenHero} />

      {genreChips.length ? (
        <View style={{ marginTop: sectionGap * 2.5, paddingHorizontal: hp }}>
          <View className="rounded-3xl border border-white/10 bg-[#12131c] p-4 pb-5 overflow-hidden">
            <Text className="text-white/40 text-[11px] font-bold tracking-[0.2em] mb-2">DISCOVER</Text>
            <Text className="text-white text-xl font-bold mb-4">Browse by genre</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 4, alignItems: 'center' }}
            >
              {genreChips.map((item: TmdbGenre, index: number) => (
                <React.Fragment key={item.id}>
                  {index > 0 ? (
                    <View className="w-px h-7 bg-white/18 self-center mx-3" accessibilityElementsHidden />
                  ) : null}
                  <FocusSurface
                    className="rounded-full bg-white/[0.08] border border-white/14 px-5 py-2.5 active:bg-white/14"
                    onPress={() =>
                      navigation.navigate('Genre', {
                        genreId: item.id,
                        genreName: item.name,
                        mediaType: 'movie',
                      })
                    }
                    accessibilityLabel={`Genre ${item.name}`}
                  >
                    <Text className="text-white text-sm font-semibold">{item.name}</Text>
                  </FocusSurface>
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: sectionGap * 2 }}>
        <MediaRow
          eyebrow="THIS WEEK"
          title="Trending movies"
          data={(trendingMovies.data?.results ?? []).map(mapMovie)}
          posterW={posterW}
          posterH={posterH}
          isLoading={trendingMovies.isLoading}
          onSelect={onSelect}
        />
        <MediaRow
          eyebrow="ON AIR"
          title="Trending series"
          data={(trendingTv.data?.results ?? []).map(mapTv)}
          posterW={posterW}
          posterH={posterH}
          isLoading={trendingTv.isLoading}
          onSelect={onSelectTv}
        />
        <MediaRow
          eyebrow="DISCOVER"
          title="Popular picks"
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
