export type TmdbPosterEntity = {
  id: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number;
};

export type TmdbMovieListResult = TmdbPosterEntity & {
  title: string;
  release_date?: string;
};

export type TmdbTvListResult = TmdbPosterEntity & {
  name: string;
  first_air_date?: string;
};

export type TmdbPaged<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbMovieDetail = TmdbMovieListResult & {
  genres?: TmdbGenre[];
  runtime?: number;
  tagline?: string;
  imdb_id?: string | null;
};

export type TmdbTvDetail = TmdbTvListResult & {
  genres?: TmdbGenre[];
  number_of_seasons?: number;
  episode_run_time?: number[];
  tagline?: string;
  seasons?: TmdbSeasonSummary[];
};

export type TmdbSeasonSummary = {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path?: string | null;
};

export type TmdbEpisode = {
  id: number;
  name: string;
  overview?: string;
  still_path?: string | null;
  episode_number: number;
  season_number: number;
  runtime?: number | null;
};

export type TmdbSeasonDetail = {
  id: number;
  name: string;
  season_number: number;
  episodes: TmdbEpisode[];
};

export type TmdbMultiSearchResult =
  | ({ media_type: 'movie' } & TmdbMovieListResult)
  | ({ media_type: 'tv' } & TmdbTvListResult);
