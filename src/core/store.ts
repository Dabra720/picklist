import { useSyncExternalStore } from 'react';
import {
  applyWrites,
  loadAll,
  replaceStores,
  type DataStore,
  type SettingRecord,
  type Write,
} from './db';
import { showToast } from './lib/toast';
import { EMPTY_DATA, type AppData } from './types';

export interface AppState {
  status: 'loading' | 'ready' | 'error';
  data: AppData;
  error?: string;
}

/**
 * Runs once on the stored data when the app starts, before anything is shown. A module uses it
 * to tidy up its own records; the writes it returns are saved right after.
 */
export type LoadHook = (data: AppData) => { data: AppData; writes?: Write[] };

// All data is kept in memory and every change is written through to IndexedDB.
let state: AppState = { status: 'loading', data: EMPTY_DATA };
const listeners = new Set<() => void>();
let loadHooks: LoadHook[] = [];

function setState(next: AppState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state);
}

export function getData(): AppData {
  return state.data;
}

// Writes are chained so they reach the database in the order they were made.
let writeQueue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>) {
  writeQueue = writeQueue.then(task).catch((error) => {
    console.error(error);
    showToast('Opslaan is mislukt. Mogelijk is de opslag van dit apparaat vol.');
  });
}

/**
 * The one way to change data: shows the new data at once and saves the writes in a single
 * transaction. Every module goes through here (later also the hook for synchronisation).
 */
export function commit(data: AppData, writes: Write[]) {
  setState({ ...state, data });
  enqueue(() => applyWrites(writes));
}

/** Registers the modules' load hooks; call once before initStore. */
export function configureStore(hooks: LoadHook[]) {
  loadHooks = hooks;
}

export async function initStore() {
  setState({ status: 'loading', data: EMPTY_DATA });
  try {
    const stored = await loadAll();
    let data = stored.data;
    const writes: Write[] = [];
    for (const hook of loadHooks) {
      const result = hook(data);
      data = result.data;
      if (result.writes) writes.push(...result.writes);
    }
    loadSettings(stored.settings);
    setState({ status: 'ready', data });
    if (writes.length > 0) enqueue(() => applyWrites(writes));
    // Ask the browser not to evict our data under storage pressure (best effort).
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch (error) {
    console.error(error);
    setState({
      status: 'error',
      data: EMPTY_DATA,
      error: error instanceof Error ? error.message : 'Onbekende fout',
    });
  }
}

/**
 * Saves imported data: the given stores are replaced by their contents in `data` in one
 * transaction. Rejects (and keeps the old data) if saving fails.
 */
export async function importData(data: AppData, stores: DataStore[]): Promise<void> {
  await writeQueue;
  await replaceStores(data, stores);
  setState({ ...state, data });
}

// ---------- Settings ----------
// Small key-value preferences, stored in IndexedDB so they can travel with backups and sync.

const settings = new Map<string, unknown>();
const settingTimes = new Map<string, number>();
const settingListeners = new Set<() => void>();
// Changes on every settings change, so useSetting can tell React something changed.
let settingsVersion = 0;

function settingsChanged() {
  settingsVersion += 1;
  settingListeners.forEach((listener) => listener());
}

/** A setting that re-renders the component when it changes. */
export function useSetting<T>(key: string): T | undefined {
  useSyncExternalStore(
    (listener) => {
      settingListeners.add(listener);
      return () => settingListeners.delete(listener);
    },
    () => settingsVersion,
  );
  return settings.get(key) as T | undefined;
}

function loadSettings(records: SettingRecord[]) {
  settings.clear();
  settingTimes.clear();
  for (const record of records) {
    settings.set(record.id, record.value);
    settingTimes.set(record.id, record.updatedAt ?? 0);
  }
  settingsChanged();
}

export function getSetting<T>(key: string): T | undefined {
  return settings.get(key) as T | undefined;
}

/** All settings as stored records. */
export function getSettingRecords(): SettingRecord[] {
  return [...settingTimes.entries()].map(([id, updatedAt]) => ({
    id,
    value: settings.get(id),
    updatedAt,
  }));
}

export function setSetting(key: string, value: unknown) {
  if (value === undefined) {
    settings.delete(key);
    settingTimes.delete(key);
    settingsChanged();
    enqueue(() => applyWrites([{ store: 'settings', remove: [key] }]));
    return;
  }
  const record: SettingRecord = { id: key, value, updatedAt: Date.now() };
  settings.set(key, value);
  settingTimes.set(key, record.updatedAt);
  settingsChanged();
  enqueue(() => applyWrites([{ store: 'settings', put: [record] }]));
}

/** Saves settings from a backup as they were, keeping their own updatedAt. */
export function putSettingRecords(records: SettingRecord[]) {
  if (records.length === 0) return;
  for (const record of records) {
    settings.set(record.id, record.value);
    settingTimes.set(record.id, record.updatedAt);
  }
  settingsChanged();
  enqueue(() => applyWrites([{ store: 'settings', put: records }]));
}
