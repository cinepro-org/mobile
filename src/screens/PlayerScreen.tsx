import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Video, { SelectedTrackType, TextTrackType } from 'react-native-video';
import type { VideoRef, TextTracks } from 'react-native-video';
import { useKeepAwake } from 'expo-keep-awake';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export function PlayerScreen() {
  useKeepAwake();
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Player'>>();
  const params = route.params;
  const insets = useSafeAreaInsets();

  const videoRef = useRef<VideoRef>(null);
  const progressBarWidth = useRef(1);
  const hudHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const clearHudTimer = useCallback(() => {
    if (hudHideTimer.current) {
      clearTimeout(hudHideTimer.current);
      hudHideTimer.current = null;
    }
  }, []);

  const scheduleHudHide = useCallback(() => {
    clearHudTimer();
    if (Platform.isTV || settingsOpen || paused) return;
    hudHideTimer.current = setTimeout(() => setHud(false), 5500);
  }, [clearHudTimer, paused, settingsOpen]);

  useEffect(() => {
    if (!hud || Platform.isTV || settingsOpen || paused) {
      clearHudTimer();
      return;
    }
    scheduleHudHide();
    return clearHudTimer;
  }, [hud, paused, scheduleHudHide, settingsOpen, clearHudTimer]);

  useAndroidTVBack(() => {
    if (settingsOpen) {
      setSettingsOpen(false);
      return true;
    }
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

  const seekTo = useCallback((seconds: number) => {
    const ref = videoRef.current;
    if (!ref || !duration) return;
    const next = Math.max(0, Math.min(duration, seconds));
    ref.seek(next);
    setPosition(next);
  }, [duration]);

  const seekBy = useCallback(
    (delta: number) => {
      seekTo(position + delta);
    },
    [position, seekTo]
  );

  const seekFromProgressTap = useCallback(
    (locationX: number) => {
      if (!duration || progressBarWidth.current <= 0) return;
      const ratio = Math.max(0, Math.min(1, locationX / progressBarWidth.current));
      seekTo(ratio * duration);
    },
    [duration, seekTo]
  );

  const togglePlayback = useCallback(() => {
    setPaused((p) => !p);
    if (!Platform.isTV) scheduleHudHide();
  }, [scheduleHudHide]);

  const uri = activeSource ? resolveProxyUrl(activeSource.url) : '';

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  const chromeBottomPad = Math.max(insets.bottom, 12);
  const chromeTopPad = Math.max(insets.top, 8);

  const pillBtn =
    'rounded-2xl px-4 py-3 bg-white/12 border border-white/18 active:bg-white/20';
  const iconRound = 'rounded-full w-12 h-12 items-center justify-center bg-white/14 border border-white/18';

  const openSettings = () => {
    setSettingsOpen(true);
    clearHudTimer();
  };

  return (
    <View className="flex-1 bg-black">
      <Pressable
        className="flex-1"
        onPress={() => {
          if (settingsOpen) return;
          setHud((h) => !h);
        }}
      >
        {uri ? (
          <Video
            ref={videoRef}
            source={{ uri }}
            style={{ flex: 1 }}
            resizeMode="contain"
            paused={paused}
            rate={rate}
            progressUpdateInterval={400}
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
            <Text className="text-white text-center text-base leading-6">
              {omss.isLoading ? 'Resolving streams…' : 'No playable sources from Core.'}
            </Text>
          </View>
        )}

        {buffering && uri ? (
          <View className="absolute inset-0 items-center justify-center pointer-events-none">
            <View className="rounded-full bg-black/55 px-5 py-4">
              <ActivityIndicator size="large" color="#fff" />
            </View>
          </View>
        ) : null}

        {!Platform.isTV && hud && paused ? (
          <Pressable
            className="absolute inset-0 items-center justify-center"
            onPress={() => setPaused(false)}
            accessibilityLabel="Play"
          >
            <View className="w-[76px] h-[76px] rounded-full bg-black/55 border border-white/25 items-center justify-center">
              <Ionicons name="play" color="#fff" size={40} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        ) : null}

        {hud ? (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0.72)', 'transparent']}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: 140,
              }}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 280,
              }}
            />

            <View
              style={{ paddingTop: chromeTopPad, paddingHorizontal: 16 }}
              className="absolute left-0 right-0 top-0 flex-row items-center gap-3"
            >
              <FocusSurface
                className={iconRound}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Close player"
              >
                <Ionicons name="chevron-down" color="#fff" size={26} />
              </FocusSurface>
              <View className="flex-1">
                <Text className="text-white font-semibold text-[15px] leading-5" numberOfLines={2}>
                  {params.title}
                </Text>
                {activeSource ? (
                  <Text className="text-white/55 text-xs mt-1" numberOfLines={1}>
                    {activeSource.quality.toUpperCase()} · {activeSource.type.toUpperCase()} ·{' '}
                    {activeSource.provider.name}
                  </Text>
                ) : null}
              </View>
              <FocusSurface className={iconRound} onPress={openSettings} accessibilityLabel="Playback settings">
                <Ionicons name="options-outline" color="#fff" size={22} />
              </FocusSurface>
            </View>

            <View
              style={{ paddingBottom: chromeBottomPad, paddingHorizontal: 16 }}
              className="absolute left-0 right-0 bottom-0 gap-4"
            >
              {introEnd != null && introEnd > 0 && position < introEnd ? (
                <FocusSurface
                  className="self-center rounded-full bg-accent px-6 py-3 shadow-lg"
                  onPress={() => seekTo(introEnd)}
                  accessibilityLabel="Skip intro"
                >
                  <Text className="text-white font-bold text-sm tracking-wide">SKIP INTRO</Text>
                </FocusSurface>
              ) : null}

              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-white/90 text-xs font-medium tabular-nums">{formatDuration(position)}</Text>
                  <Text className="text-white/45 text-xs tabular-nums">−{formatDuration(Math.max(0, duration - position))}</Text>
                </View>
                <Pressable
                  onLayout={(e) => {
                    progressBarWidth.current = e.nativeEvent.layout.width;
                  }}
                  onPress={(e) => seekFromProgressTap(e.nativeEvent.locationX)}
                  className="h-9 justify-center"
                  accessibilityLabel="Seek along timeline"
                  accessibilityRole="adjustable"
                >
                  <View className="h-1 rounded-full bg-white/20 overflow-hidden">
                    <View
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </View>
                  <View
                    className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-accent shadow-md"
                    style={{
                      left: `${progress * 100}%`,
                      marginLeft: -7,
                      top: '50%',
                      marginTop: -7,
                    }}
                  />
                </Pressable>
              </View>

              <BlurView intensity={48} tint="dark" className="rounded-3xl overflow-hidden border border-white/12">
                <View className="px-3 py-4 gap-4 bg-black/25">
                  <View className="flex-row items-center justify-between px-2">
                    <FocusSurface
                      className="rounded-full w-[52px] h-[52px] items-center justify-center bg-white/12 border border-white/15"
                      onPress={() => seekBy(-10)}
                      accessibilityLabel="Back 10 seconds"
                    >
                      <View className="items-center">
                        <Ionicons name="play-back" color="#fff" size={22} />
                        <Text className="text-white/90 text-[10px] font-bold mt-0.5">10</Text>
                      </View>
                    </FocusSurface>

                    <FocusSurface
                      className="rounded-full w-[68px] h-[68px] items-center justify-center bg-white border border-white/30"
                      onPress={togglePlayback}
                      accessibilityLabel={paused ? 'Play' : 'Pause'}
                    >
                      <Ionicons name={paused ? 'play' : 'pause'} color="#07080d" size={36} style={paused ? { marginLeft: 4 } : undefined} />
                    </FocusSurface>

                    <FocusSurface
                      className="rounded-full w-[52px] h-[52px] items-center justify-center bg-white/12 border border-white/15"
                      onPress={() => seekBy(10)}
                      accessibilityLabel="Forward 10 seconds"
                    >
                      <View className="items-center">
                        <Ionicons name="play-forward" color="#fff" size={22} />
                        <Text className="text-white/90 text-[10px] font-bold mt-0.5">10</Text>
                      </View>
                    </FocusSurface>
                  </View>

                  <View className="flex-row flex-wrap justify-center gap-2 px-1">
                    <FocusSurface
                      className={pillBtn}
                      onPress={() =>
                        setSubtitleTrack((v) => {
                          if (!textTracks.length) return -1;
                          if (v < 0) return 0;
                          if (v >= textTracks.length - 1) return -1;
                          return v + 1;
                        })
                      }
                      accessibilityLabel="Subtitles"
                    >
                      <Text className="text-white text-xs font-semibold">
                        CC · {subtitleTrack < 0 ? 'Off' : textTracks[subtitleTrack]?.title ?? 'On'}
                      </Text>
                    </FocusSurface>
                    <FocusSurface className={pillBtn} onPress={openSettings} accessibilityLabel="Quality and speed">
                      <Text className="text-white text-xs font-semibold">
                        {rate}x · {activeSource?.quality ?? 'Auto'}
                      </Text>
                    </FocusSurface>
                  </View>

                  {params.next && duration - position < 28 ? (
                    <Text className="text-center text-white/65 text-xs px-2">
                      Next episode queued — continues automatically.
                    </Text>
                  ) : null}
                </View>
              </BlurView>
            </View>
          </>
        ) : null}
      </Pressable>

      <Modal
        visible={settingsOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/75" onPress={() => setSettingsOpen(false)} />
          <View
            className="mx-3 rounded-3xl overflow-hidden border border-white/14 bg-[#12131c] max-h-[72%]"
            style={{ marginBottom: Math.max(insets.bottom, 20) }}
          >
            <View className="px-5 pt-5 pb-3 flex-row items-center justify-between border-b border-white/10">
              <Text className="text-white text-lg font-bold">Playback</Text>
              <Pressable
                onPress={() => setSettingsOpen(false)}
                className="rounded-full bg-white/12 p-2"
                accessibilityLabel="Close settings"
              >
                <Ionicons name="close" color="#fff" size={22} />
              </Pressable>
            </View>
            <ScrollView className="px-4 py-4" keyboardShouldPersistTaps="handled">
              <Text className="text-white/50 text-xs uppercase tracking-wider mb-3 mt-1">Speed</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {RATES.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRate(r)}
                    className={`rounded-xl px-4 py-3 border ${
                      rate === r ? 'bg-accent border-accent' : 'bg-white/8 border-white/12'
                    }`}
                  >
                    <Text className="text-white font-semibold">{r}x</Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-white/50 text-xs uppercase tracking-wider mb-3">Captions</Text>
              <Pressable
                onPress={() => setSubtitleTrack(-1)}
                className={`rounded-xl px-4 py-3 mb-2 border ${
                  subtitleTrack < 0 ? 'bg-accent/90 border-accent' : 'bg-white/8 border-white/12'
                }`}
              >
                <Text className="text-white font-medium">Off</Text>
              </Pressable>
              {textTracks.map((t, idx) => (
                <Pressable
                  key={`${t.title}-${idx}`}
                  onPress={() => setSubtitleTrack(idx)}
                  className={`rounded-xl px-4 py-3 mb-2 border ${
                    subtitleTrack === idx ? 'bg-accent/90 border-accent' : 'bg-white/8 border-white/12'
                  }`}
                >
                  <Text className="text-white font-medium">{t.title}</Text>
                </Pressable>
              ))}

              <Text className="text-white/50 text-xs uppercase tracking-wider mb-3 mt-4">Stream quality</Text>
              {sorted.map((s, idx) => (
                <Pressable
                  key={`${s.provider.id}-${idx}-${s.quality}`}
                  onPress={() => setSourceIndex(idx)}
                  className={`rounded-xl px-4 py-3 mb-2 border ${
                    idx === sourceIndex ? 'bg-accent/90 border-accent' : 'bg-white/8 border-white/12'
                  }`}
                >
                  <Text className="text-white font-semibold">
                    {s.quality} · {s.type.toUpperCase()}
                  </Text>
                  <Text className="text-white/55 text-xs mt-1">{s.provider.name}</Text>
                </Pressable>
              ))}

              <Text className="text-white/50 text-xs uppercase tracking-wider mb-3 mt-5">Intro timing</Text>
              <Pressable
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
                  setSettingsOpen(false);
                }}
                className="rounded-xl px-4 py-3 bg-white/10 border border-white/14 mb-8"
              >
                <Text className="text-white font-semibold">Set intro end to current time</Text>
                <Text className="text-white/50 text-xs mt-1">
                  Enables “Skip intro” until this position for this episode or movie.
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
