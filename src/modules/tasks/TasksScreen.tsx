import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { MenuButton } from '../../app/AppMenu';
import { ActionSheet } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { showToast } from '../../core/lib/toast';
import { byOrder, plainInput } from '../../core/lib/util';
import { getSetting, setSetting, useAppState } from '../../core/store';
import { MAX_NAME_LENGTH } from '../../core/types';
import { LabelSheet, type LabelActions, type LabelTexts } from '../lists/LabelSheet';
import { openTask } from './routes';
import {
  clearCompleted,
  createProject,
  createTask,
  deleteProject,
  restoreTasks,
  setTaskStatus,
  toggleTaskDone,
  updateProject,
} from './store';
import { TaskRow } from './TaskRow';
import { STATUSES, type Task, type TaskStatus } from './types';
import { groupTasks, sortTasks, SORTS, type TaskSort } from './util';

type View = 'list' | 'board';
/** 'all', 'inbox' or a project id. */
type ProjectFilter = string;

const PROJECT_TEXTS: LabelTexts = {
  title: 'Projecten',
  intro: 'Met projecten groepeer je taken, bijvoorbeeld Verbouwing, Werk of Vakantie.',
  one: 'Project',
  newPlaceholder: 'Nieuw project',
  deleteTitle: 'Project verwijderen?',
  deleteMessage: (name) => `De taken in "${name}" blijven bewaard en gaan naar Inbox.`,
};

const projectActions: LabelActions = {
  create: createProject,
  update: updateProject,
  remove: deleteProject,
};

