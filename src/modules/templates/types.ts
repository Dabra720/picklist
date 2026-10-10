import type { BaseRecord } from '../../core/types';

/**
 * A template is a self-contained copy of a list's labels and items, stored as one record. A list
 * made from it is a new copy: changing a template never changes existing lists, and the other
 * way round.
 */
export interface TemplateLabel {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface TemplateItem {
  id: string;
  name: string;
  quantity: number;
  labelId: string | null;
  order: number;
}

export interface Template extends BaseRecord {
  name: string;
  categoryId: string | null;
  order: number;
  labels: TemplateLabel[];
  items: TemplateItem[];
}

export interface TemplateCategory extends BaseRecord {
  name: string;
  order: number;
}
