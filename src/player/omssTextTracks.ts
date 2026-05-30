import { TextTrackType, type TextTracks } from 'react-native-video';
import type { OmssSubtitle, OmssSubtitleFormat } from '@/api/types/omss';
import { buildPlaybackRequest } from '@/utils/stream';

/** Side-loaded track entry for react-native-video (includes fetch headers when needed). */
export type OmssSidecarTextTrack = TextTracks[number] & {
  headers?: Record<string, string>;
};

export type OmssTextTrackMeta = {
  index: number;
  label: string;
  format: OmssSubtitleFormat;
  language: string;
};

const LANGUAGE_HINTS: [RegExp, string][] = [
  [/\benglish\b|\(\s*en\s*\)|\ben\b/i, 'en'],
  [/\bspanish\b|\(\s*es\s*\)|\bes\b/i, 'es'],
  [/\bfrench\b|\(\s*fr\s*\)|\bfr\b/i, 'fr'],
  [/\bgerman\b|\(\s*de\s*\)|\bde\b/i, 'de'],
  [/\bitalian\b|\(\s*it\s*\)|\bit\b/i, 'it'],
  [/\bportuguese\b|\(\s*pt\s*\)|\bpt\b/i, 'pt'],
  [/\bjapanese\b|\(\s*ja\s*\)|\bja\b/i, 'ja'],
  [/\bkorean\b|\(\s*ko\s*\)|\bko\b/i, 'ko'],
  [/\bchinese\b|\(\s*zh\s*\)|\bzh\b/i, 'zh'],
];

export function inferSubtitleLanguage(label: string): string {
  for (const [pattern, code] of LANGUAGE_HINTS) {
    if (pattern.test(label)) return code;
  }
  return 'en';
}

/** Map OMSS subtitle format to the MIME type ExoPlayer / AVPlayer expect. */
export function omssFormatToTextTrackType(format: OmssSubtitleFormat): TextTrackType {
  switch (format) {
    case 'srt':
      return TextTrackType.SUBRIP;
    case 'ass':
    case 'ssa':
      // ExoPlayer SSA sidecar — not in enum but accepted at runtime.
      return 'text/x-ssa' as TextTrackType;
    case 'vtt':
    default:
      return TextTrackType.VTT;
  }
}

function subtitleAcceptHeader(format: OmssSubtitleFormat): string {
  switch (format) {
    case 'srt':
      return 'application/x-subrip, text/plain, */*';
    case 'ass':
    case 'ssa':
      return 'text/x-ssa, text/plain, */*';
    case 'vtt':
    default:
      return 'text/vtt, text/plain, */*';
  }
}

/**
 * Build side-loaded text tracks from OMSS subtitles.
 * Uses the same upstream URL + Referer/Origin resolution as video playback.
 */
export function buildOmssTextTracks(subtitles: OmssSubtitle[]): {
  tracks: OmssSidecarTextTrack[];
  meta: OmssTextTrackMeta[];
} {
  const tracks: OmssSidecarTextTrack[] = [];
  const meta: OmssTextTrackMeta[] = [];

  subtitles.forEach((sub, index) => {
    const label = sub.label?.trim() || `Subtitle ${index + 1}`;
    const language = inferSubtitleLanguage(label);
    const playback = buildPlaybackRequest(sub.url);
    const headers: Record<string, string> = {
      Accept: subtitleAcceptHeader(sub.format),
      ...(playback.headers ?? {}),
    };

    tracks.push({
      title: label,
      language: language as OmssSidecarTextTrack['language'],
      type: omssFormatToTextTrackType(sub.format),
      uri: playback.uri,
      headers,
    });
    meta.push({ index, label, format: sub.format, language });
  });

  return { tracks, meta };
}

const ENGLISH_LABEL = /\benglish\b|\(\s*en\s*\)|\ben-us\b|\ben-gb\b|\[en\]/i;

export function isExplicitEnglishSubtitle(label: string): boolean {
  return ENGLISH_LABEL.test(label);
}

/** Prefer an English-labeled track; if only one track exists, use it. */
export function pickDefaultEnglishSubtitleIndex(meta: OmssTextTrackMeta[]): number {
  if (!meta.length) return -1;
  const englishIdx = meta.findIndex((m) => isExplicitEnglishSubtitle(m.label));
  if (englishIdx >= 0) return englishIdx;
  if (meta.length === 1) return 0;
  const langEnIdx = meta.findIndex((m) => m.language === 'en');
  if (langEnIdx >= 0) return langEnIdx;
  return -1;
}

/**
 * Apply saved per-title preference, or auto-select English on first play.
 * `savedIdx === null` means no stored row for this title yet.
 */
export function resolveSubtitleTrackIndex(
  savedIdx: number | null,
  meta: OmssTextTrackMeta[]
): number {
  if (!meta.length) return -1;
  if (savedIdx === null) return pickDefaultEnglishSubtitleIndex(meta);
  if (savedIdx === -1) return -1;
  const clamped = clampSubtitleTrackIndex(savedIdx, meta.length);
  return clamped >= 0 ? clamped : pickDefaultEnglishSubtitleIndex(meta);
}

export function clampSubtitleTrackIndex(index: number, trackCount: number): number {
  if (trackCount <= 0) return -1;
  if (index < 0) return -1;
  if (index >= trackCount) return -1;
  return index;
}
