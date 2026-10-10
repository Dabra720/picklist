import type { Write } from '../../core/db';
import { byOrder, cleanName, nextOrder, uid } from '../../core/lib/util';
import { commit, getData, type LoadHook } from '../../core/store';
import { LABEL_COLORS, type Item, type Label, type PackList, type SortMode } from './types';
import { cleanQuantity } from './util';

// ---------- Loading ----------

/** Items saved before quantities existed have none; they count as one. */
export const normalizeLists: LoadHook = (data) => ({
  data: {
    ...data,
    items: data.items.map((item) => ({ ...item, quantity: cleanQuantity(item.quantity) })),
  },
});

// ---------- Lists ----------

export function createList(name: string): string | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const data = getData();
  const now = Date.now();
  const list: PackList = {
    id: uid(),
    name: clean,
    order: nextOrder(data.lists),
    sortMode: 'manual',
    createdAt: now,
    updatedAt: now,
  };
  commit({ ...data, lists: [...data.lists, list] }, [{ store: 'lists', put: [list] }]);
  return list.id;
}

function updateList(id: string, patch: Partial<Pick<PackList, 'name' | 'sortMode'>>) {
  const data = getData();
  const current = data.lists.find((l) => l.id === id);
  if (!current) return;
  const updated = { ...current, ...patch, updatedAt: Date.now() };
  commit({ ...data, lists: data.lists.map((l) => (l.id === id ? updated : l)) }, [
    { store: 'lists', put: [updated] },
  ]);
}

export function renameList(id: string, name: string) {
  const clean = cleanName(name);
  if (clean) updateList(id, { name: clean });
}

export function setSortMode(id: string, sortMode: SortMode) {
  updateList(id, { sortMode });
}

export function deleteList(id: string) {
  const data = getData();
  const labelIds = data.labels.filter((l) => l.listId === id).map((l) => l.id);
  const itemIds = data.items.filter((i) => i.listId === id).map((i) => i.id);
  commit(
    {
      ...data,
      lists: data.lists.filter((l) => l.id !== id),
      labels: data.labels.filter((l) => l.listId !== id),
      items: data.items.filter((i) => i.listId !== id),
    },
    [
      { store: 'lists', remove: [id] },
      { store: 'labels', remove: labelIds },
      { store: 'items', remove: itemIds },
    ],
  );
}

