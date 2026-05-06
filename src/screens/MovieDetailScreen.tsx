import React, { useCallback, useMemo } from 'react';
import { ImageBackground, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { qk } from '@/api/queryKeys';
import { TmdbApi } from '@/api/tmdbClient';
import { CineProApi } from '@/api/cineproClient';
import { MediaRow } from '@/components/MediaRow';
import type { MediaCardModel } from '@/components/MediaCard';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useLibraryStore, mediaStorageKey } from '@/store/libraryStore';
import { FocusSurface } from '@/tv/FocusSurface';
import { tmdbImg } from '@/services/tmdbImages';
import Ionicons from '@expo/vector-icons/Ionicons';

export function MovieDetailScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'MovieDetail'>>();
  const { id } = route.params;
  const { posterW, posterH, overscanX, sectionGap } = useResponsive();

  const detail = useQuery({
    queryKey: qk.movieDetail(id),
    queryFn: () => TmdbApi.movieDetail(id),
  });

  const sources = useQuery({
    queryKey: qk.movieSources(id),
    queryFn: () => CineProApi.movieSources(id),
    retry: (count, err: unknown) => {
      const status =
        typeof err === 'object' && err && 'status' in err ? (err as { status?: number }).status : undefined;
      if (status === 404) return false;
      return count < 2;
    },
  });

  const rec = useQuery({
    queryKey: qk.recMovies(id, 1),
    queryFn: () => TmdbApi.recommendationsMovies(id, 1),
    enabled: !!detail.data,
  });

  const toggleWatchlist = useLibraryStore((s) => s.toggleWatchlist);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const continueWatching = useLibraryStore((s) => s.continueWatching);

  const resumeSec = useMemo(() => {
    const key = mediaStorageKey({ mediaType: 'movie', tmdbId: id });
    return continueWatching.find((c) => c.mediaKey === key)?.positionSec;
  }, [continueWatching, id]);

  const onPlay = useCallback(() => {
    const d = detail.data;
    if (!d) return;
    navigation.navigate('Player', {
      title: d.title,
      mediaType: 'movie',
      tmdbId: id,
      posterPath: d.poster_path,
      backdropPath: d.backdrop_path,
      resumeSec,
    });
  }, [detail.data, id, navigation, resumeSec]);

  const backdropUri = tmdbImg(detail.data?.backdrop_path ?? detail.data?.poster_path, 'w1280');

  const recModels: MediaCardModel[] = useMemo(
    () =>
      (rec.data?.results ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path,
        backdropPath: m.backdrop_path,
        subtitle: m.release_date?.slice(0, 4),
        mediaType: 'movie' as const,
      })),
    [rec.data?.results]
  );

  const d = detail.data;

  return (
    <ScrollView className="flex-1 bg-ink" contentContainerStyle={{ paddingBottom: sectionGap * 8 }}>
      <ImageBackground
        source={backdropUri ? { uri: backdropUri } : undefined}
        style={{ minHeight: 380 }}
        resizeMode="cover"
      >
        <LinearGradient colors={['rgba(7,8,13,0.25)', '#07080d']} style={{ flex: 1 }}>
          <View style={{ paddingTop: sectionGap * 4, paddingHorizontal: overscanX }} className="flex-row">
            <FocusSurface
              className="rounded-full bg-black/45 border border-white/15 px-3 py-2 mr-auto"
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" color="#fff" size={22} />
            </FocusSurface>
          </View>
          <View style={{ paddingHorizontal: overscanX }} className="mt-10">
            <Text className="text-white text-4xl font-bold">{d?.title ?? '…'}</Text>
            <Text className="text-white/60 mt-2">{d?.release_date?.slice(0, 4)} · ★ {d?.vote_average?.toFixed(1)}</Text>
            <Text className="text-white/80 mt-4 leading-6">{d?.overview}</Text>

            <View className="flex-row flex-wrap gap-3 mt-6">
              <FocusSurface
                className="rounded-xl bg-accent px-6 py-3"
                onPress={onPlay}
                accessibilityLabel="Play movie"
              >
                <Text className="text-white font-bold text-base">Play</Text>
              </FocusSurface>
              {d ? (
                <>
                  <FocusSurface
                    className="rounded-xl bg-white/10 border border-white/15 px-5 py-3"
                    onPress={() =>
                      toggleWatchlist({
                        mediaType: 'movie',
                        tmdbId: d.id,
                        title: d.title,
                        posterPath: d.poster_path,
                      })
                    }
                  >
                    <Text className="text-white font-semibold">Watchlist</Text>
                  </FocusSurface>
                  <FocusSurface
                    className="rounded-xl bg-white/10 border border-white/15 px-5 py-3"
                    onPress={() =>
                      toggleFavorite({
                        mediaType: 'movie',
                        tmdbId: d.id,
                        title: d.title,
                        posterPath: d.poster_path,
                      })
                    }
                  >
                    <Text className="text-white font-semibold">Favorite</Text>
                  </FocusSurface>
                </>
              ) : null}
            </View>

            <View className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4">
              <Text className="text-white font-semibold mb-1">OMSS sources</Text>
              <Text className="text-white/60 text-sm">
                {sources.isLoading
                  ? 'Loading streaming sources from CinePro Core…'
                  : sources.data
                    ? `${sources.data.sources.length} sources · expires ${new Date(sources.data.expiresAt).toLocaleString()}`
                    : sources.error
                      ? 'No sources / Core unreachable — check Settings URL.'
                      : 'No data'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={{ paddingTop: sectionGap * 2 }}>
        <MediaRow
          title="Related picks"
          data={recModels}
          posterW={posterW}
          posterH={posterH}
          isLoading={rec.isLoading}
          onSelect={(item) => navigation.navigate('MovieDetail', { id: item.id })}
        />
      </View>
    </ScrollView>
  );
}
