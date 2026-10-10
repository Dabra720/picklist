import { byOrder, collator } from '../../core/lib/util';
import { count } from '../../core/lib/validate';
import type { AppData } from '../../core/types';
import type { Template, TemplateCategory } from './types';

export interface TemplateGroup {
  key: string;
  category: TemplateCategory | null;
  templates: Template[];
}

/** Templates per category, in category order; templates without a category come last. */
export function groupTemplates(data: AppData): TemplateGroup[] {
  const categories = [...data.templateCategories].sort(byOrder);
  const known = new Set(categories.map((category) => category.id));
  const sorted = [...data.templates].sort((a, b) => collator.compare(a.name, b.name));
  const groups: TemplateGroup[] = categories.map((category) => ({
    key: category.id,
    category,
    templates: sorted.filter((template) => template.categoryId === category.id),
  }));
  groups.push({
    key: 'none',
    category: null,
    templates: sorted.filter((t) => t.categoryId === null || !known.has(t.categoryId)),
  });
  return groups.filter((group) => group.templates.length > 0);
}

export function describeTemplate(template: Template): string {
  const parts = [count(template.items.length, 'item', 'items')];
  if (template.labels.length > 0) parts.push(count(template.labels.length, 'label', 'labels'));
  return parts.join(' · ');
}
