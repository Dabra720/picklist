import type { DateKey } from '../../core/lib/dates';
import type { BaseRecord } from '../../core/types';

/** Weekdays as 0 = Monday … 6 = Sunday. */
export type HabitGoal =
  { kind: 'daily' } | { kind: 'weekdays'; days: number[] } | { kind: 'perWeek'; times: number };

export interface Habit extends BaseRecord {
  name: string;
  color: string;
  goal: HabitGoal;
  /** A daily amount (8 glazen water, 30 minuten), or null for a simple yes/no. */
  target: { amount: number; unit: string } | null;
  /** Paused periods; `to` is null while the habit is paused. Paused days never break a streak. */
  pausedRanges: { from: DateKey; to: DateKey | null }[];
  archived: boolean;
  order: number;
}

/** One habit on one day. The id is `${habitId}:${date}`, so the same day never exists twice. */
export interface HabitCheck extends BaseRecord {
  habitId: string;
  date: DateKey;
  amount: number;
}

export const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
export const MAX_AMOUNT = 9999;
