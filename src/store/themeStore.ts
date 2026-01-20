import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'default' | 'blueprint' | 'soft-minimal';

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'default',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'systemica-theme',
    }
  )
);

// Theme metadata for UI
export const themeInfo: Record<ThemeName, { name: string; description: string }> = {
  default: {
    name: 'Classic',
    description: 'Original Systemica theme with gradient nodes',
  },
  blueprint: {
    name: 'Blueprint',
    description: 'Technical wireframe style with cyan accents',
  },
  'soft-minimal': {
    name: 'Soft Minimal',
    description: 'Clean geometric shapes with warm tones',
  },
};
