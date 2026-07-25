import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'night' | 'day';

type UiState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'night',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'day' ? 'night' : 'day' }),
    }),
    {
      name: 'nr-ui',
      version: 1,
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
