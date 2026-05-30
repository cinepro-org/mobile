import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Android TV: `hasTVPreferredFocus` should apply only on first mount.
 * Leaving it permanently true traps focus on that element.
 */
export function useInitialTVFocus(enabled = true) {
  const [prefer, setPrefer] = useState(enabled);

  const onInitialFocus = useCallback(() => {
    setPrefer(false);
  }, []);

  return {
    hasTVPreferredFocus: enabled && prefer,
    onInitialFocus,
  };
}

/**
 * Apply preferred focus once each time an overlay becomes visible (e.g. player HUD).
 */
export function useOverlayInitialFocus(visible: boolean, enabled = true) {
  const [prefer, setPrefer] = useState(false);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !wasVisibleRef.current && enabled) {
      setPrefer(true);
    }
    if (!visible) {
      setPrefer(false);
    }
    wasVisibleRef.current = visible;
  }, [enabled, visible]);

  const onInitialFocus = useCallback(() => {
    setPrefer(false);
  }, []);

  return {
    hasTVPreferredFocus: visible && enabled && prefer,
    onInitialFocus,
  };
}
