import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, Platform, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { qk } from '@/api/queryKeys';
import { TmdbApi } from '@/api/tmdbClient';
import { movieSourcesQueryOptions } from '@/player/playbackSourceQuery';
import {
  resolveStreamReadyState,
  streamAvailabilityDetailLine,
} from '@/player/streamAvailability';
import { MediaRow } from '@/components/MediaRow';
import type { MediaCardModel } from '@/components/MediaCard';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useLibraryStore, mediaStorageKey } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useHasConfiguredTmdbKey } from '@/utils/tmdbCredentials';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAndroidTVBack } from '@/hooks/useAndroidTVBack';
import { useTV } from '@/hooks/useTV';
import { tmdbImg } from '@/services/tmdbImages';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { DetailBackdropHero } from '@/components/DetailBackdropHero';
import { TVDetailLayout } from '@/tv/TVDetailLayout';
import { TVMediaRow } from '@/tv/TVMediaRow';
import Ionicons from '@expo/vector-icons/Ionicons';

const OVERVIEW_PREVIEW_LINES = 5;

export function MovieDetailScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'MovieDetail'>>();
  const { id } = route.params;
  const { posterW, posterH, overscanX, sectionGap, heroH, landscapeW, landscapeH } = useResponsive();
  const { colors, isDark } = useAppTheme();
  const ts = useThemedStyles();
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const isTV = useTV();
  const cineproBaseUrl = useSettingsStore((s) => s.cineproBaseUrl);
  const hasTmdb = useHasConfiguredTmdbKey();

  const detail = useQuery({
    queryKey: qk.movieDetail(id),
    queryFn: () => TmdbApi.movieDetail(id),
    enabled: hasTmdb,
  });

  const coreConfigured = !!cineproBaseUrl.trim();
  const sources = useQuery(movieSourcesQueryOptions(id, coreConfigured));
  const streamState = useMemo(
    () => resolveStreamReadyState(coreConfigured, sources),
    [coreConfigured, sources.data, sources.error, sources.isError, sources.isFetching, sources.isPending]
  );

  const rec = useQuery({
    queryKey: qk.recMovies(id, 1),
    queryFn: () => TmdbApi.recommendationsMovies(id, 1),
    enabled: !!detail.data && hasTmdb,
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

  const openPlayer = useCallback(() => {
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

  const onPlay = useCallback(() => {
    if (!detail.data) return;
    if (streamState.status === 'ready') {
      openPlayer();
      return;
    }
    if (streamState.status === 'loading') {
      Alert.alert(streamState.title, streamState.message, [
        { text: 'Wait', style: 'cancel' },
        { text: 'Open player', onPress: openPlayer },
      ]);
      return;
    }
    Alert.alert(streamState.title, streamState.message);
  }, [detail.data, openPlayer, streamState]);

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

  const hp = Math.max(overscanX, 16);

  useAndroidTVBack(() => {
    navigation.goBack();
    return true;
  });

  if (isTV) {
    const metaChips = [
      ...(d?.release_date ? [{ key: 'year', label: d.release_date.slice(0, 4) }] : []),
      ...(runtimeLabel ? [{ key: 'runtime', label: runtimeLabel, icon: 'time-outline' as const }] : []),
      ...(d?.vote_average != null
        ? [{ key: 'rating', label: `${d.vote_average.toFixed(1)} TMDB`, icon: 'star' as const }]
        : []),
      ...(d?.genres ?? []).map((g) => ({ key: `genre-${g.id}`, label: g.name })),
    ];

    return (
      <TVDetailLayout
        backdropUri={backdropUri}
        title={d?.title ?? 'Untitled'}
        tagline={d?.tagline}
        overview={d?.overview}
        metaChips={metaChips}
        loading={loading}
        onBack={() => navigation.goBack()}
        primaryAction={{
          key: 'play',
          label:
            streamState.status === 'loading' ? 'Loading streams…' : resumeSec ? 'Resume' : 'Play',
          icon: resumeSec ? 'play-circle' : 'play',
          onPress: onPlay,
          hasTVPreferredFocus: true,
          accessibilityLabel: resumeSec ? 'Resume playback' : 'Play movie',
        }}
        secondaryActions={[
          {
            key: 'watchlist',
            label: 'Watchlist',
            icon: inWatchlist ? 'bookmark' : 'bookmark-outline',
            active: inWatchlist,
            onPress: () =>
              d &&
              toggleWatchlist({
                mediaType: 'movie',
                tmdbId: d.id,
                title: d.title,
                posterPath: d.poster_path,
              }),
          },
          {
            key: 'favorite',
            label: 'Favorite',
            icon: inFavorites ? 'heart' : 'heart-outline',
            active: inFavorites,
            onPress: () =>
              d &&
              toggleFavorite({
                mediaType: 'movie',
                tmdbId: d.id,
                title: d.title,
                posterPath: d.poster_path,
              }),
          },
        ]}
      >
        <TVMediaRow
          title="More like this"
          data={recModels}
          cardW={landscapeW}
          cardH={landscapeH}
          isLoading={rec.isLoading}
          onSelect={(item) => navigation.navigate('MovieDetail', { id: item.id })}
          horizontalPadding={0}
        />
      </TVDetailLayout>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ink }}
      contentContainerStyle={{ paddingBottom: sectionGap * 10 }}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
    >
      <DetailBackdropHero
        backdropUri={backdropUri}
        heroHeight={heroH}
        horizontalPadding={hp}
        onBack={() => navigation.goBack()}
      />

      <View style={{ paddingHorizontal: hp, marginTop: -72 }}>
        <View
          className="rounded-3xl overflow-hidden"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            ...(isDark
              ? {}
              : {
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 4,
                }),
          }}
        >
          <LinearGradient
            colors={[colors.accentSoft, 'transparent']}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120 }}
          />

          <View className="p-5">
            {loading ? (
              <View className="gap-4 py-2">
                <View className="flex-row gap-4">
                  <View className="w-[118px] rounded-2xl aspect-[2/3]" style={ts.skeletonBlock} />
                  <View className="flex-1 gap-2 justify-center">
                    <View className="h-6 rounded-lg w-[90%]" style={ts.skeletonBlock} />
                    <View className="h-4 rounded-lg w-[40%]" style={ts.skeletonBlock} />
                  </View>
                </View>
                <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
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
                    <Text className="text-[22px] font-bold leading-7" style={{ color: colors.text }} numberOfLines={3}>
                      {d?.title ?? 'Untitled'}
                    </Text>
                    {d?.tagline ? (
                      <Text className="text-sm italic mt-2" style={{ color: colors.textFaint }} numberOfLines={2}>
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
                    <View style={ts.metaChip}>
                      <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                        {d.release_date.slice(0, 4)}
                      </Text>
                    </View>
                  ) : null}
                  {runtimeLabel ? (
                    <View style={[ts.metaChip, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Ionicons name="time-outline" color={colors.textMuted} size={14} />
                      <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                        {runtimeLabel}
                      </Text>
                    </View>
                  ) : null}
                  {d?.vote_average != null ? (
                    <View style={[ts.metaChip, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Ionicons name="star" color="#f5c518" size={14} />
                      <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                        {d.vote_average.toFixed(1)} TMDB
                      </Text>
                    </View>
                  ) : null}
                  {(d?.genres ?? []).map((g) => (
                    <View key={g.id} style={ts.genreChip}>
                      <Text className="text-xs font-medium" style={{ color: colors.text }}>
                        {g.name}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                {d?.overview ? (
                  <View className="mt-5">
                    <Text className="text-xs uppercase tracking-widest mb-2" style={{ color: colors.textMuted }}>
                      Synopsis
                    </Text>
                    <Text
                      className="text-[15px] leading-6"
                      style={{ color: colors.text }}
                      numberOfLines={overviewExpanded ? undefined : OVERVIEW_PREVIEW_LINES}
                    >
                      {d.overview}
                    </Text>
                    {(d.overview?.length ?? 0) > 220 ? (
                      <FocusSurface className="self-start mt-2 py-1" onPress={toggleOverview}>
                        <Text className="text-sm font-semibold" style={{ color: colors.accent }}>
                          {overviewExpanded ? 'Show less' : 'Read more'}
                        </Text>
                      </FocusSurface>
                    ) : null}
                  </View>
                ) : null}

                <View className="mt-6 gap-3">
                  <FocusSurface
                    className="rounded-2xl py-4 flex-row items-center justify-center gap-2"
                    style={
                      streamState.status === 'ready'
                        ? ts.accentButton
                        : { ...ts.secondaryButton, paddingVertical: 16 }
                    }
                    focusVariant="accent"
                    hasTVPreferredFocus={isTV}
                    onPress={onPlay}
                    accessibilityLabel={
                      streamState.status === 'loading'
                        ? 'Streams are still loading'
                        : resumeSec
                          ? 'Resume playback'
                          : 'Play movie'
                    }
                  >
                    {streamState.status === 'loading' ? (
                      <ActivityIndicator color={colors.textOnAccent} size="small" />
                    ) : (
                      <Ionicons
                        name={resumeSec ? 'play-circle' : 'play'}
                        color={streamState.status === 'ready' ? colors.textOnAccent : colors.text}
                        size={22}
                      />
                    )}
                    <Text
                      className="font-bold text-base"
                      style={{
                        color: streamState.status === 'ready' ? colors.textOnAccent : colors.text,
                      }}
                    >
                      {streamState.status === 'loading'
                        ? 'Loading streams…'
                        : resumeSec
                          ? 'Resume'
                          : 'Play'}
                    </Text>
                  </FocusSurface>

                  <View className="flex-row gap-3">
                    <FocusSurface
                      className="flex-1 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
                      style={ts.secondaryButton}
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
                        color={colors.text}
                        size={20}
                      />
                      <Text className="font-semibold text-sm" style={{ color: colors.text }}>
                        Watchlist
                      </Text>
                    </FocusSurface>
                    <FocusSurface
                      className="flex-1 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
                      style={ts.secondaryButton}
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
                        color={inFavorites ? colors.accentMuted : colors.text}
                        size={20}
                      />
                      <Text className="font-semibold text-sm" style={{ color: colors.text }}>
                        Favorite
                      </Text>
                    </FocusSurface>
                  </View>
                </View>

                <View className="mt-6" style={ts.infoPanel}>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons
                      name={
                        streamState.status === 'ready'
                          ? 'cloud-done-outline'
                          : streamState.status === 'loading'
                            ? 'cloud-download-outline'
                            : streamState.status === 'error' || streamState.status === 'no_core'
                              ? 'cloud-offline-outline'
                              : 'cloud-outline'
                      }
                      color={colors.textMuted}
                      size={20}
                    />
                    <Text className="font-semibold text-[15px]" style={{ color: colors.text }}>
                      Streaming availability
                    </Text>
                  </View>
                  <Text className="text-sm leading-5" style={{ color: colors.textMuted }}>
                    {streamAvailabilityDetailLine(streamState, sources.data?.expiresAt)}
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
