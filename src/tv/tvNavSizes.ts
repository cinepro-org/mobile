import { deviceClass } from '@/utils/layout';

/** Collapsed rail — icons only. */
export const TV_NAV_COLLAPSED_WIDTH = 76;

/** Expanded rail — icons + labels. */
export function tvNavExpandedWidth(): number {
  return deviceClass() === 'tv4k' ? 320 : 280;
}
