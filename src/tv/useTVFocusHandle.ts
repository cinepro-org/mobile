import { useCallback, useState } from 'react';
import { findNodeHandle, type View } from 'react-native';

/** Registers a native node handle when a focus target mounts (for nextFocusDown/Up wiring). */
export function useTVFocusHandle() {
  const [handle, setHandle] = useState<number | undefined>();

  const ref = useCallback((node: View | null) => {
    if (!node) return;
    requestAnimationFrame(() => {
      const nativeHandle = findNodeHandle(node);
      if (typeof nativeHandle === 'number') {
        setHandle(nativeHandle);
      }
    });
  }, []);

  return { ref, handle };
}
