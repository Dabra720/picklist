import { useSyncExternalStore } from 'react';
import { applyWrites, loadAll, replaceAll, type Write } from '../db/idb';
import { showToast } from '../lib/toast';
import { byOrder, cleanName, cleanNoteBody, cleanQuantity, isEmptyNote, nextOrder, uid } from '../lib/util';
import {
  EMPTY_DATA,
  LABEL_COLORS,
  MAX_NAME_LENGTH,
  type AppData,
  type Item,
  type Label,
  type Note,
  type PackList,
  type SortMode,
} from '../types';

export interface AppState {
  status: 'loading' | 'ready' | 'error';
  data: AppData;
  error?: string;
}

// All data is kept in memory and every change is written through to IndexedDB.
let state: AppState = { status: 'loading', data: EMPTY_DATA };
const listeners = new Set<() => void>();

function setState(next: AppState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state);
}

export function getData(): AppData {
  return state.data;
}

// Writes are chained so they reach the database in the order they were made.
let writeQueue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>) {
  writeQueue = writeQueue.then(task).catch((error) => {
    console.error(error);
    showToast('Opslaan is mislukt. Mogelijk is de opslag van dit apparaat vol.');
  });
}

function commit(data: AppData, writes: Write[]) {
  setState({ ...state, data });
  enqueue(() => applyWrites(writes));
}

export async function initStore() {
  setState({ status: 'loading', data: EMPTY_DATA });
  try {
    const stored = await loadAll();
    // Items saved before quantities existed have none; they count as one.
    const items = stored.items.map((item) => ({ ...item, quantity: cleanQuantity(item.quantity) }));
    // A note that was opened but never written in is not worth keeping.
    const emptyNotes = stored.notes.filter(isEmptyNote).map((note) => note.id);
    const notes = stored.notes.filter((note) => !isEmptyNote(note));
    setState({ status: 'ready', data: { ...stored, items, notes } });
    if (emptyNotes.length > 0) enqueue(() => applyWrites([{ store: 'notes', remove: emptyNotes }]));
    // Ask the browser not to evict our data under storage pressure (best effort).
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch (error) {
    console.error(error);
    setState({
      status: 'error',
      data: EMPTY_DATA,
      error: error instanceof Error ? error.message : 'Onbekende fout',
    });
  }
}

// ---------- Lists ----------

export function createList(name: string): string | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const { data } = state;
  const list: PackList = {
    id: uid(),
    name: clean,
    order: nextOrder(data.lists),
    sortMode: 'manual',
    createdAt: Date.now(),
  };
  commit({ ...data, lists: [...data.lists, list] }, [{ store: 'lists', put: [list] }]);
  return list.id;
}

