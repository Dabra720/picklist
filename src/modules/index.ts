import type { AppModule } from '../core/modules';
import { listsModule } from './lists/module';
import { notesModule } from './notes/module';
import { templatesModule } from './templates/module';

/** All modules, in menu order. The first one is shown for unknown routes. */
export const MODULES: AppModule[] = [listsModule, templatesModule, notesModule];

export function moduleFor(segment: string): AppModule {
  return MODULES.find((module) => segment in module.routes) ?? MODULES[0];
}
