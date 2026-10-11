import { isDateKey, isTime } from '../../core/lib/dates';
import { cleanName } from '../../core/lib/util';
import {
  count,
  IdSet,
  isRecord,
  isValidId,
  readArray,
  readTimes,
  Skipped,
} from '../../core/lib/validate';
import type { ModuleBackup } from '../../core/modules';
import type { AppData } from '../../core/types';
import { REPEATS, type Reminder, type ReminderTarget } from './types';

const KINDS: ReminderTarget['kind'][] = ['list', 'note', 'task'];
const STORE = { list: 'lists', note: 'notes', task: 'tasks' } as const;

/** Reminders. Version 1 = the records as stored in database version 7. */
export const remindersBackup: ModuleBackup = {
  version: 1,
  stores: ['reminders'],

  parse(section) {
    const skipped = new Skipped();
    const now = Date.now();
    const ids = new IdSet();
    const reminders: Reminder[] = [];
    readArray(section, 'reminders').forEach((record) => {
      if (!isRecord(record))
        return skipped.add('herinnering', 'herinneringen', 'ongeldige gegevens');
      const title = typeof record.title === 'string' ? cleanName(record.title) : '';
      if (!title) return skipped.add('herinnering', 'herinneringen', 'zonder titel');
      if (!isDateKey(record.date))
        return skipped.add('herinnering', 'herinneringen', 'zonder geldige datum');
      if (!ids.accept(record.id))
        return skipped.add('herinnering', 'herinneringen', 'ongeldige of dubbele id');
      const target =
        isRecord(record.target) &&
        KINDS.includes(record.target.kind as ReminderTarget['kind']) &&
        isValidId(record.target.id)
          ? { kind: record.target.kind as ReminderTarget['kind'], id: record.target.id }
          : null;
      const anchor =
        typeof record.anchorDay === 'number'
          ? Math.round(record.anchorDay)
          : Number(record.date.slice(8, 10));
      reminders.push({
        id: record.id,
        title,
        date: record.date,
        time: isTime(record.time) ? record.time : null,
        repeat: REPEATS.some((r) => r.value === record.repeat)
          ? (record.repeat as Reminder['repeat'])
          : 'none',
        anchorDay: anchor >= 1 && anchor <= 31 ? anchor : 1,
        target,
        completedAt: typeof record.completedAt === 'number' ? record.completedAt : null,
        ...readTimes(record, now),
      });
    });
    return { data: { reminders }, warnings: skipped.messages() };
  },

  /** A link to a list, note or task that is not there is dropped; the reminder stays. */
  repair(data: AppData): AppData {
    let changed = false;
    const reminders = data.reminders.map((r) => {
      if (!r.target) return r;
      const exists = (data[STORE[r.target.kind]] as { id: string }[]).some(
        (x) => x.id === r.target!.id,
      );
      if (exists) return r;
      changed = true;
      return { ...r, target: null };
    });
    return changed ? { ...data, reminders } : data;
  },

  describe(data) {
    const all = data.reminders ?? [];
    return `${count(all.length, 'herinnering', 'herinneringen')} (${all.filter((r) => r.completedAt === null).length} open)`;
  },
};
