import type { BaseRecord } from '../../core/types';

export type SortMode = 'manual' | 'alpha' | 'unchecked';

export interface PackList extends BaseRecord {
  name: string;
  order: number;
  sortMode: SortMode;
}

export interface Label extends BaseRecord {
  listId: string;
  name: string;
  color: string;
  order: number;
}

export interface Item extends BaseRecord {
  listId: string;
  labelId: string | null;
  name: string;
  /** How many of this item to pack; the item is still checked off as a whole. */
  quantity: number;
  checked: boolean;
  order: number;
}

export const SORT_MODES: SortMode[] = ['manual', 'alpha', 'unchecked'];

export const LABEL_COLORS = [
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#64748b',
];

export const MAX_QUANTITY = 999;
