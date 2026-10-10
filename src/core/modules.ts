import type { ReactNode } from 'react';
import type { IconName } from './components/Icon';
import type { Route } from './router';
import type { LoadHook } from './store';
import type { AppData } from './types';

/**
 * Everything the app shell needs to know about a module. A new module adds one of these to
 * src/modules/index.ts (plus its stores in core/migrations.ts) and touches nothing else.
 */
export interface AppModule {
  id: string;
  /** Name in the menu. */
  label: string;
  icon: IconName;
  /** Route segment of the module's main screen; '' is the start screen. */
  home: string;
  /**
   * Screens per route segment. A screen returns null when what the route points at no longer
   * exists; the app then goes to the module's main screen.
   */
  routes: Record<string, (param: string | undefined, data: AppData) => ReactNode | null>;
  /** Called when the user leaves one of this module's routes. */
  onLeave?: (route: Route) => void;
  /** Tidy-up steps for this module's data when the app starts. */
  loadHooks?: LoadHook[];
}
