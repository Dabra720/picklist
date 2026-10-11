import { useState } from 'react';
import { ActionSheet } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { parseDateKey, todayKey, type DateKey } from '../../core/lib/dates';
import { showToast } from '../../core/lib/toast';
import { useAppState } from '../../core/store';
import { AmountSheet } from './AmountSheet';
import { DayDot } from './DayDot';
import { HabitSheet } from './HabitSheet';
import { goHabits } from './routes';
import {
  deleteHabit,
  pauseHabit,
  restoreHabit,
  resumeHabit,
  setArchived,
  toggleDay,
} from './store';
import { WEEKDAYS, type Habit } from './types';
import { amountsByDate, goalLabel, habitStats, isPausedNow, monthGrid, percentOf } from './util';

const monthName = new Intl.DateTimeFormat('nl', { month: 'long', year: 'numeric' });

/** One habit: streaks, completion this week and month, and a month calendar to fill in days. */
export function HabitScreen({ habit }: { habit: Habit }) {
  const { data } = useAppState();
  const today = todayKey();
  const [month, setMonth] = useState(() => {
    const d = parseDateKey(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [dialog, setDialog] = useState<'menu' | 'edit' | { date: DateKey } | null>(null);
  const close = () => setDialog(null);

  const amounts = amountsByDate(data.habitChecks, habit.id);
  const stats = habitStats(habit, data.habitChecks, today);
  const pausedNow = isPausedNow(habit, today);
  const grid = monthGrid(month.year, month.month);
  const thisMonth = parseDateKey(today);
  const atCurrentMonth =
    month.year === thisMonth.getFullYear() && month.month === thisMonth.getMonth();

  const shift = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const next = new Date(year, m + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  const tap = (date: DateKey) => (habit.target ? setDialog({ date }) : toggleDay(habit, date));
  const unit = (n: number) => (n === 1 ? stats.unit.replace(/en$/, '') : stats.unit);

  const remove = () => {
    const removed = deleteHabit(habit.id);
    goHabits();
    if (removed) {
      showToast(`"${habit.name}" verwijderd.`, {
        label: 'Ongedaan maken',
        run: () => restoreHabit(removed),
      });
    }
  };

  return (
    <div className="screen">
      <header className="topbar">
        <button
          type="button"
          className="icon-btn"
          aria-label="Terug naar gewoontes"
          onClick={goHabits}
        >
          <Icon name="back" />
        </button>
        <h1 className="topbar-title">{habit.name}</h1>
        <button
          type="button"
          className="icon-btn"
          aria-label="Opties voor deze gewoonte"
          onClick={() => setDialog('menu')}
        >
          <Icon name="more" />
        </button>
      </header>

      <main className="content">
        <p className="sheet-text notice-small">
          {goalLabel(habit)}
          {pausedNow && ' · gepauzeerd'}
          {habit.archived && ' · gearchiveerd'}
        </p>

        <section className="stat-grid" aria-label="Statistieken">
          <div className="card stat">
            <span className="stat-value">{stats.current}</span>
            <span className="stat-label">Huidige reeks ({unit(stats.current)})</span>
          </div>
          <div className="card stat">
            <span className="stat-value">{stats.longest}</span>
            <span className="stat-label">Langste reeks</span>
          </div>
          <div className="card stat">
            <span className="stat-value">{percentOf(stats.week)}%</span>
            <span className="stat-label">
              Deze week ({stats.week.done}/{stats.week.total})
            </span>
          </div>
          <div className="card stat">
            <span className="stat-value">{percentOf(stats.month)}%</span>
            <span className="stat-label">
              Deze maand ({stats.month.done}/{stats.month.total})
            </span>
          </div>
        </section>

        <section className="card calendar" aria-label="Kalender">
          <div className="calendar-head">
            <button
              type="button"
              className="icon-btn"
              aria-label="Vorige maand"
              onClick={() => shift(-1)}
            >
              <Icon name="back" />
            </button>
            <h2>{monthName.format(new Date(month.year, month.month, 1))}</h2>
            <button
              type="button"
              className="icon-btn"
              aria-label="Volgende maand"
              disabled={atCurrentMonth}
              onClick={() => shift(1)}
            >
              <Icon name="chevronRight" />
            </button>
          </div>
          <div className="calendar-grid" role="grid">
            {WEEKDAYS.map((d) => (
              <span key={d} className="week-label">
                {d}
              </span>
            ))}
            {grid.flat().map((date, i) =>
              date ? (
                <div key={date} className="calendar-cell">
                  <span className="calendar-day">{Number(date.slice(8))}</span>
                  <DayDot
                    habit={habit}
                    date={date}
                    amount={amounts.get(date)}
                    label={date}
                    onTap={() => tap(date)}
                  />
                </div>
              ) : (
                <span key={`e${i}`} />
              ),
            )}
          </div>
          <p className="calendar-legend">
            Tik op een dag om die aan te passen. Grijze dagen tellen niet mee.
          </p>
        </section>
      </main>

      {dialog === 'menu' && (
        <ActionSheet
          title={habit.name}
          onClose={close}
          actions={[
            { label: 'Bewerken', icon: 'edit', keepOpen: true, run: () => setDialog('edit') },
            pausedNow
              ? { label: 'Hervatten', icon: 'reset', run: () => resumeHabit(habit.id) }
              : { label: 'Pauzeren', icon: 'uncheck', run: () => pauseHabit(habit.id) },
            habit.archived
              ? {
                  label: 'Terughalen uit archief',
                  icon: 'upload',
                  run: () => setArchived(habit.id, false),
                }
              : { label: 'Archiveren', icon: 'download', run: () => setArchived(habit.id, true) },
            { label: 'Verwijderen', icon: 'trash', danger: true, run: remove },
          ]}
        />
      )}
      {dialog === 'edit' && <HabitSheet habit={habit} onClose={close} />}
      {dialog && typeof dialog === 'object' && (
        <AmountSheet habit={habit} date={dialog.date} onClose={close} />
      )}
    </div>
  );
}
