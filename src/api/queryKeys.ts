export const qk = {
  health: ['omss', 'health'] as const,
  movieSources: (id: number | string) => ['omss', 'movie', String(id)] as const,
  tvSources: (id: number | string, s: number, e: number) =>
    ['omss', 'tv', String(id), s, e] as const,
  trendingMovies: (page: number) => ['tmdb', 'trendingMovies', page] as const,
  trendingTv: (page: number) => ['tmdb', 'trendingTv', page] as const,
  discoverMovies: (page: number, genre?: number) =>
    ['tmdb', 'discoverMovies', page, genre ?? 'all'] as const,
  discoverTv: (page: number, genre?: number) =>
    ['tmdb', 'discoverTv', page, genre ?? 'all'] as const,
  searchMulti: (query: string, page: number) => ['tmdb', 'search', query, page] as const,
  movieDetail: (id: number) => ['tmdb', 'movie', id] as const,
  tvDetail: (id: number) => ['tmdb', 'tv', id] as const,
  tvSeason: (id: number, season: number) => ['tmdb', 'tvSeason', id, season] as const,
  genresMovie: ['tmdb', 'genres', 'movie'] as const,
  genresTv: ['tmdb', 'genres', 'tv'] as const,
  recMovies: (id: number, page: number) => ['tmdb', 'recMovies', id, page] as const,
  recTv: (id: number, page: number) => ['tmdb', 'recTv', id, page] as const,
};
