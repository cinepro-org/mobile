import React, { memo } from 'react';
import { Platform, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FocusSurface } from '@/tv/FocusSurface';
import { PlayerProgressBar } from '@/player/PlayerProgressBar';
import { TV_CONTROL_FOCUS_SCALE } from '@/tv/focusStyles';
import { useOverlayInitialFocus } from '@/tv/useInitialTVFocus';
import { useTVFocusHandle } from '@/tv/useTVFocusHandle';
import { fontScale } from '@/utils/layout';

type EpisodeNeighbors = {
  prev?: { episode: number } | null;
  next?: { episode: number; episodeTitle?: string } | null;
};

type Props = {
  visible: boolean;
  title: string;
  episodeTitle?: string;
  isTvEpisode: boolean;
  season?: number;
  episode?: number;
  paused: boolean;
  position: number;
  duration: number;
  progress: number;
  bufferedProgress: number;
  introEnd: number | null;
  tvNeighbors: EpisodeNeighbors;
  autoplayNextEpisode: boolean;
  nextPosterUri?: string;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onSeekRatio: (ratio: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  onOpenEpisodes: () => void;
  onOpenSettings: () => void;
  onSkipIntro: () => void;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  onPlayNextNow: () => void;
  onDismissUpNext: () => void;
  onRequestShow: () => void;
  formatDuration: (sec: number) => string;
  topPad: number;
  bottomPad: number;
  horizontalPad: number;
};

const OVERLAY_Z = 20;
const OVERLAY_ELEVATION = 20;
const BTN = TV_CONTROL_FOCUS_SCALE;

/**
 * Android TV player control overlay — large focusable transport controls,
 * auto-shown on playback start and remote input.
 */
export const TVPlayerControls = memo(function TVPlayerControls({
  visible,
  title,
  episodeTitle,
  isTvEpisode,
  season,
  episode,
  paused,
  position,
  duration,
  progress,
  bufferedProgress,
  introEnd,
  tvNeighbors,
  autoplayNextEpisode,
  nextPosterUri,
  onClose,
  onTogglePlay,
  onSeekBack,
  onSeekForward,
  onSeekRatio,
  onScrubStart,
  onScrubEnd,
  onOpenEpisodes,
  onOpenSettings,
  onSkipIntro,
  onPrevEpisode,
  onNextEpisode,
  onPlayNextNow,
  onDismissUpNext,
  onRequestShow,
  formatDuration,
  topPad,
  bottomPad,
  horizontalPad,
}: Props) {
  const playFocus = useOverlayInitialFocus(visible);
  const closeBtn = useTVFocusHandle();
  const episodesBtn = useTVFocusHandle();
  const skipIntroBtn = useTVFocusHandle();
  const progressBar = useTVFocusHandle();
  const prevBtn = useTVFocusHandle();
  const seekBackBtn = useTVFocusHandle();
  const playBtn = useTVFocusHandle();
  const seekForwardBtn = useTVFocusHandle();
  const nextBtn = useTVFocusHandle();
  const settingsBtn = useTVFocusHandle();

  const showSkipIntro = introEnd != null && introEnd > 0 && position < introEnd;
  const showUpNext = Boolean(tvNeighbors.next && duration - position < 32);

  const overlayStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: OVERLAY_Z,
    ...(Platform.OS === 'android' ? { elevation: OVERLAY_ELEVATION } : null),
  };

  const transportUp = progressBar.handle;
  const topDown = showSkipIntro ? skipIntroBtn.handle : progressBar.handle;

  // When the HUD is hidden, keep a tiny invisible focus anchor (not full-screen — that draws a giant oval).
  if (!visible) {
    return (
      <View pointerEvents="box-none" style={overlayStyle}>
        <FocusSurface
          style={{ position: 'absolute', bottom: 0, left: 0, width: 2, height: 2, opacity: 0 }}
          focusVariant="ghost"
          focusedScale={1}
          onPress={onRequestShow}
          accessibilityLabel="Show playback controls"
        >
          <View />
        </FocusSurface>
      </View>
    );
  }

  const circleBtn = 56;
  const circleBtnLg = 76;
  const circleIcon = 24;
  const circleIconLg = 36;
  const bottomScrimH = 400;

  return (
    <View pointerEvents="box-none" style={overlayStyle}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.42, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bottomScrimH }}
      />

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: topPad,
          left: horizontalPad,
          right: horizontalPad,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <FocusSurface
          ref={closeBtn.ref}
          className="rounded-full items-center justify-center"
          style={{ width: circleBtn, height: circleBtn, backgroundColor: 'rgba(229,9,20,0.95)' }}
          focusVariant="playerControl"
          focusedScale={BTN}
          onPress={onClose}
          nextFocusRight={isTvEpisode ? episodesBtn.handle : undefined}
          nextFocusDown={topDown}
          accessibilityLabel="Close player"
        >
          <Ionicons name="chevron-down" color="#fff" size={28} />
        </FocusSurface>

        <View className="flex-1 mx-4" pointerEvents="none">
          <Text className="text-white font-bold" numberOfLines={1} style={{ fontSize: fontScale(18) }}>
            {title}
          </Text>
          {episodeTitle ? (
            <Text className="text-white/70 mt-0.5" numberOfLines={1} style={{ fontSize: fontScale(14) }}>
              {episodeTitle}
            </Text>
          ) : null}
        </View>

        {isTvEpisode ? (
          <FocusSurface
            ref={episodesBtn.ref}
            className="rounded-full items-center justify-center flex-row gap-2 px-5"
            style={{ height: circleBtn, backgroundColor: 'rgba(229,9,20,0.95)' }}
            focusVariant="playerControl"
            focusedScale={BTN}
            onPress={onOpenEpisodes}
            nextFocusLeft={closeBtn.handle}
            nextFocusDown={topDown}
            accessibilityLabel="Choose episode"
          >
            <Ionicons name="list" color="#fff" size={22} />
            <Text className="text-white font-bold" style={{ fontSize: fontScale(14) }}>
              S{season} E{episode}
            </Text>
          </FocusSurface>
        ) : null}
      </View>

      <View
        pointerEvents="box-none"
        style={{
          paddingBottom: bottomPad,
          paddingHorizontal: horizontalPad,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          gap: 14,
        }}
      >
        {showSkipIntro ? (
          <FocusSurface
            ref={skipIntroBtn.ref}
            className="self-center flex-row items-center gap-2 rounded-full px-7 py-3.5"
            style={{ backgroundColor: 'rgba(229,9,20,0.95)' }}
            focusVariant="playerControl"
            focusedScale={BTN}
            onPress={onSkipIntro}
            nextFocusDown={progressBar.handle}
            accessibilityLabel="Skip intro"
          >
            <Ionicons name="play-forward" color="#fff" size={20} />
            <Text className="text-white font-bold" style={{ fontSize: fontScale(15) }}>
              Skip intro
            </Text>
          </FocusSurface>
        ) : null}

        {showUpNext ? (
          <View className="rounded-2xl overflow-hidden border border-accent/35 bg-black/55 mb-1">
            <View className="flex-row gap-3 p-3">
              <View className="w-[88px] h-[56px] rounded-xl overflow-hidden bg-white/10">
                {nextPosterUri ? (
                  <Image source={{ uri: nextPosterUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View className="flex-1 bg-white/10" />
                )}
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-accent font-bold uppercase tracking-wider" style={{ fontSize: fontScale(11) }}>
                  Up next
                </Text>
                <Text className="text-white font-semibold" numberOfLines={2} style={{ fontSize: fontScale(15) }}>
                  {tvNeighbors.next!.episodeTitle ?? `Episode ${tvNeighbors.next!.episode}`}
                </Text>
              </View>
            </View>
            <View className="flex-row border-t border-white/10">
              <FocusSurface
                className="flex-1 py-3.5 border-r border-white/10"
                focusVariant="playerOverlay"
                focusedScale={BTN}
                onPress={onPlayNextNow}
                nextFocusDown={progressBar.handle}
              >
                <Text className="text-accent text-center font-bold" style={{ fontSize: fontScale(14) }}>
                  Play now
                </Text>
              </FocusSurface>
              <FocusSurface
                className="flex-1 py-3.5"
                focusVariant="playerOverlay"
                focusedScale={BTN}
                onPress={onDismissUpNext}
                nextFocusDown={progressBar.handle}
              >
                <Text className="text-white/70 text-center font-semibold" style={{ fontSize: fontScale(14) }}>
                  Dismiss
                </Text>
              </FocusSurface>
            </View>
          </View>
        ) : null}

        <View className="flex-row justify-between items-center px-0.5">
          <Text className="text-accent font-semibold tabular-nums" style={{ fontSize: fontScale(16) }}>
            {formatDuration(position)}
          </Text>
          <Text className="text-accent/75 tabular-nums font-medium" style={{ fontSize: fontScale(16) }}>
            {formatDuration(duration)}
          </Text>
        </View>

        <PlayerProgressBar
          progress={progress}
          bufferedProgress={bufferedProgress}
          isTv
          cinematic
          duration={duration}
          onSeekRatio={onSeekRatio}
          onScrubStart={onScrubStart}
          onScrubEnd={onScrubEnd}
          formatDuration={formatDuration}
          focusRef={progressBar.ref}
          nextFocusUp={showSkipIntro ? skipIntroBtn.handle : closeBtn.handle}
          nextFocusDown={playBtn.handle}
        />

        <View className="flex-row items-center justify-center gap-4 mt-1">
          {isTvEpisode ? (
            <FocusSurface
              ref={prevBtn.ref}
              className={`rounded-full items-center justify-center ${!tvNeighbors.prev ? 'opacity-35' : ''}`}
              style={{ width: circleBtn, height: circleBtn, backgroundColor: 'rgba(229,9,20,0.95)' }}
              focusVariant="playerControl"
              focusedScale={BTN}
              onPress={onPrevEpisode}
              disabled={!tvNeighbors.prev}
              nextFocusRight={seekBackBtn.handle}
              nextFocusUp={transportUp}
              accessibilityLabel="Previous episode"
            >
              <Ionicons name="play-skip-back" color="#fff" size={circleIcon} />
            </FocusSurface>
          ) : null}

          <FocusSurface
            ref={seekBackBtn.ref}
            className="rounded-full items-center justify-center"
            style={{ width: circleBtn, height: circleBtn, backgroundColor: 'rgba(229,9,20,0.95)' }}
            focusVariant="playerControl"
            focusedScale={BTN}
            onPress={onSeekBack}
            nextFocusLeft={isTvEpisode && tvNeighbors.prev ? prevBtn.handle : undefined}
            nextFocusRight={playBtn.handle}
            nextFocusUp={transportUp}
            accessibilityLabel="Back 10 seconds"
          >
            <Ionicons name="play-back" color="#fff" size={circleIcon} />
          </FocusSurface>

          <FocusSurface
            ref={playBtn.ref}
            className="rounded-full items-center justify-center"
            style={{ width: circleBtnLg, height: circleBtnLg, backgroundColor: 'rgba(229,9,20,0.95)' }}
            focusVariant="playerControl"
            focusedScale={BTN}
            onPress={onTogglePlay}
            hasTVPreferredFocus={playFocus.hasTVPreferredFocus}
            onFocus={playFocus.onInitialFocus}
            nextFocusLeft={isTvEpisode && tvNeighbors.prev ? prevBtn.handle : seekBackBtn.handle}
            nextFocusRight={seekForwardBtn.handle}
            nextFocusUp={transportUp}
            accessibilityLabel={paused ? 'Play' : 'Pause'}
          >
            <Ionicons
              name={paused ? 'play' : 'pause'}
              color="#fff"
              size={circleIconLg}
              style={paused ? { marginLeft: 4 } : undefined}
            />
          </FocusSurface>

          <FocusSurface
            ref={seekForwardBtn.ref}
            className="rounded-full items-center justify-center"
            style={{ width: circleBtn, height: circleBtn, backgroundColor: 'rgba(229,9,20,0.95)' }}
            focusVariant="playerControl"
            focusedScale={BTN}
            onPress={onSeekForward}
            nextFocusLeft={playBtn.handle}
            nextFocusRight={isTvEpisode && tvNeighbors.next ? nextBtn.handle : settingsBtn.handle}
            nextFocusUp={transportUp}
            accessibilityLabel="Forward 10 seconds"
          >
            <Ionicons name="play-forward" color="#fff" size={circleIcon} />
          </FocusSurface>

          {isTvEpisode ? (
            <FocusSurface
              ref={nextBtn.ref}
              className={`rounded-full items-center justify-center ${!tvNeighbors.next ? 'opacity-35' : ''}`}
              style={{ width: circleBtn, height: circleBtn, backgroundColor: 'rgba(229,9,20,0.95)' }}
              focusVariant="playerControl"
              focusedScale={BTN}
              onPress={onNextEpisode}
              disabled={!tvNeighbors.next}
              nextFocusLeft={seekForwardBtn.handle}
              nextFocusRight={settingsBtn.handle}
              nextFocusUp={transportUp}
              accessibilityLabel="Next episode"
            >
              <Ionicons name="play-skip-forward" color="#fff" size={circleIcon} />
            </FocusSurface>
          ) : null}

          <FocusSurface
            ref={settingsBtn.ref}
            className="rounded-full items-center justify-center"
            style={{ width: circleBtn, height: circleBtn, backgroundColor: 'rgba(229,9,20,0.95)' }}
            focusVariant="playerControl"
            focusedScale={BTN}
            onPress={onOpenSettings}
            nextFocusLeft={isTvEpisode && tvNeighbors.next ? nextBtn.handle : seekForwardBtn.handle}
            nextFocusUp={transportUp}
            accessibilityLabel="Playback settings"
          >
            <Ionicons name="settings-outline" color="#fff" size={circleIcon} />
          </FocusSurface>
        </View>
      </View>
    </View>
  );
});
