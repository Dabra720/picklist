import type { AppModule } from '../core/modules';
import { listsModule } from './lists/module';
import { notesModule } from './notes/module';
import { tasksModule } from './tasks/module';
import { templatesModule } from './templates/module';

/** All modules, in menu order. The first one is shown for unknown routes. */
export const MODULES: AppModule[] = [listsModule, templatesModule, tasksModule, notesModule];

export function moduleFor(segment: string): AppModule {
  return MODULES.find((module) => segment in module.routes) ?? MODULES[0];
}
