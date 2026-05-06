import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { TmdbApi } from '@/api/tmdbClient';
import { MediaCard } from '@/components/MediaCard';
import type { MediaCardModel } from '@/components/MediaCard';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { MissingKeysBanner } from '@/components/MissingKeysBanner';
import { TMDB_API_KEY } from '@/utils/env';
import { FocusSurface } from '@/tv/FocusSurface';
import Ionicons from '@expo/vector-icons/Ionicons';

export function GenreScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Genre'>>();
  const navigation = useAppNavigation();
  const { posterW, posterH, overscanX } = useResponsive();
  const { genreId, genreName, mediaType } = route.params;

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
    getNextPageParam: (last) => {
      const lp = last as { page: number; total_pages: number };
      return lp.page < lp.total_pages ? lp.page + 1 : undefined;
    },
    enabled: !!TMDB_API_KEY,
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

  const renderItem = useCallback(
    ({ item }: { item: MediaCardModel }) => (
      <View style={{ paddingHorizontal: overscanX / 2, paddingBottom: 16 }}>
        <MediaCard item={item} width={posterW} height={posterH} onPress={() => onSelect(item)} />
      </View>
    ),
    [onSelect, overscanX, posterH, posterW]
  );

  if (!TMDB_API_KEY) {
    return (
      <View className="flex-1 bg-ink px-4 pt-16">
        <MissingKeysBanner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ink pt-14">
      <View style={{ paddingHorizontal: overscanX }} className="flex-row items-center mb-4">
        <FocusSurface
          className="rounded-full bg-black/45 border border-white/15 px-3 py-2 mr-3"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" color="#fff" size={22} />
        </FocusSurface>
        <Text className="text-white text-3xl font-bold flex-1">{genreName}</Text>
      </View>
      {query.isLoading ? <ActivityIndicator color="#fff" /> : null}
      <FlashList
        data={flat}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1 }}
        onEndReached={() => query.fetchNextPage()}
        onEndReachedThreshold={0.65}
      />
    </View>
  );
}
