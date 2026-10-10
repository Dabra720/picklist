import type { DateKey } from '../../core/lib/dates';
import type { BaseRecord } from '../../core/types';

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly';

/** What a reminder can be attached to. */
export interface ReminderTarget {
  kind: 'list' | 'note' | 'task';
  id: string;
}

export interface Reminder extends BaseRecord {
  title: string;
  /** Local calendar day of the (next) reminder. */
  date: DateKey;
  /** "HH:MM", or null for the whole day. */
  time: string | null;
  repeat: Repeat;
  /** Day of the month a monthly reminder keeps returning to (31 → 30 → 28 → 31). */
  anchorDay: number;
  target: ReminderTarget | null;
  /** Set when a one-off reminder is done; repeating reminders move on to their next date. */
  completedAt: number | null;
}

export const REPEATS: { value: Repeat; label: string; every: string }[] = [
  { value: 'none', label: 'Eenmalig', every: '' },
  { value: 'daily', label: 'Dagelijks', every: 'Elke dag' },
  { value: 'weekly', label: 'Wekelijks', every: 'Elke week' },
  { value: 'monthly', label: 'Maandelijks', every: 'Elke maand' },
];
