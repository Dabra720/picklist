import { useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';

const KEY = 'paklijsten-theme';
// Keep in sync with --bg in styles.css.
const BACKGROUND = { light: '#f5f6f8', dark: '#0e1113' };

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // Storage can be unavailable (private mode); fall back to the system theme.
  }
  return 'system';
}

export function applyTheme(theme: Theme = readTheme()) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;

  // Colour of the status bar / browser chrome.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const own = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = BACKGROUND[theme === 'system' ? own : theme];
  });
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const setTheme = (next: Theme) => {
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Not persisted, but still applied for this session.
    }
    applyTheme(next);
    setThemeState(next);
  };
  return [theme, setTheme];
}
