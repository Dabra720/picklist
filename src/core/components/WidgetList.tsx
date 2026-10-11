import type { ReactNode } from 'react';

/** The rows of a dashboard card, at most `max`, with "+ n meer" below. */
export function WidgetList<T>({
  items,
  max,
  empty,
  render,
  keyOf,
}: {
  items: T[];
  max: number;
  empty: ReactNode;
  render: (item: T) => ReactNode;
  keyOf: (item: T) => string;
}) {
  if (items.length === 0) return <p className="widget-empty">{empty}</p>;
  return (
    <>
      <ul className="task-list">
        {items.slice(0, max).map((item) => (
          <li key={keyOf(item)}>{render(item)}</li>
        ))}
      </ul>
      {items.length > max && <p className="widget-more-count">+ {items.length - max} meer</p>}
    </>
  );
}
