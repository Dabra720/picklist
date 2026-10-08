import type { AppData } from '../types';

const DB_NAME = 'paklijsten';
// Bump when the schema changes and add a migration step in `upgrade`.
// Never delete or recreate existing stores there: user data must survive app updates.
const DB_VERSION = 1;

export type StoreName = 'lists' | 'labels' | 'items';
const STORES: StoreName[] = ['lists', 'labels', 'items'];

export interface Write {
  store: StoreName;
  put?: { id: string }[];
  remove?: string[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function upgrade(db: IDBDatabase) {
  for (const name of STORES) {
    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
  }
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is niet beschikbaar in deze browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onblocked = () => reject(new Error('De database is in gebruik door een ander tabblad.'));
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

export async function loadAll(): Promise<AppData> {
  const db = await openDb();
  const tx = db.transaction(STORES, 'readonly');
  const [lists, labels, items] = await Promise.all([
    getAll<AppData['lists'][number]>(tx, 'lists'),
    getAll<AppData['labels'][number]>(tx, 'labels'),
    getAll<AppData['items'][number]>(tx, 'items'),
  ]);
  return { lists, labels, items };
}

/** Applies all writes in a single transaction, so a change is saved completely or not at all. */
export async function applyWrites(writes: Write[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES, 'readwrite');
  for (const write of writes) {
    const store = tx.objectStore(write.store);
    write.put?.forEach((record) => store.put(record));
    write.remove?.forEach((id) => store.delete(id));
  }
  await transactionDone(tx);
}

export async function replaceAll(data: AppData): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES, 'readwrite');
  for (const name of STORES) {
    const store = tx.objectStore(name);
    store.clear();
    data[name].forEach((record) => store.put(record));
  }
  await transactionDone(tx);
}
