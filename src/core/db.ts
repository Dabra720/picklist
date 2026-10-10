import { DB_VERSION, migrate } from './migrations';
import type { AppData } from './types';

const DB_NAME = 'paklijsten';

/** Stores holding user data; each maps to the array of the same name in AppData. */
export type DataStore = keyof AppData;
export const DATA_STORES: DataStore[] = [
  'lists',
  'labels',
  'items',
  'notes',
  'templates',
  'templateCategories',
];

export type StoreName = DataStore | 'settings';
const ALL_STORES: StoreName[] = [...DATA_STORES, 'settings'];

/** A key-value pair in the settings store. */
export interface SettingRecord {
  id: string;
  value: unknown;
  updatedAt: number;
}

export interface Write {
  store: StoreName;
  put?: { id: string }[];
  remove?: string[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is niet beschikbaar in deze browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      // Runs inside the upgrade transaction: if any step fails, the whole upgrade is rolled back
      // and the database stays at its old version with its data intact.
      migrate(request.result, request.transaction!, event.oldVersion);
    };
    request.onblocked = () =>
      reject(new Error('De database is in gebruik door een ander tabblad.'));
    request.onerror = () => reject(request.error ?? new Error('Database openen mislukt.'));
    request.onsuccess = () => {
      const db = request.result;
      // Let a newer version of the app (in another tab) upgrade the database.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Opslaan mislukt.'));
    tx.onabort = () => reject(tx.error ?? new Error('Opslaan afgebroken.'));
  });
}

function getAll<T>(tx: IDBTransaction, store: StoreName): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAll(): Promise<{ data: AppData; settings: SettingRecord[] }> {
  const db = await openDb();
  const tx = db.transaction(ALL_STORES, 'readonly');
  const [settings, ...arrays] = await Promise.all([
    getAll<SettingRecord>(tx, 'settings'),
    ...DATA_STORES.map((name) => getAll<unknown>(tx, name)),
  ]);
  const data = Object.fromEntries(
    DATA_STORES.map((name, i) => [name, arrays[i]]),
  ) as unknown as AppData;
  return { data, settings };
}

/** Applies all writes in a single transaction, so a change is saved completely or not at all. */
export async function applyWrites(writes: Write[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(ALL_STORES, 'readwrite');
  for (const write of writes) {
    const store = tx.objectStore(write.store);
    write.put?.forEach((record) => store.put(record));
    write.remove?.forEach((id) => store.delete(id));
  }
  await transactionDone(tx);
}

/**
 * Replaces the contents of the given data stores (not the settings) in one transaction: either
 * all of them are saved, or nothing changes.
 */
export async function replaceStores(data: AppData, stores: DataStore[]): Promise<void> {
  if (stores.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(stores, 'readwrite');
  for (const name of stores) {
    const store = tx.objectStore(name);
    store.clear();
    data[name].forEach((record) => store.put(record));
  }
  await transactionDone(tx);
}
