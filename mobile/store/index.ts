import { create } from 'zustand';

type Language = 'en' | 'hi' | 'mr';

interface AppState {
  // Location — null means not yet resolved
  lat: number | null;
  lon: number | null;
  locationName: string;
  locationReady: boolean;
  setLocation: (lat: number, lon: number, name: string) => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Alert threshold
  alertThreshold: number;
  setAlertThreshold: (threshold: number) => void;

  // Alert enabled
  alertEnabled: boolean;
  setAlertEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  lat: null,
  lon: null,
  locationName: 'Detecting location...',
  locationReady: false,
  setLocation: (lat, lon, name) =>
    set({ lat, lon, locationName: name, locationReady: true }),

  language: 'en',
  setLanguage: (language) => set({ language }),

  alertThreshold: 150,
  setAlertThreshold: (alertThreshold) => set({ alertThreshold }),

  alertEnabled: false,
  setAlertEnabled: (alertEnabled) => set({ alertEnabled }),
}));
