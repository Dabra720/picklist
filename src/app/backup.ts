import type { DataStore, SettingRecord } from '../core/db';
import { showToast } from '../core/lib/toast';
import { fail, InvalidBackup, isRecord, isValidId } from '../core/lib/validate';
import type { ModuleBackup } from '../core/modules';
import {
  getData,
  getSetting,
  getSettingRecords,
  importData,
  putSettingRecords,
  setSetting,
} from '../core/store';
import type { AppData, BaseRecord } from '../core/types';
import { MODULES } from '../modules';

/**
 * Backup file format.
 *
 * Version 3 (current): every module has its own section with its own version, so a module can
 * change its data without breaking the others, and a backup may hold only some modules:
 *   { app, version: 3, exportedAt, modules: { lists: { version, lists, labels, items },
 *     notes: { version, notes }, settings: { version, settings } } }
 * Versions 1 and 2 (older apps) had the arrays at the top level; they are still read.
 */
const APP_ID = 'paklijsten';
const FORMAT_VERSION = 3;

const SETTINGS_KEY = 'settings';
const SETTINGS_VERSION = 1;
/** Settings that describe this device rather than the user's data; never in a backup. */
const DEVICE_SETTINGS = new Set(['lastBackupAt', 'backupReminderAt']);
/** Setting written when a backup with all modules was exported. */
export const LAST_BACKUP_SETTING = 'lastBackupAt';

/** One part of the app in a backup: a module, or the settings. */
export interface BackupPart {
  key: string;
  label: string;
}

interface ModulePart extends BackupPart {
  backup: ModuleBackup;
}

const SETTINGS_PART: BackupPart = { key: SETTINGS_KEY, label: 'Instellingen' };

// Read from the module list when needed, not when this file loads: the modules import the menu,
// which imports this file, so MODULES is not available yet at that moment.
function moduleParts(): ModulePart[] {
  return MODULES.flatMap((module) =>
    module.backup ? [{ key: module.id, label: module.label, backup: module.backup }] : [],
  );
}

/** All parts, in the order they are shown. */
export function backupParts(): BackupPart[] {
  return [...moduleParts(), SETTINGS_PART];
}

function syncedSettings(): SettingRecord[] {
  return getSettingRecords().filter((record) => !DEVICE_SETTINGS.has(record.id));
}

/** What a part currently holds on this device, e.g. "3 lijsten, 40 items". */
export function describeCurrent(key: string): string {
  if (key === SETTINGS_KEY) return describeSettings(syncedSettings());
  const part = moduleParts().find((candidate) => candidate.key === key);
  return part ? part.backup.describe(getData()) : '';
}

function describeSettings(records: SettingRecord[]): string {
  const names: Record<string, string> = { theme: 'thema' };
  if (records.length === 0) return 'Geen';
  return records.map((record) => names[record.id] ?? record.id).join(', ');
}

/** True when the part has anything to export. */
export function hasContent(key: string): boolean {
  if (key === SETTINGS_KEY) return syncedSettings().length > 0;
  const part = moduleParts().find((candidate) => candidate.key === key);
  const data = getData();
  return part ? part.backup.stores.some((store) => data[store].length > 0) : false;
}

// ---------- Export ----------

export function buildBackup(keys: string[]) {
  const data = getData();
  const modules: Record<string, unknown> = {};
  for (const part of moduleParts()) {
    if (!keys.includes(part.key)) continue;
    const section: Record<string, unknown> = { version: part.backup.version };
    for (const store of part.backup.stores) section[store] = data[store];
    modules[part.key] = section;
  }
  if (keys.includes(SETTINGS_KEY)) {
    modules[SETTINGS_KEY] = { version: SETTINGS_VERSION, settings: syncedSettings() };
  }
  return { app: APP_ID, version: FORMAT_VERSION, exportedAt: new Date().toISOString(), modules };
}

/**
 * Saves a backup of the given parts as a JSON file. Returns false when the user cancelled.
 * A backup of all modules counts as "the" backup for the reminder.
 */
export async function exportBackup(keys: string[]): Promise<boolean> {
  const date = new Date().toISOString().slice(0, 10);
  const complete = moduleParts().every((part) => keys.includes(part.key));
  const which = complete
    ? ''
    : `-${backupParts()
        .filter((part) => keys.includes(part.key))
        .map((part) => part.label.toLowerCase())
        .join('-')}`;
  const name = `paklijsten-backup${which}-${date}.json`;
  const json = JSON.stringify(buildBackup(keys), null, 2);
  const file = new File([json], name, { type: 'application/json' });

  const saved = await saveFile(file);
  if (saved && complete) setSetting(LAST_BACKUP_SETTING, Date.now());
  return saved;
}

