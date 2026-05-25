import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Platform } from 'react-native';
import { useTVEventHandler } from '@/tv/useTVEventHandler';
import { TV_NAV_COLLAPSED_WIDTH, tvNavExpandedWidth } from '@/tv/tvNavSizes';

type TVNavigationContextValue = {
  expanded: boolean;
  drawerWidth: number;
  widthAnim: Animated.Value;
  expand: () => void;
  collapse: () => void;
  /** Call from content roots so left on the remote expands the rail when collapsed. */
  registerContentFocus: () => void;
};

const TVNavigationContext = createContext<TVNavigationContextValue | null>(null);

const ANIM_MS = 280;

/**
 * Manages collapsible Android TV side navigation width and expand/collapse state.
 * Nav items expand on focus; content focus collapses the rail.
 */
export function TVNavigationProvider({ children }: { children: ReactNode }) {
  const expandedRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const expandedWidth = tvNavExpandedWidth();
  const widthAnim = useRef(new Animated.Value(TV_NAV_COLLAPSED_WIDTH)).current;
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animateWidth = useCallback(
    (toExpanded: boolean) => {
      expandedRef.current = toExpanded;
      setExpanded(toExpanded);
      Animated.timing(widthAnim, {
        toValue: toExpanded ? expandedWidth : TV_NAV_COLLAPSED_WIDTH,
        duration: ANIM_MS,
        useNativeDriver: false,
      }).start();
    },
    [expandedWidth, widthAnim]
  );

  const expand = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    if (!expandedRef.current) animateWidth(true);
  }, [animateWidth]);

  const collapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      if (expandedRef.current) animateWidth(false);
    }, 120);
  }, [animateWidth]);

  const registerContentFocus = useCallback(() => {
    collapse();
  }, [collapse]);

  // Pressing left from main content expands the collapsed rail.
  useTVEventHandler(
    useCallback(
      (evt) => {
        if (expandedRef.current || evt.eventType !== 'left') return;
        expand();
      },
      [expand]
    ),
    Platform.isTV
  );

  const drawerWidth = expanded ? expandedWidth : TV_NAV_COLLAPSED_WIDTH;

  const value = useMemo(
    () => ({
      expanded,
      drawerWidth,
      widthAnim,
      expand,
      collapse,
      registerContentFocus,
    }),
    [collapse, drawerWidth, expand, expanded, registerContentFocus, widthAnim]
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

/** Safe hook for shared screens — no-op when not inside TV nav provider. */
export function useTVNavigationOptional(): TVNavigationContextValue | null {
  return useContext(TVNavigationContext);
}
