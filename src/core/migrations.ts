/**
 * Database migrations, one step per version, applied in order when the app opens an older
 * database. Rules:
 * - Never delete or recreate a store, and never drop data: user data must survive every update.
 * - A step may add stores and fill in new fields on existing records.
 * - Add a new step (and bump nothing else) to change the schema; DB_VERSION follows from the list.
 *
 * All steps run in the one upgrade transaction, strictly one after the other: a step calls
 * `done` once its writes are queued, and only then does the next step start reading. Otherwise
 * two steps that change the same records (when a database skips several versions at once) would
 * both read the old record and the second would overwrite what the first added.
 */

type Done = () => void;

interface Migration {
  version: number;
  description: string;
  run: (db: IDBDatabase, tx: IDBTransaction, done: Done) => void;
}

function createStore(db: IDBDatabase, name: string) {
  if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
}

type Row = Record<string, unknown>;

/** Reads all records of a store and writes back the ones `change` returns; then calls `done`. */
function updateRecords(
  tx: IDBTransaction,
  storeName: string,
  change: (record: Row) => Row | null,
  done: Done,
) {
  const store = tx.objectStore(storeName);
  const request = store.getAll();
  request.onsuccess = () => {
    for (const record of request.result as Row[]) {
      const next = change(record);
      if (next) store.put(next);
    }
    done();
  };
}

/** Runs the tasks one after the other, then calls `done`. */
function inSequence(tasks: ((done: Done) => void)[], done: Done) {
  const next = (index: number) =>
    index < tasks.length ? tasks[index](() => next(index + 1)) : done();
  next(0);
}

/** Gives every record in a store the createdAt/updatedAt fields it lacks. */
function backfillTimestamps(
  tx: IDBTransaction,
  storeName: string,
  createdAtFor: (record: Row) => number,
) {
  return (done: Done) =>
    updateRecords(
      tx,
      storeName,
      (record) => {
        const createdAt =
          typeof record.createdAt === 'number' ? record.createdAt : createdAtFor(record);
        if (typeof record.updatedAt === 'number' && record.createdAt === createdAt) return null;
        return {
          ...record,
          createdAt,
          updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : createdAt,
        };
      },
      done,
    );
}

/** Gives every record in a store an empty array field it does not have yet. */
function addEmptyArray(tx: IDBTransaction, storeName: string, field: string) {
  return (done: Done) =>
    updateRecords(
      tx,
      storeName,
      (record) => (Array.isArray(record[field]) ? null : { ...record, [field]: [] }),
      done,
    );
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Paklijsten: lists, labels, items',
    run: (db, _tx, done) => {
      ['lists', 'labels', 'items'].forEach((name) => createStore(db, name));
      done();
    },
  },
  {
    version: 2,
    description: 'Notities: notes',
    run: (db, _tx, done) => {
      createStore(db, 'notes');
      done();
    },
  },
  {
    version: 3,
    description: 'Fundament: settings store, createdAt/updatedAt on every record',
    run: (db, tx, done) => {
      createStore(db, 'settings');
      const now = Date.now();
      // Labels and items had no dates; they take the date of the list they belong to.
      const listsRequest = tx.objectStore('lists').getAll();
      listsRequest.onsuccess = () => {
        const listCreated = new Map<string, number>();
        for (const list of listsRequest.result as Row[]) {
          if (typeof list.id === 'string' && typeof list.createdAt === 'number') {
            listCreated.set(list.id, list.createdAt);
          }
        }
        const fromList = (record: Row) => listCreated.get(record.listId as string) ?? now;
        inSequence(
          [
            backfillTimestamps(tx, 'lists', () => now),
            backfillTimestamps(tx, 'labels', fromList),
            backfillTimestamps(tx, 'items', fromList),
          ],
          done,
        );
      };
    },
  },
  {
    version: 4,
    description: 'Templates: templates, templateCategories',
    run: (db, _tx, done) => {
      ['templates', 'templateCategories'].forEach((name) => createStore(db, name));
      done();
    },
  },
  {
    version: 5,
    description: 'Taken: tasks, projects',
    run: (db, _tx, done) => {
      ['tasks', 'projects'].forEach((name) => createStore(db, name));
      done();
    },
  },
  {
    version: 6,
    description: 'Tags: tags store, tagIds on lists, notes and tasks',
    run: (db, tx, done) => {
      createStore(db, 'tags');
      inSequence(
        ['lists', 'notes', 'tasks'].map((name) => addEmptyArray(tx, name, 'tagIds')),
        done,
      );
    },
  },
];

export const DB_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/** Applies every step newer than `oldVersion`, one after the other. */
export function migrate(db: IDBDatabase, tx: IDBTransaction, oldVersion: number) {
  const steps = MIGRATIONS.filter((migration) => migration.version > oldVersion);
  inSequence(
    steps.map((step) => (done: Done) => step.run(db, tx, done)),
    () => undefined,
  );
}
