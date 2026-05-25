import { useCallback, type RefCallback } from 'react';
import type { View } from 'react-native';
import { useTVNavigationOptional } from '@/tv/TVNavigationContext';

/**
 * Links a main-content focus target to the side rail for D-pad left/right hand-off.
 * Attach `contentFocusRef` to the screen's primary focusable (Play, search field, etc.).
 */
export function useTVContentFocusLink() {
  const tvNav = useTVNavigationOptional();

  const contentFocusRef: RefCallback<View> = useCallback(
    (node) => {
      tvNav?.setContentFocusRef(node);
    },
    [tvNav]
  );

  return {
    contentFocusRef,
    nextFocusLeft: tvNav?.navFocusHandle ?? undefined,
    registerContentFocus: tvNav?.registerContentFocus,
  };
}
