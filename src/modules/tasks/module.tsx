import type { AppModule } from '../../core/modules';
import { tasksBackup } from './backup';
import { TaskScreen } from './TaskScreen';
import { TasksScreen } from './TasksScreen';

export const tasksModule: AppModule = {
  id: 'tasks',
  label: 'Taken',
  icon: 'task',
  home: 'taken',
  routes: {
    taken: () => <TasksScreen />,
    taak: (id, data) => {
      const task = data.tasks.find((candidate) => candidate.id === id);
      return task ? <TaskScreen key={task.id} task={task} /> : null;
    },
  },
  backup: tasksBackup,
};
