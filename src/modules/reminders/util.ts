import {
  addDays,
  capitalize,
  dateKey,
  parseDateKey,
  relativeDay,
  startOfWeek,
  todayKey,
  type DateKey,
} from '../../core/lib/dates';
import type { AppData } from '../../core/types';
import type { Task } from '../tasks/types';
import { REPEATS, type Reminder, type ReminderTarget, type Repeat } from './types';

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** The date after `date` for a repeating reminder. */
export function nextDate(date: DateKey, repeat: Repeat, anchorDay: number): DateKey {
  if (repeat === 'daily') return addDays(date, 1);
  if (repeat === 'weekly') return addDays(date, 7);
  const current = parseDateKey(date);
  const year = current.getMonth() === 11 ? current.getFullYear() + 1 : current.getFullYear();
  const month = (current.getMonth() + 1) % 12;
  return dateKey(new Date(year, month, Math.min(anchorDay, daysInMonth(year, month))));
}

/** After completing a repeating reminder: its next date, skipping dates already in the past. */
export function advance(
  reminder: Pick<Reminder, 'date' | 'repeat' | 'anchorDay'>,
  today = todayKey(),
): DateKey {
  let date = nextDate(reminder.date, reminder.repeat, reminder.anchorDay);
  while (date < today) date = nextDate(date, reminder.repeat, reminder.anchorDay);
  return date;
}

/** The moment a reminder is due: its time, or the start of its day. */
export function dueAt(reminder: Pick<Reminder, 'date' | 'time'>): number {
  return new Date(`${reminder.date}T${reminder.time ?? '00:00'}`).getTime();
}

export function isOpen(reminder: Reminder): boolean {
  return reminder.completedAt === null;
}

/** Due now or earlier and not done. */
export function isDue(reminder: Reminder, now = Date.now()): boolean {
  return isOpen(reminder) && dueAt(reminder) <= now;
}

export function whenLabel(
  item: { date: DateKey; time: string | null },
  today = todayKey(),
): string {
  const day = capitalize(relativeDay(item.date, today));
  return item.time ? `${day} ${item.time}` : day;
}

export function repeatLabel(repeat: Repeat): string {
  return REPEATS.find((r) => r.value === repeat)?.every ?? '';
}

/** Name of what a reminder is attached to, or null when it no longer exists. */
export function targetName(data: AppData, target: ReminderTarget | null): string | null {
  if (!target) return null;
  if (target.kind === 'list') return data.lists.find((l) => l.id === target.id)?.name ?? null;
  if (target.kind === 'task') return data.tasks.find((t) => t.id === target.id)?.title ?? null;
  const note = data.notes.find((n) => n.id === target.id);
  return note ? note.title.trim() || note.body.trim().split('\n')[0] || 'Naamloze notitie' : null;
}

export const TARGET_LABEL: Record<ReminderTarget['kind'], string> = {
  list: 'Lijst',
  note: 'Notitie',
  task: 'Taak',
};

/** One line in "Aankomend": a reminder, or the deadline of an open task. */
export type Upcoming =
  | { kind: 'reminder'; key: string; date: DateKey; time: string | null; reminder: Reminder }
  | { kind: 'deadline'; key: string; date: DateKey; time: string | null; task: Task };

export interface UpcomingGroup {
  key: string;
  title: string;
  alert?: boolean;
  items: Upcoming[];
}

/** Open reminders and task deadlines, grouped: overdue, today, tomorrow, this week, later. */
export function upcoming(data: AppData, now = new Date()): UpcomingGroup[] {
  const today = todayKey(now);
  const items: Upcoming[] = [
    ...data.reminders
      .filter(isOpen)
      .map((r) => ({
        kind: 'reminder' as const,
        key: `r-${r.id}`,
        date: r.date,
        time: r.time,
        reminder: r,
      })),
    ...data.tasks
      .filter((t) => t.status !== 'done' && t.dueDate)
      .map((t) => ({
        kind: 'deadline' as const,
        key: `d-${t.id}`,
        date: t.dueDate!,
        time: t.dueTime,
        task: t,
      })),
  ].sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));

  const endOfWeek = addDays(startOfWeek(today), 6);
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const bucket = (item: Upcoming) => {
    // A reminder that has gone off today counts as overdue (as in the notice); a whole-day one
    // only after the day.
    if (
      item.date < today ||
      (item.date === today &&
        item.kind === 'reminder' &&
        item.time !== null &&
        item.time <= nowTime)
    ) {
      return 'overdue';
    }
    if (item.date === today) return 'today';
    if (item.date === addDays(today, 1)) return 'tomorrow';
    if (item.date <= endOfWeek) return 'week';
    return 'later';
  };
  const groups: [string, string][] = [
    ['overdue', 'Te laat'],
    ['today', 'Vandaag'],
    ['tomorrow', 'Morgen'],
    ['week', 'Deze week'],
    ['later', 'Later'],
  ];
  return groups
    .map(([key, title]) => ({
      key,
      title,
      alert: key === 'overdue',
      items: items.filter((i) => bucket(i) === key),
    }))
    .filter((g) => g.items.length > 0);
}

// ---------- Calendar file (.ics) ----------

const RRULE: Record<Repeat, string | null> = {
  none: null,
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
};

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 octets are folded, as the iCalendar format requires. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 74) {
    let cut = 74;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut -= 1;
    parts.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

/**
 * An iCalendar event with an alarm, so the phone's calendar reminds the user even when this app
 * is closed. Times are "floating" (local time), which is what a personal reminder means.
 */
export function buildIcs(reminder: Reminder, context: string | null, now = new Date()): string {
  const compact = (key: DateKey) => key.replace(/-/g, '');
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Paklijsten//Herinneringen//NL',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@paklijsten`,
    `DTSTAMP:${stamp}`,
    ...(reminder.time
      ? [`DTSTART:${compact(reminder.date)}T${reminder.time.replace(':', '')}00`, 'DURATION:PT15M']
      : [
          `DTSTART;VALUE=DATE:${compact(reminder.date)}`,
          `DTEND;VALUE=DATE:${compact(addDays(reminder.date, 1))}`,
        ]),
    ...(RRULE[reminder.repeat] ? [`RRULE:${RRULE[reminder.repeat]}`] : []),
    `SUMMARY:${escapeText(reminder.title)}`,
    ...(context ? [`DESCRIPTION:${escapeText(context)}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(reminder.title)}`,
    // Whole-day reminders ring at 09:00 that day.
    `TRIGGER:${reminder.time ? 'PT0M' : 'PT9H'}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
