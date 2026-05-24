import type { UseQueryOptions } from '@tanstack/react-query';
import { CineProApi } from '@/api/cineproClient';
import { qk } from '@/api/queryKeys';
import type { OmssSourceResponse } from '@/api/types/omss';
import { OmssHttpError } from '@/api/types/omss';

/** Keep manifests warm while browsing detail / player (episode lists fetch on tap). */
export const PLAYBACK_SOURCE_STALE_MS = 90_000;

export function playbackSourceRetry(count: number, err: Error): boolean {
  const status = err instanceof OmssHttpError ? err.status : undefined;
  if (status === 404) return false;
  return count < 2;
}

export function movieSourcesQueryOptions(
  tmdbId: number,
  enabled: boolean
): UseQueryOptions<OmssSourceResponse, Error> {
  return {
    queryKey: qk.movieSources(tmdbId),
    queryFn: () => CineProApi.movieSources(tmdbId),
    enabled,
    retry: playbackSourceRetry,
    staleTime: PLAYBACK_SOURCE_STALE_MS,
  };
}

export function tvEpisodeSourcesQueryOptions(
  tmdbShowId: number,
  season: number,
  episode: number,
  enabled: boolean
): UseQueryOptions<OmssSourceResponse, Error> {
  return {
    queryKey: qk.tvSources(tmdbShowId, season, episode),
    queryFn: () =>
      CineProApi.tvEpisodeSources({
        tmdbShowId,
        season,
        episode,
      }),
    enabled,
    retry: playbackSourceRetry,
    staleTime: PLAYBACK_SOURCE_STALE_MS,
  };
}
