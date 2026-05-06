import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useAndroidTVBack(onBack: () => boolean): void {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => onBack());
    return () => sub.remove();
  }, [onBack]);
}
