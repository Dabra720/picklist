import { MAX_NAME_LENGTH } from '../types';

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

export function percent(checked: number, total: number): number {
  return total === 0 ? 0 : Math.round((checked / total) * 100);
}

export function byOrder<T extends { order: number }>(a: T, b: T): number {
  return a.order - b.order;
}

export function nextOrder(records: { order: number }[]): number {
  return records.reduce((max, r) => Math.max(max, r.order), -1) + 1;
}

export function moveInArray<T>(array: T[], from: number, to: number): T[] {
  const copy = [...array];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export const collator = new Intl.Collator('nl', { sensitivity: 'base', numeric: true });
