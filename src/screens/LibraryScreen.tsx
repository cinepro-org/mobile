import React, { useCallback, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { MediaRow } from '@/components/MediaRow';
import type { MediaCardModel } from '@/components/MediaCard';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useLibraryStore } from '@/store/libraryStore';

export function LibraryScreen() {
  const navigation = useAppNavigation();
  const { posterW, posterH, sectionGap } = useResponsive();
  const watchlist = useLibraryStore((s) => s.watchlist);
  const favorites = useLibraryStore((s) => s.favorites);
  const continueWatching = useLibraryStore((s) => s.continueWatching);

  const continueModels: MediaCardModel[] = useMemo(
    () =>
      continueWatching.map((c) => ({
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

  const wlModels: MediaCardModel[] = useMemo(
    () =>
      watchlist.map((w) => ({
        id: w.tmdbId,
        title: w.title,
        posterPath: w.posterPath,
        mediaType: w.mediaType,
      })),
    [watchlist]
  );

  const favModels: MediaCardModel[] = useMemo(
    () =>
      favorites.map((w) => ({
        id: w.tmdbId,
        title: w.title,
        posterPath: w.posterPath,
        mediaType: w.mediaType,
      })),
    [favorites]
  );

  const onPick = useCallback(
    (item: MediaCardModel) => {
      if (item.mediaType === 'tv') navigation.navigate('TvDetail', { id: item.id });
      else navigation.navigate('MovieDetail', { id: item.id });
    },
    [navigation]
  );

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ paddingTop: sectionGap * 6, paddingBottom: sectionGap * 6 }}
    >
      <Text className="text-white text-3xl font-bold px-4 mb-6">Library</Text>
      <MediaRow
        title="Continue watching"
        data={continueModels}
        posterW={posterW}
        posterH={posterH}
        onSelect={onPick}
      />
      <MediaRow title="Watchlist" data={wlModels} posterW={posterW} posterH={posterH} onSelect={onPick} />
      <MediaRow title="Favorites" data={favModels} posterW={posterW} posterH={posterH} onSelect={onPick} />
    </ScrollView>
  );
}
