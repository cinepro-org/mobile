import React, { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { useTVNavigationOptional } from '@/tv/TVNavigationContext';

type Props = ViewProps & {
  children: ReactNode;
};

/**
 * Wraps main screen content on Android TV.
 * Collapses the side rail when any child receives focus (D-pad moved into content).
 */
export function TVContentArea({ children, onFocus, ...rest }: Props) {
  const tvNav = useTVNavigationOptional();

  return (
    <View
      {...rest}
      onFocus={(e) => {
        tvNav?.registerContentFocus();
        onFocus?.(e);
      }}
    >
      {children}
    </View>
  );
}
