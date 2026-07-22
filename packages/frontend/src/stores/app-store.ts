import { create } from 'zustand';

interface AppState {
  deviceId: string | null;
  isOnline: boolean;
  pendingSyncCount: number;
  setDeviceId: (id: string) => void;
  setOnline: (online: boolean) => void;
  setPendingSyncCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  deviceId: null,
  isOnline: navigator.onLine,
  pendingSyncCount: 0,
  setDeviceId: (id) => set({ deviceId: id }),
  setOnline: (online) => set({ isOnline: online }),
  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
}));
