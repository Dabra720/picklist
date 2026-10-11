import { Icon } from '../../core/components/Icon';
import type { Project, Task } from './types';
import { dueLabel, isOverdue } from './util';

interface Props {
  task: Task;
  project?: Project;
  /** Show the project's name (when not already filtered on one project). */
  showProject: boolean;
  onToggle: () => void;
  onOpen: () => void;
  /** Extra button on the right, e.g. "move" on the board. */
  action?: { label: string; icon: 'more'; run: () => void };
}

/** One task: a round checkbox, the title and a line with deadline, priority, project and subtasks. */
export function TaskRow({ task, project, showProject, onToggle, onOpen, action }: Props) {
  const done = task.status === 'done';
  const subtasksDone = task.subtasks.filter((s) => s.done).length;
  return (
    <div className={`task-row${done ? ' task-done' : ''}`}>
      <label className="task-check">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          aria-label={`${task.title} afgerond`}
        />
        <span className="checkbox checkbox-round" aria-hidden="true">
          <Icon name="check" size={16} />
        </span>
      </label>
      <button type="button" className="task-main" onClick={onOpen}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {task.status === 'doing' && <span className="task-badge">Bezig</span>}
          {task.priority === 'high' && !done && <span className="task-priority">Hoog</span>}
          {task.dueDate && (
            <span className={isOverdue(task) ? 'task-due task-overdue' : 'task-due'}>
              {dueLabel(task)}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span>
              {subtasksDone}/{task.subtasks.length}
            </span>
          )}
          {showProject && project && (
            <span className="task-project">
              <span className="dot" style={{ background: project.color }} />
              {project.name}
            </span>
          )}
        </span>
      </button>
      {action && (
        <button
          type="button"
          className="icon-btn icon-btn-subtle"
          aria-label={action.label}
          onClick={action.run}
        >
          <Icon name={action.icon} size={20} />
        </button>
      )}
    </div>
  );
}
