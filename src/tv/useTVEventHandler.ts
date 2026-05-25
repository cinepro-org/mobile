import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export type TVRemoteEvent = {
  eventType: string;
  eventKeyAction?: number;
};

export type TVRemoteEventHandler = (event: TVRemoteEvent) => void;

type TVEventHandlerStatic = {
  addListener: (handler: TVRemoteEventHandler) => { remove: () => void };
};

function loadTVEventHandler(): TVEventHandlerStatic | undefined {
  try {
    const rn = require('react-native') as { TVEventHandler?: TVEventHandlerStatic };
    return rn.TVEventHandler;
  } catch {
    return undefined;
  }
}

function loadUseTVEventHandler():
  | ((handler: TVRemoteEventHandler) => void)
  | undefined {
  try {
    const rn = require('react-native') as {
      useTVEventHandler?: (handler: TVRemoteEventHandler) => void;
    };
    return rn.useTVEventHandler;
  } catch {
    return undefined;
  }
}

const nativeUseTVEventHandler = loadUseTVEventHandler();

/** No-op hook used when `useTVEventHandler` is unavailable (non-TV builds). */
function useNoopTVEventHandler(_handler: TVRemoteEventHandler): void {}

const usePlatformTVEventHandler = nativeUseTVEventHandler ?? useNoopTVEventHandler;

/**
 * Listens for Android TV / Apple TV remote events: select, playPause, directions, menu.
 * Falls back to legacy `TVEventHandler` when the hook is not exported.
 */
export function useTVEventHandler(handler: TVRemoteEventHandler, enabled = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const dispatch = useCallback(
    (event: TVRemoteEvent) => {
      if (!enabled || !Platform.isTV) return;
      handlerRef.current(event);
    },
    [enabled]
  );

  usePlatformTVEventHandler(dispatch);

  useEffect(() => {
    if (!Platform.isTV || !enabled || nativeUseTVEventHandler) return;
    const TVEventHandler = loadTVEventHandler();
    if (!TVEventHandler) return;
    const sub = TVEventHandler.addListener((event) => handlerRef.current(event));
    return () => sub.remove();
  }, [enabled]);
}
