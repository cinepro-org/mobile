import React, { useCallback } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { MediaCardModel } from '@/components/MediaCard';
import { MediaCard } from '@/components/MediaCard';
import { useResponsive } from '@/hooks/useResponsive';
import { GRID_ROW_GAP, gridPosterSlotDimensions } from '@/utils/layout';

type Props = {
  data: MediaCardModel[];
  listHorizontalPadding: number;
  overscanX: number;
  onSelect: (item: MediaCardModel) => void;
  ListEmptyComponent?: React.ReactElement | null;
  onEndReached?: () => void;
  bottomInset?: number;
  preferFirstFocus?: boolean;
};

/** Multi-column poster grid (Search, Browse by genre). Needs a flex:1 parent. */
export function MediaPosterGrid({
  data,
  listHorizontalPadding,
  overscanX,
  onSelect,
  ListEmptyComponent,
  onEndReached,
  bottomInset = 24,
  preferFirstFocus,
}: Props) {
  const { gridColumns: numColumns, windowWidth } = useResponsive();
  const { posterW, posterH, slotW } = gridPosterSlotDimensions(windowWidth, overscanX, numColumns);
  const rowHeight = posterH + GRID_ROW_GAP;

  const renderItem = useCallback(
    ({ item, index }: { item: MediaCardModel; index: number }) => (
      <View
        style={{
          width: slotW,
          height: rowHeight,
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <MediaCard
          item={item}
          width={posterW}
          height={posterH}
          onPress={() => onSelect(item)}
          hasTVPreferredFocus={preferFirstFocus && index === 0}
        />
      </View>
    ),
    [onSelect, posterH, posterW, preferFirstFocus, rowHeight, slotW]
  );

  return (
    <View style={{ flex: 1, minHeight: 120 }}>
      <FlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.mediaType ?? 'media'}-${item.id}`}
        numColumns={numColumns}
        extraData={`${numColumns}-${posterW}-${windowWidth}-${data.length}`}
        ListEmptyComponent={ListEmptyComponent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: listHorizontalPadding,
          paddingBottom: bottomInset,
          flexGrow: 1,
        }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.65}
        removeClippedSubviews={false}
      />
    </View>
  );
}
