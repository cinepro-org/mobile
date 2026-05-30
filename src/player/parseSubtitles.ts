export type SubtitleCue = {
  start: number;
  end: number;
  text: string;
};

/** Normalize CRLF / CR to LF so blank-line splits work for Windows SRT files. */
export function normalizeSubtitleText(body: string): string {
  return body.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function parseTimestamp(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length === 3) {
    const [h, m, rest] = parts;
    const [s, ms = '0'] = rest.split('.');
    return (
      Number(h) * 3600 +
      Number(m) * 60 +
      Number(s) +
      Number(ms.padEnd(3, '0').slice(0, 3)) / 1000
    );
  }
  if (parts.length === 2) {
    const [m, rest] = parts;
    const [s, ms = '0'] = rest.split('.');
    return Number(m) * 60 + Number(s) + Number(ms.padEnd(3, '0').slice(0, 3)) / 1000;
  }
  return 0;
}

function stripTags(text: string): string {
  return text
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\{\\[^}]+\}/g, '')
    .trim();
}

const SRT_BLOCK_RE =
  /(?:^|\n)(\d+)\n(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*\n([\s\S]*?)(?=\n\d+\n\d{2}:\d{2}:\d{2}|$)/g;

const VTT_CUE_RE =
  /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})[^\n]*\n([\s\S]*?)(?=\n\d{2}:\d{2}:\d{2}\.\d{3}\s*-->|$)/g;

/** Parse WebVTT or SRT sidecar files into timed cues. */
export function parseSubtitleFile(body: string, formatHint?: string): SubtitleCue[] {
  const normalized = normalizeSubtitleText(body);
  if (!normalized) return [];

  const lowerHint = formatHint?.toLowerCase() ?? '';
  const looksLikeVtt =
    lowerHint === 'vtt' ||
    normalized.startsWith('WEBVTT') ||
    /^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->/.test(normalized);

  return looksLikeVtt ? parseVtt(normalized) : parseSrt(normalized);
}

function parseVtt(body: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const withoutHeader = body.replace(/^WEBVTT[^\n]*\n?/i, '');

  for (const match of withoutHeader.matchAll(VTT_CUE_RE)) {
    const text = stripTags(match[3] ?? '');
    if (!text) continue;
    cues.push({
      start: parseTimestamp(match[1]),
      end: parseTimestamp(match[2]),
      text,
    });
  }

  if (cues.length) return cues.sort((a, b) => a.start - b.start);

  // Fallback: blank-line blocks (already LF-normalized).
  const blocks = withoutHeader.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    if (!lines.length) continue;

    let timeLineIdx = 0;
    if (lines[0] && !lines[0].includes('-->') && lines.length > 1) {
      timeLineIdx = 1;
    }
    const timeLine = lines[timeLineIdx];
    if (!timeLine?.includes('-->')) continue;

    const [startRaw, endRaw] = timeLine.split('-->').map((s) => s.trim().split(/\s+/)[0]);
    const text = stripTags(lines.slice(timeLineIdx + 1).join('\n'));
    if (!text) continue;

    cues.push({
      start: parseTimestamp(startRaw),
      end: parseTimestamp(endRaw),
      text,
    });
  }

  return cues.sort((a, b) => a.start - b.start);
}

function parseSrt(body: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];

  for (const match of body.matchAll(SRT_BLOCK_RE)) {
    const text = stripTags(match[4] ?? '');
    if (!text) continue;
    cues.push({
      start: parseTimestamp(match[2]),
      end: parseTimestamp(match[3]),
      text,
    });
  }

  if (cues.length) return cues.sort((a, b) => a.start - b.start);

  // Fallback: blank-line blocks (already LF-normalized).
  const blocks = body.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    if (lines.length < 2) continue;

    let timeLineIdx = 0;
    if (/^\d+$/.test(lines[0] ?? '') && lines.length >= 3) {
      timeLineIdx = 1;
    }
    const timeLine = lines[timeLineIdx];
    if (!timeLine?.includes('-->')) continue;

    const [startRaw, endRaw] = timeLine.split('-->').map((s) => s.trim());
    const text = stripTags(lines.slice(timeLineIdx + 1).join('\n'));
    if (!text) continue;

    cues.push({
      start: parseTimestamp(startRaw),
      end: parseTimestamp(endRaw),
      text,
    });
  }

  return cues.sort((a, b) => a.start - b.start);
}

export function cueAtTime(cues: SubtitleCue[], timeSec: number): string | null {
  const t = Math.max(0, timeSec);
  for (const cue of cues) {
    // Small lead/lag tolerance for progress tick interval (~450ms).
    if (t >= cue.start - 0.05 && t <= cue.end + 0.15) {
      return cue.text;
    }
  }
  return null;
}
