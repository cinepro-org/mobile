import { CINEPRO_BASE_URL } from '@/utils/env';

let activeBase = CINEPRO_BASE_URL;

export function getOmssBaseUrl(): string {
  return activeBase;
}

export function setOmssBaseUrl(url: string): void {
  activeBase = url.trim().replace(/\/$/, '');
}
