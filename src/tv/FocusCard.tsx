import React from 'react';
import { MediaCard, type MediaCardModel } from '@/components/MediaCard';

type Props = {
  item: MediaCardModel;
  width: number;
  height: number;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  focusedGlow?: boolean;
};

/** Media poster card with TV focus ring passthrough. */
export function FocusCard(props: Props) {
  return <MediaCard {...props} />;
}
