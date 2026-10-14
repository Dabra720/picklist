import type { Write } from '../../core/db';
import { byOrder, cleanName, nextOrder, uid } from '../../core/lib/util';
import { commit, getData, type LoadHook } from '../../core/store';
import { cleanParents } from './labelTree';
import { LABEL_COLORS, type Item, type Label, type PackList, type SortMode } from './types';
import { cleanQuantity } from './util';

// ---------- Loading ----------

/**
 * Items saved before quantities existed have none; they count as one. A sublabel whose parent is
 * gone (or is in another list, or is itself a sublabel) becomes a top-level label.
 */
export const normalizeLists: LoadHook = (data) => {
  const byList = new Map<string, Label[]>();
  for (const label of data.labels) {
    byList.set(label.listId, [...(byList.get(label.listId) ?? []), label]);
  }
  const cleaned = new Map<string, Label>();
  for (const labels of byList.values()) {
    for (const label of cleanParents(labels)) cleaned.set(label.id, label);
  }
  const changed: Label[] = [];
  const labels = data.labels.map((label) => {
    const next = cleaned.get(label.id) ?? label;
    if (next !== label) changed.push(next);
    return next;
  });
  return {
    data: {
      ...data,
      labels,
      items: data.items.map((item) => ({ ...item, quantity: cleanQuantity(item.quantity) })),
    },
    writes: changed.length > 0 ? [{ store: 'labels', put: changed }] : undefined,
  };
};

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
    tagIds: [],
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
    })
    .map((l) => ({ ...l, parentId: (l.parentId && labelIdMap.get(l.parentId)) || null }));
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

/** Creates a label, or a sublabel when `parentId` is a top-level label of the same list. */
export function createLabel(
  listId: string,
  name: string,
  parentId: string | null = null,
): string | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const data = getData();
  const parent = parentId
    ? data.labels.find((l) => l.id === parentId && l.listId === listId && !l.parentId)
    : undefined;
  const all = data.labels.filter((l) => l.listId === listId);
  const siblings = all.filter((l) => (l.parentId ?? null) === (parent?.id ?? null));
  const now = Date.now();
  const label: Label = {
    id: uid(),
    listId,
    parentId: parent?.id ?? null,
    name: clean,
    // A sublabel starts with the colour of its label.
    color: parent?.color ?? LABEL_COLORS[all.length % LABEL_COLORS.length],
    order: nextOrder(siblings),
    createdAt: now,
    updatedAt: now,
  };
  commit({ ...data, labels: [...data.labels, label] }, [{ store: 'labels', put: [label] }]);
  return label.id;
}

export function updateLabel(
  id: string,
  patch: Partial<Pick<Label, 'name' | 'color' | 'parentId'>>,
) {
  const data = getData();
  const current = data.labels.find((l) => l.id === id);
  if (!current) return;
  const updated = { ...current, ...patch, updatedAt: Date.now() };
  if (patch.name !== undefined) {
    const clean = cleanName(patch.name);
    if (!clean) return;
    updated.name = clean;
  }
  if (patch.parentId !== undefined && patch.parentId !== (current.parentId ?? null)) {
    const listLabels = data.labels.filter((l) => l.listId === current.listId);
    if (patch.parentId !== null) {
      // Only a top-level label of the same list can be a parent, and a label with sublabels of
      // its own cannot become a sublabel (labels go one level deep).
      const parent = listLabels.find((l) => l.id === patch.parentId);
      const hasChildren = listLabels.some((l) => l.parentId === id);
      if (!parent || parent.parentId || parent.id === id || hasChildren) return;
    }
    // It moves to the end of its new siblings.
    updated.order = nextOrder(listLabels.filter((l) => (l.parentId ?? null) === patch.parentId));
  }
  commit({ ...data, labels: data.labels.map((l) => (l.id === id ? updated : l)) }, [
    { store: 'labels', put: [updated] },
  ]);
}

/**
 * Removes a label. Its items are kept: those of a sublabel move to its label, those of a
 * top-level label become unlabelled. The sublabels of a removed label become top-level labels.
 */
export function deleteLabel(id: string) {
  const data = getData();
  const removed = data.labels.find((l) => l.id === id);
  if (!removed) return;
  const now = Date.now();
  const fallback = removed.parentId ?? null;
  const changedItems: Item[] = [];
  const items = data.items.map((item) => {
    if (item.labelId !== id) return item;
    const updated = { ...item, labelId: fallback, updatedAt: now };
    changedItems.push(updated);
    return updated;
  });
  const changedLabels: Label[] = [];
  let order = nextOrder(data.labels.filter((l) => l.listId === removed.listId && !l.parentId));
  const labels = data.labels
    .filter((l) => l.id !== id)
    .map((l) => {
      if (l.parentId !== id) return l;
      const updated = { ...l, parentId: null, order: order++, updatedAt: now };
      changedLabels.push(updated);
      return updated;
    });
  commit({ ...data, labels, items }, [
    { store: 'labels', remove: [id] },
    { store: 'labels', put: changedLabels },
    { store: 'items', put: changedItems },
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
