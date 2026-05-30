import React, { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { OnLoadData } from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OmssSource } from '@/api/types/omss';
import type { OmssTextTrackMeta } from '@/player/omssTextTracks';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAndroidTVBack } from '@/hooks/useAndroidTVBack';

export type PlayerSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
  rates: readonly number[];
  rate: number;
  onRateChange: (r: number) => void;
  subtitleMeta: OmssTextTrackMeta[];
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

function SectionLabel({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center gap-2 mb-3">
      <Ionicons name={icon} color={colors.playerHudMuted} size={17} />
      <Text className="text-[11px] uppercase tracking-widest font-bold" style={{ color: colors.playerHudMuted }}>
        {label}
      </Text>
    </View>
  );
}

function FormatBadge({ format }: { format: string }) {
  const { colors } = useAppTheme();
  return (
    <View
      className="rounded-md px-1.5 py-0.5 ml-2"
      style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderColor: colors.playerHudBorder, borderWidth: 1 }}
    >
      <Text className="text-[10px] font-bold uppercase" style={{ color: colors.playerHudMuted }}>
        {format}
      </Text>
    </View>
  );
}

export function PlayerSettingsModal(props: PlayerSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const {
    visible,
    onClose,
    rates,
    rate,
    onRateChange,
    subtitleMeta,
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

  const audioSafeIdx = audioTracks.length ? Math.min(preferredAudioIdx, audioTracks.length - 1) : 0;
  const captionSummary =
    subtitleTrack < 0
      ? 'Off'
      : (subtitleMeta.find((m) => m.index === subtitleTrack)?.label ?? 'On');
  const streamSummary =
    sortedSources.length === 0
      ? 'None available'
      : sortedSources[sourceIndex]
        ? `${sortedSources[sourceIndex].quality} · ${sortedSources[sourceIndex].provider.name}`
        : '—';
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

  const chipIdle = {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: colors.playerHudBorder,
    borderWidth: 1,
    borderRadius: 999,
  };
  const chipActive = {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 999,
  };
  const rowStyle = {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: colors.playerHudBorder,
    borderWidth: 1,
    borderRadius: 16,
  };

  const isAndroidPhone = Platform.OS === 'android' && !Platform.isTV;
  const tapRow = isAndroidPhone ? 'px-4 py-4 min-h-[56px]' : 'px-4 py-3.5';
  const sheetRadius = isAndroidPhone ? 'rounded-[30px]' : 'rounded-[28px]';
  const scrollPad = isAndroidPhone ? 'px-5 py-5' : 'px-5 py-4';
  const rateChipPad = isAndroidPhone ? 'px-5 py-4 min-h-[52px]' : 'px-5 py-3.5';

  const subtitleOptions: { index: number; label: string; format?: string }[] = [
    { index: -1, label: 'Off' },
    ...subtitleMeta.map((m) => ({ index: m.index, label: m.label, format: m.format.toUpperCase() })),
  ];

  const expandRow = (expanded: boolean) => `${expanded ? 'mb-2' : 'mb-4'}`;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <FocusSurface
          className="absolute inset-0 bg-black/75"
          onPress={onClose}
          focusVariant="ghost"
          focusable={!Platform.isTV}
        >
          <View className="flex-1" />
        </FocusSurface>
        <View
          className={`mx-3 overflow-hidden border max-h-[88%] shadow-2xl ${sheetRadius}`}
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
                  Subtitles, stream, speed & audio
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
              accessibilityLabel="Close settings"
            >
              <Ionicons name="close" color={colors.playerHudText} size={isAndroidPhone ? 24 : 22} />
            </FocusSurface>
          </View>

          <ScrollView
            className={scrollPad}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            focusable={false}
            nestedScrollEnabled
          >
            <FocusSurface
              onPress={() => setCaptionsExpanded((v) => !v)}
              className={`rounded-2xl ${tapRow} flex-row items-center justify-between ${expandRow(captionsExpanded)}`}
              style={rowStyle}
              focusVariant="playerOverlay"
              hasTVPreferredFocus={Platform.isTV}
              accessibilityRole="button"
              accessibilityState={{ expanded: captionsExpanded }}
              accessibilityLabel="Subtitles options"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Ionicons name="text-outline" color={colors.playerHudMuted} size={20} />
                <View className="flex-1 min-w-0">
                  <Text className="text-[11px] uppercase tracking-widest font-bold" style={{ color: colors.playerHudMuted }}>
                    Subtitles
                  </Text>
                  <Text className="font-semibold text-[15px] mt-0.5" style={{ color: colors.playerHudText }} numberOfLines={1}>
                    {captionSummary}
                  </Text>
                </View>
              </View>
              <Ionicons name={captionsExpanded ? 'chevron-up' : 'chevron-down'} color={colors.playerHudMuted} size={22} />
            </FocusSurface>
            {captionsExpanded ? (
              <View className="mb-6">
                {subtitleOptions.map((opt) => {
                  const selected = subtitleTrack === opt.index;
                  return (
                    <FocusSurface
                      key={opt.index}
                      onPress={() => onSubtitleChange(opt.index)}
                      className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between gap-3`}
                      style={selected ? chipActive : rowStyle}
                      focusVariant={selected ? 'chipOnAccent' : 'playerOverlay'}
                      accessibilityLabel={opt.index < 0 ? 'Subtitles off' : `Subtitle ${opt.label}`}
                      accessibilityState={{ selected }}
                    >
                      <View className="flex-row items-center flex-1 min-w-0">
                        {opt.index < 0 ? (
                          <Ionicons
                            name="eye-off-outline"
                            size={18}
                            color={selected ? colors.textOnAccent : colors.playerHudMuted}
                            style={{ marginRight: 10 }}
                          />
                        ) : null}
                        <Text
                          className="font-medium text-[15px] flex-1"
                          style={{ color: selected ? colors.textOnAccent : colors.playerHudText }}
                          numberOfLines={2}
                        >
                          {opt.label}
                        </Text>
                        {opt.format ? <FormatBadge format={opt.format} /> : null}
                      </View>
                      {selected ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                    </FocusSurface>
                  );
                })}
                {!subtitleMeta.length ? (
                  <Text className="text-sm leading-5" style={{ color: colors.playerHudMuted }}>
                    No subtitle files from your Core for this title.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <FocusSurface
              onPress={() => setStreamExpanded((v) => !v)}
              className={`rounded-2xl ${tapRow} flex-row items-center justify-between ${expandRow(streamExpanded)}`}
              style={rowStyle}
              focusVariant="playerOverlay"
              accessibilityRole="button"
              accessibilityState={{ expanded: streamExpanded }}
              accessibilityLabel="Video source options"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Ionicons name="server-outline" color={colors.playerHudMuted} size={20} />
                <View className="flex-1 min-w-0">
                  <Text className="text-[11px] uppercase tracking-widest font-bold" style={{ color: colors.playerHudMuted }}>
                    Video source
                  </Text>
                  <Text className="font-semibold text-[15px] mt-0.5" style={{ color: colors.playerHudText }} numberOfLines={2}>
                    {streamSummary}
                  </Text>
                </View>
              </View>
              <Ionicons name={streamExpanded ? 'chevron-up' : 'chevron-down'} color={colors.playerHudMuted} size={22} />
            </FocusSurface>
            {streamExpanded ? (
              <View className="mb-6 gap-2.5">
                {sortedSources.length ? (
                  sortedSources.map((s, idx) => {
                    const selected = idx === sourceIndex;
                    return (
                      <FocusSurface
                        key={`${s.provider.id}-${idx}-${s.quality}`}
                        onPress={() => onSourceChange(idx)}
                        className={`rounded-2xl ${tapRow} flex-row items-center gap-3`}
                        style={[
                          rowStyle,
                          selected
                            ? { borderColor: colors.accent, backgroundColor: 'rgba(229,9,20,0.14)' }
                            : null,
                        ]}
                        focusVariant={selected ? 'chipOnAccent' : 'playerOverlay'}
                        accessibilityLabel={`${s.quality} ${s.type} from ${s.provider.name}`}
                        accessibilityState={{ selected }}
                      >
                        <View
                          className="w-11 h-11 rounded-xl items-center justify-center border"
                          style={{
                            backgroundColor: selected ? colors.accent : 'rgba(255,255,255,0.08)',
                            borderColor: selected ? colors.accent : colors.playerHudBorder,
                          }}
                        >
                          <Ionicons
                            name={s.type === 'hls' ? 'git-network-outline' : 'film-outline'}
                            color={selected ? colors.textOnAccent : colors.playerHudMuted}
                            size={20}
                          />
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="font-bold text-[15px]" style={{ color: colors.playerHudText }}>
                            {s.quality}
                            <Text style={{ color: colors.playerHudMuted, fontWeight: '600' }}>
                              {' '}
                              · {s.type.toUpperCase()}
                            </Text>
                          </Text>
                          <Text className="text-xs mt-0.5" style={{ color: colors.playerHudMuted }} numberOfLines={1}>
                            {s.provider.name}
                          </Text>
                        </View>
                        {selected ? (
                          <Ionicons name="checkmark-circle" color="#fff" size={22} />
                        ) : (
                          <Ionicons name="chevron-forward" color={colors.playerHudMuted} size={18} />
                        )}
                      </FocusSurface>
                    );
                  })
                ) : (
                  <Text className="text-sm leading-5" style={{ color: colors.playerHudMuted }}>
                    No alternate streams available.
                  </Text>
                )}
              </View>
            ) : null}

            <SectionLabel icon="speedometer-outline" label="Speed" />
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
              className={`rounded-2xl ${tapRow} flex-row items-center justify-between ${expandRow(videoExpanded)}`}
              style={rowStyle}
              focusVariant="playerOverlay"
              accessibilityRole="button"
              accessibilityState={{ expanded: videoExpanded }}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Ionicons name="resize-outline" color={colors.playerHudMuted} size={20} />
                <View className="flex-1 min-w-0">
                  <Text className="text-[11px] uppercase tracking-widest font-bold" style={{ color: colors.playerHudMuted }}>
                    Video quality
                  </Text>
                  <Text className="font-semibold text-[15px] mt-0.5" style={{ color: colors.playerHudText }} numberOfLines={1}>
                    {videoSummary}
                  </Text>
                </View>
              </View>
              <Ionicons name={videoExpanded ? 'chevron-up' : 'chevron-down'} color={colors.playerHudMuted} size={22} />
            </FocusSurface>
            {videoExpanded ? (
              <View className="mb-6">
                <FocusSurface
                  onPress={() => onVideoIdxChange(-1)}
                  className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between`}
                  style={preferredVideoIdx < 0 ? chipActive : rowStyle}
                  focusVariant={preferredVideoIdx < 0 ? 'chipOnAccent' : 'playerOverlay'}
                >
                  <Text className="font-semibold text-[15px]" style={{ color: colors.playerHudText }}>
                    Auto (adaptive)
                  </Text>
                  {preferredVideoIdx < 0 ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                </FocusSurface>
                {videoTracks.map((vt, i) => (
                  <FocusSurface
                    key={`${vt.trackId ?? i}-${vt.height}`}
                    onPress={() => onVideoIdxChange(i)}
                    className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between gap-3`}
                    style={preferredVideoIdx === i ? chipActive : rowStyle}
                    focusVariant={preferredVideoIdx === i ? 'chipOnAccent' : 'playerOverlay'}
                  >
                    <Text className="font-medium text-[15px] flex-1" style={{ color: colors.playerHudText }}>
                      {vt.height ? `${vt.height}p` : 'Video'}{' '}
                      {vt.bitrate ? `· ${Math.round(vt.bitrate / 1000)} kbps` : ''}
                    </Text>
                    {preferredVideoIdx === i ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                  </FocusSurface>
                ))}
                {!videoTracks.length ? (
                  <Text className="text-sm leading-5" style={{ color: colors.playerHudMuted }}>
                    Quality levels appear after playback starts.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <FocusSurface
              onPress={() => setAudioExpanded((v) => !v)}
              className={`rounded-2xl ${tapRow} flex-row items-center justify-between ${expandRow(audioExpanded)}`}
              style={rowStyle}
              focusVariant="playerOverlay"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Ionicons name="mic-outline" color={colors.playerHudMuted} size={20} />
                <View className="flex-1 min-w-0">
                  <Text className="text-[11px] uppercase tracking-widest font-bold" style={{ color: colors.playerHudMuted }}>
                    Audio
                  </Text>
                  <Text className="font-semibold text-[15px] mt-0.5" style={{ color: colors.playerHudText }} numberOfLines={2}>
                    {audioSummary}
                  </Text>
                </View>
              </View>
              <Ionicons name={audioExpanded ? 'chevron-up' : 'chevron-down'} color={colors.playerHudMuted} size={22} />
            </FocusSurface>
            {audioExpanded ? (
              <View className="mb-6">
                {audioTracks.map((at, i) => (
                  <FocusSurface
                    key={`${at.index}-${i}`}
                    onPress={() => onAudioIdxChange(i)}
                    className={`rounded-2xl ${tapRow} mb-2 border flex-row items-center justify-between gap-3`}
                    style={audioSafeIdx === i ? chipActive : rowStyle}
                    focusVariant={audioSafeIdx === i ? 'chipOnAccent' : 'playerOverlay'}
                  >
                    <Text className="font-medium text-[15px] flex-1" style={{ color: colors.playerHudText }} numberOfLines={2}>
                      {[at.title, at.language].filter(Boolean).join(' · ') || `Track ${i + 1}`}
                    </Text>
                    {audioSafeIdx === i ? <Ionicons name="checkmark-circle" color="#fff" size={22} /> : null}
                  </FocusSurface>
                ))}
                {!audioTracks.length ? (
                  <Text className="text-sm leading-5 mb-2" style={{ color: colors.playerHudMuted }}>
                    Audio tracks appear after playback starts.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <SectionLabel icon="timer-outline" label="Intro skip" />
            <FocusSurface
              onPress={onMarkIntroEnd}
              className="rounded-2xl px-4 py-4 mb-8 border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderColor: colors.playerHudBorder,
              }}
              focusVariant="playerOverlay"
            >
              <Text className="font-bold text-[15px]" style={{ color: colors.playerHudText }}>
                Mark intro end here
              </Text>
              <Text className="text-[13px] mt-1.5 leading-[19px]" style={{ color: colors.playerHudMuted }}>
                Uses the current time as where intros finish. Future plays show “Skip intro”.
              </Text>
            </FocusSurface>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
