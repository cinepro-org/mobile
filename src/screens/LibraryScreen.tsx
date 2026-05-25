import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { MediaRow } from '@/components/MediaRow';
import type { MediaCardModel } from '@/components/MediaCard';
import { useResponsive } from '@/hooks/useResponsive';
import { useTV } from '@/hooks/useTV';
import { useTVContentFocusLink } from '@/tv/useTVContentFocusLink';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useLibraryStore } from '@/store/libraryStore';
import { ThemedScreen, ThemedText } from '@/theme/themedPrimitives';
import { useAppTheme } from '@/theme/AppThemeProvider';

export function LibraryScreen() {
  const navigation = useAppNavigation();
  const { colors } = useAppTheme();
  const { posterW, posterH, sectionGap } = useResponsive();
  const isTV = useTV();
  const { contentFocusRef, nextFocusLeft } = useTVContentFocusLink();
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
      style={{ flex: 1, backgroundColor: colors.ink }}
      contentContainerStyle={{ paddingTop: sectionGap * 6, paddingBottom: sectionGap * 6 }}
    >
      <ThemedText variant="title" className="text-3xl px-4 mb-6">
        Library
      </ThemedText>
      <MediaRow
        title="Continue watching"
        data={continueModels}
        posterW={posterW}
        posterH={posterH}
        onSelect={onPick}
        preferFirstFocus={isTV && continueModels.length > 0}
        contentFocusRef={isTV && continueModels.length > 0 ? contentFocusRef : undefined}
        nextFocusLeft={isTV ? nextFocusLeft : undefined}
      />
      <MediaRow
        title="Watchlist"
        data={wlModels}
        posterW={posterW}
        posterH={posterH}
        onSelect={onPick}
        preferFirstFocus={isTV && continueModels.length === 0 && wlModels.length > 0}
        contentFocusRef={
          isTV && continueModels.length === 0 && wlModels.length > 0 ? contentFocusRef : undefined
        }
        nextFocusLeft={isTV ? nextFocusLeft : undefined}
      />
      <MediaRow
        title="Favorites"
        data={favModels}
        posterW={posterW}
        posterH={posterH}
        onSelect={onPick}
        preferFirstFocus={
          isTV && continueModels.length === 0 && wlModels.length === 0 && favModels.length > 0
        }
        contentFocusRef={
          isTV && continueModels.length === 0 && wlModels.length === 0 && favModels.length > 0
            ? contentFocusRef
            : undefined
        }
        nextFocusLeft={isTV ? nextFocusLeft : undefined}
      />
    </ScrollView>
  );
}
