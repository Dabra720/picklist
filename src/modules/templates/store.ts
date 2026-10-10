import { byOrder, cleanName, nextOrder, uid } from '../../core/lib/util';
import { commit, getData } from '../../core/store';
import type { Item, Label, PackList } from '../lists/types';
import { LABEL_COLORS } from '../lists/types';
import { cleanQuantity } from '../lists/util';
import type { Template, TemplateCategory, TemplateItem, TemplateLabel } from './types';

// ---------- Templates ----------

function saveTemplate(next: Template) {
  const data = getData();
  const exists = data.templates.some((t) => t.id === next.id);
  commit(
    {
      ...data,
      templates: exists
        ? data.templates.map((t) => (t.id === next.id ? next : t))
        : [...data.templates, next],
    },
    [{ store: 'templates', put: [next] }],
  );
}

/** Changes one template; `change` gets the current template and returns the new one. */
function changeTemplate(id: string, change: (template: Template) => Template | null) {
  const current = getData().templates.find((t) => t.id === id);
  if (!current) return;
  const next = change(current);
  if (next) saveTemplate({ ...next, updatedAt: Date.now() });
}

export function createTemplate(name: string, categoryId: string | null): string | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const now = Date.now();
  const template: Template = {
    id: uid(),
    name: clean,
    categoryId,
    order: nextOrder(getData().templates),
    labels: [],
    items: [],
    createdAt: now,
    updatedAt: now,
  };
  saveTemplate(template);
  return template.id;
}

export function renameTemplate(id: string, name: string) {
  const clean = cleanName(name);
  if (clean) changeTemplate(id, (t) => ({ ...t, name: clean }));
}

export function setTemplateCategory(id: string, categoryId: string | null) {
  changeTemplate(id, (t) => (t.categoryId === categoryId ? null : { ...t, categoryId }));
}

export function duplicateTemplate(id: string): string | null {
  const data = getData();
  const source = data.templates.find((t) => t.id === id);
  if (!source) return null;
  const now = Date.now();
  const copy: Template = {
    ...source,
    id: uid(),
    name: cleanName(`${source.name} (kopie)`),
    order: nextOrder(data.templates),
    createdAt: now,
    updatedAt: now,
  };
  saveTemplate(copy);
  return copy.id;
}

export function deleteTemplate(id: string) {
  const data = getData();
  commit({ ...data, templates: data.templates.filter((t) => t.id !== id) }, [
    { store: 'templates', remove: [id] },
  ]);
}

/** Puts back a template exactly as it was (used to undo a delete). */
export function restoreTemplate(template: Template) {
  const data = getData();
  if (data.templates.some((t) => t.id === template.id)) return;
  const categoryExists = data.templateCategories.some((c) => c.id === template.categoryId);
  saveTemplate(categoryExists ? template : { ...template, categoryId: null });
}

// ---------- Labels and items inside a template ----------

export function addTemplateLabel(templateId: string, name: string): string | null {
  const clean = cleanName(name);
  const template = getData().templates.find((t) => t.id === templateId);
  if (!clean || !template) return null;
  const label: TemplateLabel = {
    id: uid(),
    name: clean,
    color: LABEL_COLORS[template.labels.length % LABEL_COLORS.length],
    order: nextOrder(template.labels),
  };
  changeTemplate(templateId, (t) => ({ ...t, labels: [...t.labels, label] }));
  return label.id;
}

export function updateTemplateLabel(
  templateId: string,
  labelId: string,
  patch: { name?: string; color?: string },
) {
  const name = patch.name !== undefined ? cleanName(patch.name) : undefined;
  if (name === '') return;
  changeTemplate(templateId, (t) => ({
    ...t,
    labels: t.labels.map((label) =>
      label.id === labelId
        ? { ...label, ...(name ? { name } : {}), ...(patch.color ? { color: patch.color } : {}) }
        : label,
    ),
  }));
}

/** Removes a label; its items stay and lose the label. */
export function deleteTemplateLabel(templateId: string, labelId: string) {
  changeTemplate(templateId, (t) => ({
    ...t,
    labels: t.labels.filter((label) => label.id !== labelId),
    items: t.items.map((item) => (item.labelId === labelId ? { ...item, labelId: null } : item)),
  }));
}

export function addTemplateItem(
  templateId: string,
  name: string,
  labelId: string | null,
  quantity = 1,
): boolean {
  const clean = cleanName(name);
  if (!clean || !getData().templates.some((t) => t.id === templateId)) return false;
  changeTemplate(templateId, (t) => ({
    ...t,
    items: [
      ...t.items,
      {
        id: uid(),
        name: clean,
        labelId,
        quantity: cleanQuantity(quantity),
        order: nextOrder(t.items),
      },
    ],
  }));
  return true;
}

export function updateTemplateItem(
  templateId: string,
  itemId: string,
  patch: { name: string; labelId: string | null; quantity: number },
) {
  const name = cleanName(patch.name);
  if (!name) return;
  changeTemplate(templateId, (t) => ({
    ...t,
    items: t.items.map((item) => {
      if (item.id !== itemId) return item;
      const moved = patch.labelId !== item.labelId;
      return {
        ...item,
        name,
        labelId: patch.labelId,
        quantity: cleanQuantity(patch.quantity),
        // An item that moves to another label is placed at the end of that group.
        order: moved ? nextOrder(t.items) : item.order,
      };
    }),
  }));
}

export function deleteTemplateItem(templateId: string, itemId: string) {
  changeTemplate(templateId, (t) => ({
    ...t,
    items: t.items.filter((item) => item.id !== itemId),
  }));
}