async function saveFile(file: File): Promise<boolean> {
  // On phones the share sheet ("Bewaar in Bestanden") is more reliable than a download,
  // especially in an installed iOS PWA.
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Paklijsten back-up' });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

// ---------- Reading a backup ----------

/** A part of a backup file, read and validated. */
export interface ParsedPart extends BackupPart {
  data: Partial<AppData>;
  settings: SettingRecord[];
  summary: string;
  warnings: string[];
}

export interface ParsedBackup {
  exportedAt: number | null;
  parts: ParsedPart[];
  /** Parts that were left out as a whole (unknown, or from a newer app version). */
  warnings: string[];
}

export type ParseResult = { ok: true; backup: ParsedBackup } | { ok: false; error: string };

function parseSettings(section: Record<string, unknown>): ParsedPart {
  const records: SettingRecord[] = [];
  const list = Array.isArray(section.settings) ? section.settings : [];
  for (const record of list) {
    if (!isRecord(record) || !isValidId(record.id) || DEVICE_SETTINGS.has(record.id)) continue;
    if (records.some((existing) => existing.id === record.id)) continue;
    const updatedAt = typeof record.updatedAt === 'number' ? record.updatedAt : 0;
    records.push({ id: record.id, value: record.value, updatedAt });
  }
  return {
    ...SETTINGS_PART,
    data: {},
    settings: records,
    summary: describeSettings(records),
    warnings: [],
  };
}

/** Validates a backup file and returns clean, consistent data per part. */
export function parseBackup(text: string): ParseResult {
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      fail('Het bestand is geen geldig JSON-bestand.');
    }
    if (!isRecord(raw) || raw.app !== APP_ID) fail('Dit is geen back-up van Paklijsten.');
    if (typeof raw.version !== 'number' || raw.version > FORMAT_VERSION) {
      fail('Deze back-up is gemaakt met een nieuwere versie van de app. Werk de app eerst bij.');
    }

    // Older formats: arrays at the top level, no sections. Notes only exist from version 2.
    const sections: Record<string, unknown> =
      raw.version >= 3
        ? isRecord(raw.modules)
          ? raw.modules
          : fail('De back-up bevat geen onderdelen.')
        : {
            lists: { version: 1, lists: raw.lists, labels: raw.labels, items: raw.items },
            ...(raw.notes !== undefined ? { notes: { version: 1, notes: raw.notes } } : {}),
          };

    const parts: ParsedPart[] = [];
    const warnings: string[] = [];
    for (const [key, section] of Object.entries(sections)) {
      const known = backupParts().find((part) => part.key === key);
      if (!known) {
        warnings.push(`Onbekend onderdeel "${key}" overgeslagen.`);
        continue;
      }
      if (!isRecord(section)) fail(`Het onderdeel ${known.label} is ongeldig.`);
      const version = typeof section.version === 'number' ? section.version : 1;
      if (key === SETTINGS_KEY) {
        if (version > SETTINGS_VERSION) {
          warnings.push(`${known.label} overgeslagen: gemaakt met een nieuwere versie van de app.`);
        } else {
          parts.push(parseSettings(section));
        }
        continue;
      }
      const { backup } = known as ModulePart;
      if (version > backup.version) {
        warnings.push(`${known.label} overgeslagen: gemaakt met een nieuwere versie van de app.`);
        continue;
      }
      const result = backup.parse(section, version);
      parts.push({
        key,
        label: known.label,
        data: result.data,
        settings: [],
        summary: backup.describe(result.data),
        warnings: result.warnings,
      });
    }
    if (parts.length === 0) fail('Deze back-up bevat niets dat terug te zetten is.');

    const exportedAt =
      typeof raw.exportedAt === 'string' && !Number.isNaN(Date.parse(raw.exportedAt))
        ? Date.parse(raw.exportedAt)
        : null;
    // Show parts in the app's order.
    parts.sort(
      (a, b) =>
        backupParts().findIndex((part) => part.key === a.key) -
        backupParts().findIndex((part) => part.key === b.key),
    );
    return { ok: true, backup: { exportedAt, parts, warnings } };
  } catch (error) {
    if (error instanceof InvalidBackup) return { ok: false, error: error.message };
    throw error;
  }
}

