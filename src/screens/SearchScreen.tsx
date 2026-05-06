import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { TmdbApi } from '@/api/tmdbClient';
import type { TmdbMultiSearchResult } from '@/api/types/tmdb';
import { MediaCard } from '@/components/MediaCard';
import type { MediaCardModel } from '@/components/MediaCard';
import { MissingKeysBanner } from '@/components/MissingKeysBanner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { TMDB_API_KEY } from '@/utils/env';

function toModel(hit: TmdbMultiSearchResult): MediaCardModel | null {
  if (hit.media_type === 'movie') {
    return {
      id: hit.id,
      title: hit.title,
      posterPath: hit.poster_path,
      backdropPath: hit.backdrop_path,
      subtitle: hit.release_date?.slice(0, 4),
      mediaType: 'movie',
    };
  }
  if (hit.media_type === 'tv') {
    return {
      id: hit.id,
      title: hit.name,
      posterPath: hit.poster_path,
      backdropPath: hit.backdrop_path,
      subtitle: hit.first_air_date?.slice(0, 4),
      mediaType: 'tv',
    };
  }
  return null;
}

export function SearchScreen() {
  const navigation = useAppNavigation();
  const { posterW, posterH, overscanX } = useResponsive();
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q, 380);

  const enabled = debounced.trim().length >= 2 && !!TMDB_API_KEY;

  const query = useInfiniteQuery({
    queryKey: ['tmdb', 'searchInfinite', debounced.trim()] as const,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => TmdbApi.searchMulti(debounced.trim(), pageParam),
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    enabled,
  });

  const flat = useMemo(() => {
    const rows: MediaCardModel[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const r of page.results) {
        const m = toModel(r);
        if (m) rows.push(m);
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
      <View className="flex-1 bg-ink px-4 pt-12">
        <MissingKeysBanner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ink pt-12" style={{ paddingHorizontal: overscanX }}>
      <Text className="text-white text-2xl font-bold px-4 mb-4">Search</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Titles, people, keywords…"
        placeholderTextColor="rgba(255,255,255,0.35)"
        className="mx-4 mb-4 rounded-2xl bg-white/10 text-white px-4 py-3 border border-white/10"
        accessibilityLabel="Search catalog"
        autoCorrect={false}
      />

      {query.isFetching ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
      ) : null}

      {!enabled ? (
        <Text className="text-white/50 px-6">Type at least two characters to search TMDB.</Text>
      ) : (
        <FlashList
          data={flat}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          style={{ flex: 1 }}
          onEndReached={() => query.fetchNextPage()}
          onEndReachedThreshold={0.7}
        />
      )}
    </View>
  );
}
