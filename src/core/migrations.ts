/**
 * Database migrations, one step per version, applied in order when the app opens an older
 * database. Rules:
 * - Never delete or recreate a store, and never drop data: user data must survive every update.
 * - A step may add stores and fill in new fields on existing records.
 * - Add a new step (and bump nothing else) to change the schema; DB_VERSION follows from the list.
 */

interface Migration {
  version: number;
  description: string;
  run: (db: IDBDatabase, tx: IDBTransaction) => void;
}

function createStore(db: IDBDatabase, name: string) {
  if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
}

/** Gives every record in a store the createdAt/updatedAt fields it lacks. */
function backfillTimestamps(
  tx: IDBTransaction,
  storeName: string,
  createdAtFor: (record: Record<string, unknown>) => number,
) {
  const store = tx.objectStore(storeName);
  const request = store.getAll();
  request.onsuccess = () => {
    for (const record of request.result as Record<string, unknown>[]) {
      const createdAt =
        typeof record.createdAt === 'number' ? record.createdAt : createdAtFor(record);
      if (typeof record.updatedAt === 'number' && record.createdAt === createdAt) continue;
      store.put({
        ...record,
        createdAt,
        updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : createdAt,
      });
    }
  };
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Paklijsten: lists, labels, items',
    run: (db) => ['lists', 'labels', 'items'].forEach((name) => createStore(db, name)),
  },
  {
    version: 2,
    description: 'Notities: notes',
    run: (db) => createStore(db, 'notes'),
  },
  {
    version: 3,
    description: 'Fundament: settings store, createdAt/updatedAt on every record',
    run: (db, tx) => {
      createStore(db, 'settings');
      const now = Date.now();
      // Labels and items had no dates; they take the date of the list they belong to.
      const listsRequest = tx.objectStore('lists').getAll();
      listsRequest.onsuccess = () => {
        const listCreated = new Map<string, number>();
        for (const list of listsRequest.result as Record<string, unknown>[]) {
          if (typeof list.id === 'string' && typeof list.createdAt === 'number') {
            listCreated.set(list.id, list.createdAt);
          }
        }
        const fromList = (record: Record<string, unknown>) =>
          listCreated.get(record.listId as string) ?? now;
        backfillTimestamps(tx, 'lists', () => now);
        backfillTimestamps(tx, 'labels', fromList);
        backfillTimestamps(tx, 'items', fromList);
      };
    },
  },
  {
    version: 4,
    description: 'Templates: templates, templateCategories',
    run: (db) => ['templates', 'templateCategories'].forEach((name) => createStore(db, name)),
  },
];

export const DB_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export function migrate(db: IDBDatabase, tx: IDBTransaction, oldVersion: number) {
  for (const migration of MIGRATIONS) {
    if (migration.version > oldVersion) migration.run(db, tx);
  }
}
