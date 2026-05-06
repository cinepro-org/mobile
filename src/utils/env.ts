function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export const CINEPRO_BASE_URL = stripTrailingSlash(
  process.env.EXPO_PUBLIC_CINEPRO_BASE_URL ?? 'http://localhost:3000'
);

export const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';

export const TMDB_API_BASE = 'https://api.themoviedb.org/3';

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
