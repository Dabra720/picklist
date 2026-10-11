import { useSyncExternalStore } from 'react';
import { setSetting, useSetting } from '../core/store';
import { MODULES } from '../modules';

// ---------- Menu and settings: one shared open/closed state ----------
// The ☰ button and "Meer" in the tab bar open the same side menu.

type Overlay = 'menu' | 'settings' | null;
let overlay: Overlay = null;
const listeners = new Set<() => void>();

function setOverlay(next: Overlay) {
  overlay = next;
  listeners.forEach((listener) => listener());
}

export const openMenu = () => setOverlay('menu');
export const openSettings = () => setOverlay('settings');
export const closeOverlay = () => setOverlay(null);

export function useOverlay(): Overlay {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => overlay,
  );
}

// ---------- Tab bar ----------

export const TAB_SETTING = 'nav.tabs';
export const TAB_COUNT = 4;

/** The modules in the tab bar: the stored choice, completed with the first modules not chosen. */
export function resolveTabs(stored: unknown): string[] {
  const ids = MODULES.map((module) => module.id);
  const chosen = Array.isArray(stored)
    ? stored.filter((id, index): id is string => ids.includes(id) && stored.indexOf(id) === index)
    : [];
  const rest = ids.filter((id) => !chosen.includes(id));
  return [...chosen, ...rest].slice(0, Math.min(TAB_COUNT, ids.length));
}

export function useTabs(): string[] {
  return resolveTabs(useSetting<unknown>(TAB_SETTING));
}

/** Puts a module in a tab slot; if it already had another slot, the two swap. */
export function setTab(tabs: string[], slot: number, moduleId: string) {
  const next = [...tabs];
  const previous = next.indexOf(moduleId);
  if (previous !== -1) next[previous] = next[slot];
  next[slot] = moduleId;
  setSetting(TAB_SETTING, next);
}
