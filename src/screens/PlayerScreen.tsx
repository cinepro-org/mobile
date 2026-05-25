import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Video, {
  BufferingStrategyType,
  SelectedTrackType,
  SelectedVideoTrackType,
  TextTrackType,
  ViewType,
} from 'react-native-video';
import type { VideoRef, TextTracks, OnLoadData, OnVideoErrorData } from 'react-native-video';
import { useKeepAwake } from 'expo-keep-awake';
import * as Brightness from 'expo-brightness';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import type { RootStackParamList, PlayerEpisodeRef, PlayerRouteParams } from '@/navigation/types';
import { qk } from '@/api/queryKeys';
import { TmdbApi } from '@/api/tmdbClient';
import { useHasConfiguredTmdbKey } from '@/utils/tmdbCredentials';
import { buildTvPlayerParams, resolveTvNeighbors } from '@/player/playerEpisodeNav';
import { PlayerEpisodeSidebar } from '@/player/PlayerEpisodeSidebar';
import {
  buildPlaybackRequest,
  pickAutoSource,
  resolveProxyUrl,
  videoSourceContentTypeForPlayback,
} from '@/utils/stream';
import { useSettingsStore } from '@/store/settingsStore';
import {
  useLibraryStore,
  mediaStorageKey,
  type ContinuePlayback,
} from '@/store/libraryStore';
import { FocusSurface } from '@/tv/FocusSurface';
import { useTVEventHandler } from '@/tv/useTVEventHandler';
import { useAndroidTVBack } from '@/hooks/useAndroidTVBack';
import { useTV } from '@/hooks/useTV';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { tmdbImg } from '@/services/tmdbImages';
import { playbackLogger } from '@/player/playbackLogger';
import { usePlayerOrientation } from '@/player/usePlayerOrientation';
import { usePlaybackSources } from '@/player/usePlaybackSources';
import { createPlaybackFallbackController } from '@/player/playbackFallbackController';
import type { PlaybackFallbackContext } from '@/player/playbackFallbackController';
import {
  isAndroidExoNetworkOrSourceError,
  loggablePlaybackRequest,
  sourceSignature,
  sniffDrmHint,
} from '@/player/streamUtils';
import { loadPlayerSelection, savePlayerSelection } from '@/player/selectionsStorage';
import { PlayerDisplayHudControls } from '@/player/PlayerDisplayHudControls';
import { PlayerProgressBar } from '@/player/PlayerProgressBar';
import { PlayerSettingsModal } from '@/player/PlayerSettingsModal';
import { resolveStreamReadyState } from '@/player/streamAvailability';
import { aspectRatioValue, formatAspectLabel } from '@/player/playerDisplay';
import { useAppTheme } from '@/theme/AppThemeProvider';

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

/** Shimmer while OMSS resolves streams — with explicit status copy. */
function PlayerFetchSkeleton({
  wide,
  title,
  message,
}: {
  wide: boolean;
  title: string;
  message: string;
}) {
  const { colors } = useAppTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [p]);
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.35, 0.65]),
  }));
  return (
    <View className="flex-1 px-8 justify-center gap-5">
      <View className="items-center gap-3 mb-2">
        <ActivityIndicator color={colors.accent} size="large" />
        <Text className="text-xl font-bold text-center" style={{ color: colors.playerHudText }}>
          {title}
        </Text>
        <Text
          className="text-[15px] leading-[22px] text-center max-w-[320px]"
          style={{ color: colors.playerHudMuted }}
        >
          {message}
        </Text>
      </View>
      <Animated.View
        style={[
          a,
          {
            borderRadius: 26,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderColor: colors.playerHudBorder,
            borderWidth: 1,
            height: wide ? 160 : 128,
          },
        ]}
      />
      <Animated.View style={a} className="h-3 rounded-full bg-white/10 w-[88%]" />
      <Animated.View style={a} className="h-3 rounded-full bg-white/10 w-[55%]" />
    </View>
  );
}

