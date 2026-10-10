import { byOrder, collator } from '../../core/lib/util';
import { MAX_QUANTITY, type Item, type SortMode } from './types';

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

export function sortItems(items: Item[], mode: SortMode): Item[] {
  const sorted = [...items].sort(byOrder);
  if (mode === 'alpha') sorted.sort((a, b) => collator.compare(a.name, b.name));
  if (mode === 'unchecked') sorted.sort((a, b) => Number(a.checked) - Number(b.checked));
  return sorted;
}
