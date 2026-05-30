import React, { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { OnLoadData, TextTracks } from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OmssSource } from '@/api/types/omss';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAndroidTVBack } from '@/hooks/useAndroidTVBack';

export type PlayerSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
  rates: readonly number[];
  rate: number;
  onRateChange: (r: number) => void;
  textTracks: TextTracks;
  subtitleTrack: number;
  onSubtitleChange: (idx: number) => void;
  sortedSources: OmssSource[];
  sourceIndex: number;
  onSourceChange: (idx: number) => void;
  audioTracks: OnLoadData['audioTracks'];
  preferredAudioIdx: number;
  onAudioIdxChange: (idx: number) => void;
  videoTracks: NonNullable<OnLoadData['videoTracks']>;
  /** -1 = Auto (adaptive) */
  preferredVideoIdx: number;
  onVideoIdxChange: (idx: number) => void;
  onMarkIntroEnd: () => void;
};

export function PlayerSettingsModal(props: PlayerSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const {
    visible,
    onClose,
    rates,
    rate,
    onRateChange,
    textTracks,
    subtitleTrack,
    onSubtitleChange,
    sortedSources,
    sourceIndex,
    onSourceChange,
    audioTracks,
    preferredAudioIdx,
    onAudioIdxChange,
    videoTracks,
    preferredVideoIdx,
    onVideoIdxChange,
    onMarkIntroEnd,
  } = props;

  const [captionsExpanded, setCaptionsExpanded] = useState(false);
  const [streamExpanded, setStreamExpanded] = useState(false);
  const [audioExpanded, setAudioExpanded] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCaptionsExpanded(false);
      setStreamExpanded(false);
      setAudioExpanded(false);
      setVideoExpanded(false);
    }
  }, [visible]);

  useAndroidTVBack(() => {
    if (visible) {
      onClose();
      return true;
    }
    return false;
  });

  const captionSummary = subtitleTrack < 0 ? 'Off' : textTracks[subtitleTrack]?.title ?? 'On';
  const streamSummary =
    sortedSources.length === 0
      ? 'None available'
      : sortedSources[sourceIndex]
        ? `${sortedSources[sourceIndex].quality} · ${sortedSources[sourceIndex].provider.name}`
        : '—';

  const audioSafeIdx = audioTracks.length ? Math.min(preferredAudioIdx, audioTracks.length - 1) : 0;
  const audioSummary =
    audioTracks.length === 0
      ? 'Default (stream)'
      : [audioTracks[audioSafeIdx]?.title, audioTracks[audioSafeIdx]?.language].filter(Boolean).join(' · ') ||
        `Track ${audioSafeIdx + 1}`;

  const videoSummary =
    preferredVideoIdx < 0
      ? 'Auto · best for device'
      : (() => {
          const vt = videoTracks[Math.min(preferredVideoIdx, videoTracks.length - 1)];
          if (!vt) return 'Auto';
          const px = vt.height ? `${vt.height}p` : vt.bitrate ? `${Math.round(vt.bitrate / 1000)} kbps` : 'Quality';
          return px;
        })();

  const pillStyle = {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: colors.playerHudBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  };
  const rowStyle = {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: colors.playerHudBorder,
    borderWidth: 1,
    borderRadius: 16,
  };
  const chipIdle = {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: colors.playerHudBorder,
    borderWidth: 1,
    borderRadius: 16,
  };
  const chipActive = {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 16,
  };

  const isAndroidPhone = Platform.OS === 'android' && !Platform.isTV;
  /** Comfortable list rows on small Android screens (Material ~48dp+). */
  const tapRow = isAndroidPhone ? 'px-4 py-4 min-h-[56px]' : 'px-4 py-3.5';
  const sheetRadius = isAndroidPhone ? 'rounded-[30px]' : 'rounded-[28px]';
  const scrollPad = isAndroidPhone ? 'px-5 py-5' : 'px-5 py-4';
  const rateChipPad = isAndroidPhone ? 'px-5 py-4 min-h-[52px]' : 'px-5 py-3.5';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <FocusSurface className="absolute inset-0 bg-black/75" onPress={onClose}>
          <View className="flex-1" />
        </FocusSurface>
        <View
          className={`mx-3 overflow-hidden border max-h-[82%] shadow-2xl ${sheetRadius}`}
          style={{
            marginBottom: Math.max(insets.bottom, isAndroidPhone ? 16 : 12),
            backgroundColor: colors.playerHud,
            borderColor: colors.playerHudBorder,
          }}
        >
          <View className="items-center pt-3 pb-2">
            <View className="w-12 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
          </View>
          <View
            className="px-5 pb-3 flex-row items-center justify-between border-b"
            style={{ borderColor: colors.playerHudBorder }}
          >
            <View className="flex-row items-center gap-3 flex-1">
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center border"
                style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentBorder }}
              >
                <Ionicons name="options-outline" color={colors.playerHudText} size={22} />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold" style={{ color: colors.playerHudText }}>
                  Playback
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.playerHudMuted }}>
                  Speed, audio, quality & captions
                </Text>
              </View>
            </View>
            <FocusSurface
              onPress={onClose}
              className={`rounded-full border ${isAndroidPhone ? 'p-3' : 'p-2.5'}`}
              style={{
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderColor: colors.playerHudBorder,
              }}
              focusVariant="playerOverlay"
              hasTVPreferredFocus={Platform.isTV}
              accessibilityLabel="Close settings"
              hitSlop={isAndroidPhone ? { top: 8, bottom: 8, left: 8, right: 8 } : undefined}
            >
              <Ionicons name="close" color={colors.playerHudText} size={isAndroidPhone ? 24 : 22} />
            </FocusSurface>
          </View>

          <ScrollView className={scrollPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="speedometer-outline" color="rgba(255,255,255,0.45)" size={17} />
              <Text
                className="text-[11px] uppercase tracking-widest font-bold"
                style={{ color: colors.playerHudMuted }}
              >
                Speed
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2 mb-7">
              {rates.map((r) => (
                <FocusSurface
                  key={r}
                  onPress={() => onRateChange(r)}
                  className={`rounded-2xl min-w-[72px] items-center justify-center ${rateChipPad}`}
                  style={rate === r ? chipActive : chipIdle}
                  focusVariant={rate === r ? 'chipOnAccent' : 'chip'}
                >
                  <Text className="font-bold text-[15px]" style={{ color: colors.playerHudText }}>
                    {r}x
                  </Text>
                </FocusSurface>
              ))}
            </View>

            <FocusSurface
              onPress={() => setVideoExpanded((v) => !v)}
              className={`rounded-2xl ${tapRow} flex-row items-center justify-between ${videoExpanded ? 'mb-2' : 'mb-4'}`}
              style={rowStyle}
              focusVariant="playerOverlay"
              accessibilityRole="button"
              accessibilityState={{ expanded: videoExpanded }}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Ionicons name="film-outline" color="rgba(255,255,255,0.55)" size={20} />
                <View className="flex-1 min-w-0">
                  <Text className="text-white/45 text-[11px] uppercase tracking-widest font-bold">Video quality</Text>
                  <Text className="text-white font-semibold text-[15px] mt-0.5" numberOfLines={1}>
                    {videoSummary}
                  </Text>
                </View>
              </View>
              <Ionicons name={videoExpanded ? 'chevron-up' : 'chevron-down'} color="rgba(255,255,255,0.55)" size={22} />
            </FocusSurface>
            {videoExpanded ? (
              <View className="mb-6">
                <FocusSurface
                  onPress={() => onVideoIdxChange(-1)}
                  className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between ${
                    preferredVideoIdx < 0 ? 'bg-accent/95 border-accent' : 'bg-white/8 border-white/12 active:bg-white/14'
                  }`}
                  focusVariant={preferredVideoIdx < 0 ? 'chipOnAccent' : 'playerOverlay'}
                >
                  <Text className="text-white font-semibold text-[15px]">Auto (adaptive)</Text>
                  {preferredVideoIdx < 0 ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                </FocusSurface>
                {videoTracks.map((vt, i) => (
                  <FocusSurface
                    key={`${vt.trackId ?? i}-${vt.height}`}
                    onPress={() => onVideoIdxChange(i)}
                    className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between gap-3 ${
                      preferredVideoIdx === i ? 'bg-accent/95 border-accent' : 'bg-white/8 border-white/12 active:bg-white/14'
                    }`}
                    focusVariant={preferredVideoIdx === i ? 'chipOnAccent' : 'playerOverlay'}
                  >
                    <Text className="text-white font-medium text-[15px] flex-1">
                      {vt.height ? `${vt.height}p` : 'Video'}{' '}
                      {vt.bitrate ? `· ${Math.round(vt.bitrate / 1000)} kbps` : ''}
                    </Text>
                    {preferredVideoIdx === i ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                  </FocusSurface>
                ))}
                {!videoTracks.length ? (
                  <Text className="text-white/40 text-sm leading-5">Quality levels appear after playback starts.</Text>
                ) : null}
              </View>
            ) : null}

            <FocusSurface
              onPress={() => setAudioExpanded((v) => !v)}
              className={`rounded-2xl ${tapRow} border border-white/14 bg-white/6 flex-row items-center justify-between active:bg-white/12 ${audioExpanded ? 'mb-2' : 'mb-4'}`}
              focusVariant="playerOverlay"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Ionicons name="mic-outline" color="rgba(255,255,255,0.55)" size={20} />
                <View className="flex-1 min-w-0">
                  <Text className="text-white/45 text-[11px] uppercase tracking-widest font-bold">Audio</Text>
                  <Text className="text-white font-semibold text-[15px] mt-0.5" numberOfLines={2}>
                    {audioSummary}
                  </Text>
                </View>
              </View>
              <Ionicons name={audioExpanded ? 'chevron-up' : 'chevron-down'} color="rgba(255,255,255,0.55)" size={22} />
            </FocusSurface>
            {audioExpanded ? (
              <View className="mb-6">
                {audioTracks.map((at, i) => (
                  <FocusSurface
                    key={`${at.index}-${i}`}
                    onPress={() => onAudioIdxChange(i)}
                    className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between gap-3 ${
                      audioSafeIdx === i ? 'bg-accent/95 border-accent' : 'bg-white/8 border-white/12 active:bg-white/14'
                    }`}
                    focusVariant={audioSafeIdx === i ? 'chipOnAccent' : 'playerOverlay'}
                  >
                    <Text className="text-white font-medium text-[15px] flex-1" numberOfLines={2}>
                      {[at.title, at.language].filter(Boolean).join(' · ') || `Track ${i + 1}`}
                    </Text>
                    {audioSafeIdx === i ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                  </FocusSurface>
                ))}
                {!audioTracks.length ? (
                  <Text className="text-white/40 text-sm leading-5 mb-2">Audio tracks appear after playback starts.</Text>
                ) : null}
              </View>
            ) : null}

            <FocusSurface
              onPress={() => setCaptionsExpanded((v) => !v)}
              className={`rounded-2xl ${tapRow} border border-white/14 bg-white/6 flex-row items-center justify-between active:bg-white/12 ${captionsExpanded ? 'mb-2' : 'mb-4'}`}
              focusVariant="playerOverlay"
              accessibilityRole="button"
              accessibilityState={{ expanded: captionsExpanded }}
              accessibilityLabel="Captions options"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Ionicons name="text-outline" color="rgba(255,255,255,0.55)" size={20} />
                <View className="flex-1 min-w-0">
                  <Text className="text-white/45 text-[11px] uppercase tracking-widest font-bold">Captions</Text>
                  <Text className="text-white font-semibold text-[15px] mt-0.5" numberOfLines={1}>
                    {captionSummary}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={captionsExpanded ? 'chevron-up' : 'chevron-down'}
                color="rgba(255,255,255,0.55)"
                size={22}
              />
            </FocusSurface>
            {captionsExpanded ? (
              <View className="mb-6">
                <FocusSurface
                  onPress={() => onSubtitleChange(-1)}
                  className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between ${
                    subtitleTrack < 0 ? 'bg-accent/95 border-accent' : 'bg-white/8 border-white/12 active:bg-white/14'
                  }`}
                  focusVariant={subtitleTrack < 0 ? 'chipOnAccent' : 'playerOverlay'}
                >
                  <Text className="text-white font-semibold text-[15px]">Off</Text>
                  {subtitleTrack < 0 ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                </FocusSurface>
                {textTracks.map((t, idx) => (
                  <FocusSurface
                    key={`${t.title}-${idx}`}
                    onPress={() => onSubtitleChange(idx)}
                    className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between gap-3 ${
                      subtitleTrack === idx ? 'bg-accent/95 border-accent' : 'bg-white/8 border-white/12 active:bg-white/14'
                    }`}
                    focusVariant={subtitleTrack === idx ? 'chipOnAccent' : 'playerOverlay'}
                  >
                    <Text className="text-white font-medium text-[15px] flex-1" numberOfLines={2}>
                      {t.title}
                    </Text>
                    {subtitleTrack === idx ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                  </FocusSurface>
                ))}
                {!textTracks.length ? (
                  <Text className="text-white/40 text-sm leading-5">No captions reported for this title.</Text>
                ) : null}
              </View>
            ) : null}

            <FocusSurface
              onPress={() => setStreamExpanded((v) => !v)}
              className={`rounded-2xl ${tapRow} border border-white/14 bg-white/6 flex-row items-center justify-between active:bg-white/12 ${streamExpanded ? 'mb-2' : 'mb-4'}`}
              focusVariant="playerOverlay"
              accessibilityRole="button"
              accessibilityState={{ expanded: streamExpanded }}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Ionicons name="server-outline" color="rgba(255,255,255,0.55)" size={20} />
                <View className="flex-1 min-w-0">
                  <Text className="text-white/45 text-[11px] uppercase tracking-widest font-bold">Stream source</Text>
                  <Text className="text-white font-semibold text-[15px] mt-0.5" numberOfLines={2}>
                    {streamSummary}
                  </Text>
                </View>
              </View>
              <Ionicons name={streamExpanded ? 'chevron-up' : 'chevron-down'} color="rgba(255,255,255,0.55)" size={22} />
            </FocusSurface>
            {streamExpanded ? (
              <View className="mb-6">
                {!sortedSources.length ? (
                  <Text className="text-white/40 text-sm leading-5 mb-2">No alternate streams.</Text>
                ) : null}
                {sortedSources.map((s, idx) => (
                  <FocusSurface
                    key={`${s.provider.id}-${idx}-${s.quality}`}
                    onPress={() => onSourceChange(idx)}
                    className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between gap-3 ${
                      idx === sourceIndex ? 'bg-accent/95 border-accent' : 'bg-white/8 border-white/12 active:bg-white/14'
                    }`}
                    focusVariant={idx === sourceIndex ? 'chipOnAccent' : 'playerOverlay'}
                  >
                    <View className="flex-1">
                      <Text className="text-white font-bold text-[15px]">
                        {s.quality} · {s.type.toUpperCase()}
                      </Text>
                      <Text className="text-white/50 text-xs mt-1">{s.provider.name}</Text>
                    </View>
                    {idx === sourceIndex ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                  </FocusSurface>
                ))}
              </View>
            ) : null}

            <View className="flex-row items-center gap-2 mb-3 mt-2">
              <Ionicons name="timer-outline" color="rgba(255,255,255,0.45)" size={17} />
              <Text className="text-white/45 text-[11px] uppercase tracking-widest font-bold">Intro skip</Text>
            </View>
            <FocusSurface
              onPress={onMarkIntroEnd}
              className={`${isAndroidPhone ? 'py-5' : ''} mb-10`}
              style={pillStyle}
              focusVariant="playerOverlay"
            >
              <Text className="text-white font-bold text-[15px]">Mark intro end here</Text>
              <Text className="text-white/48 text-[13px] mt-1.5 leading-[19px]">
                Uses the current time as where intros finish. Future plays show “Skip intro”.
              </Text>
            </FocusSurface>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
