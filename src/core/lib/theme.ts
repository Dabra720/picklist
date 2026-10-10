import { useState } from 'react';
import { getSetting, setSetting } from '../store';

export type Theme = 'system' | 'light' | 'dark';

/**
 * The theme is a setting in IndexedDB. It is also mirrored in localStorage, because the inline
 * script in index.html must apply it before the first paint, before IndexedDB is read.
 */
const KEY = 'paklijsten-theme';
const SETTING = 'theme';
// Keep in sync with --bg in styles.css.
const BACKGROUND = { light: '#f5f6f8', dark: '#0e1113' };

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readCachedTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // Storage can be unavailable (private mode); fall back to the system theme.
  }
  return 'system';
}

function writeCachedTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Not cached; the stored setting still applies on the next start.
  }
}

export function applyTheme(theme: Theme = readCachedTheme()) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;

  // Colour of the status bar / browser chrome.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const own = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = BACKGROUND[theme === 'system' ? own : theme];
  });
}

/**
 * Once the stored settings are loaded: use the stored theme, or move a theme chosen before it
 * was stored in IndexedDB (only in localStorage) into the settings.
 */
export function syncThemeSetting() {
  const stored = getSetting<unknown>(SETTING);
  if (isTheme(stored)) {
    writeCachedTheme(stored);
    applyTheme(stored);
  } else {
    const cached = readCachedTheme();
    if (cached !== 'system') setSetting(SETTING, cached);
  }
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = getSetting<unknown>(SETTING);
    return isTheme(stored) ? stored : readCachedTheme();
  });
  const setTheme = (next: Theme) => {
    setSetting(SETTING, next);
    writeCachedTheme(next);
    applyTheme(next);
    setThemeState(next);
  };
  return [theme, setTheme];
}
