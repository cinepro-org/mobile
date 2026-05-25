import React, { useEffect, useRef } from 'react';
import { View, type View as RNView, type ViewProps } from 'react-native';
import { useTVNavigationOptional } from '@/tv/TVNavigationContext';

type Props = ViewProps & {
  children: React.ReactNode;
  /** Register this element as the D-pad entry point into main content. */
  asFocusAnchor?: boolean;
};

/**
 * Wraps main screen content on Android TV and registers a focus anchor
 * so D-pad right from the side rail can reach content reliably.
 */
export function TVContentArea({ children, asFocusAnchor = false, ...rest }: Props) {
  const tvNav = useTVNavigationOptional();
  const anchorRef = useRef<RNView>(null);

  useEffect(() => {
    if (asFocusAnchor) {
      tvNav?.setContentFocusRef(anchorRef.current);
    }
  }, [asFocusAnchor, tvNav]);

  if (!asFocusAnchor) {
    return <View {...rest}>{children}</View>;
  }

  return (
    <View ref={anchorRef} collapsable={false} focusable={false} {...rest}>
      {children}
    </View>
  );
}
