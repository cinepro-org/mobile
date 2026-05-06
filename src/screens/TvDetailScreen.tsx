import React, { useCallback, useMemo } from 'react';
import { ImageBackground, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { qk } from '@/api/queryKeys';
import { TmdbApi } from '@/api/tmdbClient';
import { MediaRow } from '@/components/MediaRow';
import type { MediaCardModel } from '@/components/MediaCard';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useLibraryStore } from '@/store/libraryStore';
import { FocusSurface } from '@/tv/FocusSurface';
import { tmdbImg } from '@/services/tmdbImages';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { TmdbSeasonSummary } from '@/api/types/tmdb';

export function TvDetailScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'TvDetail'>>();
  const { id } = route.params;
  const { posterW, posterH, overscanX, sectionGap } = useResponsive();

  const detail = useQuery({
    queryKey: qk.tvDetail(id),
    queryFn: () => TmdbApi.tvDetail(id),
  });

  const rec = useQuery({
    queryKey: qk.recTv(id, 1),
    queryFn: () => TmdbApi.recommendationsTv(id, 1),
    enabled: !!detail.data,
  });

  const toggleWatchlist = useLibraryStore((s) => s.toggleWatchlist);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  const seasons = detail.data?.seasons ?? [];

  const playableSeasons = useMemo(
    () => seasons.filter((s) => s.season_number >= 0),
    [seasons]
  );

  const recModels: MediaCardModel[] = useMemo(
    () =>
      (rec.data?.results ?? []).map((m) => ({
        id: m.id,
        title: m.name,
        posterPath: m.poster_path,
        backdropPath: m.backdrop_path,
        subtitle: m.first_air_date?.slice(0, 4),
        mediaType: 'tv' as const,
      })),
    [rec.data?.results]
  );

  const backdropUri = tmdbImg(detail.data?.backdrop_path ?? detail.data?.poster_path, 'w1280');
  const d = detail.data;

  const openSeason = useCallback(
    (season: TmdbSeasonSummary) => {
      navigation.navigate('EpisodeBrowser', {
        id,
        seasonNumber: season.season_number,
        title: `${d?.name ?? 'Show'} · ${season.name}`,
      });
    },
    [d?.name, id, navigation]
  );

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
            <Text className="text-white text-4xl font-bold">{d?.name ?? '…'}</Text>
            <Text className="text-white/60 mt-2">
              {d?.first_air_date?.slice(0, 4)} · {d?.number_of_seasons ?? playableSeasons.length} seasons · ★{' '}
              {d?.vote_average?.toFixed(1)}
            </Text>
            <Text className="text-white/80 mt-4 leading-6">{d?.overview}</Text>

            <View className="flex-row flex-wrap gap-3 mt-6">
              {d ? (
                <>
                  <FocusSurface
                    className="rounded-xl bg-white/10 border border-white/15 px-5 py-3"
                    onPress={() =>
                      toggleWatchlist({
                        mediaType: 'tv',
                        tmdbId: d.id,
                        title: d.name,
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
                        mediaType: 'tv',
                        tmdbId: d.id,
                        title: d.name,
                        posterPath: d.poster_path,
                      })
                    }
                  >
                    <Text className="text-white font-semibold">Favorite</Text>
                  </FocusSurface>
                </>
              ) : null}
            </View>

            <Text className="text-white text-lg font-semibold mt-8 mb-3">Seasons</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {playableSeasons.map((item) => (
                <FocusSurface
                  key={item.id}
                  className="mr-3 rounded-full bg-white/10 border border-white/15 px-4 py-3"
                  onPress={() => openSeason(item)}
                  accessibilityLabel={`Open ${item.name}`}
                >
                  <Text className="text-white font-semibold">{item.name}</Text>
                </FocusSurface>
              ))}
            </ScrollView>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={{ paddingTop: sectionGap * 2 }}>
        <MediaRow
          title="Because you opened this series"
          data={recModels}
          posterW={posterW}
          posterH={posterH}
          isLoading={rec.isLoading}
          onSelect={(item) => navigation.navigate('TvDetail', { id: item.id })}
        />
      </View>
    </ScrollView>
  );
}
