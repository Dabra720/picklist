import { useState } from 'react';
import { Icon } from '../../core/components/Icon';
import { WidgetList } from '../../core/components/WidgetList';
import { showToast } from '../../core/lib/toast';
import { useAppState } from '../../core/store';
import { openTask } from '../tasks/routes';
import { setTaskStatus, toggleTaskDone } from '../tasks/store';
import { ReminderSheet } from './ReminderSheet';
import { completeReminder, restoreReminder } from './store';
import type { Reminder } from './types';
import { upcoming, whenLabel, type Upcoming } from './util';

/** Dashboard: what is due today or overdue — reminders and task deadlines. */
export function TodayWidget() {
  const { data } = useAppState();
  const [editing, setEditing] = useState<Reminder | null>(null);
  const groups = upcoming(data).filter((g) => g.key === 'overdue' || g.key === 'today');
  const items = groups.flatMap((g) => g.items.map((item) => ({ item, late: g.key === 'overdue' })));

  const done = ({ item }: { item: Upcoming }) => {
    if (item.kind === 'deadline') {
      toggleTaskDone(item.task.id);
      showToast(`"${item.task.title}" afgerond.`, {
        label: 'Ongedaan maken',
        run: () => setTaskStatus(item.task.id, item.task.status),
      });
    } else {
      const before = completeReminder(item.reminder.id);
      if (before)
        showToast(`"${item.reminder.title}" afgerond.`, {
          label: 'Ongedaan maken',
          run: () => restoreReminder(before),
        });
    }
  };

  return (
    <>
      <WidgetList
        items={items}
        max={6}
        empty="Niets meer voor vandaag."
        keyOf={({ item }) => item.key}
        render={(entry) => {
          const title =
            entry.item.kind === 'deadline' ? entry.item.task.title : entry.item.reminder.title;
          return (
            <div className="task-row">
              <label className="task-check">
                <input
                  type="checkbox"
                  checked={false}
                  aria-label={`${title} afgerond`}
                  onChange={() => done(entry)}
                />
                <span className="checkbox checkbox-round" aria-hidden="true">
                  <Icon name="check" size={16} />
                </span>
              </label>
              <button
                type="button"
                className="task-main"
                onClick={() =>
                  entry.item.kind === 'deadline'
                    ? openTask(entry.item.task.id)
                    : setEditing(entry.item.reminder)
                }
              >
                <span className="task-title">{title}</span>
                <span className="task-meta">
                  <span className={entry.late ? 'task-due task-overdue' : 'task-due'}>
                    {whenLabel(entry.item)}
                  </span>
                  <span className="reminder-kind">
                    <Icon name={entry.item.kind === 'deadline' ? 'task' : 'bell'} size={14} />
                    {entry.item.kind === 'deadline' ? 'Deadline' : 'Herinnering'}
                  </span>
                </span>
              </button>
            </div>
          );
        }}
      />
      {editing && <ReminderSheet reminder={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