/** Copies a list with its labels and items. The copy starts with everything unchecked. */
export function duplicateList(id: string): string | null {
  const data = getData();
  const source = data.lists.find((l) => l.id === id);
  if (!source) return null;
  const now = Date.now();
  const list: PackList = {
    ...source,
    id: uid(),
    name: cleanName(`${source.name} (kopie)`),
    order: nextOrder(data.lists),
    createdAt: now,
    updatedAt: now,
  };
  const labelIdMap = new Map<string, string>();
  const labels = data.labels
    .filter((l) => l.listId === id)
    .map((l) => {
      const copy: Label = { ...l, id: uid(), listId: list.id, createdAt: now, updatedAt: now };
      labelIdMap.set(l.id, copy.id);
      return copy;
    });
  const items = data.items
    .filter((i) => i.listId === id)
    .map<Item>((i) => ({
      ...i,
      id: uid(),
      listId: list.id,
      labelId: (i.labelId && labelIdMap.get(i.labelId)) || null,
      checked: false,
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

// ---------- Labels ----------

export function createLabel(listId: string, name: string): string | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const data = getData();
  const siblings = data.labels.filter((l) => l.listId === listId);
  const now = Date.now();
  const label: Label = {
    id: uid(),
    listId,
    name: clean,
    color: LABEL_COLORS[siblings.length % LABEL_COLORS.length],
    order: nextOrder(siblings),
    createdAt: now,
    updatedAt: now,
  };
  commit({ ...data, labels: [...data.labels, label] }, [{ store: 'labels', put: [label] }]);
  return label.id;
}

export function updateLabel(id: string, patch: Partial<Pick<Label, 'name' | 'color'>>) {
  const data = getData();
  const current = data.labels.find((l) => l.id === id);
  if (!current) return;
  const updated = { ...current, ...patch, updatedAt: Date.now() };
  if (patch.name !== undefined) {
    const clean = cleanName(patch.name);
    if (!clean) return;
    updated.name = clean;
  }
  commit({ ...data, labels: data.labels.map((l) => (l.id === id ? updated : l)) }, [
    { store: 'labels', put: [updated] },
  ]);
}

/** Removes a label. Its items are kept and become unlabelled. */
export function deleteLabel(id: string) {
  const data = getData();
  const now = Date.now();
  const changed: Item[] = [];
  const items = data.items.map((item) => {
    if (item.labelId !== id) return item;
    const updated = { ...item, labelId: null, updatedAt: now };
    changed.push(updated);
    return updated;
  });
  commit({ ...data, labels: data.labels.filter((l) => l.id !== id), items }, [
    { store: 'labels', remove: [id] },
    { store: 'items', put: changed },
  ]);
}

// ---------- Items ----------

export function addItem(
  listId: string,
  name: string,
  labelId: string | null,
  quantity = 1,
): string | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const data = getData();
  const now = Date.now();
  const item: Item = {
    id: uid(),
    listId,
    labelId,
    name: clean,
    quantity: cleanQuantity(quantity),
    checked: false,
    order: nextOrder(data.items.filter((i) => i.listId === listId)),
    createdAt: now,
    updatedAt: now,
  };
  commit({ ...data, items: [...data.items, item] }, [{ store: 'items', put: [item] }]);
  return item.id;
}

export function updateItem(
  id: string,
  patch: Partial<Pick<Item, 'name' | 'labelId' | 'quantity' | 'checked'>>,
) {
  const data = getData();
  const current = data.items.find((i) => i.id === id);
  if (!current) return;
  const updated = { ...current, ...patch, updatedAt: Date.now() };
  updated.quantity = cleanQuantity(updated.quantity);
  if (patch.name !== undefined) {
    const clean = cleanName(patch.name);
    if (!clean) return;
    updated.name = clean;
  }
  // An item that moves to another label is placed at the end of that group.
  if (patch.labelId !== undefined && patch.labelId !== current.labelId) {
    updated.order = nextOrder(data.items.filter((i) => i.listId === current.listId));
  }
  commit({ ...data, items: data.items.map((i) => (i.id === id ? updated : i)) }, [
    { store: 'items', put: [updated] },
  ]);
}

export function toggleItem(id: string) {
  const current = getData().items.find((i) => i.id === id);
  if (current) updateItem(id, { checked: !current.checked });
}

export function deleteItem(id: string) {
  const data = getData();
  commit({ ...data, items: data.items.filter((i) => i.id !== id) }, [
    { store: 'items', remove: [id] },
  ]);
}

/** Puts back an item exactly as it was (used to undo a delete). */
export function restoreItem(item: Item) {
  const data = getData();
  if (data.items.some((i) => i.id === item.id) || !data.lists.some((l) => l.id === item.listId)) {
    return;
  }
  const labelExists = data.labels.some((l) => l.id === item.labelId);
  const restored = labelExists ? item : { ...item, labelId: null, updatedAt: Date.now() };
  commit({ ...data, items: [...data.items, restored] }, [{ store: 'items', put: [restored] }]);
}

/**
 * Sets the checked state of the items in a list: `isChecked` decides per item.
 * Only the checked flag changes; items, labels and order are left alone.
 */
function setChecked(listId: string, isChecked: (item: Item) => boolean) {
  const data = getData();
  const now = Date.now();
  const changed: Item[] = [];
  const items = data.items.map((item) => {
    if (item.listId !== listId) return item;
    const checked = isChecked(item);
    if (item.checked === checked) return item;
    const updated = { ...item, checked, updatedAt: now };
    changed.push(updated);
    return updated;
  });
  if (changed.length > 0) commit({ ...data, items }, [{ store: 'items', put: changed }]);
}

export function setAllChecked(listId: string, checked: boolean) {
  setChecked(listId, () => checked);
}

export function checkedIds(listId: string): Set<string> {
  return new Set(
    getData()
      .items.filter((i) => i.listId === listId && i.checked)
      .map((i) => i.id),
  );
}

export function restoreChecked(listId: string, ids: Set<string>) {
  setChecked(listId, (item) => ids.has(item.id));
}

/**
 * Stores a new manual order for a set of items (typically one label group).
 * The items swap the order values they already had, so other groups are unaffected.
 */
export function reorderItems(orderedIds: string[]) {
  const data = getData();
  const byId = new Map(data.items.map((i) => [i.id, i]));
  const slots = orderedIds
    .map((id) => byId.get(id))
    .filter((i): i is Item => i !== undefined)
    .sort(byOrder)
    .map((i) => i.order);
  const now = Date.now();
  const changed = new Map<string, Item>();
  orderedIds.forEach((id, index) => {
    const item = byId.get(id);
    if (item && item.order !== slots[index]) {
      changed.set(id, { ...item, order: slots[index], updatedAt: now });
    }
  });
  if (changed.size === 0) return;
  const writes: Write[] = [{ store: 'items', put: [...changed.values()] }];
  commit({ ...data, items: data.items.map((i) => changed.get(i.id) ?? i) }, writes);
}

// ---------- Example ----------

export function createExampleList(): string | null {
  const listId = createList('Weekendje weg');
  if (!listId) return null;
  const example: [string, string[]][] = [
    ['Kleding', ['Ondergoed', 'Sokken', 'T-shirts', 'Trui', 'Pyjama']],
    ['Toiletartikelen', ['Tandenborstel', 'Tandpasta', 'Deodorant']],
    ['Elektronica', ['Telefoonoplader', 'Oordopjes', 'Powerbank']],
    ['Documenten', ['Identiteitsbewijs', 'Bankpas']],
  ];
  for (const [labelName, names] of example) {
    const labelId = createLabel(listId, labelName);
    names.forEach((name) => addItem(listId, name, labelId));
  }
  return listId;
}
