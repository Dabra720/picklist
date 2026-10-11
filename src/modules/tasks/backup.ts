import { isDateKey, isTime } from '../../core/lib/dates';
import { cleanName } from '../../core/lib/util';
import {
  count,
  IdSet,
  isRecord,
  isValidId,
  readArray,
  readOrder,
  readTimes,
  Skipped,
} from '../../core/lib/validate';
import type { ModuleBackup } from '../../core/modules';
import type { AppData } from '../../core/types';
import { LABEL_COLORS } from '../lists/types';
import {
  MAX_TASK_NOTES,
  PRIORITIES,
  STATUSES,
  type Project,
  type Subtask,
  type Task,
} from './types';

function readSubtasks(value: unknown): Subtask[] {
  if (!Array.isArray(value)) return [];
  const ids = new IdSet();
  return value.flatMap((record) => {
    if (!isRecord(record)) return [];
    const title = typeof record.title === 'string' ? cleanName(record.title) : '';
    if (!title || !ids.accept(record.id)) return [];
    return [{ id: record.id, title, done: record.done === true }];
  });
}

/** Tasks and projects. Version 1 = the records as stored in database version 5. */
export const tasksBackup: ModuleBackup = {
  version: 1,
  stores: ['tasks', 'projects'],

  parse(section) {
    const skipped = new Skipped();
    const now = Date.now();

    const projectIds = new IdSet();
    const projects: Project[] = [];
    readArray(section, 'projects').forEach((record, index) => {
      if (!isRecord(record)) return skipped.add('project', 'projecten', 'ongeldige gegevens');
      const name = typeof record.name === 'string' ? cleanName(record.name) : '';
      if (!name) return skipped.add('project', 'projecten', 'zonder naam');
      if (!projectIds.accept(record.id))
        return skipped.add('project', 'projecten', 'ongeldige of dubbele id');
      projects.push({
        id: record.id,
        name,
        color:
          typeof record.color === 'string' && /^#[0-9a-f]{6}$/i.test(record.color)
            ? record.color
            : LABEL_COLORS[index % LABEL_COLORS.length],
        order: readOrder(record, index),
        ...readTimes(record, now),
      });
    });

    const taskIds = new IdSet();
    const tasks: Task[] = [];
    readArray(section, 'tasks').forEach((record, index) => {
      if (!isRecord(record)) return skipped.add('taak', 'taken', 'ongeldige gegevens');
      const title = typeof record.title === 'string' ? cleanName(record.title) : '';
      if (!title) return skipped.add('taak', 'taken', 'zonder titel');
      if (!taskIds.accept(record.id))
        return skipped.add('taak', 'taken', 'ongeldige of dubbele id');
      const status = STATUSES.some((s) => s.value === record.status)
        ? (record.status as Task['status'])
        : 'todo';
      const dueDate = isDateKey(record.dueDate) ? record.dueDate : null;
      tasks.push({
        id: record.id,
        title,
        notes: typeof record.notes === 'string' ? record.notes.slice(0, MAX_TASK_NOTES) : '',
        status,
        priority: PRIORITIES.some((p) => p.value === record.priority)
          ? (record.priority as Task['priority'])
          : 'normal',
        dueDate,
        dueTime: dueDate && isTime(record.dueTime) ? record.dueTime : null,
        projectId:
          isValidId(record.projectId) && projectIds.has(record.projectId) ? record.projectId : null,
        order: readOrder(record, index),
        subtasks: readSubtasks(record.subtasks),
        completedAt:
          status === 'done'
            ? typeof record.completedAt === 'number'
              ? record.completedAt
              : now
            : null,
        ...readTimes(record, now),
      });
    });

    return { data: { tasks, projects }, warnings: skipped.messages() };
  },

  repair(data: AppData): AppData {
    const projectIds = new Set(data.projects.map((p) => p.id));
    return {
      ...data,
      tasks: data.tasks.map((t) =>
        t.projectId !== null && !projectIds.has(t.projectId) ? { ...t, projectId: null } : t,
      ),
    };
  },

  describe(data) {
    const tasks = data.tasks ?? [];
    const open = tasks.filter((t) => t.status !== 'done').length;
    return `${count(tasks.length, 'taak', 'taken')} (${open} open)`;
  },
};
