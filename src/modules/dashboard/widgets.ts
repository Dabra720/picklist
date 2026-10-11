import { setSetting, useSetting } from '../../core/store';
import type { DashboardWidget } from '../../core/modules';
import { MODULES } from '..';

const SETTING = 'dashboard.widgets';

interface Stored {
  order: string[];
  hidden: string[];
}

/** All widgets the modules offer, in module order. */
export function allWidgets(): DashboardWidget[] {
  return MODULES.flatMap((module) => module.widgets ?? []);
}

/** The order the user chose (new widgets at the end, after the default order), and what is hidden. */
const DEFAULT_ORDER = ['today', 'habits', 'tasks', 'lists', 'notes'];

export function useDashboardLayout() {
  const stored = useSetting<Stored>(SETTING);
  const widgets = allWidgets();
  const ids = widgets.map((w) => w.id);
  const order = [...(stored?.order ?? []), ...DEFAULT_ORDER, ...ids].filter(
    (id, index, all) => ids.includes(id) && all.indexOf(id) === index,
  );
  const hidden = new Set((stored?.hidden ?? []).filter((id) => ids.includes(id)));
  const byId = new Map(widgets.map((w) => [w.id, w]));
  return {
    ordered: order.map((id) => byId.get(id)!),
    hidden,
    save: (nextOrder: string[], nextHidden: Set<string>) =>
      setSetting(SETTING, { order: nextOrder, hidden: [...nextHidden] } satisfies Stored),
  };
}
