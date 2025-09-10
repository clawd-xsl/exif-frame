import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  svg: string;
  setSvg: (svg: string) => void;
  assets: string;
  setAssets: (assets: string) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      svg: '',
      setSvg: (svg) => set({ svg }),
      assets: '',
      setAssets: (assets) => set({ assets }),
    }),
    {
      name: 'exif-frame-theme',
      partialize: (state) => ({
        svg: state.svg,
        assets: state.assets,
      }),
    }
  )
);
