import { CheckRow } from '../../core/components/CheckRow';
import { Icon } from '../../core/components/Icon';
import { Sheet } from '../../core/components/Sheet';
import { moveInArray } from '../../core/lib/util';
import { useDashboardLayout } from './widgets';

/** Show or hide dashboard cards and change their order. */
export function CustomizeSheet({ onClose }: { onClose: () => void }) {
  const { ordered, hidden, save } = useDashboardLayout();
  const ids = ordered.map((w) => w.id);
  const move = (index: number, delta: number) =>
    save(moveInArray(ids, index, index + delta), hidden);
  const toggle = (id: string, on: boolean) => {
    const next = new Set(hidden);
    if (on) next.delete(id);
    else next.add(id);
    save(ids, next);
  };
  return (
    <Sheet title="Dashboard aanpassen" onClose={onClose}>
      <p className="sheet-text">Kies welke blokken je ziet en in welke volgorde.</p>
      <ul className="check-list">
        {ordered.map((widget, index) => (
          <li key={widget.id} className="widget-order-row">
            <CheckRow
              checked={!hidden.has(widget.id)}
              onChange={(on) => toggle(widget.id, on)}
              title={widget.title}
            />
            <button
              type="button"
              className="icon-btn icon-btn-subtle"
              aria-label={`${widget.title} omhoog`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <Icon name="up" size={20} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-subtle"
              aria-label={`${widget.title} omlaag`}
              disabled={index === ordered.length - 1}
              onClick={() => move(index, 1)}
            >
              <Icon name="down" size={20} />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
