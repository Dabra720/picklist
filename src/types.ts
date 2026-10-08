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
  checked: boolean;
  order: number;
}

export interface AppData {
  lists: PackList[];
  labels: Label[];
  items: Item[];
}

export const EMPTY_DATA: AppData = { lists: [], labels: [], items: [] };

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
