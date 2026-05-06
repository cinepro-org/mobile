import { Dimensions, Platform, ScaledSize } from 'react-native';

export type DeviceClass = 'phone' | 'tablet' | 'tv1080' | 'tv4k';

const TV_BREAKPOINT_SHORTEST_SIDE = 900;

export function getWindow(): ScaledSize {
  return Dimensions.get('window');
}

export function shortestSide(): number {
  const { width, height } = getWindow();
  return Math.min(width, height);
}

export function longestSide(): number {
  const { width, height } = getWindow();
  return Math.max(width, height);
}

export function isTVLike(): boolean {
  return Platform.isTV === true;
}

export function deviceClass(): DeviceClass {
  if (isTVLike()) {
    const longest = longestSide();
    return longest >= 3800 ? 'tv4k' : 'tv1080';
  }
  const ss = shortestSide();
  if (ss >= 768) return 'tablet';
  return 'phone';
}

export function overscanHorizontal(): number {
  switch (deviceClass()) {
    case 'tv4k':
      return 96;
    case 'tv1080':
      return 48;
    default:
      return 0;
  }
}

export function overscanVertical(): number {
  switch (deviceClass()) {
    case 'tv4k':
      return 54;
    case 'tv1080':
      return 28;
    default:
      return 0;
  }
}

export function gridColumns(): number {
  const { width } = getWindow();
  const dc = deviceClass();
  if (dc === 'tv4k') return Math.max(6, Math.round(width / 320));
  if (dc === 'tv1080') return Math.max(5, Math.round(width / 280));
  if (dc === 'tablet') return Math.max(4, Math.round(width / 220));
  return width > 420 ? 3 : 2;
}

export function rowPosterWidth(): number {
  switch (deviceClass()) {
    case 'tv4k':
      return 200;
    case 'tv1080':
      return 168;
    case 'tablet':
      return 140;
    default:
      return 120;
  }
}

export function rowPosterHeight(): number {
  const w = rowPosterWidth();
  return Math.round((w * 3) / 2);
}

export function heroHeight(): number {
  const { height } = getWindow();
  const dc = deviceClass();
  if (dc === 'tv4k' || dc === 'tv1080') return Math.round(height * 0.62);
  if (dc === 'tablet') return Math.round(height * 0.52);
  return Math.round(height * 0.44);
}

export function spacing(scale: number): number {
  const base = deviceClass() === 'phone' ? 8 : deviceClass() === 'tablet' ? 10 : 12;
  return Math.round(base * scale);
}

export function fontScale(base: number): number {
  const dc = deviceClass();
  const multiplier =
    dc === 'tv4k' ? 1.35 : dc === 'tv1080' ? 1.18 : dc === 'tablet' ? 1.08 : 1;
  return Math.round(base * multiplier);
}

export { TV_BREAKPOINT_SHORTEST_SIDE };
