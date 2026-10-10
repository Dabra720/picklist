import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { ActionSheet } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { fitTextarea, useAutosave } from '../../core/lib/autosave';
import { showToast } from '../../core/lib/toast';
import { byOrder, plainInput } from '../../core/lib/util';
import { useAppState } from '../../core/store';
import { MAX_NAME_LENGTH } from '../../core/types';
import { goTasks } from './routes';
import {
  addSubtask,
  deleteSubtask,
  deleteTask,
  restoreTask,
  setTaskStatus,
  updateSubtask,
  updateTask,
} from './store';
import { MAX_TASK_NOTES, PRIORITIES, STATUSES, type Subtask, type Task } from './types';
import { isOverdue } from './util';

const INBOX = 'inbox';
const dateTime = new Intl.DateTimeFormat('nl', { dateStyle: 'long', timeStyle: 'short' });

function SubtaskRow({ taskId, subtask }: { taskId: string; subtask: Subtask }) {
  const [title, setTitle] = useState(subtask.title);
  return (
    <li className={`subtask${subtask.done ? ' task-done' : ''}`}>
      <label className="task-check">
        <input
          type="checkbox"
          checked={subtask.done}
          aria-label={`${subtask.title} afgerond`}
          onChange={() => updateSubtask(taskId, subtask.id, { done: !subtask.done })}
        />
        <span className="checkbox checkbox-round" aria-hidden="true">
          <Icon name="check" size={16} />
        </span>
      </label>
      <input
        type="text"
        value={title}
        aria-label="Subtaak"
        maxLength={MAX_NAME_LENGTH}
        {...plainInput}
        enterKeyHint="done"
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() =>
          title.trim() ? updateSubtask(taskId, subtask.id, { title }) : setTitle(subtask.title)
        }
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <button
        type="button"
        className="icon-btn icon-btn-subtle"
        aria-label={`Subtaak ${subtask.title} verwijderen`}
        onClick={() => deleteSubtask(taskId, subtask.id)}
      >
        <Icon name="close" size={18} />
      </button>
    </li>
  );
}

/** One task, edited in place: every change is saved right away. */
export function TaskScreen({ task }: { task: Task }) {
  const { data } = useAppState();
  const projects = [...data.projects].sort(byOrder);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [newSubtask, setNewSubtask] = useState('');
  const [menu, setMenu] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const titleSave = useAutosave((value: string) => updateTask(task.id, { title: value }));
  const notesSave = useAutosave((value: string) => updateTask(task.id, { notes: value }));

  useLayoutEffect(() => fitTextarea(notesRef.current), [notes]);

  const remove = () => {
    titleSave.cancel();
    notesSave.cancel();
    const snapshot = { ...task };
    deleteTask(task.id);
    goTasks();
    showToast(`"${task.title}" verwijderd.`, {
      label: 'Ongedaan maken',
      run: () => restoreTask(snapshot),
    });
  };

  const submitSubtask = (event: FormEvent) => {
    event.preventDefault();
    if (addSubtask(task.id, newSubtask)) setNewSubtask('');
  };

  const subtasksDone = task.subtasks.filter((s) => s.done).length;

  return (
    <div className="screen">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="Terug naar taken" onClick={goTasks}>
          <Icon name="back" />
        </button>
        <span className="topbar-title note-date">
          {task.status === 'done' && task.completedAt
            ? `Afgerond ${dateTime.format(task.completedAt)}`
            : 'Taak'}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Opties voor deze taak"
          onClick={() => setMenu(true)}
        >
          <Icon name="more" />
        </button>
      </header>

      <main className="content task-editor">
        <input
          type="text"
          className="note-title"
          value={title}
          aria-label="Titel"
          placeholder="Titel"
          maxLength={MAX_NAME_LENGTH}
          {...plainInput}
          enterKeyHint="done"
          onChange={(event) => {
            setTitle(event.target.value);
            if (event.target.value.trim()) titleSave.schedule(event.target.value);
          }}
          onBlur={() => {
            titleSave.flush();
            if (!title.trim()) setTitle(task.title);
          }}
        />

        <div className="segmented" role="radiogroup" aria-label="Status">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={task.status === s.value}
              className={task.status === s.value ? 'active' : ''}
              onClick={() => setTaskStatus(task.id, s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="field">
          <span id="task-priority">Prioriteit</span>
          <div className="segmented" role="radiogroup" aria-labelledby="task-priority">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={task.priority === p.value}
                className={task.priority === p.value ? 'active' : ''}
                onClick={() => updateTask(task.id, { priority: p.value })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span id="task-due">
            Deadline{isOverdue(task) && <span className="danger-text"> · te laat</span>}
          </span>
          <div className="date-row" role="group" aria-labelledby="task-due">
            <input
              type="date"
              className="date-input"
              aria-label="Datum"
              value={task.dueDate ?? ''}
              onChange={(event) => updateTask(task.id, { dueDate: event.target.value || null })}
            />
            <input
              type="time"
              className="date-input"
              aria-label="Tijd"
              value={task.dueTime ?? ''}
              disabled={!task.dueDate}
              onChange={(event) => updateTask(task.id, { dueTime: event.target.value || null })}
            />
            {task.dueDate && (
              <button
                type="button"
                className="icon-btn icon-btn-subtle"
                aria-label="Deadline wissen"
                onClick={() => updateTask(task.id, { dueDate: null })}
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        </div>

        <label className="field">
          <span>Project</span>
          <select
            className="select"
            value={
              task.projectId && projects.some((p) => p.id === task.projectId)
                ? task.projectId
                : INBOX
            }
            onChange={(event) =>
              updateTask(task.id, {
                projectId: event.target.value === INBOX ? null : event.target.value,
              })
            }
          >
            <option value={INBOX}>Inbox (geen project)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <section className="field" aria-labelledby="task-subtasks">
          <span id="task-subtasks">
            Subtaken{task.subtasks.length > 0 && ` · ${subtasksDone}/${task.subtasks.length}`}
          </span>
          {task.subtasks.length > 0 && (
            <ul className="card subtasks">
              {task.subtasks.map((subtask) => (
                <SubtaskRow key={subtask.id} taskId={task.id} subtask={subtask} />
              ))}
            </ul>
          )}
          <form className="inline-form" onSubmit={submitSubtask}>
            <input
              type="text"
              value={newSubtask}
              placeholder="Subtaak toevoegen"
              aria-label="Nieuwe subtaak"
              maxLength={MAX_NAME_LENGTH}
              {...plainInput}
              enterKeyHint="done"
              onChange={(event) => setNewSubtask(event.target.value)}
            />
            <button
              type="submit"
              className="btn btn-square"
              aria-label="Subtaak toevoegen"
              disabled={!newSubtask.trim()}
            >
              <Icon name="plus" />
            </button>
          </form>
        </section>

        <label className="field">
          <span>Notities</span>
          <textarea
            ref={notesRef}
            className="task-notes"
            value={notes}
            placeholder="Details, links, afspraken…"
            maxLength={MAX_TASK_NOTES}
            onChange={(event) => {
              setNotes(event.target.value);
              notesSave.schedule(event.target.value);
            }}
          />
        </label>
      </main>

      {menu && (
        <ActionSheet
          title={task.title}
          onClose={() => setMenu(false)}
          actions={[{ label: 'Verwijderen', icon: 'trash', danger: true, run: remove }]}
        />
      )}
    </div>
  );
}
