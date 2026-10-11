import { useState, type CSSProperties } from 'react';
import { Icon } from '../../core/components/Icon';
import { WidgetList } from '../../core/components/WidgetList';
import { todayKey } from '../../core/lib/dates';
import { byOrder } from '../../core/lib/util';
import { useAppState } from '../../core/store';
import { AmountSheet } from './AmountSheet';
import { DayDot } from './DayDot';
import { openHabit } from './routes';
import { addAmount, toggleDay } from './store';
import type { Habit } from './types';
import { amountsByDate, habitStats, isDone, isPaused, isScheduled } from './util';

/** Dashboard: today's habits, to check off right here. */
export function HabitsWidget() {
  const { data } = useAppState();
  const [amountFor, setAmountFor] = useState<Habit | null>(null);
  const today = todayKey();
  const habits = [...data.habits]
    .sort(byOrder)
    .filter((h) => !h.archived && !isPaused(h, today) && isScheduled(h, today));
  return (
    <>
      <WidgetList
        items={habits}
        max={6}
        empty="Geen gewoontes voor vandaag."
        keyOf={(h) => h.id}
        render={(habit) => {
          const amount = amountsByDate(data.habitChecks, habit.id).get(today);
          const stats = habitStats(habit, data.habitChecks, today);
          return (
            <div className="task-row habit-row" style={{ '--habit': habit.color } as CSSProperties}>
              <DayDot
                habit={habit}
                date={today}
                amount={amount}
                label={habit.name}
                onTap={() => (habit.target ? setAmountFor(habit) : toggleDay(habit, today))}
              />
              <button type="button" className="task-main" onClick={() => openHabit(habit.id)}>
                <span className="task-title">{habit.name}</span>
                <span className="task-meta">
                  {habit.target && (
                    <span>
                      {amount ?? 0}/{habit.target.amount} {habit.target.unit}
                    </span>
                  )}
                  {stats.current > 0 && <span className="habit-streak">Reeks {stats.current}</span>}
                </span>
              </button>
              {habit.target && !isDone(habit, amount) && (
                <button
                  type="button"
                  className="icon-btn icon-btn-subtle"
                  aria-label={`${habit.name}: één ${habit.target.unit || 'keer'} erbij`}
                  onClick={() => addAmount(habit, today, 1)}
                >
                  <Icon name="plus" size={20} />
                </button>
              )}
            </div>
          );
        }}
      />
      {amountFor && (
        <AmountSheet habit={amountFor} date={today} onClose={() => setAmountFor(null)} />
      )}
    </>
  );
}
