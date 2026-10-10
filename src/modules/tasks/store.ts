import { cleanName, nextOrder, uid } from '../../core/lib/util';
import { commit, getData } from '../../core/store';
import { LABEL_COLORS } from '../lists/types';
import { MAX_TASK_NOTES, type Project, type Subtask, type Task, type TaskStatus } from './types';

// ---------- Tasks ----------

function saveTask(next: Task) {
  const data = getData();
  const exists = data.tasks.some((t) => t.id === next.id);
  commit(
    {
      ...data,
      tasks: exists ? data.tasks.map((t) => (t.id === next.id ? next : t)) : [...data.tasks, next],
    },
    [{ store: 'tasks', put: [next] }],
  );
}

/** Changes one task; `change` returns the new task, or null for no change. */
function changeTask(id: string, change: (task: Task) => Task | null) {
  const current = getData().tasks.find((t) => t.id === id);
  if (!current) return;
  const next = change(current);
  if (next) saveTask({ ...next, updatedAt: Date.now() });
}

export function createTask(
  title: string,
  fields: Partial<Pick<Task, 'projectId' | 'status' | 'dueDate' | 'priority'>> = {},
): string | null {
  const clean = cleanName(title);
  if (!clean) return null;
  const now = Date.now();
  const status = fields.status ?? 'todo';
  const task: Task = {
    id: uid(),
    title: clean,
    notes: '',
    status,
    priority: fields.priority ?? 'normal',
    dueDate: fields.dueDate ?? null,
    dueTime: null,
    projectId: fields.projectId ?? null,
    order: nextOrder(getData().tasks),
    subtasks: [],
    completedAt: status === 'done' ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  saveTask(task);
  return task.id;
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'notes' | 'priority' | 'dueDate' | 'dueTime' | 'projectId'>
>;

export function updateTask(id: string, patch: TaskPatch) {
  changeTask(id, (task) => {
    const next = { ...task, ...patch };
    if (patch.title !== undefined) {
      const clean = cleanName(patch.title);
      if (!clean) return null;
      next.title = clean;
    }
    if (patch.notes !== undefined) next.notes = patch.notes.slice(0, MAX_TASK_NOTES);
    // A time only makes sense with a date.
    if (next.dueDate === null) next.dueTime = null;
    const changed = (Object.keys(patch) as (keyof TaskPatch)[]).some(
      (key) => next[key] !== task[key],
    );
    return changed || next.dueTime !== task.dueTime ? next : null;
  });
}

export function setTaskStatus(id: string, status: TaskStatus) {
  changeTask(id, (task) =>
    task.status === status
      ? null
      : { ...task, status, completedAt: status === 'done' ? Date.now() : null },
  );
}

/** The round checkbox in lists: done ↔ to do. */
export function toggleTaskDone(id: string) {
  const task = getData().tasks.find((t) => t.id === id);
  if (task) setTaskStatus(id, task.status === 'done' ? 'todo' : 'done');
}

export function deleteTask(id: string) {
  const data = getData();
  commit({ ...data, tasks: data.tasks.filter((t) => t.id !== id) }, [
    { store: 'tasks', remove: [id] },
  ]);
}

/** Puts back a task exactly as it was (used to undo a delete). */
export function restoreTask(task: Task) {
  const data = getData();
  if (data.tasks.some((t) => t.id === task.id)) return;
  const projectExists = data.projects.some((p) => p.id === task.projectId);
  saveTask(projectExists ? task : { ...task, projectId: null });
}

/** Removes completed tasks (optionally only those of one project). */
export function clearCompleted(projectId?: string | null): Task[] {
  const data = getData();
  const removed = data.tasks.filter(
    (t) => t.status === 'done' && (projectId === undefined || t.projectId === projectId),
  );
  if (removed.length === 0) return [];
  const ids = new Set(removed.map((t) => t.id));
  commit({ ...data, tasks: data.tasks.filter((t) => !ids.has(t.id)) }, [
    { store: 'tasks', remove: [...ids] },
  ]);
  return removed;
}

export function restoreTasks(tasks: Task[]) {
  const data = getData();
  const existing = new Set(data.tasks.map((t) => t.id));
  const projects = new Set(data.projects.map((p) => p.id));
  const restored = tasks
    .filter((t) => !existing.has(t.id))
    .map((t) =>
      t.projectId === null || projects.has(t.projectId) ? t : { ...t, projectId: null },
    );
  if (restored.length === 0) return;
  commit({ ...data, tasks: [...data.tasks, ...restored] }, [{ store: 'tasks', put: restored }]);
}

// ---------- Subtasks ----------

export function addSubtask(taskId: string, title: string): boolean {
  const clean = cleanName(title);
  if (!clean) return false;
  changeTask(taskId, (task) => ({
    ...task,
    subtasks: [...task.subtasks, { id: uid(), title: clean, done: false }],
  }));
  return true;
}

export function updateSubtask(
  taskId: string,
  subtaskId: string,
  patch: Partial<Omit<Subtask, 'id'>>,
) {
  const title = patch.title !== undefined ? cleanName(patch.title) : undefined;
  if (title === '') return;
  changeTask(taskId, (task) => ({
    ...task,
    subtasks: task.subtasks.map((s) =>
      s.id === subtaskId
        ? {
            ...s,
            ...(title ? { title } : {}),
            ...(patch.done !== undefined ? { done: patch.done } : {}),
          }
        : s,
    ),
  }));
}

export function deleteSubtask(taskId: string, subtaskId: string) {
  changeTask(taskId, (task) => ({
    ...task,
    subtasks: task.subtasks.filter((s) => s.id !== subtaskId),
  }));
}

// ---------- Projects ----------

export function createProject(name: string): string | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const data = getData();
  const now = Date.now();
  const project: Project = {
    id: uid(),
    name: clean,
    color: LABEL_COLORS[data.projects.length % LABEL_COLORS.length],
    order: nextOrder(data.projects),
    createdAt: now,
    updatedAt: now,
  };
  commit({ ...data, projects: [...data.projects, project] }, [
    { store: 'projects', put: [project] },
  ]);
  return project.id;
}

export function updateProject(id: string, patch: { name?: string; color?: string }) {
  const data = getData();
  const current = data.projects.find((p) => p.id === id);
  if (!current) return;
  const name = patch.name !== undefined ? cleanName(patch.name) : current.name;
  if (!name) return;
  const updated = { ...current, name, color: patch.color ?? current.color, updatedAt: Date.now() };
  commit({ ...data, projects: data.projects.map((p) => (p.id === id ? updated : p)) }, [
    { store: 'projects', put: [updated] },
  ]);
}

/** Removes a project; its tasks stay and move to the Inbox. */
export function deleteProject(id: string) {
  const data = getData();
  const now = Date.now();
  const changed: Task[] = [];
  const tasks = data.tasks.map((t) => {
    if (t.projectId !== id) return t;
    const updated = { ...t, projectId: null, updatedAt: now };
    changed.push(updated);
    return updated;
  });
  commit({ ...data, tasks, projects: data.projects.filter((p) => p.id !== id) }, [
    { store: 'projects', remove: [id] },
    { store: 'tasks', put: changed },
  ]);
}
