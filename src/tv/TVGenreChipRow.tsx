import React, { memo, useCallback, useEffect, useState, type RefCallback } from 'react';
import { ScrollView, Text, View, findNodeHandle } from 'react-native';
import { FocusSurface } from '@/tv/FocusSurface';
import { TV_CONTROL_FOCUS_SCALE } from '@/tv/focusStyles';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { fontScale } from '@/utils/layout';

export type TVGenreChipItem = {
  id: number;
  name: string;
};

type Props = {
  chips: TVGenreChipItem[];
  /** Currently active/selected category (distinct from TV focus ring). */
  selectedId?: number | null;
  onSelect: (chip: TVGenreChipItem) => void;
  /** Wire first chip as D-pad down target from hero. */
  linkFirstChipRef?: RefCallback<View>;
  /** Notifies parent when the first chip native handle is ready (for hero nextFocusDown). */
  onFirstChipHandleReady?: (handle: number) => void;
  /** Native handle for D-pad up back to hero. */
  nextFocusUp?: number;
};

/**
 * Horizontal genre/category chips with nav-style focus rings on Android TV.
 * Selected = filled accent; focused = accent outline only (no fill change).
 */
export const TVGenreChipRow = memo(function TVGenreChipRow({
  chips,
  selectedId = null,
  onSelect,
  linkFirstChipRef,
  onFirstChipHandleReady,
  nextFocusUp,
}: Props) {
  const { colors } = useAppTheme();
  const ts = useThemedStyles();
  const [handles, setHandles] = useState<Record<number, number>>({});

  const registerChip = useCallback(
    (index: number, node: View | null) => {
      if (index === 0) linkFirstChipRef?.(node);
      if (!node) return;
      requestAnimationFrame(() => {
        const handle = findNodeHandle(node);
        if (typeof handle !== 'number') return;
        setHandles((prev) => (prev[index] === handle ? prev : { ...prev, [index]: handle }));
      });
    },
    [linkFirstChipRef]
  );

  useEffect(() => {
    const first = handles[0];
    if (typeof first === 'number') onFirstChipHandleReady?.(first);
  }, [handles, onFirstChipHandleReady]);

  if (!chips.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      focusable={false}
      nestedScrollEnabled
      contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
    >
      {chips.map((chip, index) => {
        const selected = selectedId === chip.id;
        return (
          <FocusSurface
            key={chip.id}
            ref={(node) => registerChip(index, node)}
            collapsable={false}
            className="rounded-full px-6 py-3 min-h-[44px] justify-center"
            style={selected ? ts.chipActive : ts.chip}
            focusVariant={selected ? 'chipOnAccent' : 'chip'}
            focusedScale={TV_CONTROL_FOCUS_SCALE}
            collapseTVNavOnFocus
            onPress={() => onSelect(chip)}
            nextFocusLeft={index > 0 ? handles[index - 1] : undefined}
            nextFocusRight={index < chips.length - 1 ? handles[index + 1] : undefined}
            nextFocusUp={nextFocusUp}
            accessibilityRole="button"
            accessibilityLabel={`Genre ${chip.name}`}
            accessibilityState={{ selected }}
          >
            <Text
              className="font-semibold"
              style={{
                color: selected ? colors.textOnAccent : colors.text,
                fontSize: fontScale(14),
              }}
            >
              {chip.name}
            </Text>
          </FocusSurface>
        );
      })}
    </ScrollView>
  );
});
