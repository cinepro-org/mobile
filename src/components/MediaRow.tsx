import React, { memo, useCallback } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { MediaCardModel } from '@/components/MediaCard';
import { MediaCard } from '@/components/MediaCard';
import { SkeletonRow } from '@/components/SkeletonRow';
import { SectionHeader } from '@/theme/themedPrimitives';

type Props = {
  title: string;
  eyebrow?: string;
  data: MediaCardModel[];
  posterW: number;
  posterH: number;
  isLoading?: boolean;
  onSelect: (item: MediaCardModel) => void;
  /** Focus the first card when this row mounts (e.g. first row on a screen). */
  preferFirstFocus?: boolean;
};

export const MediaRow = memo(function MediaRow({
  title,
  eyebrow,
  data,
  posterW,
  posterH,
  isLoading,
  onSelect,
  preferFirstFocus,
}: Props) {
  const renderItem = useCallback(
    ({ item, index }: { item: MediaCardModel; index: number }) => (
      <View style={{ marginRight: 14 }}>
        <MediaCard
          item={item}
          width={posterW}
          height={posterH}
          onPress={() => onSelect(item)}
          hasTVPreferredFocus={preferFirstFocus && index === 0}
        />
      </View>
    ),
    [onSelect, posterH, posterW, preferFirstFocus]
  );

  if (isLoading) {
    return <SkeletonRow title={title} eyebrow={eyebrow} cardW={posterW} cardH={posterH} />;
  }

  if (!data.length) return null;

  return (
    <View className="mb-7">
      <View className="px-4">
        <SectionHeader title={title} eyebrow={eyebrow} />
      </View>
      <FlashList
        horizontal
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        style={{ height: posterH + 8 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 2 }}
      />
    </View>
  );
});
