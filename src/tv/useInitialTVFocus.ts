import { useCallback, useState } from 'react';

/**
 * Android TV: `hasTVPreferredFocus` should apply only on first mount.
 * Leaving it permanently true traps focus on that element.
 */
export function useInitialTVFocus(enabled = true) {
  const [prefer, setPrefer] = useState(enabled);

  const onFocus = useCallback(() => {
    setPrefer(false);
  }, []);

  return {
    hasTVPreferredFocus: enabled && prefer,
    onInitialFocus: onFocus,
  };
}
