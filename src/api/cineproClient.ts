import { sleep } from '@/utils/sleep';
import {
  OmssHttpError,
  type OmssErrorBody,
  type OmssHealthResponse,
  type OmssRefreshResponse,
  type OmssSourceResponse,
} from '@/api/types/omss';
import { getOmssBaseUrl } from '@/api/runtimeConfig';

/** Catches typos like `http://l192.168.x.x` that break `fetch` with "Failed to parse URL". */
function looksLikeExtraCharBeforeIpv4(hostname: string): boolean {
  return /^l\d+(?:\.\d+){3}$/i.test(hostname);
}

function joinUrl(path: string): string {
  const base = getOmssBaseUrl().trim();
  if (!base) {
    throw new OmssHttpError('Configure your CinePro Core (OMSS) URL in Settings.', 400);
  }
  const normalizedBase = base.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const joined = `${normalizedBase}${p}`;
  try {
    const u = new URL(joined);
    if (looksLikeExtraCharBeforeIpv4(u.hostname)) {
      throw new OmssHttpError(
        'Invalid Core URL: remove the stray letter before the IP (use 192.168… not l192.168…).',
        400
      );
    }
  } catch (e) {
    if (e instanceof OmssHttpError) throw e;
    throw new OmssHttpError(
      'Invalid Core URL. Check spelling and use a full URL like http://192.168.0.10:3000',
      400
    );
  }
  return joined;
}

async function parseJsonSafe<T>(res: Response): Promise<T | undefined> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

export async function omssFetchJson<T>(
  path: string,
  init?: RequestInit & { retries?: number }
): Promise<T> {
  const retries = init?.retries ?? 2;
  const { retries: _r, ...rest } = init ?? {};
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(joinUrl(path), {
        ...rest,
        headers: {
          Accept: 'application/json',
          ...(rest.headers ?? {}),
        },
      });

      if (res.status >= 500 && attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }

      const data = await parseJsonSafe<T | OmssErrorBody>(res);
      if (!res.ok) {
        const errBody = data as OmssErrorBody | undefined;
        throw new OmssHttpError(
          errBody?.error?.message ?? `Request failed (${res.status})`,
          res.status,
          errBody && 'error' in errBody ? errBody : undefined
        );
      }
      return data as T;
    } catch (e) {
      lastErr = e;
      if (e instanceof OmssHttpError && e.status < 500) throw e;
      if (attempt === retries) throw e;
      await sleep(250 * (attempt + 1));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Unknown OMSS error');
}

export const CineProApi = {
  health(): Promise<OmssHealthResponse> {
    return omssFetchJson<OmssHealthResponse>('/v1/health');
  },

  movieSources(tmdbId: string | number): Promise<OmssSourceResponse> {
    return omssFetchJson<OmssSourceResponse>(`/v1/movies/${encodeURIComponent(String(tmdbId))}`);
  },

  tvEpisodeSources(params: {
    tmdbShowId: string | number;
    season: number;
    episode: number;
  }): Promise<OmssSourceResponse> {
    const id = encodeURIComponent(String(params.tmdbShowId));
    return omssFetchJson<OmssSourceResponse>(
      `/v1/tv/${id}/seasons/${params.season}/episodes/${params.episode}`
    );
  },

  refresh(responseId: string): Promise<OmssRefreshResponse> {
    return omssFetchJson<OmssRefreshResponse>(
      `/v1/refresh/${encodeURIComponent(responseId)}`,
      { method: 'GET' }
    );
  },
};
