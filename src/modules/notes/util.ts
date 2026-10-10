import { MAX_NAME_LENGTH } from '../../core/types';
import { MAX_NOTE_LENGTH, type Note } from './types';

export function cleanNoteBody(value: string): string {
  return value.slice(0, MAX_NOTE_LENGTH);
}

export function isEmptyNote(note: Pick<Note, 'title' | 'body'>): boolean {
  return note.title.trim() === '' && note.body.trim() === '';
}

/** Title to show for a note: its own title, else its first line of text. */
export function noteHeading(note: Pick<Note, 'title' | 'body'>): string {
  const title = note.title.trim();
  if (title) return title;
  const firstLine = note.body.trim().split('\n', 1)[0]?.trim();
  return firstLine ? firstLine.slice(0, MAX_NAME_LENGTH) : 'Naamloze notitie';
}

const timeFormat = new Intl.DateTimeFormat('nl', { hour: '2-digit', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('nl', { day: 'numeric', month: 'short' });
const yearFormat = new Intl.DateTimeFormat('nl', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Short date for a note: "14:05" today, "gisteren", "3 okt." or "3 okt. 2025". */
export function formatNoteDate(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (timestamp >= startOfToday) return timeFormat.format(date);
  if (timestamp >= startOfToday - 86_400_000) return 'gisteren';
  return date.getFullYear() === today.getFullYear()
    ? dayFormat.format(date)
    : yearFormat.format(date);
}
