import { MAX_NAME_LENGTH, MAX_QUANTITY, type Item, type SortMode } from '../types';

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
