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
import { CineProApi } from '@/api/cineproClient';
import { MediaRow } from '@/components/MediaRow';
import type { MediaCardModel } from '@/components/MediaCard';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useLibraryStore, mediaStorageKey } from '@/store/libraryStore';
import { FocusSurface } from '@/tv/FocusSurface';
import { tmdbImg } from '@/services/tmdbImages';
import Ionicons from '@expo/vector-icons/Ionicons';

const OVERVIEW_PREVIEW_LINES = 5;

export function MovieDetailScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'MovieDetail'>>();
  const { id } = route.params;
  const { posterW, posterH, overscanX, sectionGap, heroH } = useResponsive();
  const insets = useSafeAreaInsets();
  const [overviewExpanded, setOverviewExpanded] = useState(false);

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

  const inWatchlist = useLibraryStore((s) =>
    s.watchlist.some((w) => w.mediaType === 'movie' && w.tmdbId === id)
  );
  const inFavorites = useLibraryStore((s) =>
    s.favorites.some((w) => w.mediaType === 'movie' && w.tmdbId === id)
  );

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
  const posterUri = tmdbImg(detail.data?.poster_path, 'w500');

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
  const loading = detail.isPending;
  const runtimeLabel =
    d?.runtime != null ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m` : null;

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
                    accessibilityLabel={`Poster for ${d?.title ?? 'movie'}`}
                  />
                  <View className="flex-1 justify-center">
                    <Text className="text-white text-[22px] font-bold leading-7" numberOfLines={3}>
                      {d?.title ?? 'Untitled'}
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
                  {d?.release_date ? (
                    <View className="rounded-full bg-white/10 border border-white/12 px-3 py-1.5">
                      <Text className="text-white/90 text-xs font-semibold">{d.release_date.slice(0, 4)}</Text>
                    </View>
                  ) : null}
                  {runtimeLabel ? (
                    <View className="rounded-full bg-white/10 border border-white/12 px-3 py-1.5 flex-row items-center gap-1">
                      <Ionicons name="time-outline" color="rgba(255,255,255,0.85)" size={14} />
                      <Text className="text-white/90 text-xs font-semibold">{runtimeLabel}</Text>
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
                    <Text className="text-white/55 text-xs uppercase tracking-widest mb-2">Synopsis</Text>
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
                  <FocusSurface
                    className="rounded-2xl bg-accent py-4 flex-row items-center justify-center gap-2 shadow-lg"
                    onPress={onPlay}
                    accessibilityLabel={resumeSec ? 'Resume playback' : 'Play movie'}
                  >
                    <Ionicons name={resumeSec ? 'play-circle' : 'play'} color="#fff" size={22} />
                    <Text className="text-white font-bold text-base">{resumeSec ? 'Resume' : 'Play'}</Text>
                  </FocusSurface>

                  <View className="flex-row gap-3">
                    <FocusSurface
                      className="flex-1 rounded-2xl bg-white/10 border border-white/14 py-3.5 flex-row items-center justify-center gap-2"
                      onPress={() =>
                        d &&
                        toggleWatchlist({
                          mediaType: 'movie',
                          tmdbId: d.id,
                          title: d.title,
                          posterPath: d.poster_path,
                        })
                      }
                      accessibilityLabel="Toggle watchlist"
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
                          mediaType: 'movie',
                          tmdbId: d.id,
                          title: d.title,
                          posterPath: d.poster_path,
                        })
                      }
                      accessibilityLabel="Toggle favorites"
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

                <View className="mt-6 rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons
                      name={sources.data?.sources.length ? 'cloud-done-outline' : sources.error ? 'cloud-offline-outline' : 'cloud-outline'}
                      color="rgba(255,255,255,0.75)"
                      size={20}
                    />
                    <Text className="text-white font-semibold text-[15px]">Streaming availability</Text>
                  </View>
                  <Text className="text-white/65 text-sm leading-5">
                    {sources.isLoading
                      ? 'Connecting to your CinePro Core server…'
                      : sources.data
                        ? `${sources.data.sources.length} source${sources.data.sources.length === 1 ? '' : 's'} ready · refresh before ${new Date(sources.data.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : sources.error
                          ? 'No sources yet — check that Core is running and Settings → URL is correct.'
                          : 'No stream data.'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={{ marginTop: sectionGap * 2 }}>
          <MediaRow
            title="More like this"
            data={recModels}
            posterW={posterW}
            posterH={posterH}
            isLoading={rec.isLoading}
            onSelect={(item) => navigation.navigate('MovieDetail', { id: item.id })}
          />
        </View>
      </View>
    </ScrollView>
  );
}
