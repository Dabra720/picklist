import { ProgressBar } from '../../core/components/ProgressBar';
import { WidgetList } from '../../core/components/WidgetList';
import { useAppState } from '../../core/store';
import { openList } from './routes';

/** Dashboard: packing lists that are not complete yet, most recently used first. */
export function ListsWidget() {
  const { data } = useAppState();
  const counts = new Map<string, { total: number; checked: number }>();
  for (const item of data.items) {
    const c = counts.get(item.listId) ?? { total: 0, checked: 0 };
    c.total += 1;
    if (item.checked) c.checked += 1;
    counts.set(item.listId, c);
  }
  // A list counts as in use when it changed most recently or one of its items did.
  const lastUse = new Map<string, number>();
  for (const list of data.lists) lastUse.set(list.id, list.updatedAt);
  for (const item of data.items)
    lastUse.set(item.listId, Math.max(lastUse.get(item.listId) ?? 0, item.updatedAt));
  const active = data.lists
    .map((list) => ({ list, ...(counts.get(list.id) ?? { total: 0, checked: 0 }) }))
    .filter(({ total, checked }) => total > 0 && checked < total)
    .sort((a, b) => (lastUse.get(b.list.id) ?? 0) - (lastUse.get(a.list.id) ?? 0));
  return (
    <WidgetList
      items={active}
      max={3}
      empty={data.lists.length === 0 ? 'Nog geen paklijsten.' : 'Alle paklijsten zijn compleet.'}
      keyOf={({ list }) => list.id}
      render={({ list, total, checked }) => (
        <button type="button" className="widget-list-row" onClick={() => openList(list.id)}>
          <span className="widget-list-top">
            <span className="task-title">{list.name}</span>
            <span className="task-meta">
              {checked}/{total}
            </span>
          </span>
          <ProgressBar small checked={checked} total={total} label={`Voortgang ${list.name}`} />
        </button>
      )}
    />
  );
}
