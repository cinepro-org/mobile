import { useSettingsStore } from '@/store/settingsStore';

/** Always reads the persisted Core URL so fetches never race App mount / useEffect. */
export function getOmssBaseUrl(): string {
  return useSettingsStore.getState().cineproBaseUrl.trim();
}

/** @deprecated No longer needed; URL lives in settings store only. */
export function setOmssBaseUrl(_url: string): void {}
