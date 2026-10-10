import type { Item, Label, PackList } from '../modules/lists/types';
import type { Note } from '../modules/notes/types';
import type { Template, TemplateCategory } from '../modules/templates/types';

/**
 * Fields every stored record has. `updatedAt` changes on every edit; it is what merging a backup
 * and, later, synchronisation between devices compare.
 */
export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
}

/** All user data, one array per IndexedDB store. Each module owns its own arrays. */
export interface AppData {
  lists: PackList[];
  labels: Label[];
  items: Item[];
  notes: Note[];
  templates: Template[];
  templateCategories: TemplateCategory[];
}

export const EMPTY_DATA: AppData = {
  lists: [],
  labels: [],
  items: [],
  notes: [],
  templates: [],
  templateCategories: [],
};

export const MAX_NAME_LENGTH = 100;
