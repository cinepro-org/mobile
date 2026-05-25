import React, { useCallback } from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { TmdbEpisode } from '@/api/types/tmdb';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAndroidTVBack } from '@/hooks/useAndroidTVBack';
import { tmdbImg } from '@/services/tmdbImages';
import { useAppTheme } from '@/theme/AppThemeProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  seasonLabel: string;
  showTitle?: string;
  episodes: TmdbEpisode[];
  currentEpisode?: number;
  resumeByEpisode?: Record<number, number>;
  loading?: boolean;
  onSelectEpisode: (episodeNumber: number, episodeTitle: string) => void;
};

export function PlayerEpisodeSidebar({
  visible,
  onClose,
  seasonLabel,
  showTitle,
  episodes,
  currentEpisode,
  resumeByEpisode,
  loading,
  onSelectEpisode,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  useAndroidTVBack(() => {
    if (visible) {
      onClose();
      return true;
    }
    return false;
  });

  const renderItem = useCallback(
    ({ item, index }: { item: TmdbEpisode; index: number }) => {
      const active = item.episode_number === currentEpisode;
      const resumeSec = resumeByEpisode?.[item.episode_number];
      const thumb = tmdbImg(item.still_path, 'w342');

      return (
        <FocusSurface
          className="mx-3 mb-2.5 rounded-2xl overflow-hidden border"
          style={{
            borderColor: active ? colors.accent : colors.playerHudBorder,
            backgroundColor: active ? colors.accentSoft : 'rgba(255,255,255,0.08)',
          }}
          focusVariant={active ? 'accent' : 'subtle'}
          hasTVPreferredFocus={visible && index === 0}
          onPress={() => onSelectEpisode(item.episode_number, item.name)}
          accessibilityLabel={`Episode ${item.episode_number} ${item.name}`}
          accessibilityState={{ selected: active }}
        >
          <View className="flex-row items-center gap-3 p-2.5">
            <View
              className="w-[88px] h-[50px] rounded-xl overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-xs font-bold" style={{ color: colors.playerHudMuted }}>
                    E{item.episode_number}
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-1 min-w-0 gap-0.5">
              <Text
                className="font-bold text-[14px]"
                style={{ color: active ? colors.accent : colors.playerHudText }}
                numberOfLines={2}
              >
                {item.episode_number}. {item.name}
              </Text>
              {resumeSec != null && resumeSec > 30 ? (
                <Text className="text-[11px] font-semibold" style={{ color: colors.accentMuted }}>
                  Resume
                </Text>
              ) : null}
            </View>
            {active ? <Ionicons name="play-circle" color={colors.accent} size={22} /> : null}
          </View>
        </FocusSurface>
      );
    },
    [colors, currentEpisode, onSelectEpisode, resumeByEpisode, visible]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 flex-row">
        <FocusSurface
          className="flex-1 bg-black/65"
          onPress={onClose}
          focusVariant="subtle"
          accessibilityLabel="Close episode list backdrop"
        >
          <View className="flex-1" />
        </FocusSurface>
        <View
          className="h-full border-l"
          style={{
            width: '84%',
            maxWidth: 400,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: colors.playerHud,
            borderColor: colors.playerHudBorder,
          }}
        >
          <View
            className="px-4 pb-3 flex-row items-center gap-3 border-b"
            style={{ borderColor: colors.playerHudBorder }}
          >
            <FocusSurface
              className="rounded-full p-2.5 border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderColor: colors.playerHudBorder,
              }}
              focusVariant="onMedia"
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" color={colors.playerHudText} size={22} />
            </FocusSurface>
            <View className="flex-1 min-w-0">
              <Text
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: colors.playerHudMuted }}
                numberOfLines={1}
              >
                {showTitle ?? 'Series'}
              </Text>
              <Text className="text-lg font-bold" style={{ color: colors.playerHudText }} numberOfLines={2}>
                {seasonLabel}
              </Text>
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center gap-3">
              <ActivityIndicator color={colors.accent} size="large" />
              <Text className="text-sm" style={{ color: colors.playerHudMuted }}>
                Loading episodes…
              </Text>
            </View>
          ) : (
            <FlashList
              data={episodes}
              renderItem={renderItem}
              keyExtractor={(e) => String(e.id)}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
              ListEmptyComponent={
                <Text className="text-center px-6 py-8 text-sm" style={{ color: colors.playerHudMuted }}>
                  No episodes in this season.
                </Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
