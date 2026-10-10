import { useState } from 'react';
import { Icon } from '../../core/components/Icon';
import { useAppState } from '../../core/store';
import { ReminderSheet } from './ReminderSheet';
import type { Reminder, ReminderTarget } from './types';
import { whenLabel } from './util';

/** The reminders of one list, note or task, and a button to add one; for detail screens. */
export function ReminderField({ target, title }: { target: ReminderTarget; title: string }) {
  const { data } = useAppState();
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null);
  const mine = data.reminders
    .filter(
      (r) => r.completedAt === null && r.target?.kind === target.kind && r.target.id === target.id,
    )
    .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));

  return (
    <>
      <div className="reminder-field">
        {mine.map((r) => (
          <button
            key={r.id}
            type="button"
            className="chip reminder-chip"
            onClick={() => setEditing(r)}
          >
            <Icon name="bell" size={16} />
            {whenLabel(r)}
          </button>
        ))}
        <button type="button" className="chip chip-action" onClick={() => setEditing('new')}>
          <Icon name="bell" size={16} />
          {mine.length > 0 ? 'Nog een' : 'Herinnering'}
        </button>
      </div>
      {editing && (
        <ReminderSheet
          reminder={editing === 'new' ? undefined : editing}
          target={target}
          initialTitle={title}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
