import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

const read = (): Theme => {
  try {
    return (localStorage.getItem('theme') as Theme) || 'system';
  } catch {
    return 'system';
  }
};

const apply = (theme: Theme) => {
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
};

export const useTheme = create<{ theme: Theme; setTheme: (t: Theme) => void }>((set) => ({
  theme: read(),
  setTheme: (theme) => {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* private mode */
    }
    apply(theme);
    set({ theme });
  },
}));

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () =>
  apply(useTheme.getState().theme),
);
