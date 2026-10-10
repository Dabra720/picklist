import type { AppModule } from '../core/modules';
import { dashboardModule } from './dashboard/module';
import { listsModule } from './lists/module';
import { habitsModule } from './habits/module';
import { notesModule } from './notes/module';
import { remindersModule } from './reminders/module';
import { searchModule } from './search/module';
import { tasksModule } from './tasks/module';
import { templatesModule } from './templates/module';

/** All modules, in menu order. The first one (the start screen) is shown for unknown routes. */
export const MODULES: AppModule[] = [
  dashboardModule,
  listsModule,
  templatesModule,
  tasksModule,
  notesModule,
  remindersModule,
  habitsModule,
  searchModule,
];

export function moduleFor(segment: string): AppModule {
  return MODULES.find((module) => segment in module.routes) ?? MODULES[0];
}
