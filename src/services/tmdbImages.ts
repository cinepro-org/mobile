import { TMDB_IMAGE_BASE } from '@/utils/env';

export type TmdbImageSize = 'w342' | 'w500' | 'w780' | 'w1280' | 'original';

export function tmdbImg(path: string | null | undefined, size: TmdbImageSize = 'w500'): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