function updateList(id: string, patch: Partial<Pick<PackList, 'name' | 'sortMode'>>) {
  const { data } = state;
  const current = data.lists.find((l) => l.id === id);
  if (!current) return;
  const updated = { ...current, ...patch };
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
  const { data } = state;
  const labelIds = data.labels.filter((l) => l.listId === id).map((l) => l.id);
  const itemIds = data.items.filter((i) => i.listId === id).map((i) => i.id);
  commit(
    {
      lists: data.lists.filter((l) => l.id !== id),
      labels: data.labels.filter((l) => l.listId !== id),
      items: data.items.filter((i) => i.listId !== id),
      notes: data.notes,
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
  const { data } = state;
  const source = data.lists.find((l) => l.id === id);
  if (!source) return null;
  const list: PackList = {
    ...source,
    id: uid(),
    name: cleanName(`${source.name} (kopie)`),
    order: nextOrder(data.lists),
    createdAt: Date.now(),
  };
  const labelIdMap = new Map<string, string>();
  const labels = data.labels
    .filter((l) => l.listId === id)
    .map((l) => {
      const copy: Label = { ...l, id: uid(), listId: list.id };
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
    }));
  commit(
    {
      lists: [...data.lists, list],
      labels: [...data.labels, ...labels],
      items: [...data.items, ...items],
      notes: data.notes,
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
  const { data } = state;
  const siblings = data.labels.filter((l) => l.listId === listId);
  const label: Label = {
    id: uid(),
    listId,
    name: clean,
    color: LABEL_COLORS[siblings.length % LABEL_COLORS.length],
    order: nextOrder(siblings),
  };
  commit({ ...data, labels: [...data.labels, label] }, [{ store: 'labels', put: [label] }]);
  return label.id;
}

export function updateLabel(id: string, patch: Partial<Pick<Label, 'name' | 'color'>>) {
  const { data } = state;
  const current = data.labels.find((l) => l.id === id);
  if (!current) return;
  const updated = { ...current, ...patch };
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
  const { data } = state;
  const changed: Item[] = [];
  const items = data.items.map((item) => {
    if (item.labelId !== id) return item;
    const updated = { ...item, labelId: null };
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
  const { data } = state;
  const item: Item = {
    id: uid(),
    listId,
    labelId,
    name: clean,
    quantity: cleanQuantity(quantity),
    checked: false,
    order: nextOrder(data.items.filter((i) => i.listId === listId)),
  };
  commit({ ...data, items: [...data.items, item] }, [{ store: 'items', put: [item] }]);
  return item.id;
}

export function updateItem(
  id: string,
  patch: Partial<Pick<Item, 'name' | 'labelId' | 'quantity' | 'checked'>>,
) {
  const { data } = state;
  const current = data.items.find((i) => i.id === id);
  if (!current) return;
  const updated = { ...current, ...patch };
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
  const current = state.data.items.find((i) => i.id === id);
  if (current) updateItem(id, { checked: !current.checked });
}

export function deleteItem(id: string) {
  const { data } = state;
  commit({ ...data, items: data.items.filter((i) => i.id !== id) }, [
    { store: 'items', remove: [id] },
  ]);
}

/** Puts back an item exactly as it was (used to undo a delete). */
export function restoreItem(item: Item) {
  const { data } = state;
  if (data.items.some((i) => i.id === item.id) || !data.lists.some((l) => l.id === item.listId)) {
    return;
  }
  const labelExists = data.labels.some((l) => l.id === item.labelId);
  const restored = labelExists ? item : { ...item, labelId: null };
  commit({ ...data, items: [...data.items, restored] }, [{ store: 'items', put: [restored] }]);
}

/**
 * Sets the checked state of the items in a list: `isChecked` decides per item.
 * Only the checked flag changes; items, labels and order are left alone.
 */
function setChecked(listId: string, isChecked: (item: Item) => boolean) {
  const { data } = state;
  const changed: Item[] = [];
  const items = data.items.map((item) => {
    if (item.listId !== listId) return item;
    const checked = isChecked(item);
    if (item.checked === checked) return item;
    const updated = { ...item, checked };
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
    state.data.items.filter((i) => i.listId === listId && i.checked).map((i) => i.id),
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
  const { data } = state;
  const byId = new Map(data.items.map((i) => [i.id, i]));
  const slots = orderedIds
    .map((id) => byId.get(id))
    .filter((i): i is Item => i !== undefined)
    .sort(byOrder)
    .map((i) => i.order);
  const changed = new Map<string, Item>();
  orderedIds.forEach((id, index) => {
    const item = byId.get(id);
    if (item && item.order !== slots[index]) changed.set(id, { ...item, order: slots[index] });
  });
  if (changed.size === 0) return;
  commit({ ...data, items: data.items.map((i) => changed.get(i.id) ?? i) }, [
    { store: 'items', put: [...changed.values()] },
  ]);
}

// ---------- Notes ----------

export function createNote(): string {
  const { data } = state;
  const now = Date.now();
  const note: Note = { id: uid(), title: '', body: '', createdAt: now, updatedAt: now };
  commit({ ...data, notes: [...data.notes, note] }, [{ store: 'notes', put: [note] }]);
  return note.id;
}

export function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) {
  const { data } = state;
  const current = data.notes.find((n) => n.id === id);
  if (!current) return;
  const updated: Note = {
    ...current,
    title: patch.title !== undefined ? patch.title.slice(0, MAX_NAME_LENGTH) : current.title,
    body: patch.body !== undefined ? cleanNoteBody(patch.body) : current.body,
  };
  if (updated.title === current.title && updated.body === current.body) return;
  updated.updatedAt = Date.now();
  commit({ ...data, notes: data.notes.map((n) => (n.id === id ? updated : n)) }, [
    { store: 'notes', put: [updated] },
  ]);
}

export function deleteNote(id: string) {
  const { data } = state;
  if (!data.notes.some((n) => n.id === id)) return;
  commit({ ...data, notes: data.notes.filter((n) => n.id !== id) }, [
    { store: 'notes', remove: [id] },
  ]);
}

/** Removes a note silently if nothing was written in it (used when leaving a new note). */
export function discardIfEmpty(id: string) {
  const note = state.data.notes.find((n) => n.id === id);
  if (note && isEmptyNote(note)) deleteNote(id);
}

/** Puts back a note exactly as it was (used to undo a delete). */
export function restoreNote(note: Note) {
  const { data } = state;
  if (data.notes.some((n) => n.id === note.id)) return;
  commit({ ...data, notes: [...data.notes, note] }, [{ store: 'notes', put: [note] }]);
}

// ---------- Backup ----------

/** Replaces everything with imported data. Rejects (and keeps the old data) if saving fails. */
export async function importData(data: AppData): Promise<void> {
  await writeQueue;
  await replaceAll(data);
  setState({ ...state, data });
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
