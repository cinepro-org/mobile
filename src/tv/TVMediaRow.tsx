import React, { memo, useCallback, type RefCallback } from 'react';
import { Text, View, type View as RNView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { MediaCardModel } from '@/components/MediaCard';
import { TVFocusableCard } from '@/tv/TVFocusableCard';
import { SkeletonRow } from '@/components/SkeletonRow';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { fontScale } from '@/utils/layout';

type Props = {
  title: string;
  eyebrow?: string;
  data: MediaCardModel[];
  cardW: number;
  cardH: number;
  isLoading?: boolean;
  onSelect: (item: MediaCardModel) => void;
  preferFirstFocus?: boolean;
  landscape?: boolean;
  horizontalPadding?: number;
  /** Attach to the first card — used to wire hero nextFocusDown. */
  linkFirstCardRef?: RefCallback<RNView>;
};

/** Horizontal Android TV content row with large focusable cards. */
export const TVMediaRow = memo(function TVMediaRow({
  title,
  eyebrow,
  data,
  cardW,
  cardH,
  isLoading,
  onSelect,
  preferFirstFocus,
  landscape = true,
  horizontalPadding = 16,
  linkFirstCardRef,
}: Props) {
  const { colors } = useAppTheme();

  const renderItem = useCallback(
    ({ item, index }: { item: MediaCardModel; index: number }) => (
      <View style={{ marginRight: 14, overflow: 'visible' }}>
        <TVFocusableCard
          ref={index === 0 ? linkFirstCardRef : undefined}
          item={item}
          width={cardW}
          height={cardH}
          landscape={landscape}
          onPress={() => onSelect(item)}
          hasTVPreferredFocus={preferFirstFocus && index === 0}
        />
      </View>
    ),
    [cardH, cardW, landscape, linkFirstCardRef, onSelect, preferFirstFocus]
  );

  if (isLoading) {
    return <SkeletonRow title={title} eyebrow={eyebrow} cardW={cardW} cardH={cardH} />;
  }

  if (!data.length) return null;

  return (
    <View style={{ marginBottom: 32 }}>
      <View style={{ paddingHorizontal: horizontalPadding, marginBottom: 14 }}>
        {eyebrow ? (
          <Text
            className="font-bold tracking-[3px] mb-1"
            style={{ color: colors.textFaint, fontSize: fontScale(11) }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text className="font-bold" style={{ color: colors.text, fontSize: fontScale(22) }}>
          {title}
        </Text>
      </View>
      <FlashList
        horizontal
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        style={{ height: cardH + 28, overflow: 'visible' }}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingVertical: 10 }}
      />
    </View>
  );
});
