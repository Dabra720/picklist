import type { DateKey } from '../../core/lib/dates';
import type { BaseRecord } from '../../core/types';

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

/** One-off work with a status, unlike a packing list that is checked off again for every trip. */
export interface Task extends BaseRecord {
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Local calendar day, or null without a deadline. */
  dueDate: DateKey | null;
  /** "HH:MM", only together with a dueDate. */
  dueTime: string | null;
  /** null = Inbox. */
  projectId: string | null;
  order: number;
  subtasks: Subtask[];
  completedAt: number | null;
}

export interface Project extends BaseRecord {
  name: string;
  color: string;
  order: number;
}

export const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Te doen' },
  { value: 'doing', label: 'Bezig' },
  { value: 'done', label: 'Afgerond' },
];

export const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Laag' },
  { value: 'normal', label: 'Normaal' },
  { value: 'high', label: 'Hoog' },
];

export const MAX_TASK_NOTES = 20_000;
