import { isDateKey, todayKey, type DateKey } from '../../core/lib/dates';
import { cleanName, uid } from '../../core/lib/util';
import { commit, getData } from '../../core/store';
import type { Reminder, ReminderTarget, Repeat } from './types';
import { advance } from './util';

export interface ReminderFields {
  title: string;
  date: DateKey;
  time: string | null;
  repeat: Repeat;
  target: ReminderTarget | null;
}

function save(next: Reminder) {
  const data = getData();
  const exists = data.reminders.some((r) => r.id === next.id);
  commit(
    {
      ...data,
      reminders: exists
        ? data.reminders.map((r) => (r.id === next.id ? next : r))
        : [...data.reminders, next],
    },
    [{ store: 'reminders', put: [next] }],
  );
}

function anchorOf(date: DateKey): number {
  return Number(date.slice(8, 10));
}

export function createReminder(fields: ReminderFields): string | null {
  const title = cleanName(fields.title);
  if (!title || !isDateKey(fields.date)) return null;
  const now = Date.now();
  const reminder: Reminder = {
    id: uid(),
    title,
    date: fields.date,
    time: fields.time,
    repeat: fields.repeat,
    anchorDay: anchorOf(fields.date),
    target: fields.target,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  save(reminder);
  return reminder.id;
}

export function updateReminder(id: string, fields: ReminderFields) {
  const current = getData().reminders.find((r) => r.id === id);
  const title = cleanName(fields.title);
  if (!current || !title || !isDateKey(fields.date)) return;
  save({
    ...current,
    ...fields,
    title,
    anchorDay: anchorOf(fields.date),
    // Moving a done one-off reminder to a new date makes it open again.
    completedAt:
      current.completedAt !== null && fields.date !== current.date ? null : current.completedAt,
    updatedAt: Date.now(),
  });
}

/**
 * Marks a reminder done. A one-off reminder is completed; a repeating one moves to its next
 * date. Returns the reminder as it was, for undo.
 */
export function completeReminder(id: string, today = todayKey()): Reminder | null {
  const current = getData().reminders.find((r) => r.id === id);
  if (!current) return null;
  const now = Date.now();
  save(
    current.repeat === 'none'
      ? { ...current, completedAt: now, updatedAt: now }
      : { ...current, date: advance(current, today), updatedAt: now },
  );
  return current;
}

export function reopenReminder(id: string) {
  const current = getData().reminders.find((r) => r.id === id);
  if (current && current.completedAt !== null)
    save({ ...current, completedAt: null, updatedAt: Date.now() });
}

/** Puts back a reminder exactly as it was (undo of complete or delete). */
export function restoreReminder(reminder: Reminder) {
  save({ ...reminder, updatedAt: Date.now() });
}

export function deleteReminder(id: string) {
  const data = getData();
  commit({ ...data, reminders: data.reminders.filter((r) => r.id !== id) }, [
    { store: 'reminders', remove: [id] },
  ]);
}

export function clearCompletedReminders(): Reminder[] {
  const data = getData();
  const removed = data.reminders.filter((r) => r.completedAt !== null);
  if (removed.length === 0) return [];
  commit({ ...data, reminders: data.reminders.filter((r) => r.completedAt === null) }, [
    { store: 'reminders', remove: removed.map((r) => r.id) },
  ]);
  return removed;
}

export function restoreReminders(reminders: Reminder[]) {
  const data = getData();
  const existing = new Set(data.reminders.map((r) => r.id));
  const back = reminders.filter((r) => !existing.has(r.id));
  if (back.length > 0)
    commit({ ...data, reminders: [...data.reminders, ...back] }, [
      { store: 'reminders', put: back },
    ]);
}
