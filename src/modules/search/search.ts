import { todayKey } from '../../core/lib/dates';
import type { AppData } from '../../core/types';
import { openList } from '../lists/routes';
import { noteHeading } from '../notes/util';
import { openNote } from '../notes/routes';
import { openTask } from '../tasks/routes';
import { openTemplate } from '../templates/routes';

export type ResultKind = 'list' | 'note' | 'task' | 'template';

export interface SearchResult {
  key: string;
  kind: ResultKind;
  title: string;
  /** Text around the match, when the match is not in the title. */
  snippet?: string;
  /** Where it is, e.g. "Item in Weekendje weg". */
  context?: string;
  tagIds: string[];
  updatedAt: number;
  open: () => void;
}

export const KINDS: { value: ResultKind; label: string }[] = [
  { value: 'list', label: 'Paklijsten' },
  { value: 'task', label: 'Taken' },
  { value: 'note', label: 'Notities' },
  { value: 'template', label: 'Templates' },
];

export type DateFilter = 'all' | 'today' | 'week' | 'month';
export const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Altijd' },
  { value: 'today', label: 'Vandaag gewijzigd' },
  { value: 'week', label: 'Laatste 7 dagen' },
  { value: 'month', label: 'Laatste 30 dagen' },
];

/** Lower case without accents, so "cafe" finds "café". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('nl');
}

/** A piece of text around the first match, at most ~90 characters. */
export function snippetAround(text: string, query: string): string | undefined {
  const index = normalize(text).indexOf(query);
  if (index < 0) return undefined;
  const flat = text.replace(/\s+/g, ' ');
  const start = Math.max(0, normalize(flat).indexOf(query) - 30);
  const piece = flat.slice(start, start + 90).trim();
  return `${start > 0 ? '…' : ''}${piece}${start + 90 < flat.length ? '…' : ''}`;
}

export interface Filters {
  query: string;
  kind: ResultKind | 'all';
  tagIds: string[];
  date: DateFilter;
}

/** Searches every module. Without a query, filters alone decide (e.g. everything with a tag). */
export function search(data: AppData, filters: Filters, now = Date.now()): SearchResult[] {
  const query = normalize(filters.query.trim());
  const results: SearchResult[] = [];
  const matches = (...texts: string[]) => !query || texts.some((t) => normalize(t).includes(query));
  const listName = new Map(data.lists.map((l) => [l.id, l.name]));
  const listTags = new Map(data.lists.map((l) => [l.id, l.tagIds]));

  for (const list of data.lists) {
    if (matches(list.name)) {
      results.push({
        key: `l-${list.id}`,
        kind: 'list',
        title: list.name,
        tagIds: list.tagIds,
        updatedAt: list.updatedAt,
        open: () => openList(list.id),
      });
    }
  }
  // Items are found too, and lead to their list.
  if (query) {
    for (const item of data.items) {
      if (!matches(item.name)) continue;
      results.push({
        key: `i-${item.id}`,
        kind: 'list',
        title: item.name,
        context: `Item in ${listName.get(item.listId) ?? 'een lijst'}`,
        tagIds: listTags.get(item.listId) ?? [],
        updatedAt: item.updatedAt,
        open: () => openList(item.listId),
      });
    }
  }
  for (const note of data.notes) {
    if (!matches(note.title, note.body)) continue;
    const title = noteHeading(note);
    results.push({
      key: `n-${note.id}`,
      kind: 'note',
      title,
      snippet:
        query && !normalize(title).includes(query) ? snippetAround(note.body, query) : undefined,
      tagIds: note.tagIds,
      updatedAt: note.updatedAt,
      open: () => openNote(note.id),
    });
  }
  for (const task of data.tasks) {
    const subtasks = task.subtasks.map((s) => s.title).join(' · ');
    if (!matches(task.title, task.notes, subtasks)) continue;
    const inTitle = !query || normalize(task.title).includes(query);
    results.push({
      key: `t-${task.id}`,
      kind: 'task',
      title: task.title,
      snippet: inTitle
        ? undefined
        : (snippetAround(task.notes, query) ?? snippetAround(subtasks, query)),
      context: task.status === 'done' ? 'Afgerond' : undefined,
      tagIds: task.tagIds,
      updatedAt: task.updatedAt,
      open: () => openTask(task.id),
    });
  }
  for (const template of data.templates) {
    const items = template.items.map((i) => i.name).join(' · ');
    if (!matches(template.name, items)) continue;
    results.push({
      key: `p-${template.id}`,
      kind: 'template',
      title: template.name,
      snippet:
        query && !normalize(template.name).includes(query)
          ? snippetAround(items, query)
          : undefined,
      tagIds: [],
      updatedAt: template.updatedAt,
      open: () => openTemplate(template.id),
    });
  }

  const since =
    filters.date === 'today'
      ? new Date(`${todayKey(new Date(now))}T00:00`).getTime()
      : filters.date === 'week'
        ? now - 7 * 86_400_000
        : filters.date === 'month'
          ? now - 30 * 86_400_000
          : 0;
  return results
    .filter((r) => filters.kind === 'all' || r.kind === filters.kind)
    .filter((r) => filters.tagIds.every((id) => r.tagIds.includes(id)))
    .filter((r) => r.updatedAt >= since)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
