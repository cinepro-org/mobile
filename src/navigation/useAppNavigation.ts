import { useNavigation } from '@react-navigation/native';

export function useAppNavigation() {
  return useNavigation() as any;
}
