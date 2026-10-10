/** Helpers for reading data from outside the app (backup files), shared by all modules. */

/** A backup that cannot be used at all. */
export class InvalidBackup extends Error {}

export function fail(message: string): never {
  throw new InvalidBackup(message);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The array under `key`. A missing or malformed array makes the whole backup unusable. */
export function readArray(source: Record<string, unknown>, key: string): unknown[] {
  const value = source[key];
  if (!Array.isArray(value)) fail(`Het onderdeel "${key}" ontbreekt.`);
  return value;
}

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 100;
}

export function readOrder(record: Record<string, unknown>, fallback: number): number {
  return typeof record.order === 'number' && Number.isFinite(record.order)
    ? record.order
    : fallback;
}

function readTime(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/** createdAt and updatedAt of a record, with `fallback` for what an older backup does not have. */
export function readTimes(record: Record<string, unknown>, fallback: number) {
  const createdAt = readTime(record.createdAt) ?? fallback;
  return { createdAt, updatedAt: readTime(record.updatedAt) ?? createdAt };
}

/**
 * Records that are skipped while reading a backup, counted per reason, so the import can say
 * what it left out instead of refusing the whole file.
 */
export class Skipped {
  private counts = new Map<string, { one: string; many: string; reason: string; n: number }>();

  add(one: string, many: string, reason: string) {
    const key = `${one}|${reason}`;
    const entry = this.counts.get(key) ?? { one, many, reason, n: 0 };
    entry.n += 1;
    this.counts.set(key, entry);
  }

  messages(): string[] {
    return [...this.counts.values()].map(
      ({ one, many, reason, n }) => `${n} ${n === 1 ? one : many} overgeslagen: ${reason}.`,
    );
  }
}

/** Keeps only the first record per id; later ones are skipped. */
export class IdSet {
  private seen = new Set<string>();

  /** True when the id is valid and new. */
  accept(id: unknown): id is string {
    if (!isValidId(id) || this.seen.has(id)) return false;
    this.seen.add(id);
    return true;
  }

  has(id: string) {
    return this.seen.has(id);
  }
}

export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
