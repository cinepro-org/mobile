export type RootStackParamList = {
  Main: undefined;
  MovieDetail: { id: number };
  TvDetail: { id: number };
  EpisodeBrowser: { id: number; seasonNumber: number; title?: string };
  Genre: { genreId: number; genreName: string; mediaType: 'movie' | 'tv' };
  Player: PlayerRouteParams;
};

export type PlayerRouteParams = {
  title: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  resumeSec?: number;
  next?: {
    mediaType: 'tv';
    tmdbId: number;
    season: number;
    episode: number;
    episodeTitle?: string;
    showTitle?: string;
    posterPath?: string | null;
    backdropPath?: string | null;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
  Settings: undefined;
};