function stored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const value = getSetting<string>(key);
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function TasksScreen() {
  const { data } = useAppState();
  const [view, setViewState] = useState<View>(() =>
    stored('tasks.view', ['list', 'board'], 'list'),
  );
  const [sort, setSortState] = useState<TaskSort>(() =>
    stored(
      'tasks.sort',
      SORTS.map((s) => s.value),
      'due',
    ),
  );
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [column, setColumn] = useState<TaskStatus>('todo');
  const [showDone, setShowDone] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dialog, setDialog] = useState<{ kind: 'projects' } | { kind: 'move'; task: Task } | null>(
    null,
  );
  const close = () => setDialog(null);

  const setView = (next: View) => {
    setViewState(next);
    setSetting('tasks.view', next);
  };
  const setSort = (next: TaskSort) => {
    setSortState(next);
    setSetting('tasks.sort', next);
  };

  const projects = useMemo(() => [...data.projects].sort(byOrder), [data.projects]);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const activeFilter =
    filter === 'all' || filter === 'inbox' || projectById.has(filter) ? filter : 'all';

  const visible = useMemo(
    () =>
      data.tasks.filter((t) =>
        activeFilter === 'all'
          ? true
          : activeFilter === 'inbox'
            ? t.projectId === null || !projectById.has(t.projectId)
            : t.projectId === activeFilter,
      ),
    [data.tasks, activeFilter, projectById],
  );
  const open = visible.filter((t) => t.status !== 'done');
  const done = visible
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const groups = groupTasks(open, sort);
  const showProject = activeFilter === 'all';
  const taskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of data.tasks)
      if (t.projectId) counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1);
    return counts;
  }, [data.tasks]);

  const add = (event: FormEvent) => {
    event.preventDefault();
    const id = createTask(newTitle, {
      projectId: activeFilter === 'all' || activeFilter === 'inbox' ? null : activeFilter,
      status: view === 'board' ? column : 'todo',
    });
    if (id) setNewTitle('');
  };

  const toggle = (task: Task) => {
    toggleTaskDone(task.id);
    if (task.status !== 'done') {
      showToast(`"${task.title}" afgerond.`, {
        label: 'Ongedaan maken',
        run: () => setTaskStatus(task.id, task.status),
      });
    }
  };

  const clearDone = () => {
    const removed = clearCompleted(
      activeFilter === 'all' ? undefined : activeFilter === 'inbox' ? null : activeFilter,
    );
    if (removed.length > 0) {
      showToast(
        `${removed.length} afgeronde ${removed.length === 1 ? 'taak' : 'taken'} verwijderd.`,
        {
          label: 'Ongedaan maken',
          run: () => restoreTasks(removed),
        },
      );
    }
  };

  const row = (task: Task, move = false) => (
    <TaskRow
      task={task}
      project={task.projectId ? projectById.get(task.projectId) : undefined}
      showProject={showProject}
      onToggle={() => toggle(task)}
      onOpen={() => openTask(task.id)}
      action={
        move
          ? {
              label: `${task.title} verplaatsen`,
              icon: 'more',
              run: () => setDialog({ kind: 'move', task }),
            }
          : undefined
      }
    />
  );

  // Desktop: drag cards between board columns.
  const onDragStart = (task: Task) => (event: DragEvent) => {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  };
  const onDrop = (status: TaskStatus) => (event: DragEvent) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    if (id) setTaskStatus(id, status);
  };

  return (
    <div className="screen screen-wide">
      <header className="topbar">
        <MenuButton current="tasks" />
        <h1>Taken</h1>
        <div className="segmented segmented-icons" role="radiogroup" aria-label="Weergave">
          {(
            [
              ['list', 'list', 'Lijst'],
              ['board', 'board', 'Bord'],
            ] as const
          ).map(([value, icon, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={view === value}
              aria-label={label}
              className={view === value ? 'active' : ''}
              onClick={() => setView(value)}
            >
              <Icon name={icon} size={20} />
            </button>
          ))}
        </div>
      </header>

      <main className="content">
        <div className="chips" role="group" aria-label="Filter op project">
          {[
            { id: 'all', name: 'Alles', color: '' },
            { id: 'inbox', name: 'Inbox', color: '' },
            ...projects,
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={activeFilter === p.id}
              className={`chip${activeFilter === p.id ? ' chip-active' : ''}`}
              onClick={() => setFilter(p.id)}
            >
              {p.color && <span className="dot" style={{ background: p.color }} />}
              {p.name}
            </button>
          ))}
          <button
            type="button"
            className="chip chip-action"
            onClick={() => setDialog({ kind: 'projects' })}
          >
            <Icon name="folder" size={16} />
            {projects.length > 0 ? 'Projecten beheren' : 'Project toevoegen'}
          </button>
        </div>

        {view === 'list' ? (
          <>
            {open.length > 0 && (
              <div className="toolbar">
                <select
                  className="select"
                  aria-label="Sortering"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as TaskSort)}
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {open.length === 0 && done.length === 0 ? (
              <div className="empty empty-compact">
                <div className="empty-mark">
                  <Icon name="task" size={36} />
                </div>
                <h2>Geen taken</h2>
                <p>
                  Typ hieronder wat je moet doen. Open een taak voor deadline, prioriteit en
                  subtaken.
                </p>
              </div>
            ) : open.length === 0 ? (
              <div className="empty empty-compact">
                <h2>Alles gedaan</h2>
                <p>Er staan geen open taken meer.</p>
              </div>
            ) : (
              groups.map((group) => (
                <section key={group.key} className="group" aria-label={group.title || 'Taken'}>
                  {group.title && (
                    <div className="group-head">
                      <h2 className={group.alert ? 'danger-text' : undefined}>{group.title}</h2>
                      <span className="group-count">{group.tasks.length}</span>
                    </div>
                  )}
                  <ul className="card task-list">
                    {group.tasks.map((task) => (
                      <li key={task.id}>{row(task)}</li>
                    ))}
                  </ul>
                </section>
              ))
            )}
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
                      onClick={clearDone}
                    >
                      Opruimen
                    </button>
                  )}
                </div>
                {showDone && (
                  <ul className="card task-list">
                    {done.map((task) => (
                      <li key={task.id}>{row(task)}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        ) : (
          <>
            <div className="segmented board-tabs" role="tablist" aria-label="Kolom">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="tab"
                  aria-selected={column === s.value}
                  className={column === s.value ? 'active' : ''}
                  onClick={() => setColumn(s.value)}
                >
                  {s.label} {visible.filter((t) => t.status === s.value).length}
                </button>
              ))}
            </div>
            <div className="board">
              {STATUSES.map((s) => {
                const tasks =
                  s.value === 'done'
                    ? visible
                        .filter((t) => t.status === 'done')
                        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
                    : sortTasks(
                        visible.filter((t) => t.status === s.value),
                        'due',
                      );
                return (
                  <section
                    key={s.value}
                    className={`board-column${column === s.value ? ' active' : ''}`}
                    aria-label={s.label}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={onDrop(s.value)}
                  >
                    <h2 className="board-title">
                      {s.label} <span className="group-count">{tasks.length}</span>
                    </h2>
                    {tasks.length === 0 ? (
                      <p className="group-empty">Geen taken.</p>
                    ) : (
                      <ul className="board-cards">
                        {tasks.map((task) => (
                          <li
                            key={task.id}
                            className="card"
                            draggable
                            onDragStart={onDragStart(task)}
                          >
                            {row(task, true)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>

      <form className="bottom-bar add-bar" onSubmit={add}>
        <input
          type="text"
          value={newTitle}
          placeholder={
            view === 'board'
              ? `Taak toevoegen aan ${STATUSES.find((s) => s.value === column)!.label}`
              : 'Taak toevoegen'
          }
          aria-label="Nieuwe taak"
          maxLength={MAX_NAME_LENGTH}
          {...plainInput}
          enterKeyHint="done"
          onChange={(event) => setNewTitle(event.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary btn-square"
          aria-label="Taak toevoegen"
          disabled={!newTitle.trim()}
        >
          <Icon name="plus" />
        </button>
      </form>

      {dialog?.kind === 'projects' && (
        <LabelSheet
          labels={projects}
          itemCounts={taskCounts}
          actions={projectActions}
          texts={PROJECT_TEXTS}
          onClose={close}
        />
      )}
      {dialog?.kind === 'move' && (
        <ActionSheet
          title={`Verplaats naar`}
          onClose={close}
          actions={STATUSES.map((s) => ({
            label: s.label,
            icon: s.value === 'done' ? 'check' : s.value === 'doing' ? 'board' : 'task',
            disabled: dialog.task.status === s.value,
            run: () => setTaskStatus(dialog.task.id, s.value),
          }))}
        />
      )}
    </div>
  );
}
