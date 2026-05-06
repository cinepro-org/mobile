import { Platform } from 'react-native';

export function useTV(): boolean {
  return Platform.isTV === true;
}
