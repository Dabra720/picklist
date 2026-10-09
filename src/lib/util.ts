import { MAX_NAME_LENGTH, MAX_NOTE_LENGTH, MAX_QUANTITY, type Item, type Note, type SortMode } from '../types';

export function uid(): string {
  // randomUUID only exists in secure contexts; the fallback covers plain-http testing on a LAN.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Props for free-text inputs. iOS Safari ignores autocomplete="off" and offers contact AutoFill
 * for anything it takes for a name field; it leaves fields named "search" alone.
 */
export const plainInput = { autoComplete: 'off', name: 'search' } as const;

export function cleanName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

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
const yearFormat = new Intl.DateTimeFormat('nl', { day: 'numeric', month: 'short', year: 'numeric' });

/** Short date for a note: "14:05" today, "gisteren", "3 okt." or "3 okt. 2025". */
export function formatNoteDate(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (timestamp >= startOfToday) return timeFormat.format(date);
  if (timestamp >= startOfToday - 86_400_000) return 'gisteren';
  return date.getFullYear() === today.getFullYear() ? dayFormat.format(date) : yearFormat.format(date);
}

/** Returns a whole quantity between 1 and MAX_QUANTITY; anything unusable becomes 1. */
export function cleanQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value), 1), MAX_QUANTITY);
}

/** Splits "7x sokken" into a quantity and a name. Any other text is a name with quantity 1. */
export function parseQuantity(input: string): { name: string; quantity: number } {
  const match = /^\s*(\d{1,3})\s*[x×]\s+(\S.*)$/i.exec(input);
  if (!match) return { name: input, quantity: 1 };
  return { name: match[2], quantity: cleanQuantity(Number(match[1])) };
}

export function percent(checked: number, total: number): number {
  return total === 0 ? 0 : Math.round((checked / total) * 100);
}

export function byOrder<T extends { order: number }>(a: T, b: T): number {
  return a.order - b.order;
}

export function nextOrder(records: { order: number }[]): number {
  return records.reduce((max, r) => Math.max(max, r.order), -1) + 1;
}

const collator = new Intl.Collator('nl', { sensitivity: 'base', numeric: true });

export function sortItems(items: Item[], mode: SortMode): Item[] {
  const sorted = [...items].sort(byOrder);
  if (mode === 'alpha') sorted.sort((a, b) => collator.compare(a.name, b.name));
  if (mode === 'unchecked') sorted.sort((a, b) => Number(a.checked) - Number(b.checked));
  return sorted;
}

export function moveInArray<T>(array: T[], from: number, to: number): T[] {
  const copy = [...array];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}
