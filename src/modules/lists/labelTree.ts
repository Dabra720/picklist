import { byOrder } from '../../core/lib/util';
import type { ItemLike } from './types';

/**
 * Labels can have sublabels, one level deep: a label with a parentId is a sublabel of that
 * (top-level) label. These helpers are shared by lists and templates.
 */
export interface TreeLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  parentId?: string | null;
}

/**
 * The parentId a label may really have: only an existing top-level label other than itself.
 * Anything else (a missing parent, a parent that is itself a sublabel) makes it top-level.
 */
export function validParents<T extends TreeLabel>(labels: T[]): Map<string, string | null> {
  const byId = new Map(labels.map((label) => [label.id, label]));
  const result = new Map<string, string | null>();
  for (const label of labels) {
    const parent = label.parentId ? byId.get(label.parentId) : undefined;
    result.set(label.id, parent && parent.id !== label.id && !parent.parentId ? parent.id : null);
  }
  return result;
}

/** Gives every label a valid parentId (null for top-level); unchanged labels keep their object. */
export function cleanParents<T extends TreeLabel>(labels: T[]): T[] {
  const parents = validParents(labels);
  return labels.map((label) => {
    const parentId = parents.get(label.id) ?? null;
    return label.parentId === parentId ? label : { ...label, parentId };
  });
}

export interface TreeEntry<T> {
  label: T;
  depth: 0 | 1;
  parent: T | null;
  children: T[];
}

/** Top-level labels in order, each followed by its sublabels in order. */
export function labelTree<T extends TreeLabel>(labels: T[]): TreeEntry<T>[] {
  const parents = validParents(labels);
  const sorted = [...labels].sort(byOrder);
  const top = sorted.filter((label) => parents.get(label.id) === null);
  const entries: TreeEntry<T>[] = [];
  for (const label of top) {
    const children = sorted.filter((child) => parents.get(child.id) === label.id);
    entries.push({ label, depth: 0, parent: null, children });
    for (const child of children) entries.push({ label: child, depth: 1, parent: label, children: [] });
  }
  return entries;
}

/** "Kleding › Warm" for a sublabel, the plain name for a top-level label. */
export function labelPath(entry: TreeEntry<TreeLabel>): string {
  return entry.parent ? `${entry.parent.name} › ${entry.label.name}` : entry.label.name;
}

/** A label as offered for picking: in tree order, with its full name. */
export interface LabelOption {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  depth: 0 | 1;
  /** "Kleding › Warm" for a sublabel. */
  path: string;
}

/** The labels in tree order, ready for pickers and the label sheet. */
export function labelOptions(labels: TreeLabel[]): LabelOption[] {
  return labelTree(labels).map((entry) => ({
    id: entry.label.id,
    name: entry.label.name,
    color: entry.label.color,
    parentId: entry.parent?.id ?? null,
    depth: entry.depth,
    path: labelPath(entry),
  }));
}

export const NO_LABEL_KEY = 'none';

export interface LabelGroup<L, I> {
  key: string;
  label: L | null;
  depth: 0 | 1;
  /** Key of the top-level group this group belongs to (its own key for a top-level group). */
  topKey: string;
  hasChildren: boolean;
  /** Items with exactly this label. */
  own: I[];
  /** Own items plus those of its sublabels (the same as `own` for a sublabel). */
  all: I[];
}

/**
 * Splits items into groups in label order: every label (and sublabel) a group, then a group for
 * items without a label. Items whose label no longer exists count as unlabelled.
 */
export function groupItems<L extends TreeLabel, I extends ItemLike>(
  labels: L[],
  items: I[],
): LabelGroup<L, I>[] {
  const tree = labelTree(labels);
  const known = new Set(labels.map((label) => label.id));
  const keyOf = (item: I) => (item.labelId && known.has(item.labelId) ? item.labelId : NO_LABEL_KEY);
  const own = new Map<string, I[]>();
  for (const item of items) {
    const key = keyOf(item);
    own.set(key, [...(own.get(key) ?? []), item]);
  }
  const groups: LabelGroup<L, I>[] = tree.map((entry) => {
    const mine = own.get(entry.label.id) ?? [];
    const childIds = new Set(entry.children.map((child) => child.id));
    return {
      key: entry.label.id,
      label: entry.label,
      depth: entry.depth,
      topKey: entry.parent?.id ?? entry.label.id,
      hasChildren: entry.children.length > 0,
      own: mine,
      // Keep the items in the order they were given, own and sublabel items mixed.
      all:
        childIds.size === 0
          ? mine
          : items.filter((item) => {
              const key = keyOf(item);
              return key === entry.label.id || childIds.has(key);
            }),
    };
  });
  const none = own.get(NO_LABEL_KEY) ?? [];
  groups.push({
    key: NO_LABEL_KEY,
    label: null,
    depth: 0,
    topKey: NO_LABEL_KEY,
    hasChildren: false,
    own: none,
    all: none,
  });
  return groups;
}
