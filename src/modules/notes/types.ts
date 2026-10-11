import type { BaseRecord } from '../../core/types';

export interface Note extends BaseRecord {
  title: string;
  body: string;
  tagIds: string[];
}

export const MAX_NOTE_LENGTH = 50_000;
