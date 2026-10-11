import { Sheet } from '../../core/components/Sheet';
import { capitalize, relativeDay, type DateKey } from '../../core/lib/dates';
import { useAppState } from '../../core/store';
import { setAmount } from './store';
import type { Habit } from './types';
import { checkId } from './util';

/** Fill in how much of a habit was done on one day. */
export function AmountSheet({
  habit,
  date,
  onClose,
}: {
  habit: Habit;
  date: DateKey;
  onClose: () => void;
}) {
  const { data } = useAppState();
  const amount = data.habitChecks.find((c) => c.id === checkId(habit.id, date))?.amount ?? 0;
  const target = habit.target?.amount ?? 1;
  const steps = target >= 20 ? [1, 5, 10] : [1];
  return (
    <Sheet title={`${habit.name} · ${capitalize(relativeDay(date))}`} onClose={onClose}>
      <div className="amount-big" aria-live="polite">
        <strong>{amount}</strong> / {target} {habit.target?.unit}
      </div>
      <div className="amount-buttons">
        {steps.map((step) => (
          <button
            key={`-${step}`}
            type="button"
            className="btn"
            disabled={amount === 0}
            onClick={() => setAmount(habit.id, date, amount - step)}
          >
            −{step}
          </button>
        ))}
        {steps.map((step) => (
          <button
            key={`+${step}`}
            type="button"
            className="btn btn-primary"
            onClick={() => setAmount(habit.id, date, amount + step)}
          >
            +{step}
          </button>
        ))}
      </div>
      <div className="button-row">
        <button
          type="button"
          className="btn"
          onClick={() => setAmount(habit.id, date, 0)}
          disabled={amount === 0}
        >
          Op nul
        </button>
        <button type="button" className="btn" onClick={() => setAmount(habit.id, date, target)}>
          Helemaal ({target})
        </button>
      </div>
    </Sheet>
  );
}
