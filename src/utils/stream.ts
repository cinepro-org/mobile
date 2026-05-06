import type { OmssSource, OmssStreamType } from '@/api/types/omss';
import { getOmssBaseUrl } from '@/api/runtimeConfig';

const QUALITY_RANK: Record<string, number> = {
  unknown: 0,
  '144p': 1,
  '240p': 2,
  '360p': 3,
  '480p': 4,
  '720p': 5,
  '1080p': 6,
  '1440p': 7,
  '2160p': 8,
};

export function rankQuality(q: string): number {
  const key = q.toLowerCase();
  return QUALITY_RANK[key] ?? 5;
}

export function sortSourcesByQualityDesc(sources: OmssSource[]): OmssSource[] {
  return [...sources].sort((a, b) => rankQuality(b.quality) - rankQuality(a.quality));
}

export function pickAutoSource(sources: OmssSource[]): OmssSource | undefined {
  const playable = sources.filter((s) => isPlayableType(s.type));
  if (!playable.length) return undefined;
  const hlsFirst = playable.sort((a, b) => {
    const typeScore = (t: OmssStreamType) =>
      t === 'hls' ? 3 : t === 'dash' ? 2 : t === 'mp4' ? 1 : 0;
    const td = typeScore(b.type) - typeScore(a.type);
    if (td !== 0) return td;
    return rankQuality(b.quality) - rankQuality(a.quality);
  });
  return hlsFirst[0];
}

export function isPlayableType(type: OmssStreamType): boolean {
  return type === 'hls' || type === 'dash' || type === 'http' || type === 'mp4' || type === 'webm';
}

function isLoopbackHttpHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
}

function parseConfiguredBase(base: string): URL | null {
  try {
    return new URL(base.endsWith('/') ? base : `${base}/`);
  } catch {
    return null;
  }
}

/**
 * OMSS sometimes returns absolute proxy URLs using the Core machine's loopback
 * (e.g. http://localhost:3000/v1/proxy?...). Rewrite them to match Settings:
 * - Same scheme/host as the configured base (works for https://domain.com with no :443)
 * - Same path prefix when Core sits behind a reverse proxy (e.g. https://domain.com/omss)
 */
export function resolveProxyUrl(proxyPathOrUrl: string): string {
  const raw = proxyPathOrUrl.trim();
  const base = getOmssBaseUrl().trim();
  if (!raw) return raw;

  if (!raw.startsWith('http')) {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${base}${path}`;
  }

  try {
    const target = new URL(raw);
    if (!isLoopbackHttpHost(target.hostname)) return raw;
    const configured = parseConfiguredBase(base);
    if (!configured) return raw;

    target.protocol = configured.protocol;
    target.host = configured.host;

    let basePath = configured.pathname;
    if (basePath.endsWith('/')) basePath = basePath.slice(0, -1);
    target.pathname = `${basePath}${target.pathname}`;

    return target.href;
  } catch {
    return raw;
  }
}
