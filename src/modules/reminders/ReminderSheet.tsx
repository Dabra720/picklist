import { useState, type FormEvent } from 'react';
import { Icon } from '../../core/components/Icon';
import { Sheet } from '../../core/components/Sheet';
import { addDays, todayKey } from '../../core/lib/dates';
import { saveFile } from '../../core/lib/files';
import { showToast } from '../../core/lib/toast';
import { plainInput } from '../../core/lib/util';
import { useAppState } from '../../core/store';
import { MAX_NAME_LENGTH } from '../../core/types';
import { createReminder, deleteReminder, restoreReminder, updateReminder } from './store';
import { REPEATS, type Reminder, type ReminderTarget, type Repeat } from './types';
import { buildIcs, TARGET_LABEL, targetName } from './util';

/** Offers the reminder as a calendar file, so the phone's calendar can ring when the app is closed. */
export async function exportToCalendar(reminder: Reminder, context: string | null) {
  const name = `${reminder.title.replace(/[^\p{L}\p{N} -]/gu, '').trim() || 'herinnering'}.ics`;
  const file = new File([buildIcs(reminder, context)], name, { type: 'text/calendar' });
  try {
    if (await saveFile(file, reminder.title)) {
      showToast('Open het bestand en kies "Voeg toe aan agenda".');
    }
  } catch (error) {
    console.error(error);
    showToast('Agenda-bestand maken is mislukt.');
  }
}

interface Props {
  /** The reminder to edit, or nothing for a new one. */
  reminder?: Reminder;
  /** For a new reminder: what it belongs to, and a title to start with. */
  target?: ReminderTarget | null;
  initialTitle?: string;
  onClose: () => void;
}

/** Create or edit a reminder: title, day, optional time, repeat. */
export function ReminderSheet({ reminder, target = null, initialTitle = '', onClose }: Props) {
  const { data } = useAppState();
  const [title, setTitle] = useState(reminder?.title ?? initialTitle);
  const [date, setDate] = useState(reminder?.date ?? addDays(todayKey(), 1));
  const [time, setTime] = useState(reminder?.time ?? '09:00');
  const [allDay, setAllDay] = useState(reminder ? reminder.time === null : false);
  const [repeat, setRepeat] = useState<Repeat>(reminder?.repeat ?? 'none');
  const link = reminder ? reminder.target : target;
  const linkName = targetName(data, link);
  const valid = title.trim().length > 0 && date !== '' && (allDay || time !== '');

  const fields = () => ({
    title,
    date,
    time: allDay ? null : time,
    repeat,
    target: linkName ? link : null,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    if (reminder) updateReminder(reminder.id, fields());
    else if (createReminder(fields())) showToast('Herinnering gemaakt.');
    onClose();
  };

  const remove = () => {
    if (!reminder) return;
    deleteReminder(reminder.id);
    onClose();
    showToast(`Herinnering "${reminder.title}" verwijderd.`, {
      label: 'Ongedaan maken',
      run: () => restoreReminder(reminder),
    });
  };

  return (
    <Sheet title={reminder ? 'Herinnering' : 'Nieuwe herinnering'} onClose={onClose}>
      <form onSubmit={submit}>
        {link && linkName && (
          <p className="sheet-text">
            Bij {TARGET_LABEL[link.kind].toLowerCase()} <strong>{linkName}</strong>
          </p>
        )}
        <label className="field">
          <span>Waaraan herinneren?</span>
          <input
            type="text"
            value={title}
            placeholder="Bijv. Paspoort verlengen"
            maxLength={MAX_NAME_LENGTH}
            autoFocus={!reminder && !initialTitle}
            {...plainInput}
            enterKeyHint="done"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <div className="field">
          <span id="reminder-when">Wanneer</span>
          <div className="date-row" role="group" aria-labelledby="reminder-when">
            <input
              type="date"
              className="date-input"
              aria-label="Datum"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <input
              type="time"
              className="date-input"
              aria-label="Tijd"
              value={allDay ? '' : time}
              disabled={allDay}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
            />
            Hele dag (geen tijd)
          </label>
        </div>

        <div className="field">
          <span id="reminder-repeat">Herhalen</span>
          <div
            className="segmented segmented-wrap"
            role="radiogroup"
            aria-labelledby="reminder-repeat"
          >
            {REPEATS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={repeat === r.value}
                className={repeat === r.value ? 'active' : ''}
                onClick={() => setRepeat(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={!valid}>
          {reminder ? 'Opslaan' : 'Herinnering maken'}
        </button>
        {reminder && (
          <div className="button-row sheet-actions">
            <button
              type="button"
              className="btn"
              onClick={() => void exportToCalendar({ ...reminder, ...fields() }, linkName)}
            >
              <Icon name="calendar" size={20} />
              Zet in agenda
            </button>
            <button type="button" className="btn btn-danger-ghost" onClick={remove}>
              <Icon name="trash" size={20} />
              Verwijderen
            </button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
