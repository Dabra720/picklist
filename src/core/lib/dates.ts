/**
 * Dates as the user sees them: a calendar day is a local "YYYY-MM-DD" string, so a deadline or a
 * habit day never shifts when the time zone or daylight saving time changes.
 */

export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(now = new Date()): DateKey {
  return dateKey(now);
}

/** Local midnight of a date key. */
export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isDateKey(value: unknown): value is DateKey {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parseDateKey(value).getTime())
  );
}

export function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000);
}

/** Monday of the week that holds `key`. */
export function startOfWeek(key: DateKey): DateKey {
  const day = parseDateKey(key).getDay(); // 0 = Sunday
  return addDays(key, -((day + 6) % 7));
}

const weekday = new Intl.DateTimeFormat('nl', { weekday: 'long' });
const short = new Intl.DateTimeFormat('nl', { day: 'numeric', month: 'short' });
const long = new Intl.DateTimeFormat('nl', { day: 'numeric', month: 'short', year: 'numeric' });

/** "vandaag", "morgen", "gisteren", "vrijdag", "12 okt." or "12 okt. 2027". */
export function relativeDay(key: DateKey, today = todayKey()): string {
  const diff = daysBetween(today, key);
  if (diff === 0) return 'vandaag';
  if (diff === 1) return 'morgen';
  if (diff === -1) return 'gisteren';
  const date = parseDateKey(key);
  if (diff > 1 && diff < 7) return weekday.format(date);
  return date.getFullYear() === parseDateKey(today).getFullYear()
    ? short.format(date)
    : long.format(date);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
