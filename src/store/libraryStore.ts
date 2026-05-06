import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ContinuePlayback = {
  mediaKey: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  positionSec: number;
  durationSec: number;
  updatedAt: number;
  introSkipEndSec?: number | null;
};

export type LibraryTitle = {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  posterPath?: string | null;
};

type LibraryState = {
  watchlist: LibraryTitle[];
  favorites: LibraryTitle[];
  continueWatching: ContinuePlayback[];
  upsertContinue: (item: ContinuePlayback) => void;
  removeContinue: (mediaKey: string) => void;
  toggleWatchlist: (item: LibraryTitle) => void;
  toggleFavorite: (item: LibraryTitle) => void;
  setIntroSkipEnd: (mediaKey: string, endSec: number | null) => void;
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      watchlist: [],
      favorites: [],
      continueWatching: [],

      upsertContinue: (item) =>
        set((s) => {
          const rest = s.continueWatching.filter((c) => c.mediaKey !== item.mediaKey);
          return { continueWatching: [item, ...rest].slice(0, 48) };
        }),

      removeContinue: (mediaKey) =>
        set((s) => ({
          continueWatching: s.continueWatching.filter((c) => c.mediaKey !== mediaKey),
        })),

      toggleWatchlist: (item) =>
        set((s) => {
          const exists = s.watchlist.some(
            (w) => w.mediaType === item.mediaType && w.tmdbId === item.tmdbId
          );
          return {
            watchlist: exists
              ? s.watchlist.filter((w) => !(w.mediaType === item.mediaType && w.tmdbId === item.tmdbId))
              : [{ ...item }, ...s.watchlist],
          };
        }),

      toggleFavorite: (item) =>
        set((s) => {
          const exists = s.favorites.some(
            (w) => w.mediaType === item.mediaType && w.tmdbId === item.tmdbId
          );
          return {
            favorites: exists
              ? s.favorites.filter((w) => !(w.mediaType === item.mediaType && w.tmdbId === item.tmdbId))
              : [{ ...item }, ...s.favorites],
          };
        }),

      setIntroSkipEnd: (mediaKey, endSec) =>
        set((s) => ({
          continueWatching: s.continueWatching.map((c) =>
            c.mediaKey === mediaKey ? { ...c, introSkipEndSec: endSec } : c
          ),
        })),
    }),
    {
      name: 'cinestream-library',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        watchlist: state.watchlist,
        favorites: state.favorites,
        continueWatching: state.continueWatching,
      }),
    }
  )
);

export function mediaStorageKey(input: {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
}): string {
  if (input.mediaType === 'movie') return `movie:${input.tmdbId}`;
  return `tv:${input.tmdbId}:${input.season ?? 1}:${input.episode ?? 1}`;
}
