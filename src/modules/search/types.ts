import type { BaseRecord } from '../../core/types';

/** A tag connects things across modules; unlike a label, which groups items inside one list. */
export interface Tag extends BaseRecord {
  name: string;
  color: string;
  order: number;
}

/** The records that can carry tags, and the store each lives in. */
export type TaggableKind = 'list' | 'note' | 'task';
export const TAGGABLE_STORES = { list: 'lists', note: 'notes', task: 'tasks' } as const;
