import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Icon } from '../components/Icon';
import { moveInArray } from '../lib/util';
import type { Item } from '../types';

interface Props {
  items: Item[];
  /** Manual reordering is only offered when the list is shown in its stored order. */
  sortable: boolean;
  onToggle: (id: string) => void;
  onEdit: (item: Item) => void;
  onReorder: (orderedIds: string[]) => void;
}

interface DragView {
  id: string;
  from: number;
  to: number;
  dy: number;
  height: number;
}

interface DragSession {
  id: string;
  from: number;
  to: number;
  startY: number;
  startScroll: number;
  pointerY: number;
  /** Row positions in document coordinates, measured when the drag started. */
  rows: { top: number; height: number }[];
  frame: number;
}

const SCROLL_EDGE = 110;
const SCROLL_STEP = 10;

export function ItemList({ items, sortable, onToggle, onEdit, onReorder }: Props) {
  const [drag, setDrag] = useState<DragView | null>(null);
  const session = useRef<DragSession | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const ids = items.map((item) => item.id);

  useEffect(() => () => cancelAnimationFrame(session.current?.frame ?? 0), []);

  const update = () => {
    const s = session.current;
    if (!s) return;
    const dy = s.pointerY - s.startY + (window.scrollY - s.startScroll);
    const own = s.rows[s.from];
    const center = own.top + own.height / 2 + dy;
    let to = s.from;
    for (let i = s.from + 1; i < s.rows.length; i++) {
      if (center > s.rows[i].top + s.rows[i].height / 2) to = i;
    }
    for (let i = s.from - 1; i >= 0; i--) {
      if (center < s.rows[i].top + s.rows[i].height / 2) to = i;
    }
    s.to = to;
    setDrag({ id: s.id, from: s.from, to, dy, height: own.height });
  };

  // Scrolls the page while the pointer is held near the top or bottom edge.
  const autoScroll = () => {
    const s = session.current;
    if (!s) return;
    const before = window.scrollY;
    if (s.pointerY < SCROLL_EDGE) window.scrollBy(0, -SCROLL_STEP);
    else if (s.pointerY > window.innerHeight - SCROLL_EDGE) window.scrollBy(0, SCROLL_STEP);
    if (window.scrollY !== before) update();
    s.frame = requestAnimationFrame(autoScroll);
  };

  const start = (id: string, event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || session.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    session.current = {
      id,
      from: ids.indexOf(id),
      to: ids.indexOf(id),
      startY: event.clientY,
      startScroll: window.scrollY,
      pointerY: event.clientY,
      rows: ids.map((rowId) => {
        const rect = rowRefs.current.get(rowId)?.getBoundingClientRect();
        return { top: (rect?.top ?? 0) + window.scrollY, height: rect?.height ?? 0 };
      }),
      frame: requestAnimationFrame(autoScroll),
    };
    update();
  };

  const move = (event: PointerEvent) => {
    if (!session.current) return;
    session.current.pointerY = event.clientY;
    update();
  };

  const end = (commit: boolean) => {
    const s = session.current;
    if (!s) return;
    cancelAnimationFrame(s.frame);
    session.current = null;
    setDrag(null);
    if (commit && s.to !== s.from) onReorder(moveInArray(ids, s.from, s.to));
  };

  const onHandleKey = (id: string, event: KeyboardEvent) => {
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    const from = ids.indexOf(id);
    const to = from + step;
    if (step === 0 || to < 0 || to >= ids.length) return;
    event.preventDefault();
    onReorder(moveInArray(ids, from, to));
  };

  const rowStyle = (index: number): CSSProperties | undefined => {
    if (!drag) return undefined;
    if (index === drag.from) return { transform: `translateY(${drag.dy}px)` };
    if (drag.from < drag.to && index > drag.from && index <= drag.to) {
      return { transform: `translateY(${-drag.height}px)` };
    }
    if (drag.to < drag.from && index >= drag.to && index < drag.from) {
      return { transform: `translateY(${drag.height}px)` };
    }
    return undefined;
  };

  return (
    <ul className={`card items${drag ? ' items-sorting' : ''}`}>
      {items.map((item, index) => (
        <li
          key={item.id}
          ref={(element) => {
            if (element) rowRefs.current.set(item.id, element);
            else rowRefs.current.delete(item.id);
          }}
          className={`item${item.checked ? ' item-checked' : ''}${drag?.id === item.id ? ' item-dragging' : ''}`}
          style={rowStyle(index)}
        >
          <label className="item-main">
            <input type="checkbox" checked={item.checked} onChange={() => onToggle(item.id)} />
            <span className="checkbox" aria-hidden="true">
              <Icon name="check" size={18} />
            </span>
            <span className="item-name">
              {item.quantity > 1 && <span className="item-qty">{item.quantity}× </span>}
              {item.name}
            </span>
          </label>
          <button
            type="button"
            className="icon-btn icon-btn-subtle"
            aria-label={`${item.name} bewerken`}
            onClick={() => onEdit(item)}
          >
            <Icon name="edit" size={20} />
          </button>
          {sortable && (
            <button
              type="button"
              className="icon-btn icon-btn-subtle drag-handle"
              aria-label={`${item.name} verplaatsen; gebruik pijl omhoog of omlaag`}
              onPointerDown={(event) => start(item.id, event)}
              onPointerMove={move}
              onPointerUp={() => end(true)}
              onPointerCancel={() => end(false)}
              onKeyDown={(event) => onHandleKey(item.id, event)}
            >
              <Icon name="grip" size={20} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
