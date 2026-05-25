import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
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
import { useSettingsStore } from '@/store/settingsStore';
import {
  resolveStreamReadyState,
  streamAvailabilityDetailLine,
} from '@/player/streamAvailability';
import { buildTvPlayerParams } from '@/player/playerEpisodeNav';
import { usePlayTvEpisode } from '@/player/usePlayTvEpisode';
import { useHasConfiguredTmdbKey } from '@/utils/tmdbCredentials';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAndroidTVBack } from '@/hooks/useAndroidTVBack';
import { useTV } from '@/hooks/useTV';
import { tmdbImg } from '@/services/tmdbImages';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { DetailBackdropHero } from '@/components/DetailBackdropHero';
import { TVDetailLayout } from '@/tv/TVDetailLayout';
import { TVMediaRow } from '@/tv/TVMediaRow';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { TmdbSeasonSummary } from '@/api/types/tmdb';

const OVERVIEW_PREVIEW_LINES = 5;

function seasonChipLabel(season: TmdbSeasonSummary): string {
  if (season.season_number === 0) return 'Specials';
  if (/season/i.test(season.name)) return season.name;
  return `S${season.season_number}`;
}

export function TvDetailScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'TvDetail'>>();
  const { id } = route.params;
  const { posterW, posterH, overscanX, sectionGap, heroH, landscapeW, landscapeH } = useResponsive();
  const { colors, isDark } = useAppTheme();
  const ts = useThemedStyles();
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const isTV = useTV();
  const hasTmdb = useHasConfiguredTmdbKey();
  const cineproBaseUrl = useSettingsStore((s) => s.cineproBaseUrl);
  const coreConfigured = !!cineproBaseUrl.trim();

  const detail = useQuery({
    queryKey: qk.tvDetail(id),
    queryFn: () => TmdbApi.tvDetail(id),
    enabled: hasTmdb,
  });

  const rec = useQuery({
    queryKey: qk.recTv(id, 1),
    queryFn: () => TmdbApi.recommendationsTv(id, 1),
    enabled: !!detail.data && hasTmdb,
  });

  const toggleWatchlist = useLibraryStore((s) => s.toggleWatchlist);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const continueWatching = useLibraryStore((s) => s.continueWatching);

  const inWatchlist = useLibraryStore((s) =>
    s.watchlist.some((w) => w.mediaType === 'tv' && w.tmdbId === id)
  );
  const inFavorites = useLibraryStore((s) =>
    s.favorites.some((w) => w.mediaType === 'tv' && w.tmdbId === id)
  );

  const seasons = detail.data?.seasons ?? [];

  const playableSeasons = useMemo(
    () => [...seasons.filter((s) => s.season_number >= 0)].sort((a, b) => a.season_number - b.season_number),
    [seasons]
  );

  const continueEpisode = useMemo(() => {
    const rows = continueWatching
      .filter((c) => c.mediaType === 'tv' && c.tmdbId === id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return rows[0];
  }, [continueWatching, id]);

  const preferredSeasonNumber = useMemo(() => {
    if (continueEpisode?.season != null) {
      const match = playableSeasons.find((s) => s.season_number === continueEpisode.season);
      if (match) return match.season_number;
    }
    const s1 = playableSeasons.find((s) => s.season_number === 1);
    return s1?.season_number ?? playableSeasons[0]?.season_number ?? 1;
  }, [continueEpisode?.season, playableSeasons]);

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(preferredSeasonNumber);

  useEffect(() => {
    setSelectedSeasonNumber(preferredSeasonNumber);
  }, [id, preferredSeasonNumber]);

  const selectedSeasonSummary = useMemo(
    () => playableSeasons.find((s) => s.season_number === selectedSeasonNumber),
    [playableSeasons, selectedSeasonNumber]
  );

  const seasonDetail = useQuery({
    queryKey: qk.tvSeason(id, selectedSeasonNumber),
    queryFn: () => TmdbApi.tvSeason(id, selectedSeasonNumber),
    enabled: hasTmdb && selectedSeasonNumber >= 0,
  });

  const seasonEpisodes = seasonDetail.data?.episodes ?? [];
  const showTitle = detail.data?.name ?? 'Series';

  const { playEpisode, episodeQueryByNumber, readyCount, activeEpisodeNumber } = usePlayTvEpisode({
    tmdbId: id,
    seasonNumber: selectedSeasonNumber,
    episodes: seasonEpisodes,
    showTitle,
    posterPath: detail.data?.poster_path,
    backdropPath: detail.data?.backdrop_path,
  });

  const availabilityQuery =
    activeEpisodeNumber != null ? episodeQueryByNumber.get(activeEpisodeNumber) : undefined;
  const streamState = useMemo(
    () =>
      availabilityQuery
        ? resolveStreamReadyState(coreConfigured, availabilityQuery)
        : resolveStreamReadyState(coreConfigured, {
            isPending: false,
            isFetching: false,
            isError: false,
            error: null,
            data: undefined,
          }),
    [availabilityQuery, coreConfigured]
  );

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

  const openSeasonBrowser = useCallback(() => {
    if (!selectedSeasonSummary) return;
    navigation.navigate('EpisodeBrowser', {
      id,
      seasonNumber: selectedSeasonNumber,
      title: `${showTitle} · ${selectedSeasonSummary.name}`,
    });
  }, [id, navigation, selectedSeasonNumber, selectedSeasonSummary, showTitle]);

  const selectSeason = useCallback((seasonNumber: number) => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSeasonNumber(seasonNumber);
  }, []);

  const loading = detail.isPending;

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
      ...(d?.first_air_date ? [{ key: 'year', label: `Since ${d.first_air_date.slice(0, 4)}` }] : []),
      ...(d?.number_of_seasons != null
        ? [{ key: 'seasons', label: `${d.number_of_seasons} seasons`, icon: 'albums-outline' as const }]
        : []),
      ...(avgRuntime != null
        ? [{ key: 'runtime', label: `~${avgRuntime} min / ep`, icon: 'time-outline' as const }]
        : []),
      ...(d?.vote_average != null
        ? [{ key: 'rating', label: `${d.vote_average.toFixed(1)} TMDB`, icon: 'star' as const }]
        : []),
      ...(d?.genres ?? []).map((g) => ({ key: `genre-${g.id}`, label: g.name })),
    ];

    const hasResume = continueEpisode?.season != null && continueEpisode.episode != null;

    return (
      <TVDetailLayout
        backdropUri={backdropUri}
        title={d?.name ?? 'Series'}
        tagline={d?.tagline}
        overview={d?.overview}
        metaChips={metaChips}
        loading={loading}
        onBack={() => navigation.goBack()}
        primaryAction={
          hasResume
            ? {
                key: 'resume',
                label: 'Resume',
                icon: 'play-circle',
                onPress: () => {
                  const epNum = continueEpisode!.episode!;
                  const epTitle = continueEpisode!.episodeTitle ?? `Episode ${epNum}`;
                  navigation.navigate(
                    'Player',
                    buildTvPlayerParams({
                      tmdbId: id,
                      seasonNumber: continueEpisode!.season!,
                      episodeNumber: epNum,
                      episodeTitle: epTitle,
                      showTitle,
                      episodes:
                        continueEpisode!.season === selectedSeasonNumber && seasonEpisodes.length
                          ? seasonEpisodes
                          : [{ episode_number: epNum, name: epTitle }],
                      posterPath: d?.poster_path,
                      backdropPath: d?.backdrop_path,
                      resumeSec: continueEpisode!.positionSec,
                    })
                  );
                },
                hasTVPreferredFocus: true,
                accessibilityLabel: 'Resume watching',
              }
            : {
                key: 'browse',
                label: seasonEpisodes.length ? 'Browse episodes' : 'Series info',
                icon: 'play',
                onPress: () => {
                  if (seasonEpisodes.length) playEpisode(seasonEpisodes[0].episode_number, seasonEpisodes[0].name);
                },
                hasTVPreferredFocus: true,
              }
        }
        secondaryActions={[
          {
            key: 'watchlist',
            label: 'Watchlist',
            icon: inWatchlist ? 'bookmark' : 'bookmark-outline',
            active: inWatchlist,
            onPress: () =>
              d &&
              toggleWatchlist({
                mediaType: 'tv',
                tmdbId: d.id,
                title: d.name,
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
                mediaType: 'tv',
                tmdbId: d.id,
                title: d.name,
                posterPath: d.poster_path,
              }),
          },
        ]}
      >
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs uppercase tracking-widest" style={{ color: colors.textMuted }}>
              Seasons
            </Text>
            {playableSeasons.length > 0 ? (
              <FocusSurface className="py-1 px-1" collapseTVNavOnFocus onPress={openSeasonBrowser}>
                <Text className="text-xs font-bold" style={{ color: colors.accent }}>
                  Full list
                </Text>
              </FocusSurface>
            ) : null}
          </View>

          {playableSeasons.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {playableSeasons.map((season) => {
                const active = season.season_number === selectedSeasonNumber;
                return (
                  <FocusSurface
                    key={season.id}
                    className="rounded-full px-5 py-3"
                    style={active ? ts.chipActive : ts.chip}
                    collapseTVNavOnFocus
                    onPress={() => selectSeason(season.season_number)}
                    accessibilityLabel={season.name}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      className="font-bold text-sm"
                      style={{ color: active ? colors.textOnAccent : colors.text }}
                    >
                      {seasonChipLabel(season)}
                    </Text>
                  </FocusSurface>
                );
              })}
            </ScrollView>
          ) : null}

          {seasonDetail.isLoading ? (
            <ActivityIndicator color={colors.accent} size="large" style={{ marginVertical: 24 }} />
          ) : (
            <View className="gap-3">
              {seasonEpisodes.map((item, index) => {
                const uri = tmdbImg(item.still_path ?? d?.poster_path, 'w500');
                const isContinue =
                  continueEpisode?.season === selectedSeasonNumber &&
                  continueEpisode.episode === item.episode_number;

                return (
                  <FocusSurface
                    key={item.id}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      borderWidth: 1,
                      borderColor: isContinue ? colors.accentBorder : colors.border,
                      backgroundColor: isContinue ? colors.accentSoft : colors.inputBg,
                    }}
                    focusVariant={isContinue ? 'accent' : 'card'}
                    collapseTVNavOnFocus
                    hasTVPreferredFocus={!hasResume && index === 0}
                    onPress={() => playEpisode(item.episode_number, item.name)}
                    accessibilityLabel={`Play episode ${item.episode_number} ${item.name}`}
                  >
                    <View className="flex-row">
                      <Image
                        source={uri ? { uri } : undefined}
                        style={{ width: 160, height: 90 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <View className="flex-1 p-4 justify-center">
                        <Text className="font-semibold" style={{ color: colors.text }} numberOfLines={2}>
                          E{item.episode_number}: {item.name}
                        </Text>
                        {item.overview ? (
                          <Text className="text-sm mt-1.5" style={{ color: colors.textMuted }} numberOfLines={2}>
                            {item.overview}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </FocusSurface>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ marginTop: sectionGap * 2 }}>
          <TVMediaRow
            title="Similar series"
            data={recModels}
            cardW={landscapeW}
            cardH={landscapeH}
            isLoading={rec.isLoading}
            onSelect={(item) => navigation.navigate('TvDetail', { id: item.id })}
            horizontalPadding={0}
          />
        </View>
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
                    accessibilityLabel={`Poster for ${d?.name ?? 'series'}`}
                  />
                  <View className="flex-1 justify-center">
                    <Text className="text-[22px] font-bold leading-7" style={{ color: colors.text }} numberOfLines={3}>
                      {d?.name ?? 'Series'}
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
                  {d?.first_air_date ? (
                    <View style={ts.metaChip}>
                      <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                        Since {d.first_air_date.slice(0, 4)}
                      </Text>
                    </View>
                  ) : null}
                  {d?.number_of_seasons != null ? (
                    <View style={[ts.metaChip, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Ionicons name="albums-outline" color={colors.textMuted} size={14} />
                      <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                        {d.number_of_seasons} season{d.number_of_seasons === 1 ? '' : 's'}
                      </Text>
                    </View>
                  ) : null}
                  {avgRuntime != null ? (
                    <View style={[ts.metaChip, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Ionicons name="time-outline" color={colors.textMuted} size={14} />
                      <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                        ~{avgRuntime} min / ep
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
                      About
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

                {continueEpisode?.season != null && continueEpisode.episode != null ? (
                  <FocusSurface
                    className="mt-6 rounded-2xl py-4 px-4 flex-row items-center gap-3 active:opacity-90"
                    style={ts.accentButton}
                    focusVariant="accent"
                    hasTVPreferredFocus={isTV}
                    onPress={() => {
                      const epNum = continueEpisode.episode!;
                      const epTitle =
                        continueEpisode.episodeTitle ?? `Episode ${epNum}`;
                      navigation.navigate(
                        'Player',
                        buildTvPlayerParams({
                          tmdbId: id,
                          seasonNumber: continueEpisode.season!,
                          episodeNumber: epNum,
                          episodeTitle: epTitle,
                          showTitle,
                          episodes:
                            continueEpisode.season === selectedSeasonNumber && seasonEpisodes.length
                              ? seasonEpisodes
                              : [{ episode_number: epNum, name: epTitle }],
                          posterPath: d?.poster_path,
                          backdropPath: d?.backdrop_path,
                          resumeSec: continueEpisode.positionSec,
                        })
                      );
                    }}
                    accessibilityLabel="Resume watching"
                  >
                    <Ionicons name="play-circle" color={colors.textOnAccent} size={28} />
                    <View className="flex-1">
                      <Text className="font-bold text-base" style={{ color: colors.textOnAccent }}>
                        Resume
                      </Text>
                      <Text className="text-sm mt-0.5" style={{ color: colors.textOnAccent, opacity: 0.85 }}>
                        S{continueEpisode.season} · E{continueEpisode.episode}
                        {continueEpisode.episodeTitle ? ` · ${continueEpisode.episodeTitle}` : ''}
                      </Text>
                    </View>
                  </FocusSurface>
                ) : null}

                <View className="mt-6 gap-3">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-xs uppercase tracking-widest" style={{ color: colors.textMuted }}>
                      Seasons
                    </Text>
                    {playableSeasons.length > 0 ? (
                      <FocusSurface className="py-1 px-1 active:opacity-80" onPress={openSeasonBrowser}>
                        <Text className="text-xs font-bold" style={{ color: colors.accent }}>
                          Full list
                        </Text>
                      </FocusSurface>
                    ) : null}
                  </View>

                  {playableSeasons.length === 0 ? (
                    <Text className="text-sm" style={{ color: colors.textFaint }}>
                      No seasons to show.
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                    >
                      {playableSeasons.map((season) => {
                        const active = season.season_number === selectedSeasonNumber;
                        return (
                          <FocusSurface
                            key={season.id}
                            className="rounded-full px-4 py-2.5"
                            style={active ? ts.chipActive : ts.chip}
                            onPress={() => selectSeason(season.season_number)}
                            accessibilityLabel={season.name}
                            accessibilityState={{ selected: active }}
                          >
                            <Text
                              className="font-bold text-sm"
                              style={{ color: active ? colors.textOnAccent : colors.text }}
                              numberOfLines={1}
                            >
                              {seasonChipLabel(season)}
                            </Text>
                          </FocusSurface>
                        );
                      })}
                    </ScrollView>
                  )}

                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="font-semibold text-[15px] flex-1" style={{ color: colors.text }} numberOfLines={1}>
                      {selectedSeasonSummary?.name ?? `Season ${selectedSeasonNumber}`}
                    </Text>
                    {seasonDetail.isLoading ? (
                      <ActivityIndicator color={colors.accent} size="small" />
                    ) : (
                      <Text className="text-xs" style={{ color: colors.textFaint }}>
                        {readyCount > 0
                          ? `${seasonEpisodes.length} ep · ${readyCount} ready`
                          : `${seasonEpisodes.length} ep`}
                      </Text>
                    )}
                  </View>

                  {seasonDetail.isError ? (
                    <View className="rounded-2xl py-4 px-4" style={ts.infoPanel}>
                      <Text className="text-center text-sm" style={{ color: colors.textMuted }}>
                        Couldn’t load episodes. Check your connection and TMDB key.
                      </Text>
                    </View>
                  ) : seasonDetail.isLoading ? (
                    <View className="py-8 items-center">
                      <ActivityIndicator color={colors.accent} size="large" />
                    </View>
                  ) : seasonEpisodes.length === 0 ? (
                    <Text className="text-sm py-4" style={{ color: colors.textFaint }}>
                      No episodes in this season.
                    </Text>
                  ) : (
                    <View className="gap-2.5">
                      {seasonEpisodes.map((item, index) => {
                        const uri = tmdbImg(item.still_path ?? d?.poster_path, 'w500');
                        const epQuery = episodeQueryByNumber.get(item.episode_number);
                        const epState = epQuery ? resolveStreamReadyState(coreConfigured, epQuery) : null;
                        const epReady = epState?.status === 'ready';
                        const epLoading = epState?.status === 'loading';
                        const isContinue =
                          continueEpisode?.season === selectedSeasonNumber &&
                          continueEpisode.episode === item.episode_number;

                        return (
                          <FocusSurface
                            key={item.id}
                            className="rounded-2xl overflow-hidden"
                            style={{
                              borderWidth: 1,
                              borderColor: isContinue ? colors.accentBorder : colors.border,
                              backgroundColor: isContinue ? colors.accentSoft : colors.inputBg,
                            }}
                            focusVariant={isContinue ? 'accent' : 'card'}
                            hasTVPreferredFocus={
                              isTV &&
                              !(continueEpisode?.season != null && continueEpisode.episode != null) &&
                              index === 0
                            }
                            onPress={() => playEpisode(item.episode_number, item.name)}
                            accessibilityLabel={`Play episode ${item.episode_number} ${item.name}`}
                          >
                            <View className="flex-row">
                              <Image
                                source={uri ? { uri } : undefined}
                                style={{ width: 128, height: 72 }}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                              />
                              <View className="flex-1 p-3 justify-center">
                                <View className="flex-row items-center gap-2">
                                  <Text className="font-semibold flex-1" style={{ color: colors.text }} numberOfLines={2}>
                                    E{item.episode_number}: {item.name}
                                  </Text>
                                  {epLoading ? (
                                    <ActivityIndicator color={colors.accent} size="small" />
                                  ) : epReady ? (
                                    <Ionicons name="cloud-done-outline" color={colors.accent} size={18} />
                                  ) : null}
                                </View>
                                {isContinue ? (
                                  <Text
                                    className="text-[11px] font-bold mt-1 uppercase tracking-wide"
                                    style={{ color: colors.accent }}
                                  >
                                    Continue
                                  </Text>
                                ) : item.overview ? (
                                  <Text className="text-xs mt-1.5" style={{ color: colors.textMuted }} numberOfLines={2}>
                                    {item.overview}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          </FocusSurface>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View className="mt-6 gap-3">
                  <View className="flex-row gap-3">
                    <FocusSurface
                      className="flex-1 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
                      style={ts.secondaryButton}
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
                          mediaType: 'tv',
                          tmdbId: d.id,
                          title: d.name,
                          posterPath: d.poster_path,
                        })
                      }
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

                {selectedSeasonSummary ? (
                  <View className="mt-5" style={ts.infoPanel}>
                    <View className="flex-row items-center gap-2 mb-2">
                      <Ionicons
                        name={
                          streamState.status === 'ready'
                            ? 'cloud-done-outline'
                            : streamState.status === 'loading'
                              ? 'cloud-download-outline'
                              : 'cloud-offline-outline'
                        }
                        color={colors.textMuted}
                        size={20}
                      />
                      <Text className="font-semibold text-[15px]" style={{ color: colors.text }}>
                        Streaming availability
                      </Text>
                    </View>
                    <Text className="text-sm leading-5" style={{ color: colors.textMuted }}>
                      {activeEpisodeNumber == null && streamState.status === 'empty'
                        ? 'Tap an episode below to check if streams are available from your Core server.'
                        : streamState.status === 'ready'
                          ? `${selectedSeasonSummary.name} · ${streamAvailabilityDetailLine(
                              streamState,
                              availabilityQuery?.data?.expiresAt
                            )}`
                          : streamAvailabilityDetailLine(streamState)}
                    </Text>
                  </View>
                ) : null}
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
