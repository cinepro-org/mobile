import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  deviceClass,
  fontScale,
  gridColumns,
  heroHeight,
  overscanHorizontal,
  overscanVertical,
  rowPosterHeight,
  rowPosterWidth,
  spacing,
  isTVLike,
} from '@/utils/layout';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(
    () => ({
      deviceClass: deviceClass(),
      isTV: isTVLike(),
      gridColumns: gridColumns(),
      posterW: rowPosterWidth(),
      posterH: rowPosterHeight(),
      heroH: heroHeight(),
      gap: spacing(1),
      sectionGap: spacing(2),
      overscanX: overscanHorizontal(),
      overscanY: overscanVertical(),
      fontScale,
      windowWidth: width,
      windowHeight: height,
    }),
    [width, height]
  );
}
