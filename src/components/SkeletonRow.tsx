import React, { memo } from 'react';
import { View, Text } from 'react-native';

type Props = {
  title: string;
  cardW: number;
  cardH: number;
};

export const SkeletonRow = memo(function SkeletonRow({ title, cardW, cardH }: Props) {
  const placeholders = Array.from({ length: 8 });
  return (
    <View className="mb-5">
      <Text className="text-white/40 text-lg font-semibold px-4 mb-3">{title}</Text>
      <View className="flex-row px-4 gap-3">
        {placeholders.map((_, i) => (
          <View
            key={i}
            style={{ width: cardW, height: cardH }}
            className="rounded-2xl bg-white/10"
          />
        ))}
      </View>
    </View>
  );
});
