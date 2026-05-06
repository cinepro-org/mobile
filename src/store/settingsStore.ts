import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CINEPRO_BASE_URL } from '@/utils/env';

type SettingsState = {
  cineproBaseUrl: string;
  autoQuality: boolean;
  defaultPlaybackRate: number;
  setCineproBaseUrl: (url: string) => void;
  setAutoQuality: (v: boolean) => void;
  setDefaultPlaybackRate: (r: number) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cineproBaseUrl: CINEPRO_BASE_URL,
      autoQuality: true,
      defaultPlaybackRate: 1,
      setCineproBaseUrl: (url) => set({ cineproBaseUrl: url.trim().replace(/\/$/, '') }),
      setAutoQuality: (v) => set({ autoQuality: v }),
      setDefaultPlaybackRate: (r) => set({ defaultPlaybackRate: r }),
    }),
    {
      name: 'cinestream-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
