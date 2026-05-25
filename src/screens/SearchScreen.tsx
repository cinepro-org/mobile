import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, TextInput, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TmdbApi, TmdbHttpError } from '@/api/tmdbClient';
import type { TmdbMultiSearchResult } from '@/api/types/tmdb';
import type { MediaCardModel } from '@/components/MediaCard';
import { MediaPosterGrid } from '@/components/MediaPosterGrid';
import { MissingKeysBanner } from '@/components/MissingKeysBanner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useHasConfiguredTmdbKey } from '@/utils/tmdbCredentials';
import { GRID_LIST_SIDE_PADDING } from '@/utils/layout';
import { ThemedScreen, ThemedText } from '@/theme/themedPrimitives';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { focusedRingStyle } from '@/tv/focusStyles';
import { useTV } from '@/hooks/useTV';
import { useTVContentFocusLink } from '@/tv/useTVContentFocusLink';

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
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const isTV = useTV();
  const { contentFocusRef, nextFocusLeft, registerContentFocus } = useTVContentFocusLink();
  const [inputFocused, setInputFocused] = useState(false);
  const { overscanX } = useResponsive();
  const ts = useThemedStyles();
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q, 380);
  const hasTmdb = useHasConfiguredTmdbKey();
  const trimmed = debounced.trim();
  const enabled = trimmed.length >= 2 && hasTmdb;

  const query = useInfiniteQuery({
    queryKey: ['tmdb', 'searchInfinite', trimmed] as const,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => TmdbApi.searchMulti(trimmed, pageParam as number),
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

  const listEmpty = useMemo(() => {
    if (!enabled) {
      return (
        <ThemedText variant="muted" className="px-1 pt-2">
          Type at least two characters to search TMDB.
        </ThemedText>
      );
    }
    if (query.isPending) {
      return <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />;
    }
    if (query.isError) {
      const msg =
        query.error instanceof TmdbHttpError
          ? `Search failed (${query.error.status}). Check your TMDB key in Settings.`
          : query.error instanceof Error
            ? query.error.message
            : 'Search failed. Try again.';
      return (
        <ThemedText variant="muted" className="px-1 pt-2 leading-5">
          {msg}
        </ThemedText>
      );
    }
    return (
      <ThemedText variant="muted" className="px-1 pt-2">
        No movies or series found for “{trimmed}”.
      </ThemedText>
    );
  }, [colors.accent, enabled, query.error, query.isError, query.isPending, trimmed]);

  if (!hasTmdb) {
    return (
      <ThemedScreen className="px-4" style={{ paddingTop: Math.max(insets.top, 12) }}>
        <MissingKeysBanner />
      </ThemedScreen>
    );
  }

  const listPad = GRID_LIST_SIDE_PADDING + overscanX;

  return (
    <ThemedScreen style={{ paddingTop: Math.max(insets.top, 12) }}>
      <View style={{ paddingHorizontal: listPad, paddingBottom: 12 }}>
        <ThemedText variant="title" className="text-2xl mb-4">
          Search
        </ThemedText>
        <TextInput
          ref={isTV ? contentFocusRef : undefined}
          value={q}
          onChangeText={setQ}
          placeholder="Titles, people, keywords…"
          placeholderTextColor={ts.placeholder}
          className="rounded-2xl px-4 py-3"
          style={[
            ts.input,
            Platform.isTV && inputFocused ? focusedRingStyle('subtle', colors, true) : undefined,
          ]}
          accessibilityLabel="Search catalog"
          autoCorrect={false}
          returnKeyType="search"
          hasTVPreferredFocus={isTV}
          {...(isTV ? { nextFocusLeft: nextFocusLeft as never } : {})}
          onFocus={() => {
            setInputFocused(true);
            if (isTV) registerContentFocus?.();
          }}
          onBlur={() => setInputFocused(false)}
        />
      </View>

      <MediaPosterGrid
        data={enabled ? flat : []}
        listHorizontalPadding={listPad}
        overscanX={overscanX}
        onSelect={onSelect}
        ListEmptyComponent={listEmpty}
        bottomInset={Math.max(insets.bottom, 24) + 16}
        onEndReached={() => {
          if (enabled && query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
      />
    </ThemedScreen>
  );
}
