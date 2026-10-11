import { isDateKey } from '../../core/lib/dates';
import { cleanName } from '../../core/lib/util';
import {
  count,
  IdSet,
  isRecord,
  readArray,
  readOrder,
  readTimes,
  Skipped,
} from '../../core/lib/validate';
import type { ModuleBackup } from '../../core/modules';
import type { AppData } from '../../core/types';
import { LABEL_COLORS } from '../lists/types';
import { MAX_AMOUNT, type Habit, type HabitCheck, type HabitGoal } from './types';
import { checkId } from './util';

function readGoal(value: unknown): HabitGoal {
  if (!isRecord(value)) return { kind: 'daily' };
  if (value.kind === 'weekdays' && Array.isArray(value.days)) {
    const days = [
      ...new Set(value.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)),
    ].sort();
    return days.length > 0 ? { kind: 'weekdays', days } : { kind: 'daily' };
  }
  if (value.kind === 'perWeek' && typeof value.times === 'number') {
    return { kind: 'perWeek', times: Math.min(Math.max(Math.round(value.times), 1), 7) };
  }
  return { kind: 'daily' };
}

/** Habits and the days they were done. Version 1 = as stored in database version 8. */
export const habitsBackup: ModuleBackup = {
  version: 1,
  stores: ['habits', 'habitChecks'],

  parse(section) {
    const skipped = new Skipped();
    const now = Date.now();
    const habitIds = new IdSet();
    const habits: Habit[] = [];
    readArray(section, 'habits').forEach((record, index) => {
      if (!isRecord(record)) return skipped.add('gewoonte', 'gewoontes', 'ongeldige gegevens');
      const name = typeof record.name === 'string' ? cleanName(record.name) : '';
      if (!name) return skipped.add('gewoonte', 'gewoontes', 'zonder naam');
      if (!habitIds.accept(record.id))
        return skipped.add('gewoonte', 'gewoontes', 'ongeldige of dubbele id');
      const t = record.target;
      const target =
        isRecord(t) && typeof t.amount === 'number' && t.amount >= 1
          ? {
              amount: Math.min(Math.round(t.amount), MAX_AMOUNT),
              unit: typeof t.unit === 'string' ? cleanName(t.unit) : '',
            }
          : null;
      const pausedRanges = Array.isArray(record.pausedRanges)
        ? record.pausedRanges.flatMap((r) =>
            isRecord(r) && isDateKey(r.from) && (r.to === null || isDateKey(r.to))
              ? [{ from: r.from, to: r.to as string | null }]
              : [],
          )
        : [];
      habits.push({
        id: record.id,
        name,
        color:
          typeof record.color === 'string' && /^#[0-9a-f]{6}$/i.test(record.color)
            ? record.color
            : LABEL_COLORS[index % LABEL_COLORS.length],
        goal: readGoal(record.goal),
        target,
        pausedRanges,
        archived: record.archived === true,
        order: readOrder(record, index),
        ...readTimes(record, now),
      });
    });

    const checks: HabitCheck[] = [];
    const seen = new Set<string>();
    readArray(section, 'habitChecks').forEach((record) => {
      if (!isRecord(record) || typeof record.habitId !== 'string' || !isDateKey(record.date)) {
        return skipped.add('vinkje', 'vinkjes', 'ongeldige gegevens');
      }
      if (!habitIds.has(record.habitId))
        return skipped.add('vinkje', 'vinkjes', 'hoort bij een onbekende gewoonte');
      const amount =
        typeof record.amount === 'number' ? Math.min(Math.round(record.amount), MAX_AMOUNT) : 1;
      // The id is always rebuilt from habit and day, so a day can never be in the backup twice.
      const id = checkId(record.habitId, record.date);
      if (amount < 1 || seen.has(id)) return;
      seen.add(id);
      checks.push({
        id,
        habitId: record.habitId,
        date: record.date,
        amount,
        ...readTimes(record, now),
      });
    });
    return { data: { habits, habitChecks: checks }, warnings: skipped.messages() };
  },

  repair(data: AppData): AppData {
    const ids = new Set(data.habits.map((h) => h.id));
    const habitChecks = data.habitChecks.filter((c) => ids.has(c.habitId));
    return habitChecks.length === data.habitChecks.length ? data : { ...data, habitChecks };
  },

  describe(data) {
    return `${count(data.habits?.length ?? 0, 'gewoonte', 'gewoontes')}, ${count(data.habitChecks?.length ?? 0, 'dag', 'dagen')} afgevinkt`;
  },
};
