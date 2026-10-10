import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** A large, touch-friendly checkbox row with a title and an optional line of detail. */
export function CheckRow({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <label className="check-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="checkbox" aria-hidden="true">
        <Icon name="check" size={18} />
      </span>
      <span className="check-row-text">
        <span className="check-row-title">{title}</span>
        {detail && <span className="check-row-detail">{detail}</span>}
      </span>
    </label>
  );
}
