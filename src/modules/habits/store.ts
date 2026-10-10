import type { DateKey } from '../../core/lib/dates';
import { todayKey, addDays } from '../../core/lib/dates';
import { cleanName, nextOrder, uid } from '../../core/lib/util';
import { commit, getData } from '../../core/store';
import { LABEL_COLORS } from '../lists/types';
import { MAX_AMOUNT, type Habit, type HabitCheck, type HabitGoal } from './types';
import { checkId } from './util';

export interface HabitFields {
  name: string;
  color: string;
  goal: HabitGoal;
  target: Habit['target'];
}

function cleanGoal(goal: HabitGoal): HabitGoal {
  if (goal.kind === 'weekdays') {
    const days = [...new Set(goal.days)].filter((d) => d >= 0 && d <= 6).sort();
    return days.length === 0 ? { kind: 'daily' } : { kind: 'weekdays', days };
  }
  if (goal.kind === 'perWeek')
    return { kind: 'perWeek', times: Math.min(Math.max(Math.round(goal.times), 1), 7) };
  return goal;
}

function cleanTarget(target: Habit['target']): Habit['target'] {
  if (!target || !Number.isFinite(target.amount) || target.amount < 1) return null;
  return { amount: Math.min(Math.round(target.amount), MAX_AMOUNT), unit: cleanName(target.unit) };
}

function saveHabit(next: Habit) {
  const data = getData();
  const exists = data.habits.some((h) => h.id === next.id);
  commit(
    {
      ...data,
      habits: exists
        ? data.habits.map((h) => (h.id === next.id ? next : h))
        : [...data.habits, next],
    },
    [{ store: 'habits', put: [next] }],
  );
}

function changeHabit(id: string, change: (habit: Habit) => Habit | null) {
  const current = getData().habits.find((h) => h.id === id);
  if (!current) return;
  const next = change(current);
  if (next) saveHabit({ ...next, updatedAt: Date.now() });
}

export function createHabit(fields: HabitFields): string | null {
  const name = cleanName(fields.name);
  if (!name) return null;
  const data = getData();
  const now = Date.now();
  const habit: Habit = {
    id: uid(),
    name,
    color: fields.color || LABEL_COLORS[data.habits.length % LABEL_COLORS.length],
    goal: cleanGoal(fields.goal),
    target: cleanTarget(fields.target),
    pausedRanges: [],
    archived: false,
    order: nextOrder(data.habits),
    createdAt: now,
    updatedAt: now,
  };
  saveHabit(habit);
  return habit.id;
}

export function updateHabit(id: string, fields: HabitFields) {
  const name = cleanName(fields.name);
  if (!name) return;
  changeHabit(id, (habit) => ({
    ...habit,
    name,
    color: fields.color,
    goal: cleanGoal(fields.goal),
    target: cleanTarget(fields.target),
  }));
}

/** Pauses from today on; days while paused never break a streak. */
export function pauseHabit(id: string, today = todayKey()) {
  changeHabit(id, (habit) =>
    habit.pausedRanges.some((r) => r.to === null)
      ? null
      : { ...habit, pausedRanges: [...habit.pausedRanges, { from: today, to: null }] },
  );
}

/** Ends the pause: it ran until yesterday (a pause started today is simply removed). */
export function resumeHabit(id: string, today = todayKey()) {
  changeHabit(id, (habit) => ({
    ...habit,
    pausedRanges: habit.pausedRanges.flatMap((r) =>
      r.to !== null ? [r] : r.from >= today ? [] : [{ from: r.from, to: addDays(today, -1) }],
    ),
  }));
}

export function setArchived(id: string, archived: boolean) {
  changeHabit(id, (habit) => (habit.archived === archived ? null : { ...habit, archived }));
}

/** Deletes a habit with its history; returns both for undo. */
export function deleteHabit(id: string): { habit: Habit; checks: HabitCheck[] } | null {
  const data = getData();
  const habit = data.habits.find((h) => h.id === id);
  if (!habit) return null;
  const checks = data.habitChecks.filter((c) => c.habitId === id);
  commit(
    {
      ...data,
      habits: data.habits.filter((h) => h.id !== id),
      habitChecks: data.habitChecks.filter((c) => c.habitId !== id),
    },
    [
      { store: 'habits', remove: [id] },
      { store: 'habitChecks', remove: checks.map((c) => c.id) },
    ],
  );
  return { habit, checks };
}

export function restoreHabit({ habit, checks }: { habit: Habit; checks: HabitCheck[] }) {
  const data = getData();
  if (data.habits.some((h) => h.id === habit.id)) return;
  commit(
    { ...data, habits: [...data.habits, habit], habitChecks: [...data.habitChecks, ...checks] },
    [
      { store: 'habits', put: [habit] },
      { store: 'habitChecks', put: checks },
    ],
  );
}

// ---------- Checking off ----------

/** Sets the amount for a day; 0 removes the check. */
export function setAmount(habitId: string, date: DateKey, amount: number) {
  const data = getData();
  if (!data.habits.some((h) => h.id === habitId) || date > todayKey()) return;
  const id = checkId(habitId, date);
  const clean = Math.min(Math.max(Math.round(amount), 0), MAX_AMOUNT);
  const existing = data.habitChecks.find((c) => c.id === id);
  if (clean === 0) {
    if (existing)
      commit({ ...data, habitChecks: data.habitChecks.filter((c) => c.id !== id) }, [
        { store: 'habitChecks', remove: [id] },
      ]);
    return;
  }
  if (existing?.amount === clean) return;
  const now = Date.now();
  const check: HabitCheck = existing
    ? { ...existing, amount: clean, updatedAt: now }
    : { id, habitId, date, amount: clean, createdAt: now, updatedAt: now };
  commit(
    {
      ...data,
      habitChecks: existing
        ? data.habitChecks.map((c) => (c.id === id ? check : c))
        : [...data.habitChecks, check],
    },
    [{ store: 'habitChecks', put: [check] }],
  );
}

/** The tap on a day: done ↔ not done. With an amount, "done" fills the day to its target. */
export function toggleDay(habit: Habit, date: DateKey) {
  const current = getData().habitChecks.find((c) => c.id === checkId(habit.id, date))?.amount ?? 0;
  const full = habit.target?.amount ?? 1;
  setAmount(habit.id, date, current >= full ? 0 : full);
}

export function addAmount(habit: Habit, date: DateKey, delta: number) {
  const current = getData().habitChecks.find((c) => c.id === checkId(habit.id, date))?.amount ?? 0;
  setAmount(habit.id, date, current + delta);
}
