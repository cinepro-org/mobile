import { TMDB_API_BASE, TMDB_API_KEY } from '@/utils/env';
import { sleep } from '@/utils/sleep';
import type {
  TmdbGenre,
  TmdbMovieDetail,
  TmdbMovieListResult,
  TmdbMultiSearchResult,
  TmdbPaged,
  TmdbSeasonDetail,
  TmdbSeasonSummary,
  TmdbTvDetail,
  TmdbTvListResult,
} from '@/api/types/tmdb';

export class TmdbHttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'TmdbHttpError';
    this.status = status;
  }
}

function ensureKey(): string {
  if (!TMDB_API_KEY) {
    throw new TmdbHttpError('Missing EXPO_PUBLIC_TMDB_API_KEY', 401);
  }
  return TMDB_API_KEY;
}

async function tmdbGet<T>(path: string, params?: Record<string, string | number | undefined>) {
  ensureKey();
  const qs = new URLSearchParams({ api_key: TMDB_API_KEY });
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      qs.set(k, String(v));
    }
  }
  const url = `${TMDB_API_BASE}${path}?${qs.toString()}`;
  let lastErr: unknown;
  const retries = 2;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status >= 500 && attempt < retries) {
        await sleep(200 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        throw new TmdbHttpError(`TMDB error (${res.status})`, res.status);
      }
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (e instanceof TmdbHttpError && e.status !== 429) throw e;
      if (attempt === retries) throw e;
      await sleep(220 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('TMDB failure');
}

export const TmdbApi = {
  trendingMovies(page = 1) {
    return tmdbGet<TmdbPaged<TmdbMovieListResult>>('/trending/movie/week', { page });
  },

  trendingTv(page = 1) {
    return tmdbGet<TmdbPaged<TmdbTvListResult>>('/trending/tv/week', { page });
  },

  movieNowPlaying(page = 1) {
    return tmdbGet<TmdbPaged<TmdbMovieListResult>>('/movie/now_playing', { page });
  },

  movieUpcoming(page = 1) {
    return tmdbGet<TmdbPaged<TmdbMovieListResult>>('/movie/upcoming', { page });
  },

  discoverMovies(params: { page?: number; genreId?: number }) {
    return tmdbGet<TmdbPaged<TmdbMovieListResult>>('/discover/movie', {
      page: params.page ?? 1,
      with_genres: params.genreId,
      sort_by: 'popularity.desc',
    });
  },

  discoverTv(params: { page?: number; genreId?: number }) {
    return tmdbGet<TmdbPaged<TmdbTvListResult>>('/discover/tv', {
      page: params.page ?? 1,
      with_genres: params.genreId,
      sort_by: 'popularity.desc',
    });
  },

  searchMulti(query: string, page = 1) {
    return tmdbGet<TmdbPaged<TmdbMultiSearchResult>>('/search/multi', {
      query,
      page,
    });
  },

  movieDetail(id: number) {
    return tmdbGet<TmdbMovieDetail>(`/movie/${id}`);
  },

  tvDetail(id: number) {
    return tmdbGet<TmdbTvDetail>(`/tv/${id}`);
  },

  tvSeason(tvId: number, seasonNumber: number) {
    return tmdbGet<TmdbSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
  },

  async tvSeasonsMeta(tvId: number): Promise<TmdbSeasonSummary[]> {
    const detail = await tmdbGet<TmdbTvDetail>(`/tv/${tvId}`);
    return detail.seasons ?? [];
  },

  movieGenres(): Promise<{ genres: TmdbGenre[] }> {
    return tmdbGet<{ genres: TmdbGenre[] }>('/genre/movie/list');
  },

  tvGenres(): Promise<{ genres: TmdbGenre[] }> {
    return tmdbGet<{ genres: TmdbGenre[] }>('/genre/tv/list');
  },

  recommendationsMovies(id: number, page = 1) {
    return tmdbGet<TmdbPaged<TmdbMovieListResult>>(`/movie/${id}/recommendations`, { page });
  },

  recommendationsTv(id: number, page = 1) {
    return tmdbGet<TmdbPaged<TmdbTvListResult>>(`/tv/${id}/recommendations`, { page });
  },

  similarMovies(id: number, page = 1) {
    return tmdbGet<TmdbPaged<TmdbMovieListResult>>(`/movie/${id}/similar`, { page });
  },

  similarTv(id: number, page = 1) {
    return tmdbGet<TmdbPaged<TmdbTvListResult>>(`/tv/${id}/similar`, { page });
  },
};
