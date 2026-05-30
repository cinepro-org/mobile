import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { findNodeHandle, type View } from 'react-native';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { TV_NAV_COLLAPSED_WIDTH, tvNavExpandedWidth } from '@/tv/tvNavSizes';
import {
  MOTION_DURATION,
  MOTION_EASE_IN,
  MOTION_EASE_OUT,
  motionTiming,
} from '@/utils/motion';

type FocusZone = 'nav' | 'content';

type TVNavigationContextValue = {
  expanded: boolean;
  /** 0 = collapsed, 1 = expanded — drives smooth Reanimated rail width. */
  navProgress: SharedValue<number>;
  railAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  expand: () => void;
  collapse: () => void;
  registerContentFocus: () => void;
  registerNavFocus: () => void;
  contentFocusHandle: number | null;
  navFocusHandle: number | null;
  setContentFocusRef: (ref: View | null) => void;
  setNavFocusRef: (ref: View | null) => void;
};

const TVNavigationContext = createContext<TVNavigationContextValue | null>(null);

const ANIM_MS = MOTION_DURATION.normal;
const COLLAPSE_DELAY_MS = 220;

/**
 * Collapsible TV side rail. Width animates via Reanimated on the UI thread while the
 * rail overlays content (no layout reflow of the main pane).
 */
export function TVNavigationProvider({ children }: { children: ReactNode }) {
  const expandedRef = useRef(false);
  const focusZoneRef = useRef<FocusZone>('content');
  const [expanded, setExpanded] = useState(false);
  const expandedWidth = tvNavExpandedWidth();
  const navProgress = useSharedValue(0);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentAnchorRef = useRef<View | null>(null);
  /** True after main content has received focus — prevents startup nav flash expand/collapse. */
  const contentHasFocusedRef = useRef(false);
  const [contentFocusHandle, setContentFocusHandle] = useState<number | null>(null);
  const [navFocusHandle, setNavFocusHandle] = useState<number | null>(null);

  const syncHandle = useCallback((ref: View | null, setter: (h: number | null) => void) => {
    if (!ref) {
      setter(null);
      return;
    }
    requestAnimationFrame(() => {
      const handle = findNodeHandle(ref);
      setter(typeof handle === 'number' ? handle : null);
    });
  }, []);

  const setContentFocusRef = useCallback(
    (ref: View | null) => {
      contentAnchorRef.current = ref;
      syncHandle(ref, setContentFocusHandle);
    },
    [syncHandle]
  );

  const setNavFocusRef = useCallback(
    (ref: View | null) => {
      syncHandle(ref, setNavFocusHandle);
    },
    [syncHandle]
  );

  const setExpandedState = useCallback((value: boolean) => {
    expandedRef.current = value;
    setExpanded(value);
  }, []);

  const expand = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    if (expandedRef.current) return;
    setExpandedState(true);
    navProgress.value = withTiming(1, motionTiming(ANIM_MS, MOTION_EASE_OUT));
  }, [navProgress, setExpandedState]);

  const collapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      if (expandedRef.current && focusZoneRef.current === 'content') {
        navProgress.value = withTiming(
          0,
          motionTiming(ANIM_MS, MOTION_EASE_IN),
          (finished) => {
            if (finished) runOnJS(setExpandedState)(false);
          }
        );
      }
    }, COLLAPSE_DELAY_MS);
  }, [navProgress, setExpandedState]);

  const registerNavFocus = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    focusZoneRef.current = 'nav';

    // On cold start the rail can grab focus before the hero/content preferred focus lands.
    // Do not expand (or leave focus on nav) until the user has actually been in content first.
    if (!contentHasFocusedRef.current) {
      const target = contentAnchorRef.current as (View & { focus?: () => void }) | null;
      if (target?.focus) {
        requestAnimationFrame(() => target.focus());
      }
      return;
    }

    expand();
  }, [expand]);

  const registerContentFocus = useCallback(() => {
    contentHasFocusedRef.current = true;
    focusZoneRef.current = 'content';
    collapse();
  }, [collapse]);

  const railAnimatedStyle = useAnimatedStyle(() => ({
    width:
      TV_NAV_COLLAPSED_WIDTH +
      (expandedWidth - TV_NAV_COLLAPSED_WIDTH) * navProgress.value,
  }));

  const value = useMemo(
    () => ({
      expanded,
      navProgress,
      railAnimatedStyle,
      expand,
      collapse,
      registerContentFocus,
      registerNavFocus,
      contentFocusHandle,
      navFocusHandle,
      setContentFocusRef,
      setNavFocusRef,
    }),
    [
      collapse,
      contentFocusHandle,
      expand,
      expanded,
      navFocusHandle,
      navProgress,
      railAnimatedStyle,
      registerContentFocus,
      registerNavFocus,
      setContentFocusRef,
      setNavFocusRef,
    ]
  );

  return <TVNavigationContext.Provider value={value}>{children}</TVNavigationContext.Provider>;
}

export function useTVNavigation(): TVNavigationContextValue {
  const ctx = useContext(TVNavigationContext);
  if (!ctx) {
    throw new Error('useTVNavigation must be used within TVNavigationProvider');
  }
  return ctx;
}

export function useTVNavigationOptional(): TVNavigationContextValue | null {
  return useContext(TVNavigationContext);
}
