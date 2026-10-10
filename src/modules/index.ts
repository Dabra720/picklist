import type { AppModule } from '../core/modules';
import { listsModule } from './lists/module';
import { notesModule } from './notes/module';

/** All modules, in menu order. The first one is shown for unknown routes. */
export const MODULES: AppModule[] = [listsModule, notesModule];

export function moduleFor(segment: string): AppModule {
  return MODULES.find((module) => segment in module.routes) ?? MODULES[0];
}
