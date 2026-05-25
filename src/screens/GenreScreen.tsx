import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/navigation/types';
import { TmdbApi, TmdbHttpError } from '@/api/tmdbClient';
import type { MediaCardModel } from '@/components/MediaCard';
import { MediaPosterGrid } from '@/components/MediaPosterGrid';
import { GRID_LIST_SIDE_PADDING } from '@/utils/layout';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { MissingKeysBanner } from '@/components/MissingKeysBanner';
import { useHasConfiguredTmdbKey } from '@/utils/tmdbCredentials';
import { ThemedBackButton, ThemedScreen, ThemedText } from '@/theme/themedPrimitives';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { useResponsive } from '@/hooks/useResponsive';
import { useAndroidTVBack } from '@/hooks/useAndroidTVBack';
import { useTV } from '@/hooks/useTV';

export function GenreScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Genre'>>();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { overscanX } = useResponsive();
  const isTV = useTV();
  const { genreId, genreName, mediaType } = route.params;

  const hasTmdb = useHasConfiguredTmdbKey();

  const query = useInfiniteQuery({
    queryKey: ['tmdb', 'genreInfinite', mediaType, genreId] as const,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      if (mediaType === 'movie') {
        return TmdbApi.discoverMovies({ page, genreId });
      }
      return TmdbApi.discoverTv({ page, genreId });
    },
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    enabled: hasTmdb,
  });

  const flat: MediaCardModel[] = useMemo(() => {
    const rows: MediaCardModel[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.results) {
        if ('title' in item) {
          rows.push({
            id: item.id,
            title: item.title,
            posterPath: item.poster_path,
            backdropPath: item.backdrop_path,
            subtitle: item.release_date?.slice(0, 4),
            mediaType: 'movie',
          });
        } else {
          rows.push({
            id: item.id,
            title: item.name,
            posterPath: item.poster_path,
            backdropPath: item.backdrop_path,
            subtitle: item.first_air_date?.slice(0, 4),
            mediaType: 'tv',
          });
        }
      }
    }
    return rows;
  }, [query.data?.pages]);

  const onSelect = useCallback(
    (item: MediaCardModel) => {
      if (item.mediaType === 'tv') navigation.navigate('TvDetail', { id: item.id });
      else navigation.navigate('MovieDetail', { id: item.id });
    },
    [navigation]
  );

  const listEmpty = useMemo(() => {
    if (query.isPending) {
      return <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />;
    }
    if (query.isError) {
      const msg =
        query.error instanceof TmdbHttpError
          ? `Could not load titles (${query.error.status}). Check your TMDB key in Settings.`
          : query.error instanceof Error
            ? query.error.message
            : 'Could not load this genre. Try again.';
      return (
        <ThemedText variant="muted" className="px-1 pt-2 leading-5">
          {msg}
        </ThemedText>
      );
    }
    return (
      <ThemedText variant="muted" className="px-1 pt-2">
        No {mediaType === 'movie' ? 'movies' : 'series'} found in {genreName}.
      </ThemedText>
    );
  }, [colors.accent, genreName, mediaType, query.error, query.isError, query.isPending]);

  if (!hasTmdb) {
    return (
      <ThemedScreen className="px-4" style={{ paddingTop: Math.max(insets.top, 12) }}>
        <MissingKeysBanner />
      </ThemedScreen>
    );
  }

  const listPad = GRID_LIST_SIDE_PADDING + overscanX;

  useAndroidTVBack(() => {
    navigation.goBack();
    return true;
  });

  return (
    <ThemedScreen style={{ paddingTop: Math.max(insets.top, 12) }}>
      <View style={{ paddingHorizontal: listPad }} className="flex-row items-center mb-3 gap-3">
        <ThemedBackButton onPress={() => navigation.goBack()} hasTVPreferredFocus={isTV} />
        <ThemedText variant="title" className="text-2xl flex-1" numberOfLines={2}>
          {genreName}
        </ThemedText>
      </View>

      <MediaPosterGrid
        data={flat}
        listHorizontalPadding={listPad}
        overscanX={overscanX}
        onSelect={onSelect}
        ListEmptyComponent={listEmpty}
        bottomInset={Math.max(insets.bottom, 24) + 16}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
      />
    </ThemedScreen>
  );
}
