import { count, IdSet, isRecord, readArray, readTimes, Skipped } from '../../core/lib/validate';
import type { ModuleBackup } from '../../core/modules';
import { MAX_NAME_LENGTH } from '../../core/types';
import type { Note } from './types';
import { cleanNoteBody, isEmptyNote } from './util';

/** Notes. Version 1 = the records as stored in database version 3. */
export const notesBackup: ModuleBackup = {
  version: 1,
  stores: ['notes'],

  parse(section) {
    const skipped = new Skipped();
    const now = Date.now();
    const ids = new IdSet();
    const notes: Note[] = [];
    readArray(section, 'notes').forEach((record) => {
      if (!isRecord(record)) return skipped.add('notitie', 'notities', 'ongeldige gegevens');
      const note = {
        title: typeof record.title === 'string' ? record.title.slice(0, MAX_NAME_LENGTH) : '',
        body: typeof record.body === 'string' ? cleanNoteBody(record.body) : '',
      };
      // Empty notes are never kept in the app either.
      if (isEmptyNote(note)) return;
      if (!ids.accept(record.id))
        return skipped.add('notitie', 'notities', 'ongeldige of dubbele id');
      notes.push({ id: record.id, ...note, ...readTimes(record, now) });
    });
    return { data: { notes }, warnings: skipped.messages() };
  },

  describe(data) {
    return count(data.notes?.length ?? 0, 'notitie', 'notities');
  },
};