/** Puts back an item exactly as it was (used to undo a delete). */
export function restoreTemplateItem(templateId: string, item: TemplateItem) {
  changeTemplate(templateId, (t) => {
    if (t.items.some((existing) => existing.id === item.id)) return null;
    const labelExists = t.labels.some((label) => label.id === item.labelId);
    return { ...t, items: [...t.items, labelExists ? item : { ...item, labelId: null }] };
  });
}

/** New manual order for a group of items; they swap the order values they already had. */
export function reorderTemplateItems(templateId: string, orderedIds: string[]) {
  changeTemplate(templateId, (t) => {
    const byId = new Map(t.items.map((item) => [item.id, item]));
    const slots = orderedIds
      .map((id) => byId.get(id))
      .filter((item): item is TemplateItem => item !== undefined)
      .sort(byOrder)
      .map((item) => item.order);
    const order = new Map(orderedIds.map((id, index) => [id, slots[index]]));
    let changed = false;
    const items = t.items.map((item) => {
      const next = order.get(item.id);
      if (next === undefined || next === item.order) return item;
      changed = true;
      return { ...item, order: next };
    });
    return changed ? { ...t, items } : null;
  });
}

// ---------- Between lists and templates ----------

/** Saves a copy of a list's labels and items (without check marks) as a new template. */
export function saveListAsTemplate(
  listId: string,
  name: string,
  categoryId: string | null,
): string | null {
  const data = getData();
  const clean = cleanName(name);
  if (!clean || !data.lists.some((list) => list.id === listId)) return null;
  const labelIds = new Map<string, string>();
  const labels: TemplateLabel[] = data.labels
    .filter((label) => label.listId === listId)
    .sort(byOrder)
    .map((label, index) => {
      const id = uid();
      labelIds.set(label.id, id);
      return { id, name: label.name, color: label.color, order: index };
    });
  const items: TemplateItem[] = data.items
    .filter((item) => item.listId === listId)
    .sort(byOrder)
    .map((item, index) => ({
      id: uid(),
      name: item.name,
      quantity: item.quantity,
      labelId: (item.labelId && labelIds.get(item.labelId)) || null,
      order: index,
    }));
  const now = Date.now();
  const template: Template = {
    id: uid(),
    name: clean,
    categoryId,
    order: nextOrder(data.templates),
    labels,
    items,
    createdAt: now,
    updatedAt: now,
  };
  saveTemplate(template);
  return template.id;
}

/** Creates a new list with the template's labels and items, nothing checked. */
export function createListFromTemplate(templateId: string, name: string): string | null {
  const data = getData();
  const template = data.templates.find((t) => t.id === templateId);
  const clean = cleanName(name);
  if (!template || !clean) return null;
  const now = Date.now();
  const list: PackList = {
    id: uid(),
    name: clean,
    order: nextOrder(data.lists),
    sortMode: 'manual',
    createdAt: now,
    updatedAt: now,
  };
  const labelIds = new Map<string, string>();
  const labels: Label[] = [...template.labels].sort(byOrder).map((label, index) => {
    const id = uid();
    labelIds.set(label.id, id);
    return {
      id,
      listId: list.id,
      name: label.name,
      color: label.color,
      order: index,
      createdAt: now,
      updatedAt: now,
    };
  });
  const items: Item[] = [...template.items].sort(byOrder).map((item, index) => ({
    id: uid(),
    listId: list.id,
    labelId: (item.labelId && labelIds.get(item.labelId)) || null,
    name: item.name,
    quantity: item.quantity,
    checked: false,
    order: index,
    createdAt: now,
    updatedAt: now,
  }));
  commit(
    {
      ...data,
      lists: [...data.lists, list],
      labels: [...data.labels, ...labels],
      items: [...data.items, ...items],
    },
    [
      { store: 'lists', put: [list] },
      { store: 'labels', put: labels },
      { store: 'items', put: items },
    ],
  );
  return list.id;
}

// ---------- Categories ----------

export function createCategory(name: string): string | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const data = getData();
  const existing = data.templateCategories.find(
    (category) => category.name.toLocaleLowerCase('nl') === clean.toLocaleLowerCase('nl'),
  );
  if (existing) return existing.id;
  const now = Date.now();
  const category: TemplateCategory = {
    id: uid(),
    name: clean,
    order: nextOrder(data.templateCategories),
    createdAt: now,
    updatedAt: now,
  };
  commit({ ...data, templateCategories: [...data.templateCategories, category] }, [
    { store: 'templateCategories', put: [category] },
  ]);
  return category.id;
}

export function renameCategory(id: string, name: string) {
  const clean = cleanName(name);
  const data = getData();
  const current = data.templateCategories.find((c) => c.id === id);
  if (!clean || !current || current.name === clean) return;
  const updated = { ...current, name: clean, updatedAt: Date.now() };
  commit(
    {
      ...data,
      templateCategories: data.templateCategories.map((c) => (c.id === id ? updated : c)),
    },
    [{ store: 'templateCategories', put: [updated] }],
  );
}

/** Removes a category; its templates stay, without a category. */
export function deleteCategory(id: string) {
  const data = getData();
  const now = Date.now();
  const changed: Template[] = [];
  const templates = data.templates.map((t) => {
    if (t.categoryId !== id) return t;
    const updated = { ...t, categoryId: null, updatedAt: now };
    changed.push(updated);
    return updated;
  });
  commit(
    { ...data, templates, templateCategories: data.templateCategories.filter((c) => c.id !== id) },
    [
      { store: 'templateCategories', remove: [id] },
      { store: 'templates', put: changed },
    ],
  );
}
