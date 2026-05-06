import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const OVERVIEW_PREVIEW_LINES = 5;

export function TvDetailScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'TvDetail'>>();
  const { id } = route.params;
  const { posterW, posterH, overscanX, sectionGap, heroH } = useResponsive();
  const insets = useSafeAreaInsets();
  const [overviewExpanded, setOverviewExpanded] = useState(false);

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

  const inWatchlist = useLibraryStore((s) =>
    s.watchlist.some((w) => w.mediaType === 'tv' && w.tmdbId === id)
  );
  const inFavorites = useLibraryStore((s) =>
    s.favorites.some((w) => w.mediaType === 'tv' && w.tmdbId === id)
  );

  const seasons = detail.data?.seasons ?? [];

  const playableSeasons = useMemo(
    () => seasons.filter((s) => s.season_number >= 0),
    [seasons]
  );

  const defaultSeason = useMemo(() => {
    const byOne = playableSeasons.find((s) => s.season_number === 1);
    return byOne ?? playableSeasons[0];
  }, [playableSeasons]);

  const runtimes = detail.data?.episode_run_time?.filter((n) => n > 0) ?? [];
  const avgRuntime =
    runtimes.length > 0 ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length) : null;

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
  const posterUri = tmdbImg(detail.data?.poster_path, 'w500');
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

  const openDefaultSeason = useCallback(() => {
    if (defaultSeason) openSeason(defaultSeason);
  }, [defaultSeason, openSeason]);

  const loading = detail.isPending;

  const toggleOverview = () => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOverviewExpanded((v) => !v);
  };

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ paddingBottom: sectionGap * 10 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="relative w-full" style={{ height: heroH }}>
        <Image
          source={backdropUri ? { uri: backdropUri } : undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={['rgba(7,8,13,0.15)', 'rgba(7,8,13,0.55)', '#07080d']}
          locations={[0, 0.55, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <View
          style={{
            position: 'absolute',
            left: overscanX,
            right: overscanX,
            top: insets.top + 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <FocusSurface
            className="rounded-full bg-black/55 border border-white/18 px-3 py-2.5"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" color="#fff" size={24} />
          </FocusSurface>
        </View>
      </View>

      <View style={{ paddingHorizontal: Math.max(overscanX, 16), marginTop: -72 }}>
        <View className="rounded-3xl border border-white/12 bg-[#12131c] overflow-hidden shadow-2xl">
          <LinearGradient
            colors={['rgba(229,9,20,0.08)', 'transparent']}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120 }}
          />

          <View className="p-5">
            {loading ? (
              <View className="gap-4 py-2">
                <View className="flex-row gap-4">
                  <View className="w-[118px] rounded-2xl bg-white/10 aspect-[2/3]" />
                  <View className="flex-1 gap-2 justify-center">
                    <View className="h-6 rounded-lg bg-white/10 w-[90%]" />
                    <View className="h-4 rounded-lg bg-white/10 w-[40%]" />
                  </View>
                </View>
                <ActivityIndicator color="#e50914" style={{ marginTop: 16 }} />
              </View>
            ) : (
              <>
                <View className="flex-row gap-4">
                  <Image
                    source={posterUri ? { uri: posterUri } : undefined}
                    style={{ width: 118, aspectRatio: 2 / 3, borderRadius: 16 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    accessibilityLabel={`Poster for ${d?.name ?? 'series'}`}
                  />
                  <View className="flex-1 justify-center">
                    <Text className="text-white text-[22px] font-bold leading-7" numberOfLines={3}>
                      {d?.name ?? 'Series'}
                    </Text>
                    {d?.tagline ? (
                      <Text className="text-white/45 text-sm italic mt-2" numberOfLines={2}>
                        {d.tagline}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mt-4 -mx-1"
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
                >
                  {d?.first_air_date ? (
                    <View className="rounded-full bg-white/10 border border-white/12 px-3 py-1.5">
                      <Text className="text-white/90 text-xs font-semibold">
                        Since {d.first_air_date.slice(0, 4)}
                      </Text>
                    </View>
                  ) : null}
                  {d?.number_of_seasons != null ? (
                    <View className="rounded-full bg-white/10 border border-white/12 px-3 py-1.5 flex-row items-center gap-1">
                      <Ionicons name="albums-outline" color="rgba(255,255,255,0.85)" size={14} />
                      <Text className="text-white/90 text-xs font-semibold">
                        {d.number_of_seasons} season{d.number_of_seasons === 1 ? '' : 's'}
                      </Text>
                    </View>
                  ) : null}
                  {avgRuntime != null ? (
                    <View className="rounded-full bg-white/10 border border-white/12 px-3 py-1.5 flex-row items-center gap-1">
                      <Ionicons name="time-outline" color="rgba(255,255,255,0.85)" size={14} />
                      <Text className="text-white/90 text-xs font-semibold">~{avgRuntime} min / ep</Text>
                    </View>
                  ) : null}
                  {d?.vote_average != null ? (
                    <View className="rounded-full bg-white/10 border border-white/12 px-3 py-1.5 flex-row items-center gap-1">
                      <Ionicons name="star" color="#f5c518" size={14} />
                      <Text className="text-white/90 text-xs font-semibold">{d.vote_average.toFixed(1)} TMDB</Text>
                    </View>
                  ) : null}
                  {(d?.genres ?? []).map((g) => (
                    <View key={g.id} className="rounded-full bg-accent/20 border border-accent/35 px-3 py-1.5">
                      <Text className="text-white text-xs font-medium">{g.name}</Text>
                    </View>
                  ))}
                </ScrollView>

                {d?.overview ? (
                  <View className="mt-5">
                    <Text className="text-white/55 text-xs uppercase tracking-widest mb-2">About</Text>
                    <Text
                      className="text-white/85 text-[15px] leading-6"
                      numberOfLines={overviewExpanded ? undefined : OVERVIEW_PREVIEW_LINES}
                    >
                      {d.overview}
                    </Text>
                    {(d.overview?.length ?? 0) > 220 ? (
                      <FocusSurface className="self-start mt-2 py-1" onPress={toggleOverview}>
                        <Text className="text-accent text-sm font-semibold">
                          {overviewExpanded ? 'Show less' : 'Read more'}
                        </Text>
                      </FocusSurface>
                    ) : null}
                  </View>
                ) : null}

                <View className="mt-6 gap-3">
                  {defaultSeason ? (
                    <FocusSurface
                      className="rounded-2xl bg-accent py-4 flex-row items-center justify-center gap-2 shadow-lg"
                      onPress={openDefaultSeason}
                      accessibilityLabel="Browse episodes"
                    >
                      <Ionicons name="list-circle-outline" color="#fff" size={24} />
                      <Text className="text-white font-bold text-base">
                        Episodes · {defaultSeason.name}
                      </Text>
                    </FocusSurface>
                  ) : (
                    <View className="rounded-2xl bg-white/8 border border-white/12 py-4 px-4">
                      <Text className="text-white/70 text-center text-sm">
                        Season list isn’t available yet. Try again when you’re online.
                      </Text>
                    </View>
                  )}

                  <View className="flex-row gap-3">
                    <FocusSurface
                      className="flex-1 rounded-2xl bg-white/10 border border-white/14 py-3.5 flex-row items-center justify-center gap-2"
                      onPress={() =>
                        d &&
                        toggleWatchlist({
                          mediaType: 'tv',
                          tmdbId: d.id,
                          title: d.name,
                          posterPath: d.poster_path,
                        })
                      }
                    >
                      <Ionicons
                        name={inWatchlist ? 'bookmark' : 'bookmark-outline'}
                        color="#fff"
                        size={20}
                      />
                      <Text className="text-white font-semibold text-sm">Watchlist</Text>
                    </FocusSurface>
                    <FocusSurface
                      className="flex-1 rounded-2xl bg-white/10 border border-white/14 py-3.5 flex-row items-center justify-center gap-2"
                      onPress={() =>
                        d &&
                        toggleFavorite({
                          mediaType: 'tv',
                          tmdbId: d.id,
                          title: d.name,
                          posterPath: d.poster_path,
                        })
                      }
                    >
                      <Ionicons
                        name={inFavorites ? 'heart' : 'heart-outline'}
                        color={inFavorites ? '#ff5c66' : '#fff'}
                        size={20}
                      />
                      <Text className="text-white font-semibold text-sm">Favorite</Text>
                    </FocusSurface>
                  </View>
                </View>

                <Text className="text-white/55 text-xs uppercase tracking-widest mt-8 mb-3">Seasons</Text>
                {playableSeasons.length === 0 ? (
                  <Text className="text-white/45 text-sm mb-1">No seasons to show.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {playableSeasons.map((item) => {
                      const art = tmdbImg(item.poster_path ?? d?.poster_path, 'w342');
                      return (
                        <FocusSurface
                          key={item.id}
                          className="w-[132px] rounded-2xl overflow-hidden bg-white/8 border border-white/12"
                          onPress={() => openSeason(item)}
                          accessibilityLabel={`${item.name}, ${item.episode_count} episodes`}
                        >
                          <Image
                            source={art ? { uri: art } : undefined}
                            style={{ width: '100%', aspectRatio: 16 / 9 }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                          <View className="p-3 gap-1">
                            <Text className="text-white font-bold text-sm" numberOfLines={2}>
                              {item.name}
                            </Text>
                            <Text className="text-white/50 text-xs">
                              {item.episode_count} episode{item.episode_count === 1 ? '' : 's'}
                            </Text>
                          </View>
                        </FocusSurface>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>

        <View style={{ marginTop: sectionGap * 2 }}>
          <MediaRow
            title="Similar series"
            data={recModels}
            posterW={posterW}
            posterH={posterH}
            isLoading={rec.isLoading}
            onSelect={(item) => navigation.navigate('TvDetail', { id: item.id })}
          />
        </View>
      </View>
    </ScrollView>
  );
}
