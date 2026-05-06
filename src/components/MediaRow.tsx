import React, { memo, useCallback } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { MediaCardModel } from '@/components/MediaCard';
import { MediaCard } from '@/components/MediaCard';
import { SkeletonRow } from '@/components/SkeletonRow';

type Props = {
  title: string;
  data: MediaCardModel[];
  posterW: number;
  posterH: number;
  isLoading?: boolean;
  onSelect: (item: MediaCardModel) => void;
};

export const MediaRow = memo(function MediaRow({
  title,
  data,
  posterW,
  posterH,
  isLoading,
  onSelect,
}: Props) {
  const renderItem = useCallback(
    ({ item }: { item: MediaCardModel }) => (
      <View style={{ marginRight: 12 }}>
        <MediaCard
          item={item}
          width={posterW}
          height={posterH}
          onPress={() => onSelect(item)}
        />
      </View>
    ),
    [onSelect, posterH, posterW]
  );

  if (isLoading) {
    return <SkeletonRow title={title} cardW={posterW} cardH={posterH} />;
  }

  if (!data.length) return null;

  return (
    <View className="mb-5">
      <Text className="text-white text-lg font-semibold px-4 mb-3">{title}</Text>
      <FlashList
        horizontal
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        style={{ height: posterH + 6 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
      />
    </View>
  );
});
