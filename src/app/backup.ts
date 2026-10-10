import { cleanName } from '../core/lib/util';
import { MAX_NAME_LENGTH, type AppData } from '../core/types';
import {
  LABEL_COLORS,
  SORT_MODES,
  type Item,
  type Label,
  type PackList,
  type SortMode,
} from '../modules/lists/types';
import { cleanQuantity } from '../modules/lists/util';
import type { Note } from '../modules/notes/types';
import { cleanNoteBody } from '../modules/notes/util';

const APP_ID = 'paklijsten';
// 1: lists, labels, items. 2: adds notes.
const BACKUP_VERSION = 2;

interface BackupFile extends AppData {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
}

/**
 * `notesIncluded` is false for backups made before notes existed; importing one of those
 * should leave the notes on this device alone.
 */
export type ParseResult =
  | { ok: true; data: AppData; notesIncluded: boolean }
  | { ok: false; error: string };

export function buildBackup(data: AppData): BackupFile {
  return { app: APP_ID, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), ...data };
}

export async function exportBackup(data: AppData): Promise<void> {
  const json = JSON.stringify(buildBackup(data), null, 2);
  const name = `paklijsten-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });

  // On phones the share sheet ("Bewaar in Bestanden") is more reliable than a download,
  // especially in an installed iOS PWA.
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Paklijsten back-up' });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

class InvalidBackup extends Error {}

function fail(message: string): never {
  throw new InvalidBackup(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readArray(source: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = source[key];
  if (!Array.isArray(value)) fail(`Het onderdeel "${key}" ontbreekt.`);
  if (!value.every(isRecord)) fail(`Het onderdeel "${key}" bevat ongeldige gegevens.`);
  return value;
}

function readId(record: Record<string, unknown>, key: string, seen?: Set<string>): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0 || value.length > 100) {
    fail(`Ongeldige of ontbrekende "${key}".`);
  }
  if (seen) {
    if (seen.has(value)) fail('Het bestand bevat dubbele id’s.');
    seen.add(value);
  }
  return value;
}

function readName(record: Record<string, unknown>): string {
  const name = typeof record.name === 'string' ? cleanName(record.name) : '';
  if (!name) fail('Een lijst, label of item heeft geen naam.');
  return name;
}

function readOrder(record: Record<string, unknown>, fallback: number): number {
  return typeof record.order === 'number' && Number.isFinite(record.order) ? record.order : fallback;
}

function readTime(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : Date.now();
}

/** createdAt and updatedAt of a record, with `fallback` for what a backup does not have. */
function readTimes(record: Record<string, unknown>, fallback: number) {
  const createdAt = typeof record.createdAt === 'number' ? readTime(record.createdAt) : fallback;
  const updatedAt = typeof record.updatedAt === 'number' ? readTime(record.updatedAt) : createdAt;
  return { createdAt, updatedAt };
}

/** Validates the contents of a backup file and returns clean, consistent data. */
export function parseBackup(text: string): ParseResult {
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      fail('Het bestand is geen geldig JSON-bestand.');
    }
    if (!isRecord(raw) || raw.app !== APP_ID) fail('Dit is geen back-up van Paklijsten.');
    if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
      fail('Deze back-up is gemaakt met een nieuwere versie van de app.');
    }

    const listIds = new Set<string>();
    const listCreated = new Map<string, number>();
    const lists = readArray(raw, 'lists').map<PackList>((record, index) => {
      const list: PackList = {
        id: readId(record, 'id', listIds),
        name: readName(record),
        order: readOrder(record, index),
        sortMode: SORT_MODES.includes(record.sortMode as SortMode)
          ? (record.sortMode as SortMode)
          : 'manual',
        ...readTimes(record, Date.now()),
      };
      listCreated.set(list.id, list.createdAt);
      return list;
    });
    // Labels and items in older backups have no dates; they take those of their list.
    const timesFromList = (record: Record<string, unknown>) =>
      readTimes(record, listCreated.get(record.listId as string) ?? Date.now());

    const labelIds = new Set<string>();
    const labelList = new Map<string, string>();
    const labels = readArray(raw, 'labels').map<Label>((record, index) => {
      const label: Label = {
        id: readId(record, 'id', labelIds),
        listId: readId(record, 'listId'),
        name: readName(record),
        color:
          typeof record.color === 'string' && /^#[0-9a-f]{6}$/i.test(record.color)
            ? record.color
            : LABEL_COLORS[index % LABEL_COLORS.length],
        order: readOrder(record, index),
        ...timesFromList(record),
      };
      if (!listIds.has(label.listId)) fail(`Label "${label.name}" hoort bij een onbekende lijst.`);
      labelList.set(label.id, label.listId);
      return label;
    });

    const itemIds = new Set<string>();
    const items = readArray(raw, 'items').map<Item>((record, index) => {
      const listId = readId(record, 'listId');
      const name = readName(record);
      if (!listIds.has(listId)) fail(`Item "${name}" hoort bij een onbekende lijst.`);
      const labelId = typeof record.labelId === 'string' ? record.labelId : null;
      return {
        id: readId(record, 'id', itemIds),
        listId,
        // A label from another list (or a missing one) is dropped; the item itself is kept.
        labelId: labelId !== null && labelList.get(labelId) === listId ? labelId : null,
        name,
        quantity: cleanQuantity(record.quantity),
        checked: record.checked === true,
        order: readOrder(record, index),
        ...timesFromList(record),
      };
    });

    const notesIncluded = raw.notes !== undefined;
    const noteIds = new Set<string>();
    const notes = notesIncluded
      ? readArray(raw, 'notes').map<Note>((record) => {
          const createdAt = readTime(record.createdAt);
          return {
            id: readId(record, 'id', noteIds),
            title: typeof record.title === 'string' ? record.title.slice(0, MAX_NAME_LENGTH) : '',
            body: typeof record.body === 'string' ? cleanNoteBody(record.body) : '',
            createdAt,
            updatedAt: typeof record.updatedAt === 'number' ? readTime(record.updatedAt) : createdAt,
          };
        })
      : [];

    return { ok: true, data: { lists, labels, items, notes }, notesIncluded };
  } catch (error) {
    if (error instanceof InvalidBackup) return { ok: false, error: error.message };
    throw error;
  }
}
