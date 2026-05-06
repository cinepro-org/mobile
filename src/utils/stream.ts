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

export function resolveProxyUrl(proxyPathOrUrl: string): string {
  if (proxyPathOrUrl.startsWith('http')) return proxyPathOrUrl;
  const path = proxyPathOrUrl.startsWith('/') ? proxyPathOrUrl : `/${proxyPathOrUrl}`;
  return `${getOmssBaseUrl()}${path}`;
}
