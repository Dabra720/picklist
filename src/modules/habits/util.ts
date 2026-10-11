import { addDays, parseDateKey, startOfWeek, todayKey, type DateKey } from '../../core/lib/dates';
import type { Habit, HabitCheck } from './types';
import { WEEKDAYS } from './types';

/** 0 = Monday … 6 = Sunday. */
export function weekday(date: DateKey): number {
  return (parseDateKey(date).getDay() + 6) % 7;
}

export function checkId(habitId: string, date: DateKey): string {
  return `${habitId}:${date}`;
}

export function isPaused(habit: Habit, date: DateKey): boolean {
  return habit.pausedRanges.some((r) => date >= r.from && (r.to === null || date <= r.to));
}

export function isPausedNow(habit: Habit, today = todayKey()): boolean {
  return isPaused(habit, today);
}

/** Days the habit is meant for (a weekly goal counts every day as a possible day). */
export function isScheduled(habit: Habit, date: DateKey): boolean {
  return habit.goal.kind !== 'weekdays' || habit.goal.days.includes(weekday(date));
}

/** Amounts per date for one habit. */
export function amountsByDate(checks: HabitCheck[], habitId: string): Map<DateKey, number> {
  const map = new Map<DateKey, number>();
  for (const check of checks) if (check.habitId === habitId) map.set(check.date, check.amount);
  return map;
}

export function isDone(habit: Habit, amount: number | undefined): boolean {
  if (!amount) return false;
  return habit.target ? amount >= habit.target.amount : amount > 0;
}

export interface HabitStats {
  current: number;
  longest: number;
  /** "dagen" or "weken" */
  unit: 'dagen' | 'weken';
  week: { done: number; total: number };
  month: { done: number; total: number };
}

function firstDay(habit: Habit, amounts: Map<DateKey, number>): DateKey {
  const created = todayKeyOf(habit.createdAt);
  const firstCheck = [...amounts.keys()].sort()[0];
  return firstCheck && firstCheck < created ? firstCheck : created;
}

function todayKeyOf(timestamp: number): DateKey {
  return todayKey(new Date(timestamp));
}

/**
 * Streaks and completion. Day goals count days: a scheduled, not paused day that is done
 * continues the streak, one that is missed ends it; other days are skipped. Today only counts
 * once it is done (the day is not over yet). Weekly goals count weeks in the same way.
 */
export function habitStats(habit: Habit, checks: HabitCheck[], today = todayKey()): HabitStats {
  const amounts = amountsByDate(checks, habit.id);
  const start = firstDay(habit, amounts);
  const done = (date: DateKey) => isDone(habit, amounts.get(date));

  if (habit.goal.kind === 'perWeek') {
    const times = habit.goal.times;
    const weekDone = (monday: DateKey, until: DateKey) => {
      let n = 0;
      for (let d = monday, i = 0; i < 7 && d <= until; i++, d = addDays(d, 1)) if (done(d)) n++;
      return n;
    };
    const weekPaused = (monday: DateKey) =>
      Array.from({ length: 7 }, (_, i) => addDays(monday, i)).some((d) => isPaused(habit, d));
    const thisWeek = startOfWeek(today);
    const firstWeek = startOfWeek(start);
    // Weeks from oldest to newest; each is met, missed, or skipped (paused).
    const results: ('met' | 'missed' | 'skip')[] = [];
    for (let w = firstWeek; w < thisWeek; w = addDays(w, 7)) {
      results.push(weekPaused(w) ? 'skip' : weekDone(w, addDays(w, 6)) >= times ? 'met' : 'missed');
    }
    const currentMet = weekDone(thisWeek, today) >= times;
    let current = currentMet ? 1 : 0;
    for (let i = results.length - 1; i >= 0 && results[i] !== 'missed'; i--)
      if (results[i] === 'met') current++;
    let longest = 0;
    let run = 0;
    for (const r of [...results, currentMet ? 'met' : 'skip']) {
      if (r === 'met') longest = Math.max(longest, ++run);
      else if (r === 'missed') run = 0;
    }
    // Month: days done against the weekly goal, pro rata for the weeks touched so far.
    const monthStart = `${today.slice(0, 8)}01`;
    let monthDone = 0;
    for (let d = monthStart; d <= today; d = addDays(d, 1)) if (done(d)) monthDone++;
    const monthWeeks = Math.ceil((weekday(monthStart) + Number(today.slice(8, 10))) / 7);
    return {
      current,
      longest,
      unit: 'weken',
      week: { done: weekDone(thisWeek, today), total: times },
      month: { done: Math.min(monthDone, times * monthWeeks), total: times * monthWeeks },
    };
  }

  // Day goals.
  const counts = (date: DateKey) => isScheduled(habit, date) && !isPaused(habit, date);
  let current = counts(today) && done(today) ? 1 : 0;
  for (let day = addDays(today, -1); day >= start; day = addDays(day, -1)) {
    if (!counts(day)) continue;
    if (!done(day)) break;
    current++;
  }
  let longest = 0;
  let run = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (!counts(d)) continue;
    if (done(d)) longest = Math.max(longest, ++run);
    else if (d !== today) run = 0;
  }
  const period = (from: DateKey) => {
    let total = 0;
    let n = 0;
    for (let d = from < start ? start : from; d <= today; d = addDays(d, 1)) {
      if (!counts(d)) continue;
      // Today is only counted once done, so the rate does not drop in the morning.
      if (d === today && !done(d)) continue;
      total++;
      if (done(d)) n++;
    }
    return { done: n, total };
  };
  return {
    current,
    longest,
    unit: 'dagen',
    week: period(startOfWeek(today)),
    month: period(`${today.slice(0, 8)}01`),
  };
}

export function percentOf({ done, total }: { done: number; total: number }): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function goalLabel(habit: Habit): string {
  const goal = habit.goal;
  const base =
    goal.kind === 'daily'
      ? 'Elke dag'
      : goal.kind === 'perWeek'
        ? `${goal.times}× per week`
        : goal.days.length === 7
          ? 'Elke dag'
          : [...goal.days]
              .sort()
              .map((d) => WEEKDAYS[d])
              .join(', ');
  return habit.target ? `${base} · ${habit.target.amount} ${habit.target.unit}`.trim() : base;
}

/** Monday-based weeks of a month, with null for days outside it. */
export function monthGrid(year: number, month: number): (DateKey | null)[][] {
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (DateKey | null)[] = Array(weekday(first)).fill(null);
  for (let d = 0; d < days; d++) cells.push(addDays(first, d));
  while (cells.length % 7) cells.push(null);
  const weeks: (DateKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