// ---------- Restoring ----------

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  added: number;
  updated: number;
  unchanged: number;
  total: number;
}

/** Adds what is new; for records that exist on both sides, the most recently changed one wins. */
function mergeRecords<T extends BaseRecord>(
  current: T[],
  incoming: T[],
  result: ImportResult,
): T[] {
  const byId = new Map(current.map((record) => [record.id, record]));
  for (const record of incoming) {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, record);
      result.added += 1;
    } else if (record.updatedAt > existing.updatedAt) {
      byId.set(record.id, record);
      result.updated += 1;
    } else {
      result.unchanged += 1;
    }
  }
  return [...byId.values()];
}

/** The data as it will be after the import, and which stores change. */
export function planImport(
  current: AppData,
  parts: ParsedPart[],
  mode: ImportMode,
): { data: AppData; stores: DataStore[]; result: ImportResult } {
  const result: ImportResult = { added: 0, updated: 0, unchanged: 0, total: 0 };
  let data: AppData = { ...current };
  const stores: DataStore[] = [];
  for (const part of parts) {
    const modulePart = moduleParts().find((candidate) => candidate.key === part.key);
    if (!modulePart) continue;
    for (const store of modulePart.backup.stores) {
      const incoming = (part.data[store] ?? []) as BaseRecord[];
      result.total += incoming.length;
      data = {
        ...data,
        [store]:
          mode === 'replace'
            ? incoming
            : mergeRecords(current[store] as BaseRecord[], incoming, result),
      };
      stores.push(store);
    }
    if (modulePart.backup.repair) data = modulePart.backup.repair(data);
  }
  if (mode === 'replace') result.added = result.total;
  return { data, stores, result };
}

/** Saves the chosen parts of a backup. Rejects (and changes nothing) if saving fails. */
export async function restoreBackup(parts: ParsedPart[], mode: ImportMode): Promise<ImportResult> {
  const plan = planImport(getData(), parts, mode);
  await importData(plan.data, plan.stores);

  const settingsPart = parts.find((part) => part.key === SETTINGS_KEY);
  if (settingsPart) {
    const current = new Map(syncedSettings().map((record) => [record.id, record.updatedAt]));
    const records =
      mode === 'replace'
        ? settingsPart.settings
        : settingsPart.settings.filter(
            (record) => record.updatedAt > (current.get(record.id) ?? -1),
          );
    putSettingRecords(records);
  }
  return plan.result;
}

// ---------- Reminder ----------

const DAY = 86_400_000;
/** Remind when the last complete backup is older than this… */
const REMIND_AFTER_DAYS = 30;
/** …but not more often than this. */
const REMIND_EVERY_DAYS = 7;
const REMINDER_SETTING = 'backupReminderAt';

/** Shows a reminder with a one-tap export when the last backup is old (or there is none). */
export function remindToBackUp(now = Date.now()) {
  const data = getData();
  const records: BaseRecord[] = moduleParts().flatMap((part) =>
    part.backup.stores.flatMap((store) => data[store] as BaseRecord[]),
  );
  if (records.length === 0) return;

  const last = getSetting<number>(LAST_BACKUP_SETTING);
  const since = last ?? Math.min(...records.map((record) => record.createdAt));
  if (now - since < REMIND_AFTER_DAYS * DAY) return;
  const reminded = getSetting<number>(REMINDER_SETTING);
  if (reminded && now - reminded < REMIND_EVERY_DAYS * DAY) return;

  setSetting(REMINDER_SETTING, now);
  const days = Math.floor((now - since) / DAY);
  showToast(
    last ? `Je laatste back-up is ${days} dagen oud.` : 'Je hebt nog geen back-up gemaakt.',
    {
      label: 'Back-up maken',
      run: () => {
        exportBackup(backupParts().map((part) => part.key)).catch((error) => {
          console.error(error);
          showToast('Exporteren is mislukt.');
        });
      },
    },
  );
}

export function describeResult(
  result: ImportResult,
  mode: ImportMode,
  parts: ParsedPart[],
): string {
  if (mode === 'replace') {
    return `Back-up teruggezet: ${parts.map((part) => `${part.label.toLowerCase()} (${part.summary})`).join(', ')}.`;
  }
  if (result.added === 0 && result.updated === 0) {
    return 'Back-up samengevoegd: alles stond er al.';
  }
  return `Back-up samengevoegd: ${result.added} nieuw, ${result.updated} bijgewerkt.`;
}
