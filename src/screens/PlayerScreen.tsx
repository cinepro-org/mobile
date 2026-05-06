import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import Video, { SelectedTrackType, TextTrackType } from 'react-native-video';
import type { VideoRef, TextTracks } from 'react-native-video';
import { useKeepAwake } from 'expo-keep-awake';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { CineProApi } from '@/api/cineproClient';
import { qk } from '@/api/queryKeys';
import {
  pickAutoSource,
  resolveProxyUrl,
  sortSourcesByQualityDesc,
  isPlayableType,
} from '@/utils/stream';
import { useSettingsStore } from '@/store/settingsStore';
import {
  useLibraryStore,
  mediaStorageKey,
  type ContinuePlayback,
} from '@/store/libraryStore';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAndroidTVBack } from '@/hooks/useAndroidTVBack';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import Ionicons from '@expo/vector-icons/Ionicons';

export function PlayerScreen() {
  useKeepAwake();
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Player'>>();
  const params = route.params;

  const videoRef = useRef<VideoRef>(null);
  const autoQuality = useSettingsStore((s) => s.autoQuality);
  const defaultRate = useSettingsStore((s) => s.defaultPlaybackRate);

  const omss = useQuery({
    queryKey:
      params.mediaType === 'movie'
        ? qk.movieSources(params.tmdbId)
        : qk.tvSources(params.tmdbId, params.season ?? 1, params.episode ?? 1),
    queryFn: () =>
      params.mediaType === 'movie'
        ? CineProApi.movieSources(params.tmdbId)
        : CineProApi.tvEpisodeSources({
            tmdbShowId: params.tmdbId,
            season: params.season ?? 1,
            episode: params.episode ?? 1,
          }),
    retry: (c, err: unknown) => {
      const status =
        typeof err === 'object' && err && 'status' in err ? (err as { status?: number }).status : undefined;
      if (status === 404) return false;
      return c < 2;
    },
  });

  const sorted = useMemo(() => {
    const list = omss.data?.sources ?? [];
    return sortSourcesByQualityDesc(list.filter((s) => isPlayableType(s.type)));
  }, [omss.data?.sources]);

  const [sourceIndex, setSourceIndex] = useState(0);
  useEffect(() => {
    if (!sorted.length) return;
    if (autoQuality) {
      const bestIdx = sorted.findIndex((s) => s === pickAutoSource(sorted));
      setSourceIndex(bestIdx >= 0 ? bestIdx : 0);
    } else {
      setSourceIndex(0);
    }
  }, [autoQuality, sorted]);

  const activeSource = sorted[sourceIndex];

  const textTracks = useMemo(() => {
    const subs = omss.data?.subtitles ?? [];
    return subs.map((s) => ({
      title: `${s.label} (${s.format})`,
      language: 'en',
      type: TextTrackType.VTT,
      uri: resolveProxyUrl(s.url),
    })) as TextTracks;
  }, [omss.data?.subtitles]);

  const [subtitleTrack, setSubtitleTrack] = useState<number>(-1);
  const [rate, setRate] = useState(defaultRate);
  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hud, setHud] = useState(Platform.isTV);
  const upsertContinue = useLibraryStore((s) => s.upsertContinue);

  const mediaKey = useMemo(
    () =>
      mediaStorageKey({
        mediaType: params.mediaType,
        tmdbId: params.tmdbId,
        season: params.season,
        episode: params.episode,
      }),
    [params.episode, params.mediaType, params.season, params.tmdbId]
  );

  const introEnd = useLibraryStore(
    (s) => s.continueWatching.find((c) => c.mediaKey === mediaKey)?.introSkipEndSec ?? null
  );

  const persistTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const persistProgress = useCallback(() => {
    if (!duration) return;
    const row: ContinuePlayback = {
      mediaKey,
      mediaType: params.mediaType,
      tmdbId: params.tmdbId,
      title: params.title,
      posterPath: params.posterPath,
      backdropPath: params.backdropPath,
      season: params.season,
      episode: params.episode,
      episodeTitle: params.episodeTitle,
      positionSec: position,
      durationSec: duration,
      updatedAt: Date.now(),
      introSkipEndSec: introEnd ?? undefined,
    };
    upsertContinue(row);
  }, [
    duration,
    introEnd,
    mediaKey,
    params.backdropPath,
    params.episode,
    params.episodeTitle,
    params.mediaType,
    params.posterPath,
    params.season,
    params.title,
    params.tmdbId,
    position,
    upsertContinue,
  ]);

  useEffect(() => {
    persistTimer.current = setInterval(persistProgress, 9000);
    return () => {
      if (persistTimer.current) clearInterval(persistTimer.current);
      persistProgress();
    };
  }, [persistProgress]);

  useAndroidTVBack(() => {
    navigation.goBack();
    return true;
  });

  useEffect(() => {
    if (!params.next) return;
    if (!duration) return;
    const left = duration - position;
    if (left > 22 || left < 0) return;
    const id = setTimeout(() => {
      const n = params.next!;
      navigation.replace('Player', {
        title: `${n.showTitle ?? ''} · ${n.episodeTitle ?? `Episode ${n.episode}`}`,
        mediaType: 'tv',
        tmdbId: n.tmdbId,
        season: n.season,
        episode: n.episode,
        episodeTitle: n.episodeTitle,
        posterPath: n.posterPath,
        backdropPath: n.backdropPath,
      });
    }, 11000);
    return () => clearTimeout(id);
  }, [duration, navigation, params.next, position]);

  const seekBy = useCallback((delta: number) => {
    const ref = videoRef.current;
    if (!ref) return;
    const next = Math.max(0, position + delta);
    ref.seek(next);
    setPosition(next);
  }, [position]);

  const toggleRate = useCallback(() => {
    const order = [0.75, 1, 1.25, 1.5, 2];
    const idx = order.indexOf(rate);
    setRate(order[(idx + 1) % order.length]);
  }, [rate]);

  const uri = activeSource ? resolveProxyUrl(activeSource.url) : '';

  return (
    <Pressable
      className="flex-1 bg-black"
      onPress={() => setHud((h) => !h)}
      accessibilityLabel="Toggle player controls"
    >
      {uri ? (
        <Video
          ref={videoRef}
          source={{ uri }}
          style={{ flex: 1 }}
          resizeMode="contain"
          paused={paused}
          rate={rate}
          progressUpdateInterval={650}
          onLoad={(data) => {
            setDuration(data.duration);
            setBuffering(false);
            const start = params.resumeSec ?? 0;
            if (start > 3) {
              videoRef.current?.seek(start);
              setPosition(start);
            }
          }}
          onProgress={(ev) => setPosition(ev.currentTime)}
          onBuffer={(ev) => setBuffering(ev.isBuffering)}
          textTracks={textTracks}
          selectedTextTrack={
            subtitleTrack >= 0
              ? { type: SelectedTrackType.INDEX, value: subtitleTrack }
              : { type: SelectedTrackType.DISABLED }
          }
          preventsDisplaySleepDuringVideoPlayback
          renderLoader={() => (
            <View className="absolute inset-0 items-center justify-center">
              <ActivityIndicator color="#fff" />
            </View>
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-center text-base">
            {omss.isLoading ? 'Resolving OMSS sources…' : 'No playable sources from Core.'}
          </Text>
        </View>
      )}

      {buffering ? (
        <View className="absolute inset-0 items-center justify-center pointer-events-none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}

      {!Platform.isTV ? (
        <>
          <Pressable
            className="absolute left-0 top-0 bottom-0 w-[28%]"
            onPress={() => seekBy(-10)}
            accessibilityLabel="Seek back 10 seconds"
          />
          <Pressable
            className="absolute right-0 top-0 bottom-0 w-[28%]"
            onPress={() => seekBy(10)}
            accessibilityLabel="Seek forward 10 seconds"
          />
        </>
      ) : null}

      {hud ? (
        <View className="absolute left-0 right-0 bottom-0 pb-10 pt-6 px-6 bg-black/70">
          <View className="flex-row items-center justify-between mb-4">
            <FocusSurface className="rounded-full bg-white/15 p-3" onPress={() => navigation.goBack()}>
              <Ionicons name="close" color="#fff" size={22} />
            </FocusSurface>
            <Text className="text-white font-semibold flex-1 mx-4" numberOfLines={2}>
              {params.title}
            </Text>
            <FocusSurface className="rounded-full bg-white/15 p-3" onPress={() => setPaused((p) => !p)}>
              <Ionicons name={paused ? 'play' : 'pause'} color="#fff" size={22} />
            </FocusSurface>
          </View>

          <Text className="text-white/70 text-xs mb-3">
            {formatClock(position)} / {formatClock(duration)}{' '}
            {activeSource ? `· ${activeSource.quality} · ${activeSource.provider.name}` : ''}
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-3">
            <FocusSurface className="rounded-full bg-white/10 px-3 py-2 border border-white/15" onPress={() => seekBy(-10)}>
              <Text className="text-white text-xs">−10s</Text>
            </FocusSurface>
            <FocusSurface className="rounded-full bg-white/10 px-3 py-2 border border-white/15" onPress={() => seekBy(10)}>
              <Text className="text-white text-xs">+10s</Text>
            </FocusSurface>
            <FocusSurface className="rounded-full bg-white/10 px-3 py-2 border border-white/15" onPress={toggleRate}>
              <Text className="text-white text-xs">{rate}x speed</Text>
            </FocusSurface>
            <FocusSurface
              className="rounded-full bg-white/10 px-3 py-2 border border-white/15"
              onPress={() => setSubtitleTrack((v) => (v + 1 >= textTracks.length ? -1 : v + 1))}
            >
              <Text className="text-white text-xs">
                CC {subtitleTrack < 0 ? 'Off' : textTracks[subtitleTrack]?.title ?? 'On'}
              </Text>
            </FocusSurface>
          </View>

          <Text className="text-white/60 text-xs mb-2">Quality</Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {sorted.map((s, idx) => (
              <FocusSurface
                key={`${s.provider.id}-${idx}-${s.quality}`}
                className={`rounded-full px-3 py-2 border ${
                  idx === sourceIndex ? 'bg-accent border-accent' : 'bg-white/10 border-white/15'
                }`}
                onPress={() => setSourceIndex(idx)}
              >
                <Text className="text-white text-xs">
                  {s.quality} · {s.type.toUpperCase()}
                </Text>
              </FocusSurface>
            ))}
          </View>

          {introEnd != null && introEnd > 0 && position < introEnd ? (
            <FocusSurface
              className="self-start rounded-full bg-accent px-4 py-2 mb-3"
              onPress={() => seekBy(introEnd - position)}
            >
              <Text className="text-white font-semibold">Skip intro</Text>
            </FocusSurface>
          ) : null}

          <FocusSurface
            className="self-start rounded-full bg-white/10 px-4 py-2 border border-white/15"
            onPress={() => {
              const introSec = Math.floor(position);
              upsertContinue({
                mediaKey,
                mediaType: params.mediaType,
                tmdbId: params.tmdbId,
                title: params.title,
                posterPath: params.posterPath,
                backdropPath: params.backdropPath,
                season: params.season,
                episode: params.episode,
                episodeTitle: params.episodeTitle,
                positionSec: position,
                durationSec: duration || Math.max(1, position),
                updatedAt: Date.now(),
                introSkipEndSec: introSec,
              });
            }}
          >
            <Text className="text-white text-xs">Mark intro end here</Text>
          </FocusSurface>

          {params.next && duration - position < 24 ? (
            <Text className="text-white/80 text-xs mt-3">
              Next episode starts automatically soon…
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
