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
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { TV_NAV_COLLAPSED_WIDTH, tvNavExpandedWidth } from '@/tv/tvNavSizes';

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

const ANIM_MS = 220;

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
    navProgress.value = withTiming(1, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [navProgress, setExpandedState]);

  const collapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      if (expandedRef.current && focusZoneRef.current === 'content') {
        navProgress.value = withTiming(
          0,
          { duration: ANIM_MS, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(setExpandedState)(false);
          }
        );
      }
    }, 160);
  }, [navProgress, setExpandedState]);

  const registerNavFocus = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    focusZoneRef.current = 'nav';
    expand();
  }, [expand]);

  const registerContentFocus = useCallback(() => {
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
