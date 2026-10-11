import type { AppModule } from '../../core/modules';
import { remindersBackup } from './backup';
import { RemindersScreen } from './RemindersScreen';
import { ReminderWatcher } from './Watcher';

export const remindersModule: AppModule = {
  id: 'reminders',
  label: 'Herinneringen',
  icon: 'bell',
  home: 'herinneringen',
  routes: {
    herinneringen: () => <RemindersScreen />,
  },
  Background: ReminderWatcher,
  backup: remindersBackup,
};
