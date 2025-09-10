import { create } from 'zustand';

interface ThemeTabIndexStore {
  themeTabIndex: number;
  setThemeTabIndex: (tabIndex: number) => void;
}

export const useThemeTabIndexStore = create<ThemeTabIndexStore>()((set) => ({
  themeTabIndex: 0,
  setThemeTabIndex: (themeTabIndex) => set({ themeTabIndex }),
}));
