import { cleanName } from '../../core/lib/util';
import {
  count,
  IdSet,
  isRecord,
  isValidId,
  readArray,
  readOrder,
  readTimes,
  Skipped,
} from '../../core/lib/validate';
import type { ModuleBackup } from '../../core/modules';
import type { AppData } from '../../core/types';
import { LABEL_COLORS } from '../lists/types';
import { cleanQuantity } from '../lists/util';
import type { Template, TemplateCategory, TemplateItem, TemplateLabel } from './types';

function readLabels(value: unknown): TemplateLabel[] {
  if (!Array.isArray(value)) return [];
  const ids = new IdSet();
  const labels: TemplateLabel[] = [];
  value.forEach((record, index) => {
    if (!isRecord(record)) return;
    const name = typeof record.name === 'string' ? cleanName(record.name) : '';
    if (!name || !ids.accept(record.id)) return;
    labels.push({
      id: record.id,
      name,
      color:
        typeof record.color === 'string' && /^#[0-9a-f]{6}$/i.test(record.color)
          ? record.color
          : LABEL_COLORS[index % LABEL_COLORS.length],
      order: readOrder(record, index),
    });
  });
  return labels;
}

function readItems(value: unknown, labelIds: Set<string>): TemplateItem[] {
  if (!Array.isArray(value)) return [];
  const ids = new IdSet();
  const items: TemplateItem[] = [];
  value.forEach((record, index) => {
    if (!isRecord(record)) return;
    const name = typeof record.name === 'string' ? cleanName(record.name) : '';
    if (!name || !ids.accept(record.id)) return;
    const labelId =
      typeof record.labelId === 'string' && labelIds.has(record.labelId) ? record.labelId : null;
    items.push({
      id: record.id,
      name,
      quantity: cleanQuantity(record.quantity),
      labelId,
      order: readOrder(record, index),
    });
  });
  return items;
}

/** Templates and their categories. Version 1 = the records as stored in database version 4. */
export const templatesBackup: ModuleBackup = {
  version: 1,
  stores: ['templates', 'templateCategories'],

  parse(section) {
    const skipped = new Skipped();
    const now = Date.now();

    const categoryIds = new IdSet();
    const templateCategories: TemplateCategory[] = [];
    readArray(section, 'templateCategories').forEach((record, index) => {
      if (!isRecord(record)) return skipped.add('categorie', 'categorieën', 'ongeldige gegevens');
      const name = typeof record.name === 'string' ? cleanName(record.name) : '';
      if (!name) return skipped.add('categorie', 'categorieën', 'zonder naam');
      if (!categoryIds.accept(record.id)) {
        return skipped.add('categorie', 'categorieën', 'ongeldige of dubbele id');
      }
      templateCategories.push({
        id: record.id,
        name,
        order: readOrder(record, index),
        ...readTimes(record, now),
      });
    });

    const templateIds = new IdSet();
    const templates: Template[] = [];
    readArray(section, 'templates').forEach((record, index) => {
      if (!isRecord(record)) return skipped.add('template', 'templates', 'ongeldige gegevens');
      const name = typeof record.name === 'string' ? cleanName(record.name) : '';
      if (!name) return skipped.add('template', 'templates', 'zonder naam');
      if (!templateIds.accept(record.id)) {
        return skipped.add('template', 'templates', 'ongeldige of dubbele id');
      }
      const labels = readLabels(record.labels);
      templates.push({
        id: record.id,
        name,
        categoryId:
          isValidId(record.categoryId) && categoryIds.has(record.categoryId)
            ? record.categoryId
            : null,
        order: readOrder(record, index),
        labels,
        items: readItems(record.items, new Set(labels.map((label) => label.id))),
        ...readTimes(record, now),
      });
    });

    return { data: { templates, templateCategories }, warnings: skipped.messages() };
  },

  repair(data: AppData): AppData {
    const categoryIds = new Set(data.templateCategories.map((category) => category.id));
    return {
      ...data,
      templates: data.templates.map((template) =>
        template.categoryId !== null && !categoryIds.has(template.categoryId)
          ? { ...template, categoryId: null }
          : template,
      ),
    };
  },

  describe(data) {
    return count(data.templates?.length ?? 0, 'template', 'templates');
  },
};
