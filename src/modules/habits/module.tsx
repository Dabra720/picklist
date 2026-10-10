import type { AppModule } from '../../core/modules';
import { HabitsWidget } from './Widget';
import { habitsBackup } from './backup';
import { HabitScreen } from './HabitScreen';
import { HabitsScreen } from './HabitsScreen';

export const habitsModule: AppModule = {
  id: 'habits',
  label: 'Gewoontes',
  icon: 'flame',
  home: 'gewoontes',
  routes: {
    gewoontes: () => <HabitsScreen />,
    gewoonte: (id, data) => {
      const habit = data.habits.find((candidate) => candidate.id === id);
      return habit ? <HabitScreen key={habit.id} habit={habit} /> : null;
    },
  },
  backup: habitsBackup,
  widgets: [{ id: 'habits', title: 'Gewoontes vandaag', more: 'gewoontes', Component: HabitsWidget }],
};
