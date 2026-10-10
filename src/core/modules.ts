import type { ReactNode } from 'react';
import type { IconName } from './components/Icon';
import type { DataStore } from './db';
import type { Route } from './router';
import type { LoadHook } from './store';
import type { AppData } from './types';

/** What one module stores in a backup file and how it reads it back. */
export interface ModuleBackup {
  /** Version of this module's part of the backup; raise it when that part changes. */
  version: number;
  /** The stores (AppData arrays) this module owns. */
  stores: DataStore[];
  /**
   * Reads this module's part of a backup (of the given version) into clean records. Unusable
   * records are skipped and reported in `warnings`; a part that cannot be read at all throws.
   */
  parse: (
    section: Record<string, unknown>,
    version: number,
  ) => {
    data: Partial<AppData>;
    warnings: string[];
  };
  /** Restores consistency (references between records) after records were merged. */
  repair?: (data: AppData) => AppData;
  /** Short description of the contents, e.g. "3 lijsten, 40 items". */
  describe: (data: Partial<AppData>) => string;
}

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
  /** How this module takes part in backups. Key in the backup file = the module id. */
  backup?: ModuleBackup;
}
