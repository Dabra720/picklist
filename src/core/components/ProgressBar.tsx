import { percent } from '../lib/util';

interface Props {
  checked: number;
  total: number;
  label: string;
  small?: boolean;
}

export function ProgressBar({ checked, total, label, small }: Props) {
  const value = percent(checked, total);
  const complete = total > 0 && checked === total;
  return (
    <div
      className={`progress${small ? ' progress-small' : ''}${complete ? ' progress-complete' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  );
}
