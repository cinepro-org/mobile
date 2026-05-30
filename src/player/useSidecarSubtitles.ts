import { useEffect, useRef, useState } from 'react';
import type { OmssSidecarTextTrack } from '@/player/omssTextTracks';
import { cueAtTime, parseSubtitleFile } from '@/player/parseSubtitles';
import { playbackLogger } from '@/player/playbackLogger';

type Args = {
  track: OmssSidecarTextTrack | null;
  positionSec: number;
  enabled: boolean;
};

export function useSidecarSubtitles({ track, positionSec, enabled }: Args): string | null {
  const [cues, setCues] = useState<ReturnType<typeof parseSubtitleFile>>([]);
  const loadToken = useRef(0);

  useEffect(() => {
    if (!enabled || !track?.uri) {
      setCues([]);
      return;
    }

    const token = ++loadToken.current;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(track.uri, {
          headers: track.headers,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const body = await res.text();
        if (cancelled || token !== loadToken.current) return;

        const formatHint =
          track.type === 'text/vtt'
            ? 'vtt'
            : track.type === 'application/x-subrip'
              ? 'srt'
              : undefined;
        const parsed = parseSubtitleFile(body, formatHint);
        setCues(parsed);
        playbackLogger.info('Sidecar subtitle file loaded', {
          uri: track.uri,
          cues: parsed.length,
          label: track.title,
          bytes: body.length,
          firstCue: parsed[0]
            ? { start: parsed[0].start, end: parsed[0].end, preview: parsed[0].text.slice(0, 40) }
            : null,
          lastCue: parsed.length
            ? {
                start: parsed[parsed.length - 1].start,
                end: parsed[parsed.length - 1].end,
              }
            : null,
        });
      } catch (err) {
        if (cancelled || token !== loadToken.current) return;
        setCues([]);
        playbackLogger.warn('Sidecar subtitle fetch failed', {
          uri: track.uri,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, track?.title, track?.type, track?.uri, track?.headers]);

  if (!enabled || !cues.length) return null;
  return cueAtTime(cues, positionSec);
}