export function PlayerScreen() {
  useKeepAwake();
  usePlayerOrientation(true);
  const { colors } = useAppTheme();
  const navigation = useAppNavigation();
  const isTV = useTV();
  const route = useRoute<RouteProp<RootStackParamList, 'Player'>>();
  const params = route.params;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isWideLayout = width >= 840 || (width > height && width >= 640);
  const nextPosterUri =
    params.next?.posterPath != null ? tmdbImg(params.next.posterPath, 'w342') : undefined;

  const videoRef = useRef<VideoRef>(null);
  const hudHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefsToken = useRef(0);
  const saveSelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** User chose a stream in settings; when auto-quality is on we otherwise always start at best MP4. */
  const manualSourcePickRef = useRef(false);

  const autoQuality = useSettingsStore((s) => s.autoQuality);
  const defaultRate = useSettingsStore((s) => s.defaultPlaybackRate);
  const cineproBaseUrl = useSettingsStore((s) => s.cineproBaseUrl);
  const autoplayNextEpisode = useSettingsStore((s) => s.autoplayNextEpisode);
  const setDefaultPlaybackRate = useSettingsStore((s) => s.setDefaultPlaybackRate);
  const playerResizeMode = useSettingsStore((s) => s.playerResizeMode);
  const playerAspectMode = useSettingsStore((s) => s.playerAspectMode);
  const setPlayerResizeMode = useSettingsStore((s) => s.setPlayerResizeMode);
  const setPlayerAspectMode = useSettingsStore((s) => s.setPlayerAspectMode);

  const coreConfigured = !!cineproBaseUrl.trim();
  const { omss, sorted, sourceIndex, setSourceIndex, activeSource, sortedKey } = usePlaybackSources({
    enabled: coreConfigured,
    mediaType: params.mediaType,
    tmdbId: params.tmdbId,
    season: params.season,
    episode: params.episode,
  });

  const streamState = useMemo(
    () => resolveStreamReadyState(coreConfigured, omss),
    [coreConfigured, omss.data, omss.error, omss.isError, omss.isFetching, omss.isPending]
  );

  const streamsLoading = streamState.status === 'loading';

  const [subtitleTrack, setSubtitleTrack] = useState(-1);
  const [rate, setRate] = useState(defaultRate);
  const [paused, setPaused] = useState(false);
  const [position, setPosition] = useState(0);
  const [playableDuration, setPlayableDuration] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hud, setHud] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [episodeListOpen, setEpisodeListOpen] = useState(false);
  const [controlsLocked, setControlsLocked] = useState(false);
  const playbackExhaustedRef = useRef(false);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  /** After CDN direct fails, retry same OMSS source through Core proxy once. */
  const [proxyRetrySig, setProxyRetrySig] = useState<string | null>(null);
  const fallbackCtxRef = useRef<PlaybackFallbackContext>({
    sourceIndex: 0,
    sourceCount: 0,
    uri: '',
  });
  const fallbackRetryRef = useRef<() => void>(() => undefined);
  const fallbackSwitchRef = useRef<(reason: string) => void>(() => undefined);
  const fallbackExhaustedRef = useRef<() => void>(() => undefined);
  const fallbackCtlRef = useRef<ReturnType<typeof createPlaybackFallbackController> | null>(null);
  if (fallbackCtlRef.current === null) {
    fallbackCtlRef.current = createPlaybackFallbackController({
      getContext: () => fallbackCtxRef.current,
      onRetrySameSource: () => fallbackRetryRef.current(),
      onSwitchSource: (reason) => fallbackSwitchRef.current(reason),
      onExhausted: () => fallbackExhaustedRef.current(),
    });
  }
  const fallbackCtl = fallbackCtlRef.current;
  const [sourceSwitchNotice, setSourceSwitchNotice] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const sourceSwitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nativeAudioTracks, setNativeAudioTracks] = useState<OnLoadData['audioTracks']>([]);
  const [nativeVideoTracks, setNativeVideoTracks] = useState<NonNullable<OnLoadData['videoTracks']>>([]);
  const [preferredAudioIdx, setPreferredAudioIdx] = useState(0);
  const [preferredVideoIdx, setPreferredVideoIdx] = useState(-1);
  const [gestureHud, setGestureHud] = useState<{ kind: 'brightness'; value: number } | null>(null);
  const brightnessGestureStart = useRef(1);
  const [videoNaturalSize, setVideoNaturalSize] = useState({ width: 0, height: 0 });

  const upsertContinue = useLibraryStore((s) => s.upsertContinue);
  const continueWatching = useLibraryStore((s) => s.continueWatching);
  const hasTmdb = useHasConfiguredTmdbKey();

  const isTvEpisode =
    params.mediaType === 'tv' && params.season != null && params.episode != null;

  const seasonQuery = useQuery({
    queryKey: qk.tvSeason(params.tmdbId, params.season ?? 0),
    queryFn: () => TmdbApi.tvSeason(params.tmdbId, params.season!),
    enabled: hasTmdb && isTvEpisode,
  });

  const seasonEpisodes = seasonQuery.data?.episodes ?? [];

  const tvNeighbors = useMemo(
    () => resolveTvNeighbors(params, seasonEpisodes),
    [params, seasonEpisodes]
  );

  const resumeByEpisode = useMemo(() => {
    if (!isTvEpisode || params.season == null) return {};
    const map: Record<number, number> = {};
    for (const row of continueWatching) {
      if (row.mediaType !== 'tv' || row.tmdbId !== params.tmdbId || row.season !== params.season) {
        continue;
      }
      if (row.episode != null && row.positionSec > 30) {
        map[row.episode] = row.positionSec;
      }
    }
    return map;
  }, [continueWatching, isTvEpisode, params.season, params.tmdbId]);

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

  useEffect(() => {
    setRate(defaultRate);
  }, [defaultRate]);

  useEffect(() => {
    manualSourcePickRef.current = false;
  }, [mediaKey]);

  useEffect(() => {
    const t = ++prefsToken.current;
    if (!sorted.length) return;
    void loadPlayerSelection(mediaKey).then((p) => {
      if (t !== prefsToken.current) return;
      if (p?.subtitleIdx != null && p.subtitleIdx >= -1) setSubtitleTrack(p.subtitleIdx);
      if (p?.audioIdx != null && p.audioIdx >= 0) setPreferredAudioIdx(p.audioIdx);
      if (p?.videoTrackIdx != null && p.videoTrackIdx >= -1) setPreferredVideoIdx(p.videoTrackIdx);

      if (!autoQuality && p?.sourceSig) {
        const idx = sorted.findIndex((s) => sourceSignature(s) === p.sourceSig);
        if (idx >= 0) {
          manualSourcePickRef.current = true;
          setSourceIndex(idx);
          return;
        }
      }
      const pick = pickAutoSource(sorted);
      const idx = pick ? sorted.indexOf(pick) : 0;
      setSourceIndex(idx >= 0 ? idx : 0);
    });
  }, [autoQuality, mediaKey, setSourceIndex, sorted, sortedKey]);

  useEffect(() => {
    if (!autoQuality || manualSourcePickRef.current || !sorted.length) return;
    const pick = pickAutoSource(sorted);
    const idx = pick ? sorted.indexOf(pick) : 0;
    setSourceIndex(idx >= 0 ? idx : 0);
  }, [autoQuality, setSourceIndex, sorted, sortedKey]);

  const backdropUri = useMemo(
    () => tmdbImg(params.backdropPath ?? params.posterPath, 'w500'),
    [params.backdropPath, params.posterPath]
  );

  const textTracks = useMemo(() => {
    const subs = omss.data?.subtitles ?? [];
    return subs.map((s) => ({
      title: `${s.label} (${s.format})`,
      language: 'en' as const,
      type: TextTrackType.VTT,
      uri: resolveProxyUrl(s.url),
    })) as TextTracks;
  }, [omss.data?.subtitles]);

  const playbackRequest = useMemo(() => {
    if (!activeSource) return null;
    const sig = sourceSignature(activeSource);
    return buildPlaybackRequest(activeSource.url, {
      forceProxy: proxyRetrySig === sig,
    });
  }, [activeSource, proxyRetrySig]);

  const uri = playbackRequest?.uri ?? '';

  useEffect(() => {
    if (activeSource && sniffDrmHint(activeSource.url)) {
      playbackLogger.warn('Stream URL hints at DRM; player has no license config for this title.', {
        type: activeSource.type,
      });
    }
  }, [activeSource]);

  const clearSourceSwitchTimer = useCallback(() => {
    if (sourceSwitchTimer.current) {
      clearTimeout(sourceSwitchTimer.current);
      sourceSwitchTimer.current = null;
    }
  }, []);

  useEffect(() => {
    fallbackCtxRef.current = {
      sourceIndex,
      sourceCount: sorted.length,
      uri,
      sourceType: activeSource?.type,
    };
  }, [activeSource?.type, sourceIndex, sorted.length, uri]);

  useEffect(() => {
    playbackExhaustedRef.current = false;
    setPlaybackAttempt(0);
    setProxyRetrySig(null);
    fallbackCtl.resetForUri();
    setNativeAudioTracks([]);
    setNativeVideoTracks([]);
    setPreferredAudioIdx(0);
    setPreferredVideoIdx(-1);
    setVideoNaturalSize({ width: 0, height: 0 });
  }, [activeSource ? sourceSignature(activeSource) : '', fallbackCtl]);

  useEffect(() => () => {
    clearSourceSwitchTimer();
    fallbackCtl.dispose();
  }, [clearSourceSwitchTimer, fallbackCtl]);

  const videoSource = useMemo(() => {
    if (!playbackRequest || !activeSource) return undefined;
    const contentType = videoSourceContentTypeForPlayback(
      activeSource.type,
      playbackRequest.uri
    );
    return {
      uri: playbackRequest.uri,
      ...(contentType ? { type: contentType } : {}),
      ...(playbackRequest.headers ? { headers: playbackRequest.headers } : {}),
      minLoadRetryCount: 2,
      bufferConfig: {
        minBufferMs: 20_000,
        maxBufferMs: 60_000,
        bufferForPlaybackMs: 2200,
        bufferForPlaybackAfterRebufferMs: 4800,
      },
    };
  }, [activeSource, playbackRequest]);

  useEffect(() => {
    if (activeSource && playbackRequest) {
      playbackLogger.info('Playback request', loggablePlaybackRequest(activeSource, playbackRequest));
    }
  }, [activeSource, playbackRequest]);

  const selectedAudioTrack = useMemo(() => {
    if (!nativeAudioTracks.length) return { type: SelectedTrackType.SYSTEM } as const;
    const idx = Math.min(preferredAudioIdx, nativeAudioTracks.length - 1);
    const v = nativeAudioTracks[idx]?.index;
    return { type: SelectedTrackType.INDEX, value: v ?? idx } as const;
  }, [nativeAudioTracks, preferredAudioIdx]);

  const selectedVideoTrack = useMemo(() => {
    if (preferredVideoIdx < 0 || !nativeVideoTracks.length) {
      return { type: SelectedVideoTrackType.AUTO } as const;
    }
    const idx = Math.min(preferredVideoIdx, nativeVideoTracks.length - 1);
    const v = nativeVideoTracks[idx]?.index;
    return { type: SelectedVideoTrackType.INDEX, value: v ?? idx } as const;
  }, [nativeVideoTracks, preferredVideoIdx]);

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

  const persistTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    persistTimer.current = setInterval(persistProgress, 9000);
    return () => {
      if (persistTimer.current) clearInterval(persistTimer.current);
      persistProgress();
    };
  }, [persistProgress]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') persistProgress();
    });
    return () => sub.remove();
  }, [persistProgress]);

  useEffect(() => {
    if (!activeSource) return;
    if (saveSelTimer.current) clearTimeout(saveSelTimer.current);
    saveSelTimer.current = setTimeout(() => {
      void savePlayerSelection(mediaKey, {
        ...(!autoQuality || manualSourcePickRef.current
          ? { sourceSig: sourceSignature(activeSource) }
          : {}),
        subtitleIdx: subtitleTrack,
        audioIdx: preferredAudioIdx,
        videoTrackIdx: preferredVideoIdx,
      });
    }, 450);
    return () => {
      if (saveSelTimer.current) clearTimeout(saveSelTimer.current);
    };
  }, [activeSource, autoQuality, mediaKey, preferredAudioIdx, preferredVideoIdx, subtitleTrack]);

  const clearHudTimer = useCallback(() => {
    if (hudHideTimer.current) {
      clearTimeout(hudHideTimer.current);
      hudHideTimer.current = null;
    }
  }, []);

  const scheduleHudHide = useCallback(() => {
    clearHudTimer();
    if (Platform.isTV || settingsOpen || episodeListOpen || paused || controlsLocked) return;
    hudHideTimer.current = setTimeout(() => setHud(false), 5200);
  }, [clearHudTimer, controlsLocked, episodeListOpen, paused, settingsOpen]);

  useEffect(() => {
    if (!hud || Platform.isTV || settingsOpen || episodeListOpen || paused || controlsLocked) {
      clearHudTimer();
      return;
    }
    scheduleHudHide();
    return clearHudTimer;
  }, [controlsLocked, episodeListOpen, hud, paused, scheduleHudHide, settingsOpen, clearHudTimer]);

  const goToEpisodeRef = useCallback(
    (ref: PlayerEpisodeRef) => {
      const ep = seasonEpisodes.find((e) => e.episode_number === ref.episode);
      const showTitle =
        ref.showTitle ?? params.showTitle ?? params.title.split(' · ')[0]?.trim() ?? 'Series';
      const resumeKey = mediaStorageKey({
        mediaType: 'tv',
        tmdbId: ref.tmdbId,
        season: ref.season,
        episode: ref.episode,
      });
      const savedResume = continueWatching.find((c) => c.mediaKey === resumeKey)?.positionSec;
      const nextParams = buildTvPlayerParams({
        tmdbId: ref.tmdbId,
        seasonNumber: ref.season,
        episodeNumber: ref.episode,
        episodeTitle: ref.episodeTitle ?? ep?.name ?? `Episode ${ref.episode}`,
        showTitle,
        episodes: seasonEpisodes.length
          ? seasonEpisodes
          : [{ episode_number: ref.episode, name: ref.episodeTitle ?? `Episode ${ref.episode}` }],
        posterPath: ref.posterPath ?? params.posterPath,
        backdropPath: ref.backdropPath ?? params.backdropPath,
        resumeSec: savedResume,
      });
      navigation.replace('Player', nextParams);
      setEpisodeListOpen(false);
    },
    [continueWatching, navigation, params, seasonEpisodes]
  );

  const playEpisodeAt = useCallback(
    (episodeNumber: number, episodeTitle: string) => {
      goToEpisodeRef({
        mediaType: 'tv',
        tmdbId: params.tmdbId,
        season: params.season!,
        episode: episodeNumber,
        episodeTitle,
        showTitle: params.showTitle,
        posterPath: params.posterPath,
        backdropPath: params.backdropPath,
      });
    },
    [goToEpisodeRef, params]
  );

  useAndroidTVBack(() => {
    if (episodeListOpen) {
      setEpisodeListOpen(false);
      return true;
    }
    if (settingsOpen) {
      setSettingsOpen(false);
      return true;
    }
    if (isTV && hud) {
      setHud(false);
      return true;
    }
    navigation.goBack();
    return true;
  });

  useEffect(() => {
    if (!tvNeighbors.next || !autoplayNextEpisode) return;
    if (!duration) return;
    const left = duration - position;
    if (left > 22 || left < 0) return;
    const id = setTimeout(() => {
      goToEpisodeRef(tvNeighbors.next!);
    }, 11_000);
    return () => clearTimeout(id);
  }, [autoplayNextEpisode, duration, goToEpisodeRef, position, tvNeighbors.next]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        videoRef.current?.seek(Math.max(0, position - 10));
      } else if (e.code === 'ArrowRight') {
        videoRef.current?.seek(Math.min(duration || 0, position + 10));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration, position]);

  const onSeekStart = useCallback(() => {
    fallbackCtl.onSeekStart();
  }, [fallbackCtl]);

  const onSeekEnd = useCallback(() => {
    fallbackCtl.onSeekEnd();
  }, [fallbackCtl]);

  const seekTo = useCallback(
    (seconds: number, opts?: { signalSeek?: boolean }) => {
      const ref = videoRef.current;
      if (!ref || !duration) return;
      if (opts?.signalSeek !== false) {
        onSeekStart();
      }
      const next = Math.max(0, Math.min(duration, seconds));
      ref.seek(next);
      setPosition(next);
    },
    [duration, onSeekStart]
  );

  const seekBy = useCallback(
    (delta: number) => {
      seekTo(position + delta);
    },
    [position, seekTo]
  );

  const seekRatio = useCallback(
    (ratio: number) => {
      if (!duration) return;
      const ref = videoRef.current;
      if (!ref) return;
      const next = Math.max(0, Math.min(duration, ratio * duration));
      ref.seek(next);
      setPosition(next);
    },
    [duration]
  );

  const togglePlayback = useCallback(() => {
    setPaused((p) => !p);
    if (!Platform.isTV) scheduleHudHide();
  }, [scheduleHudHide]);

  useTVEventHandler(
    useCallback(
      (evt) => {
        if (!isTV || settingsOpen || episodeListOpen || controlsLocked || !uri) return;

        switch (evt.eventType) {
          case 'playPause':
            setPaused((p) => !p);
            break;
          case 'left':
            seekBy(-10);
            break;
          case 'right':
            seekBy(10);
            break;
          case 'up':
            setHud(true);
            break;
          case 'down':
            setHud(false);
            break;
          case 'select':
            setHud((visible) => !visible);
            break;
          case 'menu':
            if (hud) {
              setHud(false);
            } else {
              navigation.goBack();
            }
            break;
          default:
            break;
        }
      },
      [controlsLocked, episodeListOpen, hud, isTV, navigation, seekBy, settingsOpen, uri]
    ),
    isTV && !!uri
  );

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const bufferedProgress =
    duration > 0 ? Math.min(1, Math.max(0, playableDuration / duration)) : 0;

  /** Larger tap targets, thicker chrome, and thumb-friendly scrub strip on Android phones. */
  const isAndroidPhone = Platform.OS === 'android' && !Platform.isTV;
  const detectedAspectLabel = formatAspectLabel(videoNaturalSize.width, videoNaturalSize.height);
  const framedAspectRatio = isAndroidPhone ? aspectRatioValue(playerAspectMode) : undefined;
  const chromeBottomPad = Math.max(insets.bottom, isAndroidPhone ? 22 : 16);
  const chromeTopPad = Math.max(insets.top, isAndroidPhone ? 14 : 10);
  const gestureEdgeW = isAndroidPhone ? 92 : 76;
  const dockPadX = isAndroidPhone ? 16 : 18;
  const bottomScrimH = isAndroidPhone ? 380 : 340;

  const iconHitSlop = isAndroidPhone
    ? ({ top: 10, bottom: 10, left: 10, right: 10 } as const)
    : ({ top: 6, bottom: 6, left: 6, right: 6 } as const);
  const circleBtn = isAndroidPhone ? 50 : 46;
  const circleBtnLg = isAndroidPhone ? 72 : 68;
  const circleIcon = isAndroidPhone ? 22 : 20;
  const circleIconLg = isAndroidPhone ? 34 : 32;

  const openSettings = () => {
    setSettingsOpen(true);
    clearHudTimer();
  };

  const showNoSourcesLeftDialog = useCallback(() => {
    if (playbackExhaustedRef.current) return;
    playbackExhaustedRef.current = true;
    setPaused(true);
    setSourceSwitchNotice(null);
    clearSourceSwitchTimer();

    const sourceCount = sorted.length;
    Alert.alert(
      'Unable to play',
      sourceCount > 0
        ? `We tried ${sourceCount} stream${sourceCount === 1 ? '' : 's'} from your Core server, but none could be played on this device. Reload streams or go back and try again later.`
        : 'No playable streams are available for this title right now. Check that CinePro Core is running, then reload or try again later.',
      [
        {
          text: 'Reload streams',
          onPress: () => {
            playbackExhaustedRef.current = false;
            setSourceIndex(0);
            void omss.refetch();
          },
        },
        {
          text: 'Go back',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }, [clearSourceSwitchTimer, navigation, omss, setSourceIndex, sorted.length]);

  const showSourceSwitchNotice = useCallback(
    (nextSource: (typeof sorted)[number] | undefined, nextIndex: number) => {
      const label = nextSource
        ? `${nextSource.quality.toUpperCase()} · ${nextSource.provider.name}`
        : `stream ${nextIndex + 1} of ${sorted.length}`;
      setSourceSwitchNotice({
        title: 'Switching sources…',
        detail: `Trying ${label}`,
      });
      clearSourceSwitchTimer();
      sourceSwitchTimer.current = setTimeout(() => setSourceSwitchNotice(null), 5000);
    },
    [clearSourceSwitchTimer, sorted.length]
  );

  const retryCurrentSource = useCallback(() => {
    setPlaybackAttempt((n) => n + 1);
  }, []);

  const switchToNextSource = useCallback(
    (reason: string) => {
      setSourceIndex((i) => {
        if (i >= sorted.length - 1) {
          showNoSourcesLeftDialog();
          return i;
        }
        const nextIndex = i + 1;
        playbackLogger.info('Switching to next source', {
          reason,
          fromIndex: i,
          nextIndex,
          uriTail: uri ? uri.slice(-72) : undefined,
        });
        showSourceSwitchNotice(sorted[nextIndex], nextIndex);
        fallbackCtl.onSourceSwitched();
        setProxyRetrySig(null);
        setPlaybackAttempt(0);
        return nextIndex;
      });
    },
    [fallbackCtl, showNoSourcesLeftDialog, showSourceSwitchNotice, sorted, setSourceIndex, uri]
  );

  fallbackRetryRef.current = retryCurrentSource;
  fallbackSwitchRef.current = switchToNextSource;
  fallbackExhaustedRef.current = showNoSourcesLeftDialog;

  const onPlaybackError = useCallback(
    (e: OnVideoErrorData) => {
      if (
        activeSource &&
        playbackRequest?.via === 'upstream' &&
        isAndroidExoNetworkOrSourceError(e)
      ) {
        const sig = sourceSignature(activeSource);
        if (proxyRetrySig !== sig) {
          playbackLogger.info('CDN direct failed — retrying via Core proxy', {
            sig,
            quality: activeSource.quality,
          });
          setProxyRetrySig(sig);
          setPlaybackAttempt((n) => n + 1);
          return;
        }
      }
      fallbackCtl.onPlaybackError(e);
    },
    [activeSource, fallbackCtl, playbackRequest?.via, proxyRetrySig]
  );

  const brightnessStripPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !controlsLocked && !Platform.isTV && !!uri,
        onMoveShouldSetPanResponder: (_, g) => !controlsLocked && !Platform.isTV && Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          void (async () => {
            try {
              if (await Brightness.isAvailableAsync()) {
                const p = await Brightness.requestPermissionsAsync();
                if (p.granted) {
                  brightnessGestureStart.current = await Brightness.getBrightnessAsync();
                }
              }
            } catch {
              /* gesture optional */
            }
          })();
        },
        onPanResponderMove: (_, g) => {
          void (async () => {
            try {
              const next = Math.max(
                0,
                Math.min(1, brightnessGestureStart.current - g.dy / 480)
              );
              await Brightness.setBrightnessAsync(next);
              setGestureHud({ kind: 'brightness', value: next });
            } catch {
              /* ignore */
            }
          })();
        },
        onPanResponderRelease: () => setGestureHud(null),
        onPanResponderTerminate: () => setGestureHud(null),
      }),
    [controlsLocked, uri]
  );

  const [miniMetaVisible, setMiniMetaVisible] = useState(true);
  useEffect(() => {
    if (hud || controlsLocked || !uri) {
      setMiniMetaVisible(false);
      return;
    }
    setMiniMetaVisible(true);
    const id = setTimeout(() => setMiniMetaVisible(false), 4200);
    return () => clearTimeout(id);
  }, [controlsLocked, hud, uri, params.title]);

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      {uri ? (
        <View className="flex-1" collapsable={false}>
          <View
            className="flex-1"
            style={
              framedAspectRatio
                ? { justifyContent: 'center', alignItems: 'center' }
                : undefined
            }
          >
            <View
              style={
                framedAspectRatio
                  ? { width: '100%', aspectRatio: framedAspectRatio, maxHeight: '100%' }
                  : { flex: 1, alignSelf: 'stretch' }
              }
            >
              <Video
                ref={videoRef}
                key={`${activeSource ? sourceSignature(activeSource) : 'no-source'}:${sourceIndex}:${playbackAttempt}`}
                source={videoSource}
                style={{ flex: 1 }}
                viewType={Platform.OS === 'android' ? ViewType.TEXTURE : undefined}
                resizeMode={isAndroidPhone ? playerResizeMode : 'cover'}
                paused={paused}
            rate={rate}
            volume={1}
            progressUpdateInterval={450}
            bufferingStrategy={BufferingStrategyType.DEFAULT}
            onLoad={(data: OnLoadData) => {
              setDuration(data.duration);
              setPlayableDuration(0);
              playbackExhaustedRef.current = false;
              fallbackCtl.onPlaying();
              setSourceSwitchNotice(null);
              clearSourceSwitchTimer();
              if (data.naturalSize?.width && data.naturalSize?.height) {
                setVideoNaturalSize({
                  width: data.naturalSize.width,
                  height: data.naturalSize.height,
                });
              }
              setNativeAudioTracks(data.audioTracks ?? []);
              setNativeVideoTracks(data.videoTracks ?? []);
              playbackLogger.info('Video loaded', {
                audioTracks: data.audioTracks?.length ?? 0,
                videoTracks: data.videoTracks?.length ?? 0,
                duration: data.duration,
              });
              if (data.audioTracks?.length) {
                const idx = Math.min(preferredAudioIdx, data.audioTracks.length - 1);
                setPreferredAudioIdx(Math.max(0, idx));
              }
              const start = params.resumeSec ?? 0;
              if (start > 3) {
                videoRef.current?.seek(start);
                setPosition(start);
              }
            }}
            onProgress={(ev) => {
              setPosition(ev.currentTime);
              setPlayableDuration(ev.playableDuration ?? 0);
            }}
            onBuffer={(ev) => {
              fallbackCtl.onBuffer(ev.isBuffering);
            }}
            onSeek={() => {
              onSeekEnd();
            }}
            onError={onPlaybackError}
            onAspectRatio={
              isAndroidPhone
                ? (e) => {
                    if (e.width > 0 && e.height > 0) {
                      setVideoNaturalSize({ width: e.width, height: e.height });
                    }
                  }
                : undefined
            }
            textTracks={textTracks}
            selectedTextTrack={
              subtitleTrack >= 0
                ? { type: SelectedTrackType.INDEX, value: subtitleTrack }
                : { type: SelectedTrackType.DISABLED }
            }
            selectedAudioTrack={selectedAudioTrack}
            selectedVideoTrack={selectedVideoTrack}
            preventsDisplaySleepDuringVideoPlayback
            renderLoader={() => (
              <View
                pointerEvents="none"
                className="absolute inset-0 items-center justify-center bg-black/25"
              >
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            )}
              />
            </View>
          </View>

          {!Platform.isTV ? (
            <View
              {...brightnessStripPan.panHandlers}
              pointerEvents="box-only"
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: gestureEdgeW, zIndex: 3 }}
            />
          ) : null}

          {!Platform.isTV && miniMetaVisible ? (
            <Animated.View
              entering={undefined}
              style={[StyleSheet.absoluteFillObject, { zIndex: 4 }]}
              pointerEvents="none"
              className="justify-start"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'transparent']}
                style={{ paddingTop: chromeTopPad, paddingHorizontal: dockPadX, paddingBottom: 20 }}
              >
                <Text
                  className={`text-white font-bold max-w-[88%] ${isAndroidPhone ? 'text-[16px] leading-[22px]' : 'text-[15px]'}`}
                  numberOfLines={2}
                >
                  {params.title}
                </Text>
                {params.mediaType === 'tv' && params.episodeTitle ? (
                  <Text
                    className={`text-accent/90 mt-1 font-medium max-w-[88%] ${isAndroidPhone ? 'text-[13px]' : 'text-[12px]'}`}
                    numberOfLines={1}
                  >
                    {params.episodeTitle}
                  </Text>
                ) : null}
              </LinearGradient>
            </Animated.View>
          ) : null}

          {!Platform.isTV && !controlsLocked ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show or hide playback controls"
              style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}
              onPress={() => {
                if (settingsOpen) return;
                setHud((h) => !h);
              }}
            />
          ) : null}

          {controlsLocked && !Platform.isTV ? (
            <Pressable
              style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]}
              onPress={() => setControlsLocked(false)}
              accessibilityLabel="Unlock controls"
            >
              <View
                className={`absolute self-center rounded-full bg-black/75 border border-white/28 flex-row items-center gap-2.5 shadow-lg ${isAndroidPhone ? 'px-6 py-4' : 'px-5 py-3'}`}
                style={{
                  alignSelf: 'center',
                  left: 0,
                  right: 0,
                  marginHorizontal: 'auto',
                  bottom: Math.max(insets.bottom, isAndroidPhone ? 28 : 24),
                }}
              >
                <Ionicons name="lock-open-outline" color="#fff" size={isAndroidPhone ? 22 : 20} />
                <Text className={`text-white font-bold ${isAndroidPhone ? 'text-[15px]' : 'text-sm'}`}>
                  Tap to unlock
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      ) : streamsLoading ? (
        <PlayerFetchSkeleton
          wide={isWideLayout}
          title={streamState.title}
          message={streamState.message}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-10 gap-5">
          <LinearGradient
            colors={['rgba(229,9,20,0.22)', 'rgba(0,0,0,0)']}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: '55%',
              opacity: 0.85,
            }}
          />
          <View className="w-[88px] h-[88px] rounded-full bg-white/8 border border-white/15 items-center justify-center">
            <Ionicons
              name={
                streamState.status === 'no_core'
                  ? 'settings-outline'
                  : streamState.status === 'error'
                    ? 'alert-circle-outline'
                    : 'film-outline'
              }
              color="rgba(255,255,255,0.85)"
              size={40}
            />
          </View>
          <View className="items-center gap-2">
            <Text className="text-white text-center text-xl font-bold tracking-tight">
              {streamState.status === 'no_core' ||
              streamState.status === 'error' ||
              streamState.status === 'empty'
                ? streamState.title
                : 'Nothing to play'}
            </Text>
            <Text className="text-white/55 text-center text-[15px] leading-[22px] max-w-[320px]">
              {streamState.status === 'no_core' ||
              streamState.status === 'error' ||
              streamState.status === 'empty'
                ? streamState.message
                : 'There are no playable streams for this title right now.'}
            </Text>
          </View>
          {streamState.status === 'no_core' ? (
            <FocusSurface
              onPress={() => navigation.navigate('Settings')}
              className="rounded-full bg-accent px-8 py-3.5 active:opacity-90 shadow-lg"
              focusVariant="accent"
              hasTVPreferredFocus={isTV}
              accessibilityLabel="Open settings"
            >
              <Text className="text-white font-bold text-[15px]">Open Settings</Text>
            </FocusSurface>
          ) : (
            <FocusSurface
              onPress={() => omss.refetch()}
              className="rounded-full bg-accent px-8 py-3.5 active:opacity-90 shadow-lg"
              focusVariant="accent"
              hasTVPreferredFocus={isTV}
              accessibilityLabel="Retry loading streams"
            >
              <Text className="text-white font-bold text-[15px]">Try again</Text>
            </FocusSurface>
          )}
        </View>
      )}

      {gestureHud ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { zIndex: 25 }]}
          className="items-center justify-center"
        >
          <BlurView
            intensity={44}
            tint="dark"
            className={`rounded-2xl overflow-hidden border border-white/18 ${isAndroidPhone ? 'px-8 py-5' : 'px-7 py-4'}`}
          >
            <Text className={`text-white font-bold ${isAndroidPhone ? 'text-lg' : 'text-base'}`}>
              Brightness{' '}
              {Math.round(gestureHud.value * 100)}%
            </Text>
          </BlurView>
        </View>
      ) : null}

      {sourceSwitchNotice ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { zIndex: 26 }]}
          className="items-center justify-center px-8"
        >
          <BlurView
            intensity={48}
            tint="dark"
            className={`rounded-2xl overflow-hidden border border-accent/40 max-w-[340px] w-full ${isAndroidPhone ? 'px-7 py-5' : 'px-6 py-4'}`}
          >
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color={colors.accent} size="small" />
              <View className="flex-1 gap-1">
                <Text
                  className={`text-white font-bold ${isAndroidPhone ? 'text-[16px]' : 'text-[15px]'}`}
                >
                  {sourceSwitchNotice.title}
                </Text>
                <Text className="text-white/65 text-[13px] leading-[18px]">
                  {sourceSwitchNotice.detail}
                </Text>
              </View>
            </View>
          </BlurView>
        </View>
      ) : null}

      {(!Platform.isTV && hud && paused) || (hud && !controlsLocked) ? (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { zIndex: 6 }]}>
          {!Platform.isTV && hud && paused ? (
            <Pressable
              className="absolute inset-0 items-center justify-center"
              onPress={() => setPaused(false)}
              accessibilityLabel="Play"
            >
              <View
                className="rounded-full bg-accent items-center justify-center shadow-2xl shadow-black/50"
                style={{ width: circleBtnLg + 12, height: circleBtnLg + 12 }}
              >
                <Ionicons
                  name="play"
                  color="#fff"
                  size={circleIconLg}
                  style={{ marginLeft: isAndroidPhone ? 5 : 4 }}
                />
              </View>
            </Pressable>
          ) : null}

          {hud && !controlsLocked ? (
            <>
              <LinearGradient
                pointerEvents="none"
                colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
                locations={[0, 0.42, 1]}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: bottomScrimH,
                }}
              />

              <View
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  top: chromeTopPad,
                  left: dockPadX,
                  right: dockPadX,
                  zIndex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <FocusSurface
                  className="rounded-full items-center justify-center bg-accent active:opacity-90"
                  style={{ width: circleBtn, height: circleBtn }}
                  focusVariant="onMedia"
                  hitSlop={iconHitSlop}
                  onPress={() => navigation.goBack()}
                  accessibilityLabel="Close player"
                >
                  <Ionicons name="chevron-down" color="#fff" size={isAndroidPhone ? 26 : 24} />
                </FocusSurface>

                {isTvEpisode ? (
                  <FocusSurface
                    className="rounded-full items-center justify-center bg-accent active:opacity-90 flex-row gap-2 px-4"
                    style={{ height: circleBtn, minWidth: circleBtn }}
                    hitSlop={iconHitSlop}
                    onPress={() => setEpisodeListOpen(true)}
                    accessibilityLabel="Choose episode"
                  >
                    <Ionicons name="list" color="#fff" size={isAndroidPhone ? 20 : 18} />
                    <Text className="text-white font-bold text-[13px]">
                      S{params.season} E{params.episode}
                    </Text>
                  </FocusSurface>
                ) : null}
              </View>

              <View
                pointerEvents="box-none"
                style={{
                  paddingBottom: chromeBottomPad,
                  paddingHorizontal: dockPadX,
                }}
                className={`absolute left-0 right-0 bottom-0 ${isAndroidPhone ? 'gap-3.5' : 'gap-3'}`}
              >
                {introEnd != null && introEnd > 0 && position < introEnd ? (
                  <FocusSurface
                    className={`self-center flex-row items-center gap-2 rounded-full bg-accent shadow-lg ${
                      isAndroidPhone ? 'px-6 py-3.5' : 'px-5 py-3'
                    }`}
                    onPress={() => seekTo(introEnd)}
                    accessibilityLabel="Skip intro"
                  >
                    <Ionicons name="play-forward" color="#fff" size={isAndroidPhone ? 18 : 16} />
                    <Text
                      className={`text-white font-bold ${isAndroidPhone ? 'text-[14px]' : 'text-[13px]'}`}
                    >
                      Skip intro
                    </Text>
                  </FocusSurface>
                ) : null}

                {tvNeighbors.next && duration - position < 32 ? (
                  <View className="rounded-2xl overflow-hidden border border-accent/35 bg-black/55 mb-1">
                    <View className="flex-row gap-3 p-3">
                      <View className="w-[72px] h-[48px] rounded-xl overflow-hidden bg-white/10">
                        {nextPosterUri ? (
                          <Image
                            source={{ uri: nextPosterUri }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="flex-1 bg-white/10" />
                        )}
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="text-accent text-[11px] font-bold uppercase tracking-wider">
                          Up next
                        </Text>
                        <Text className="text-white font-semibold text-[14px]" numberOfLines={2}>
                          {tvNeighbors.next.episodeTitle ?? `Episode ${tvNeighbors.next.episode}`}
                        </Text>
                        <Text className="text-white/50 text-[11px]">
                          {autoplayNextEpisode
                            ? `Autoplay in ${Math.max(0, Math.ceil(11 - (duration - position)))}s`
                            : 'Autoplay off in Settings'}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row border-t border-white/10">
                      <FocusSurface
                        className="flex-1 py-3 border-r border-white/10"
                        focusVariant="accent"
                        onPress={() => goToEpisodeRef(tvNeighbors.next!)}
                        accessibilityLabel="Play next episode now"
                      >
                        <Text className="text-accent text-center font-bold text-[13px]">Play now</Text>
                      </FocusSurface>
                      <FocusSurface
                        className="flex-1 py-3"
                        focusVariant="subtle"
                        onPress={() =>
                          navigation.setParams({
                            next: undefined,
                          } as Partial<PlayerRouteParams>)
                        }
                        accessibilityLabel="Dismiss up next"
                      >
                        <Text className="text-white/70 text-center font-semibold text-[13px]">Dismiss</Text>
                      </FocusSurface>
                    </View>
                  </View>
                ) : null}

                <View className="flex-row justify-between items-center px-0.5">
                  <Text
                    className={`text-accent font-semibold tabular-nums ${isAndroidPhone ? 'text-[15px]' : 'text-sm'}`}
                  >
                    {formatDuration(position)}
                  </Text>
                  <Text
                    className={`text-accent/75 tabular-nums font-medium ${isAndroidPhone ? 'text-[15px]' : 'text-sm'}`}
                  >
                    {formatDuration(duration)}
                  </Text>
                </View>

                <PlayerProgressBar
                  progress={progress}
                  bufferedProgress={bufferedProgress}
                  disabled={controlsLocked}
                  isTv={Platform.isTV}
                  cinematic
                  duration={duration}
                  onSeekRatio={seekRatio}
                  onScrubStart={onSeekStart}
                  onScrubEnd={onSeekEnd}
                  formatDuration={formatDuration}
                />

                <View className="flex-row items-center mt-1 w-full">
                  {isAndroidPhone ? (
                    <View className="flex-row items-center gap-2.5 mr-2">
                      <PlayerDisplayHudControls
                        resizeMode={playerResizeMode}
                        aspectMode={playerAspectMode}
                        detectedAspectLabel={detectedAspectLabel}
                        onResizeModeChange={setPlayerResizeMode}
                        onAspectModeChange={setPlayerAspectMode}
                        buttonSize={circleBtn}
                        hitSlop={iconHitSlop}
                      />
                    </View>
                  ) : null}

                  <View
                    className={`flex-1 flex-row items-center justify-center ${isAndroidPhone ? 'gap-2' : 'gap-3'}`}
                  >
                  {isTvEpisode ? (
                    <FocusSurface
                      className={`rounded-full items-center justify-center bg-accent active:opacity-90 ${!tvNeighbors.prev ? 'opacity-35' : ''}`}
                      style={{ width: circleBtn, height: circleBtn }}
                      hitSlop={iconHitSlop}
                      onPress={() => tvNeighbors.prev && goToEpisodeRef(tvNeighbors.prev)}
                      accessibilityLabel="Previous episode"
                      disabled={!tvNeighbors.prev}
                    >
                      <Ionicons name="play-skip-back" color="#fff" size={circleIcon} />
                    </FocusSurface>
                  ) : null}

                  <FocusSurface
                    className="rounded-full items-center justify-center bg-accent active:opacity-90"
                    style={{ width: circleBtn, height: circleBtn }}
                    hitSlop={iconHitSlop}
                    onPress={() => seekBy(-10)}
                    accessibilityLabel="Back 10 seconds"
                  >
                    <Ionicons name="play-back" color="#fff" size={circleIcon} />
                  </FocusSurface>

                  <FocusSurface
                    className="rounded-full items-center justify-center bg-accent active:opacity-90"
                    style={{ width: circleBtnLg, height: circleBtnLg }}
                    focusVariant="onMedia"
                    hitSlop={iconHitSlop}
                    onPress={togglePlayback}
                    hasTVPreferredFocus={isTV && hud}
                    accessibilityLabel={paused ? 'Play' : 'Pause'}
                  >
                    <Ionicons
                      name={paused ? 'play' : 'pause'}
                      color="#fff"
                      size={circleIconLg}
                      style={paused ? { marginLeft: isAndroidPhone ? 4 : 3 } : undefined}
                    />
                  </FocusSurface>

                  <FocusSurface
                    className="rounded-full items-center justify-center bg-accent active:opacity-90"
                    style={{ width: circleBtn, height: circleBtn }}
                    hitSlop={iconHitSlop}
                    onPress={() => seekBy(10)}
                    accessibilityLabel="Forward 10 seconds"
                  >
                    <Ionicons name="play-forward" color="#fff" size={circleIcon} />
                  </FocusSurface>

                  {isTvEpisode ? (
                    <FocusSurface
                      className={`rounded-full items-center justify-center bg-accent active:opacity-90 ${!tvNeighbors.next ? 'opacity-35' : ''}`}
                      style={{ width: circleBtn, height: circleBtn }}
                      hitSlop={iconHitSlop}
                      onPress={() => tvNeighbors.next && goToEpisodeRef(tvNeighbors.next)}
                      accessibilityLabel="Next episode"
                      disabled={!tvNeighbors.next}
                    >
                      <Ionicons name="play-skip-forward" color="#fff" size={circleIcon} />
                    </FocusSurface>
                  ) : null}

                  <FocusSurface
                    className="rounded-full items-center justify-center bg-accent active:opacity-90"
                    style={{ width: circleBtn, height: circleBtn }}
                    hitSlop={iconHitSlop}
                    onPress={openSettings}
                    accessibilityLabel="Playback settings"
                  >
                    <Ionicons name="settings-outline" color="#fff" size={circleIcon} />
                  </FocusSurface>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {isTvEpisode ? (
        <PlayerEpisodeSidebar
          visible={episodeListOpen}
          onClose={() => setEpisodeListOpen(false)}
          seasonLabel={seasonQuery.data?.name ?? `Season ${params.season}`}
          showTitle={params.showTitle ?? params.title.split(' · ')[0]?.trim()}
          episodes={seasonEpisodes}
          currentEpisode={params.episode}
          resumeByEpisode={resumeByEpisode}
          loading={seasonQuery.isLoading}
          onSelectEpisode={playEpisodeAt}
        />
      ) : null}

      <PlayerSettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        rates={RATES}
        rate={rate}
        onRateChange={(r) => {
          setRate(r);
          setDefaultPlaybackRate(r);
        }}
        textTracks={textTracks}
        subtitleTrack={subtitleTrack}
        onSubtitleChange={setSubtitleTrack}
        sortedSources={sorted}
        sourceIndex={sourceIndex}
        onSourceChange={(idx) => {
          manualSourcePickRef.current = true;
          setSourceIndex(idx);
        }}
        audioTracks={nativeAudioTracks}
        preferredAudioIdx={preferredAudioIdx}
        onAudioIdxChange={setPreferredAudioIdx}
        videoTracks={nativeVideoTracks}
        preferredVideoIdx={preferredVideoIdx}
        onVideoIdxChange={setPreferredVideoIdx}
        onMarkIntroEnd={() => {
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
      />
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
