export type SortMode = 'manual' | 'alpha' | 'unchecked';

export interface PackList {
  id: string;
  name: string;
  order: number;
  sortMode: SortMode;
  createdAt: number;
}

export interface Label {
  id: string;
  listId: string;
  name: string;
  color: string;
  order: number;
}

export interface Item {
  id: string;
  listId: string;
  labelId: string | null;
  name: string;
  /** How many of this item to pack; the item is still checked off as a whole. */
  quantity: number;
  checked: boolean;
  order: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  lists: PackList[];
  labels: Label[];
  items: Item[];
  notes: Note[];
}

export const EMPTY_DATA: AppData = { lists: [], labels: [], items: [], notes: [] };

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

export const MAX_NAME_LENGTH = 100;
export const MAX_QUANTITY = 999;
export const MAX_NOTE_LENGTH = 50_000;
