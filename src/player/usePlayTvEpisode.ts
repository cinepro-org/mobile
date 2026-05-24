import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { qk } from '@/api/queryKeys';
import type { OmssSourceResponse } from '@/api/types/omss';
import { useLibraryStore, mediaStorageKey } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { buildTvPlayerParams } from '@/player/playerEpisodeNav';
import { tvEpisodeSourcesQueryOptions } from '@/player/playbackSourceQuery';
import { resolveStreamReadyState } from '@/player/streamAvailability';
import type { TmdbEpisode } from '@/api/types/tmdb';

type ShowMeta = {
  tmdbId: number;
  seasonNumber: number;
  showTitle: string;
  posterPath?: string | null;
  backdropPath?: string | null;
};

type SourceQuerySlice = {
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  data: OmssSourceResponse | undefined;
};

function cachedEpisodeSlice(
  queryClient: ReturnType<typeof useQueryClient>,
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number
): SourceQuerySlice | undefined {
  const queryKey = qk.tvSources(tmdbId, seasonNumber, episodeNumber);
  const state = queryClient.getQueryState<OmssSourceResponse, Error>(queryKey);
  if (!state) return undefined;

  if (state.fetchStatus === 'fetching') {
    return {
      isPending: true,
      isFetching: true,
      isError: false,
      error: null,
      data: state.data,
    };
  }

  if (state.status === 'error') {
    return {
      isPending: false,
      isFetching: false,
      isError: true,
      error: state.error ?? new Error('Failed to load streams'),
      data: undefined,
    };
  }

  if (state.data) {
    return {
      isPending: false,
      isFetching: false,
      isError: false,
      error: null,
      data: state.data,
    };
  }

  return undefined;
}

export function usePlayTvEpisode({
  tmdbId,
  seasonNumber,
  episodes,
  showTitle,
  posterPath,
  backdropPath,
}: ShowMeta & {
  episodes: TmdbEpisode[];
}) {
  const navigation = useAppNavigation();
  const queryClient = useQueryClient();
  const cineproBaseUrl = useSettingsStore((s) => s.cineproBaseUrl);
  const coreConfigured = !!cineproBaseUrl.trim();
  const continueWatching = useLibraryStore((s) => s.continueWatching);
  const [activeEpisodeNumber, setActiveEpisodeNumber] = useState<number | null>(null);

  const activeSourceQuery = useQuery(
    tvEpisodeSourcesQueryOptions(
      tmdbId,
      seasonNumber,
      activeEpisodeNumber ?? 1,
      coreConfigured && activeEpisodeNumber != null
    )
  );

  const getEpisodeQuerySlice = useCallback(
    (episodeNumber: number): SourceQuerySlice | undefined => {
      if (activeEpisodeNumber === episodeNumber) {
        return activeSourceQuery;
      }
      return cachedEpisodeSlice(queryClient, tmdbId, seasonNumber, episodeNumber);
    },
    [activeEpisodeNumber, activeSourceQuery, queryClient, seasonNumber, tmdbId]
  );

  const episodeQueryByNumber = useMemo(
    () => ({
      get: getEpisodeQuerySlice,
    }),
    [getEpisodeQuerySlice]
  );

  const readyCount = useMemo(() => {
    let count = 0;
    for (const ep of episodes) {
      const slice = getEpisodeQuerySlice(ep.episode_number);
      if (slice && resolveStreamReadyState(coreConfigured, slice).status === 'ready') {
        count += 1;
      }
    }
    return count;
  }, [coreConfigured, episodes, getEpisodeQuerySlice]);

  const resumeForEp = useCallback(
    (episodeNumber: number) => {
      const key = mediaStorageKey({
        mediaType: 'tv',
        tmdbId,
        season: seasonNumber,
        episode: episodeNumber,
      });
      return continueWatching.find((c) => c.mediaKey === key)?.positionSec;
    },
    [continueWatching, seasonNumber, tmdbId]
  );

  const playEpisode = useCallback(
    async (episodeNumber: number, episodeTitle: string) => {
      setActiveEpisodeNumber(episodeNumber);

      let slice: SourceQuerySlice = {
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
        data: undefined,
      };

      if (coreConfigured) {
        const options = tvEpisodeSourcesQueryOptions(tmdbId, seasonNumber, episodeNumber, true);
        try {
          const data = await queryClient.fetchQuery(options);
          slice = { isPending: false, isFetching: false, isError: false, error: null, data };
        } catch (error) {
          slice = {
            isPending: false,
            isFetching: false,
            isError: true,
            error: error instanceof Error ? error : new Error(String(error)),
            data: undefined,
          };
        }
      }

      const streamState = resolveStreamReadyState(coreConfigured, slice);

      const go = () => {
        navigation.navigate(
          'Player',
          buildTvPlayerParams({
            tmdbId,
            seasonNumber,
            episodeNumber,
            episodeTitle,
            showTitle,
            episodes,
            posterPath,
            backdropPath,
            resumeSec: resumeForEp(episodeNumber),
          })
        );
      };

      if (streamState.status === 'ready') {
        go();
        return;
      }
      if (streamState.status === 'loading') {
        Alert.alert(streamState.title, streamState.message, [
          { text: 'Wait', style: 'cancel' },
          { text: 'Open player', onPress: go },
        ]);
        return;
      }
      Alert.alert(streamState.title, streamState.message);
    },
    [
      backdropPath,
      coreConfigured,
      episodes,
      navigation,
      posterPath,
      queryClient,
      resumeForEp,
      seasonNumber,
      showTitle,
      tmdbId,
    ]
  );

  return {
    playEpisode,
    episodeQueryByNumber,
    readyCount,
    coreConfigured,
    activeEpisodeNumber,
  };
}
