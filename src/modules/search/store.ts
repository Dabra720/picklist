import type { Write } from '../../core/db';
import { cleanName, nextOrder, uid } from '../../core/lib/util';
import { commit, getData } from '../../core/store';
import type { AppData } from '../../core/types';
import { LABEL_COLORS } from '../lists/types';
import { TAGGABLE_STORES, type Tag, type TaggableKind } from './types';

export function createTag(name: string): string | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const data = getData();
  // A tag with this name already exists: use that one.
  const existing = data.tags.find(
    (t) => t.name.toLocaleLowerCase('nl') === clean.toLocaleLowerCase('nl'),
  );
  if (existing) return existing.id;
  const now = Date.now();
  const tag: Tag = {
    id: uid(),
    name: clean,
    color: LABEL_COLORS[data.tags.length % LABEL_COLORS.length],
    order: nextOrder(data.tags),
    createdAt: now,
    updatedAt: now,
  };
  commit({ ...data, tags: [...data.tags, tag] }, [{ store: 'tags', put: [tag] }]);
  return tag.id;
}

export function updateTag(id: string, patch: { name?: string; color?: string }) {
  const data = getData();
  const current = data.tags.find((t) => t.id === id);
  if (!current) return;
  const name = patch.name !== undefined ? cleanName(patch.name) : current.name;
  if (!name) return;
  const updated = { ...current, name, color: patch.color ?? current.color, updatedAt: Date.now() };
  commit({ ...data, tags: data.tags.map((t) => (t.id === id ? updated : t)) }, [
    { store: 'tags', put: [updated] },
  ]);
}

/** Removes `tagIds` that are not in `keep` from every list, note and task. */
export function withoutTags(data: AppData, keep: (id: string) => boolean, now?: number) {
  const writes: Write[] = [];
  const next = { ...data };
  for (const store of Object.values(TAGGABLE_STORES)) {
    const changed: { id: string }[] = [];
    const records = (data[store] as { id: string; tagIds: string[]; updatedAt: number }[]).map(
      (record) => {
        if (record.tagIds.every(keep)) return record;
        const updated = {
          ...record,
          tagIds: record.tagIds.filter(keep),
          ...(now ? { updatedAt: now } : {}),
        };
        changed.push(updated);
        return updated;
      },
    );
    if (changed.length > 0) {
      (next as Record<string, unknown>)[store] = records;
      writes.push({ store, put: changed });
    }
  }
  return { data: next, writes };
}

/** Removes a tag, and takes it off everything that had it. */
export function deleteTag(id: string) {
  const data = getData();
  const { data: next, writes } = withoutTags(data, (tagId) => tagId !== id, Date.now());
  commit({ ...next, tags: data.tags.filter((t) => t.id !== id) }, [
    { store: 'tags', remove: [id] },
    ...writes,
  ]);
}

/** Sets the tags of one list, note or task. */
export function setTags(kind: TaggableKind, id: string, tagIds: string[]) {
  const store = TAGGABLE_STORES[kind];
  const data = getData();
  const records = data[store] as { id: string; tagIds: string[] }[];
  const current = records.find((r) => r.id === id);
  if (!current) return;
  const known = new Set(data.tags.map((t) => t.id));
  const clean = [...new Set(tagIds)].filter((tagId) => known.has(tagId));
  if (clean.length === current.tagIds.length && clean.every((t, i) => t === current.tagIds[i]))
    return;
  const updated = { ...current, tagIds: clean, updatedAt: Date.now() };
  commit({ ...data, [store]: records.map((r) => (r.id === id ? updated : r)) } as AppData, [
    { store, put: [updated] },
  ]);
}

/** How many lists, notes and tasks carry each tag. */
export function tagUsage(data: AppData): Map<string, number> {
  const counts = new Map<string, number>();
  for (const store of Object.values(TAGGABLE_STORES)) {
    for (const record of data[store] as { tagIds: string[] }[]) {
      for (const tagId of record.tagIds) counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }
  return counts;
}
