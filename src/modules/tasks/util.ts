import {
  addDays,
  capitalize,
  daysBetween,
  relativeDay,
  startOfWeek,
  todayKey,
} from '../../core/lib/dates';
import { collator } from '../../core/lib/util';
import { PRIORITIES, type Task, type TaskPriority } from './types';

export type TaskSort = 'due' | 'priority' | 'newest';

export const SORTS: { value: TaskSort; label: string }[] = [
  { value: 'due', label: 'Deadline' },
  { value: 'priority', label: 'Prioriteit' },
  { value: 'newest', label: 'Nieuwste eerst' },
];

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };

function byDue(a: Task, b: Task): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99');
}

function byPriority(a: Task, b: Task): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const byTitle = (a: Task, b: Task) => collator.compare(a.title, b.title);
  const compare =
    sort === 'due'
      ? (a: Task, b: Task) => byDue(a, b) || byPriority(a, b) || byTitle(a, b)
      : sort === 'priority'
        ? (a: Task, b: Task) => byPriority(a, b) || byDue(a, b) || byTitle(a, b)
        : (a: Task, b: Task) => b.createdAt - a.createdAt;
  return [...tasks].sort(compare);
}

export interface TaskGroup {
  key: string;
  title: string;
  tasks: Task[];
  /** Shown in red (overdue). */
  alert?: boolean;
}

/** Open tasks grouped for the list view: by deadline bucket, by priority, or not at all. */
export function groupTasks(tasks: Task[], sort: TaskSort, today = todayKey()): TaskGroup[] {
  const sorted = sortTasks(tasks, sort);
  if (sort === 'newest') return [{ key: 'all', title: '', tasks: sorted }];
  if (sort === 'priority') {
    return PRIORITIES.slice()
      .reverse()
      .map((p) => ({
        key: p.value,
        title: `Prioriteit ${p.label.toLowerCase()}`,
        tasks: sorted.filter((t) => t.priority === p.value),
      }))
      .filter((g) => g.tasks.length > 0);
  }
  const endOfWeek = addDays(startOfWeek(today), 6);
  const bucket = (task: Task): string => {
    if (!task.dueDate) return 'none';
    if (task.dueDate < today) return 'overdue';
    if (task.dueDate === today) return 'today';
    if (task.dueDate === addDays(today, 1)) return 'tomorrow';
    if (task.dueDate <= endOfWeek) return 'week';
    return 'later';
  };
  const buckets: [string, string][] = [
    ['overdue', 'Te laat'],
    ['today', 'Vandaag'],
    ['tomorrow', 'Morgen'],
    ['week', 'Deze week'],
    ['later', 'Later'],
    ['none', 'Zonder deadline'],
  ];
  return buckets
    .map(([key, title]) => ({
      key,
      title,
      tasks: sorted.filter((t) => bucket(t) === key),
      alert: key === 'overdue',
    }))
    .filter((g) => g.tasks.length > 0);
}

export function isOverdue(task: Task, today = todayKey()): boolean {
  return task.status !== 'done' && task.dueDate !== null && task.dueDate < today;
}

/** "Vandaag 14:00", "Morgen", "Vrijdag", "12 okt." */
export function dueLabel(task: Pick<Task, 'dueDate' | 'dueTime'>, today = todayKey()): string {
  if (!task.dueDate) return '';
  const day = capitalize(relativeDay(task.dueDate, today));
  return task.dueTime ? `${day} ${task.dueTime}` : day;
}

export function daysLate(task: Task, today = todayKey()): number {
  return task.dueDate ? daysBetween(task.dueDate, today) : 0;
}
