import type { CSSProperties } from 'react';
import { Icon } from '../../core/components/Icon';
import { todayKey, type DateKey } from '../../core/lib/dates';
import type { Habit } from './types';
import { isDone, isPaused, isScheduled } from './util';

/**
 * One day of a habit: filled when done, a partial ring with an amount, dimmed when the day does
 * not count (not scheduled, paused), disabled in the future. Tapping it changes that day.
 */
export function DayDot({
  habit,
  date,
  amount,
  label,
  onTap,
}: {
  habit: Habit;
  date: DateKey;
  amount: number | undefined;
  label: string;
  onTap: () => void;
}) {
  const today = todayKey();
  const done = isDone(habit, amount);
  const partial = !done && !!amount;
  const off = !isScheduled(habit, date) || isPaused(habit, date);
  const future = date > today;
  const fraction = habit.target && amount ? Math.min(amount / habit.target.amount, 1) : 0;
  const state = done
    ? 'gedaan'
    : partial
      ? `${amount} van ${habit.target?.amount}`
      : off
        ? 'telt niet mee'
        : 'niet gedaan';
  return (
    <button
      type="button"
      className={`day-dot${done ? ' done' : ''}${partial ? ' partial' : ''}${off ? ' off' : ''}${date === today ? ' today' : ''}`}
      style={{ '--habit': habit.color, '--fraction': `${fraction * 360}deg` } as CSSProperties}
      disabled={future}
      aria-label={`${label}: ${state}`}
      onClick={onTap}
    >
      {done && <Icon name="check" size={16} />}
    </button>
  );
}
