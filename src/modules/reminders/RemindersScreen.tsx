import { useEffect, useState } from 'react';
import { MenuButton } from '../../app/AppMenu';
import { Icon } from '../../core/components/Icon';
import { showToast } from '../../core/lib/toast';
import { useAppState } from '../../core/store';
import { openList } from '../lists/routes';
import { openNote } from '../notes/routes';
import { SearchButton } from '../search/SearchButton';
import { openTask } from '../tasks/routes';
import { setTaskStatus, toggleTaskDone } from '../tasks/store';
import { ReminderSheet } from './ReminderSheet';
import {
  clearCompletedReminders,
  completeReminder,
  reopenReminder,
  restoreReminder,
  restoreReminders,
} from './store';
import type { Reminder, ReminderTarget } from './types';
import { repeatLabel, TARGET_LABEL, targetName, upcoming, whenLabel, type Upcoming } from './util';

const OPEN: Record<ReminderTarget['kind'], (id: string) => void> = {
  list: openList,
  note: openNote,
  task: openTask,
};

/** "Aankomend": open reminders and task deadlines, grouped by when they are due. */
export function RemindersScreen() {
  const { data } = useAppState();
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null);
  const [showDone, setShowDone] = useState(false);
  // Re-group every minute, so "Vandaag 14:00" moves to "Te laat" at 14:00.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const groups = upcoming(data, now);
  const done = data.reminders
    .filter((r) => r.completedAt !== null)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const complete = (reminder: Reminder) => {
    const before = completeReminder(reminder.id);
    if (!before) return;
    showToast(
      reminder.repeat === 'none'
        ? `"${reminder.title}" afgerond.`
        : `"${reminder.title}" afgerond; volgende keer staat klaar.`,
      { label: 'Ongedaan maken', run: () => restoreReminder(before) },
    );
  };

  const row = (item: Upcoming, alert?: boolean) => {
    if (item.kind === 'deadline') {
      const task = item.task;
      return (
        <div className="task-row">
          <label className="task-check">
            <input
              type="checkbox"
              checked={false}
              aria-label={`${task.title} afgerond`}
              onChange={() => {
                toggleTaskDone(task.id);
                showToast(`"${task.title}" afgerond.`, {
                  label: 'Ongedaan maken',
                  run: () => setTaskStatus(task.id, task.status),
                });
              }}
            />
            <span className="checkbox checkbox-round" aria-hidden="true">
              <Icon name="check" size={16} />
            </span>
          </label>
          <button type="button" className="task-main" onClick={() => openTask(task.id)}>
            <span className="task-title">{task.title}</span>
            <span className="task-meta">
              <span className={alert ? 'task-due task-overdue' : 'task-due'}>
                {whenLabel(item)}
              </span>
              <span className="reminder-kind">
                <Icon name="task" size={14} />
                Deadline
              </span>
            </span>
          </button>
        </div>
      );
    }
    const reminder = item.reminder;
    const linked = targetName(data, reminder.target);
    return (
      <div className="task-row">
        <label className="task-check">
          <input
            type="checkbox"
            checked={false}
            aria-label={`${reminder.title} afgerond`}
            onChange={() => complete(reminder)}
          />
          <span className="checkbox checkbox-round" aria-hidden="true">
            <Icon name="check" size={16} />
          </span>
        </label>
        <button type="button" className="task-main" onClick={() => setEditing(reminder)}>
          <span className="task-title">{reminder.title}</span>
          <span className="task-meta">
            <span className={alert ? 'task-due task-overdue' : 'task-due'}>{whenLabel(item)}</span>
            {reminder.repeat !== 'none' && (
              <span className="reminder-kind">
                <Icon name="repeat" size={14} />
                {repeatLabel(reminder.repeat)}
              </span>
            )}
          </span>
        </button>
        {reminder.target && linked && (
          <button
            type="button"
            className="chip reminder-link"
            aria-label={`Open ${TARGET_LABEL[reminder.target.kind].toLowerCase()} ${linked}`}
            onClick={() => OPEN[reminder.target!.kind](reminder.target!.id)}
          >
            {/* Same name as the reminder: say what kind of thing it opens instead. */}
            {linked === reminder.title ? TARGET_LABEL[reminder.target.kind] : linked}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="screen">
      <header className="topbar">
        <MenuButton current="reminders" />
        <h1>Herinneringen</h1>
        <SearchButton />
      </header>

      <main className="content">
        {groups.length === 0 && done.length === 0 ? (
          <div className="empty">
            <div className="empty-mark">
              <Icon name="bell" size={36} />
            </div>
            <h2>Niets aankomend</h2>
            <p>
              Maak een herinnering, ook vanuit een lijst, notitie of taak. Deadlines van taken
              verschijnen hier vanzelf.
            </p>
          </div>
        ) : (
          <>
            <p className="sheet-text notice-small">
              Meldingen verschijnen als de app open is. Wil je ook een melding als de app dicht is?
              Open een herinnering en kies <strong>Zet in agenda</strong>.
            </p>
            {groups.map((group) => (
              <section key={group.key} className="group" aria-label={group.title}>
                <div className="group-head">
                  <h2 className={group.alert ? 'danger-text' : undefined}>{group.title}</h2>
                  <span className="group-count">{group.items.length}</span>
                </div>
                <ul className="card task-list">
                  {group.items.map((item) => (
                    <li key={item.key}>{row(item, group.alert)}</li>
                  ))}
                </ul>
              </section>
            ))}
            {done.length > 0 && (
              <section className="group" aria-label="Afgerond">
                <div className="group-head">
                  <button
                    type="button"
                    className="group-toggle"
                    aria-expanded={showDone}
                    onClick={() => setShowDone(!showDone)}
                  >
                    Afgerond ({done.length})
                  </button>
                  {showDone && (
                    <button
                      type="button"
                      className="btn btn-small btn-danger-ghost"
                      onClick={() => {
                        const removed = clearCompletedReminders();
                        showToast(
                          `${removed.length} afgeronde herinnering${removed.length === 1 ? '' : 'en'} verwijderd.`,
                          {
                            label: 'Ongedaan maken',
                            run: () => restoreReminders(removed),
                          },
                        );
                      }}
                    >
                      Opruimen
                    </button>
                  )}
                </div>
                {showDone && (
                  <ul className="card task-list">
                    {done.map((r) => (
                      <li key={r.id}>
                        <div className="task-row task-done">
                          <label className="task-check">
                            <input
                              type="checkbox"
                              checked
                              aria-label={`${r.title} weer open`}
                              onChange={() => reopenReminder(r.id)}
                            />
                            <span className="checkbox checkbox-round" aria-hidden="true">
                              <Icon name="check" size={16} />
                            </span>
                          </label>
                          <button type="button" className="task-main" onClick={() => setEditing(r)}>
                            <span className="task-title">{r.title}</span>
                            <span className="task-meta">
                              <span>{whenLabel(r)}</span>
                            </span>
                          </button>
                        </div>
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
          onClick={() => setEditing('new')}
        >
          <Icon name="plus" />
          Nieuwe herinnering
        </button>
      </div>

      {editing && (
        <ReminderSheet
          reminder={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
