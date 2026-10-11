import { WidgetList } from '../../core/components/WidgetList';
import { showToast } from '../../core/lib/toast';
import { useAppState } from '../../core/store';
import { openTask } from './routes';
import { setTaskStatus, toggleTaskDone } from './store';
import { TaskRow } from './TaskRow';
import { sortTasks } from './util';

/** Dashboard: open tasks, most urgent first. */
export function TasksWidget() {
  const { data } = useAppState();
  const open = sortTasks(
    data.tasks.filter((t) => t.status !== 'done'),
    'due',
  );
  const projects = new Map(data.projects.map((p) => [p.id, p]));
  return (
    <WidgetList
      items={open}
      max={5}
      empty="Geen open taken."
      keyOf={(t) => t.id}
      render={(task) => (
        <TaskRow
          task={task}
          project={task.projectId ? projects.get(task.projectId) : undefined}
          tags={data.tags}
          showProject
          onOpen={() => openTask(task.id)}
          onToggle={() => {
            toggleTaskDone(task.id);
            showToast(`"${task.title}" afgerond.`, {
              label: 'Ongedaan maken',
              run: () => setTaskStatus(task.id, task.status),
            });
          }}
        />
      )}
    />
  );
}
