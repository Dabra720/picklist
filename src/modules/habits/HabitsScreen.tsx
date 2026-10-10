import { useState, type CSSProperties } from 'react';
import { MenuButton } from '../../app/AppMenu';
import { Icon } from '../../core/components/Icon';
import { addDays, startOfWeek, todayKey, type DateKey } from '../../core/lib/dates';
import { byOrder } from '../../core/lib/util';
import { useAppState } from '../../core/store';
import { SearchButton } from '../search/SearchButton';
import { AmountSheet } from './AmountSheet';
import { DayDot } from './DayDot';
import { HabitSheet } from './HabitSheet';
import { openHabit } from './routes';
import { addAmount, resumeHabit, toggleDay } from './store';
import { WEEKDAYS, type Habit } from './types';
import { amountsByDate, goalLabel, habitStats, isDone, isPausedNow } from './util';

/** All habits with this week's days, today's check and the current streak. */
export function HabitsScreen() {
  const { data } = useAppState();
  const [creating, setCreating] = useState(false);
  const [amountFor, setAmountFor] = useState<{ habit: Habit; date: DateKey } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const today = todayKey();
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i));

  const habits = [...data.habits].sort(byOrder);
  const active = habits.filter((h) => !h.archived && !isPausedNow(h, today));
  const paused = habits.filter((h) => !h.archived && isPausedNow(h, today));
  const archived = habits.filter((h) => h.archived);

  const tap = (habit: Habit, date: DateKey) =>
    habit.target ? setAmountFor({ habit, date }) : toggleDay(habit, date);

  const card = (habit: Habit) => {
    const amounts = amountsByDate(data.habitChecks, habit.id);
    const stats = habitStats(habit, data.habitChecks, today);
    const todayAmount = amounts.get(today) ?? 0;
    const pausedNow = isPausedNow(habit, today);
    return (
      <li
        key={habit.id}
        className="card habit-card"
        style={{ '--habit': habit.color } as CSSProperties}
      >
        <div className="habit-head">
          <button type="button" className="habit-name" onClick={() => openHabit(habit.id)}>
            <span className="list-card-name">{habit.name}</span>
            <span className="task-meta">
              <span>{goalLabel(habit)}</span>
              {stats.current > 0 && (
                <span className="habit-streak">
                  Reeks {stats.current}{' '}
                  {stats.current === 1 ? stats.unit.replace(/en$/, '') : stats.unit}
                </span>
              )}
            </span>
          </button>
          {pausedNow ? (
            <button type="button" className="btn btn-small" onClick={() => resumeHabit(habit.id)}>
              Hervatten
            </button>
          ) : habit.target ? (
            <div className="habit-amount">
              <span>
                {todayAmount}/{habit.target.amount}
              </span>
              <button
                type="button"
                className={`btn btn-square habit-plus${isDone(habit, todayAmount) ? ' done' : ''}`}
                aria-label={`${habit.name}: één ${habit.target.unit || 'keer'} erbij`}
                onClick={() => addAmount(habit, today, 1)}
              >
                <Icon name="plus" />
              </button>
            </div>
          ) : null}
        </div>
        {!pausedNow && (
          <div className="week-strip" role="group" aria-label={`${habit.name} deze week`}>
            {week.map((date, i) => (
              <div key={date} className="week-day">
                <span className={date === today ? 'week-label today' : 'week-label'}>
                  {WEEKDAYS[i]}
                </span>
                <DayDot
                  habit={habit}
                  date={date}
                  amount={amounts.get(date)}
                  label={`${habit.name} ${WEEKDAYS[i]}`}
                  onTap={() => tap(habit, date)}
                />
              </div>
            ))}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="screen">
      <header className="topbar">
        <MenuButton current="habits" />
        <h1>Gewoontes</h1>
        <SearchButton />
      </header>

      <main className="content">
        {habits.length === 0 ? (
          <div className="empty">
            <div className="empty-mark">
              <Icon name="flame" size={36} />
            </div>
            <h2>Nog geen gewoontes</h2>
            <p>
              Houd bij wat je regelmatig wilt doen, zoals lezen, sporten of water drinken, en bouw
              een reeks op.
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && <ul className="card-list">{active.map(card)}</ul>}
            {paused.length > 0 && (
              <section className="template-group" aria-label="Gepauzeerd">
                <h2 className="template-group-title">Gepauzeerd</h2>
                <ul className="card-list">{paused.map(card)}</ul>
              </section>
            )}
            {archived.length > 0 && (
              <section className="group" aria-label="Gearchiveerd">
                <button
                  type="button"
                  className="group-toggle"
                  aria-expanded={showArchived}
                  onClick={() => setShowArchived(!showArchived)}
                >
                  Gearchiveerd ({archived.length})
                </button>
                {showArchived && (
                  <ul className="card task-list">
                    {archived.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          className="search-result"
                          onClick={() => openHabit(h.id)}
                        >
                          <span className="dot" style={{ background: h.color }} />
                          <span className="search-result-text">
                            <span className="task-title">{h.name}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <div className="bottom-bar">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setCreating(true)}
        >
          <Icon name="plus" />
          Nieuwe gewoonte
        </button>
      </div>

      {creating && <HabitSheet onClose={() => setCreating(false)} />}
      {amountFor && (
        <AmountSheet
          habit={amountFor.habit}
          date={amountFor.date}
          onClose={() => setAmountFor(null)}
        />
      )}
    </div>
  );
}
